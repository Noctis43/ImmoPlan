import { prisma } from '../../config/prisma';

export class DashboardService {
    // Calcule les statistiques globales (vues, likes, note) pour un offreur. 
    static async getStats(offreurId: string) {
        const annonces = await prisma.annonces.findMany({
            where: { offreur_id: offreurId },
            select: { nb_vues: true, nb_likes: true, note_moyenne: true },
        });

        const total_annonces = annonces.length;
        const total_vues = annonces.reduce((sum, a) => sum + (a.nb_vues || 0), 0);
        const total_likes = annonces.reduce((sum, a) => sum + (a.nb_likes || 0), 0);

        const notedAnnonces = annonces.filter((a) => a.note_moyenne !== null);
        const note_moyenne_globale =
            notedAnnonces.length > 0
                ? notedAnnonces.reduce((sum, a) => sum + Number(a.note_moyenne || 0), 0) / notedAnnonces.length
                : null;

        return {
            offreur_id: offreurId,
            total_annonces,
            total_vues,
            total_likes,
            note_moyenne_globale,
        };
    }

    // Retourne les 10 meilleures annonces triées par vues pour un offreur. 
    static async getAnnoncesPerformances(offreurId: string) {
        return prisma.annonces.findMany({
            where: { offreur_id: offreurId },
            select: {
                id: true,
                titre: true,
                statut: true,
                nb_vues: true,
                nb_likes: true,
                nb_avis: true,
                created_at: true,
            },
            orderBy: { nb_vues: 'desc' },
            take: 10,
        });
    }

    // Récupère les visites à venir pour un offreur, triées par date. 
    static async getVisitesAgenda(offreurId: string) {
        return prisma.visites.findMany({
            where: {
                annonces: { offreur_id: offreurId },
            },
            include: {
                annonces: { select: { id: true, titre: true } },
                profiles_visites_chercheur_idToprofiles: { select: { id: true, nom: true, prenom: true, telephone: true } },
            },
            orderBy: [{ date_souhaitee: 'asc' }, { heure_debut: 'asc' }],
            take: 500,
        });
    }

    // Récupère les conversations récentes avec messages non lus pour un offreur. 
    static async getRecentMessages(offreurId: string) {
        return prisma.conversations.findMany({
            where: {
                offreur_id: offreurId,
                messages: { some: { statut: { not: 'lu' }, sender_id: { not: offreurId } } },
            },
            include: {
                annonces: { select: { id: true, titre: true } },
                profiles_conversations_chercheur_idToprofiles: { select: { id: true, nom: true, prenom: true, avatar_url: true } },
                messages: { orderBy: { created_at: 'desc' }, take: 1 },
            },
            orderBy: { last_message_at: { sort: 'desc', nulls: 'last' } },
            take: 20,
        });
    }
}
