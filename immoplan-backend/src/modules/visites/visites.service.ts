import { prisma } from '../../config/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { Queue } from 'bullmq';
import { env } from '../../config/env';

const notificationQueue = new Queue('notifications', {
    connection: { 
        host: new URL(env.REDIS_URL).hostname,
        port: parseInt(new URL(env.REDIS_URL).port || '6379') }
});

const emailQueue = new Queue('emails', {
    connection: { 
        host: new URL(env.REDIS_URL).hostname, 
        port: parseInt(new URL(env.REDIS_URL).port || '6379') }
});

const VISITE_TIMEZONE_OFFSET = '+03:00';

function isVisiteSlotAllowed(dateSouhaitee: string, heureDebut: string): boolean {
    const slotDate = new Date(`${dateSouhaitee}T${heureDebut}:00${VISITE_TIMEZONE_OFFSET}`);
    if (Number.isNaN(slotDate.getTime())) return false;

    const dayOfWeek = slotDate.getUTCDay(); // 0 = dimanche ... 6 = samedi (référence UTC du timestamp déjà en +03:00)
    const [hours, minutes] = heureDebut.split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return false;
    const totalMinutes = hours * 60 + minutes;

    if (dayOfWeek >= 1 && dayOfWeek <= 6) {
        return totalMinutes >= 9 * 60 && totalMinutes <= 18 * 60;
    }

    return totalMinutes >= 14 * 60 && totalMinutes <= 17 * 60;
}

