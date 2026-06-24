import { prisma } from '../../config/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { CloudinaryService } from '../../services/cloudinary.service';
import { Prisma } from '@prisma/client';

const PRIVATE_FIELDS = { auth_user_id: true, email: true, telephone: true};

const PUBLIC_PROFILE_SELECT = {
    id: true,
    nom: true,
    prenom: true,
    profile_type: true,
    avatar_url: true,
    localisation_ville: true,
    localisation_quartier: true,
    is_verified: true,
    last_seen_at: true,
    created_at: true,
};

export class ProfilesService {

    //Récupère le profil complet de l'utilisateur connecté.
    static async getMe(userId: string) {
        const profile = await prisma.profiles.findUnique({ where: { id: userId } });
        if (!profile) throw new AppError('Profil introuvable', 404, 'NOT_FOUND');
        return profile;
    }

    //Met à jour les champs du profil de l'utilisateur connecté.
    static async updateMe(userId: string, data: { nom?: string; prenom?: string; telephone?: string; bio?: string; localisation_ville?: string; localisation_quartier?: string }) {
        return prisma.profiles.update({ where: { id: userId }, data });
    }

    //pload un avatar sur Cloudinary
    static async updateAvatar(userId: string, filePath: string) {
        const profile = await prisma.profiles.findUnique({ where: { id: userId } });
        if (!profile) throw new AppError('Profil introuvable', 404, 'NOT_FOUND');

        if (profile.avatar_cloudinary_id) {
            await CloudinaryService.destroy(profile.avatar_cloudinary_id);
        }

        const result = await CloudinaryService.upload(filePath, 'avatars');

        return prisma.profiles.update({
            where: {id: userId},
            data: {
                avatar_url: result.url,
                avatar_cloudinary_id: result.publicId,
            },
        });
    }

    //Récupère le profil public
    static async getPublicProfile(profileId: string) {
        const profile = await prisma.profiles.findUnique({
            where: { id: profileId },
            select: PUBLIC_PROFILE_SELECT,
        });

        if (!profile) throw new AppError('Profil introuvable', 404, 'NOT_FOUND');
        return profile;
    }

    //Liste tous les offreurs actifs avec recherche optionnelle par nom.
    static async getAllOffreurs(search?: string, excludeId?: string) {
        const where: any = { profile_type: 'offreur', is_active: true };
        if (excludeId) where.id = { not: excludeId };

        if (search && search.trim()) {
            where.OR = [
              { nom: { contains: search.trim(), mode: 'insensitive' } },
              { prenom: { contains: search.trim(), mode: 'insensitive' } },
            ];
        }

        return prisma.profiles.findMany({
            where,
            select: {
                id: true,
                nom: true,
                prenom: true,
                avatar_url: true,
                localisation_ville: true,
                profile_type: true,
                created_at: true,
            },
            orderBy: { created_at: 'desc' }, 
        });
    }

    //Récupère le profil public enrichi d'un offreur (avec email + téléphone).
    static async getPublicProfileFull(profileId: string) {
        const profile = await prisma.profiles.findUnique({
            where: { id: profileId },
            select: {
                ...PUBLIC_PROFILE_SELECT,
                email: true,
                telephone: true,
            },
        });

        if (!profile) throw new AppError('Profil introuvable', 404, 'NOT_FOUND');
        return profile;
    }

    //Enregistre une visite de profil et notifie l'offreur visité.
    static async recordProfileVisit(visitorId: string, offreurId: string) {
        if (visitorId === offreurId) return { ok: true, notified: false };

        const target = await prisma.profiles.findUnique({ where: { id: offreurId } });
        if (!target) throw new AppError('Profil introuvable', 404, 'NOT_FOUND');
        if (target.profile_type !== 'offreur') return { ok: true, notified: false };

        const visitor = await prisma.profiles.findUnique({
            where: { id: visitorId },
            select: { nom: true, prenom: true },
        });

        await prisma.notifications.create({
            data: {
                destinataire_id: offreurId,
                type: 'vue_annonce',
                titre: 'Visite de profil',
                corps: `${visitor?.prenom ?? ''} ${visitor?.nom ?? ''} a visité votre profil.`,
                action_url: `/profil/${visitorId}`,
            },
        });

        return {
            ok: true,
            notified: true
        };
    }
}