function heureDebutToHHMM(heureDebut: Date): string {
    const d = new Date(heureDebut);
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export class VisitesService {
    //Vérifie si une visite confirmée est passée (plus de 30 min après l'heure prévue).
    static isVisitePassee(visite: { date_confirmee?: Date | string | null; heure_confirmee?: Date | string | null; statut: string }): boolean {
        if (visite.statut !== 'confirmee') return false;
    
        if (!visite.date_confirmee || !visite.heure_confirmee) return false;
    
        const date = new Date(visite.date_confirmee);

        const heureStr = String(visite.heure_confirmee);
        const [hours, minutes] = heureStr.split(':').map(Number);

        const visiteDateTime = new Date(Date.UTC(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            hours || 0,
            minutes || 0
        ));

        const limite = new Date(visiteDateTime.getTime() + 30 * 60 * 1000);
        return new Date() > limite;
    }

    //Crée une demande de visite pour une annonce avec notification à l'offreur.
    static async create(requesterId: string, data: { annonce_id: string; date_souhaitee: string; heure_debut: string; duree_minutes: number; message_demande?: string }) {
        if (!isVisiteSlotAllowed(data.date_souhaitee, data.heure_debut)) {
            throw new AppError(
                'Créneau non autorisé. Heures de visite: lun-sam 09:00-18:00, dimanche 14:00-17:00 (UTC+03:00).',
                422,
                'INVALID_VISITE_SLOT',
            );
        }

        const annonce = await prisma.annonces.findUnique({
            where: { id: data.annonce_id },
            select: { offreur_id: true, titre: true },
        });

        if (!annonce) throw new AppError('Annonce introuvable', 404, 'NOT_FOUND');
        if (annonce.offreur_id === requesterId) {
            throw new AppError('Vous ne pouvez pas demander une visite sur votre propre annonce', 403, 'FORBIDDEN');
        }

        const visite = await prisma.visites.create({
            data: {
                annonce_id: data.annonce_id,
                chercheur_id: requesterId,
                offreur_id: annonce.offreur_id,
                date_souhaitee: new Date(`${data.date_souhaitee}T00:00:00${VISITE_TIMEZONE_OFFSET}`),
                heure_debut: new Date(`${data.date_souhaitee}T${data.heure_debut}:00${VISITE_TIMEZONE_OFFSET}`),
                duree_minutes: data.duree_minutes,
                message_demande: data.message_demande || null,
            },
        });

        const notification = await prisma.notifications.create({
            data: {
                destinataire_id: annonce.offreur_id,
                type: 'demande_visite',
                titre: 'Demande de visite',
                corps: `Nouvelle demande pour "${annonce.titre}" le ${data.date_souhaitee}`,
                annonce_id: data.annonce_id,
                visite_id: visite.id,
                action_url: `/visites`,
            },
        });

        await notificationQueue.add('notify', {
            notificationId: notification.id, destinataireId: annonce.offreur_id,
            type: 'demande_visite', titre: notification.titre, corps: notification.corps,
        });

        return visite
    }

    //Récupère les visites de l'utilisateur avec statut "passée" calculé.
    static async getMyVisites(userId: string) {
        const visites = await prisma.visites.findMany({
            where: { OR: [{ chercheur_id: userId }, { offreur_id: userId }] },
            include: {
                annonces: { select: { id: true, titre: true } },
                profiles_visites_chercheur_idToprofiles: { select: { 
                    id: true,
                    nom: true, 
                    prenom: true 
                } },
                profiles_visites_offreur_idToprofiles: { select: { 
                    id: true, 
                    nom: true, 
                    prenom: true 
                } },
            },
            orderBy: { created_at: 'desc' },
        });

        return visites.map(visite => {
            const estPassee = this.isVisitePassee(visite);
            return {
                ...visite,
                date_souhaitee: visite.date_souhaitee instanceof Date ? visite.date_souhaitee.toISOString().slice(0, 10) : visite.date_souhaitee,
                date_confirmee: visite.date_confirmee instanceof Date ? visite.date_confirmee.toISOString().slice(0, 10) : visite.date_confirmee,
                heure_debut: visite.heure_debut instanceof Date ? visite.heure_debut.toISOString().slice(11, 16) : visite.heure_debut,
                heure_confirmee: visite.heure_confirmee instanceof Date ? visite.heure_confirmee.toISOString().slice(11, 16) : visite.heure_confirmee,
                estPassee,
                peutChangerStatut: visite.statut === 'confirmee' && estPassee && visite.offreur_id === userId
            };
        });
    }

    //Répond à une demande de visite 
    static async confirmer( visiteId: string, offreurId: string, data: { mode: 'accepter_demande' } | { mode: 'contre_proposer'; date_confirmee: string; heure_confirmee: string }) {
        const visite = await prisma.visites.findUnique({ where: { id: visiteId }, include: { annonces: { select: { titre: true } } } });
        if (!visite) throw new AppError('Visite introuvable', 404, 'NOT_FOUND');
        if (visite.offreur_id !== offreurId) throw new AppError('Accès interdit', 403, 'FORBIDDEN');
        if (visite.statut !== 'en_attente') {
            throw new AppError('Cette demande ne peut plus être modifiée', 400, 'BAD_STATE');
        }

        const chercheur = await prisma.profiles.findUnique({ where: { id: visite.chercheur_id }, select: { email: true } });

        if (data.mode === 'accepter_demande') {
            const date_confirmee = new Date(visite.date_souhaitee);
            const heure_confirmeeDate = new Date(visite.heure_debut);
            const heure_confirmeeLabel = heureDebutToHHMM(heure_confirmeeDate);

            const updated = await prisma.visites.update({
                where: { id: visiteId },
                data: {
                    statut: 'confirmee',
                    date_confirmee,
                    heure_confirmee: heure_confirmeeDate,
                },
            });

            const notification = await prisma.notifications.create({
                data: {
                    destinataire_id: visite.chercheur_id,
                    type: 'visite_confirmee',
                    titre: 'Visite confirmée',
                    corps: `Votre visite pour "${visite.annonces.titre}" est confirmée`,
                    visite_id: visiteId,
                    action_url: `/visites`,
                },
            });

            await notificationQueue.add('notify', {
                notificationId: notification.id,
                destinataireId: visite.chercheur_id,
                type: 'visite_confirmee',
                titre: notification.titre,
                corps: notification.corps,
                emailData: {
                    email: chercheur?.email || '',
                    annonceTitre: visite.annonces.titre,
                    date: date_confirmee.toISOString().slice(0, 10),
                    heure: heure_confirmeeLabel,
                },
            });

            await emailQueue.add('visite-email', {
                type: 'visite',
                to: chercheur?.email || '',
                data: {
                    visiteType: 'confirmee',
                    annonceTitre: visite.annonces.titre,
                    date: date_confirmee.toISOString().slice(0, 10),
                    heure: heure_confirmeeLabel,
                },
            });

            return updated;
        }

        const date_confirmee = new Date(data.date_confirmee);
        const ymd = typeof data.date_confirmee === 'string' && data.date_confirmee.length >= 10 ? data.date_confirmee.slice(0, 10) : date_confirmee.toISOString().slice(0, 10);
        const heure_confirmeeDate = new Date(`${ymd}T${data.heure_confirmee}:00`);
        
        if (Number.isNaN(heure_confirmeeDate.getTime())) {
            throw new AppError('Date ou heure invalide', 400, 'INVALID_DATETIME');
        }
        
        const heure_confirmeeLabel = data.heure_confirmee;
        const updated = await prisma.visites.update({
            where: { id: visiteId },
            data: {
                statut: 'contre_proposee',
                date_confirmee,
                heure_confirmee: heure_confirmeeDate,
            },
        });

        const notification = await prisma.notifications.create({
            data: {
                destinataire_id: visite.chercheur_id,
                type: 'demande_visite',
                titre: 'Nouveau créneau proposé',
                corps: `L'offreur propose une autre date pour "${visite.annonces.titre}" le ${data.date_confirmee} à ${heure_confirmeeLabel}. Merci de confirmer ou refuser.`,
                visite_id: visiteId,
                action_url: `/visites`,
            },
        });

        await notificationQueue.add('notify', {
            notificationId: notification.id,
            destinataireId: visite.chercheur_id,
            type: 'demande_visite',
            titre: notification.titre,
            corps: notification.corps,
        });

        return updated;
    }

    //Accepte la contre-proposition de l'offreur
    static async accepterContreProposition(visiteId: string, userId: string) {
        const visite = await prisma.visites.findUnique({
            where: { id: visiteId },
            include: { annonces: { select: { titre: true } } },
        });

        if (!visite) throw new AppError('Visite introuvable', 404, 'NOT_FOUND');
        if (visite.chercheur_id !== userId) {
            throw new AppError('Accès interdit', 403, 'FORBIDDEN');
        }
        if (visite.statut !== 'contre_proposee') {
            throw new AppError('Aucune contre-proposition à accepter', 400, 'BAD_STATE');
        }
        if (!visite.date_confirmee || !visite.heure_confirmee) {
            throw new AppError('Données de visite incomplètes', 422, 'INCOMPLETE');
        }

        const updated = await prisma.visites.update({
            where: { id: visiteId },
            data: { statut: 'confirmee' },
        });

        const recipient = await prisma.profiles.findUnique({ where: { id: visite.offreur_id }, select: { email: true } });
        const heureStr = heureDebutToHHMM(new Date(visite.heure_confirmee));
        const dateStr = new Date(visite.date_confirmee).toISOString().slice(0, 10);

        const notification = await prisma.notifications.create({
            data: {
                destinataire_id: visite.offreur_id,
                type: 'visite_confirmee',
                titre: 'Visite confirmée',
                corps: `Le créneau du ${dateStr} à ${heureStr} a été accepté pour "${visite.annonces.titre}".`,
                visite_id: visiteId,
                action_url: `/visites`,
            },
        });

        await notificationQueue.add('notify', {
            notificationId: notification.id,
            destinataireId: visite.offreur_id,
            type: 'visite_confirmee',
            titre: notification.titre,
            corps: notification.corps,
            emailData: {
                email: recipient?.email || '',
                annonceTitre: visite.annonces.titre,
                date: dateStr,
                heure: heureStr,
            },
        });

        return updated;
    }

    //Annule une visite avec notification à l'autre partie.
    static async annuler(visiteId: string, userId: string, raison: string) {
        const visite = await prisma.visites.findUnique({ where: { id: visiteId }, include: { annonces: { select: { titre: true } } } });
        if (!visite) throw new AppError('Visite introuvable', 404, 'NOT_FOUND');
        if (visite.chercheur_id !== userId && visite.offreur_id !== userId) throw new AppError('Accès interdit', 403, 'FORBIDDEN');

        const updated = await prisma.visites.update({
            where: { id: visiteId },
            data: { statut: 'annulee', raison_annulation: raison },
        });

        const recipientId = visite.offreur_id === userId ? visite.chercheur_id : visite.offreur_id;
        await prisma.notifications.create({
            data: {
                destinataire_id: recipientId, type: 'visite_annulee',
                titre: 'Visite annulée', corps: `La visite pour "${visite.annonces.titre}" a été annulée`,
                visite_id: visiteId, action_url: `/visites`,
            },
        });

        return updated;
    }

    //Marque une visite confirmée comme effectuée par l'offreur.
    static async marquerEffectuee(visiteId: string, offreurId: string) {
        const visite = await prisma.visites.findUnique({ where: { id: visiteId } });
        if (!visite) throw new AppError('Visite introuvable', 404, 'NOT_FOUND');
        if (visite.offreur_id !== offreurId) throw new AppError('Accès interdit', 403, 'FORBIDDEN');
        if (visite.statut !== 'confirmee') {
            throw new AppError('La visite doit être confirmée avant d\'être marquée comme effectuée', 400, 'BAD_STATE');
        }
        return prisma.visites.update({ where: { id: visiteId }, data: { statut: 'effectuee' } });
    }
}