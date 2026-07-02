import { prisma } from '../../config/prisma';
import { redis } from '../../config/redis';
import { logger } from '../../utils/logger';
import { jsonSafeStringify } from '../../utils/jsonSafe';
import { AppError } from '../../middlewares/error.middleware';

interface FeatureVector {

    typeBien: number[];
    prixNorm: number;
    service: number;
    villeId: number;
    surfaceNorm: number;
}

export interface RecommendationPreferences {
    prix_min?: number;
    prix_max?: number;
    service?: 'vente' | 'location';
    ville_id?: number;
}

const PROPERTY_TYPES = [
    'appartement', 'maison', 'villa', 'studio', 'duplex',
    'bureau', 'local_commercial', 'terrain', 'entrepot', 'autre',
];

const MAX_PRIX = 5_000_000_000; 
const MAX_SURFACE = 10_000; 

export class RecommandationService {
    private static PREF_KEY(userId: string): string {
        return `reco_pref:${userId}`;
    }

    static async getPreferences(chercheurId: string): Promise<RecommendationPreferences> {
        try {
            const raw = await redis.get(this.PREF_KEY(chercheurId));
            if (!raw) return {};
            const parsed = JSON.parse(raw) as RecommendationPreferences;
            return {
                prix_min: typeof parsed.prix_min === 'number' ? parsed.prix_min : undefined,
                prix_max: typeof parsed.prix_max === 'number' ? parsed.prix_max : undefined,
                service: parsed.service === 'vente' || parsed.service === 'location' ? parsed.service : undefined,
                ville_id: typeof parsed.ville_id === 'number' ? parsed.ville_id : undefined,
            };
        } catch {
            return {};
        }
    }

    static async setPreferences(chercheurId: string, prefs: RecommendationPreferences): Promise<RecommendationPreferences> {
        if (prefs.ville_id !== undefined) {
            const ville = await prisma.villes.findUnique({ where: { id: prefs.ville_id }, select: { id: true } });
            if (!ville) {
                throw new AppError('Ville introuvable', 404, 'VILLE_NOT_FOUND');
            }
        }
        const normalized: RecommendationPreferences = {
            prix_min: prefs.prix_min !== undefined ? Number(prefs.prix_min) : undefined,
            prix_max: prefs.prix_max !== undefined ? Number(prefs.prix_max) : undefined,
            service: prefs.service,
            ville_id: prefs.ville_id !== undefined ? Number(prefs.ville_id) : undefined,
        };
        await redis.set(this.PREF_KEY(chercheurId), jsonSafeStringify(normalized), 'EX', 60 * 60 * 24 * 365);
        await redis.del(`feed:${chercheurId}`);
        await redis.del(`feed:v3:${chercheurId}`);
        return normalized;
    }

    private static matchesAllPrefs(
        annonce: { service: string; prix: unknown; ville_id: number },
        prefs: RecommendationPreferences,
    ): boolean {
        if (prefs.service !== undefined && annonce.service !== prefs.service) return false;
        const prix = Number(annonce.prix);
        if (prefs.prix_min !== undefined && prix < prefs.prix_min) return false;
        if (prefs.prix_max !== undefined && prix > prefs.prix_max) return false;
        if (prefs.ville_id !== undefined && Number(annonce.ville_id) !== Number(prefs.ville_id)) {
            return false;
        }
        return true;
    }

    private static hasCompletePreferences(prefs: RecommendationPreferences): boolean {
        return (
            prefs.service !== undefined
            && prefs.ville_id !== undefined
            && prefs.prix_min !== undefined
            && prefs.prix_max !== undefined
        );
    }

    static async getTendances(query: { cursor?: string; limit?: string }, userId?: string) {
        const limit = Math.min(parseInt(query.limit || '20', 10), 50);

        const annonces = await prisma.annonces.findMany({
            where: { statut: 'publiee' },
            orderBy: [
                { nb_vues: 'desc' },
                { nb_likes: 'desc' },
                { published_at: 'desc' },
                { created_at: 'desc' },
            ],
            ...(query.cursor
                ? {
                    cursor: { id: query.cursor },
                    skip: 1,
                }
                : {}),
            take: limit + 1,
            include: {
                annonce_photos: { orderBy: { ordre: 'asc' }, take: 1 },
                profiles: { select: { id: true, nom: true, prenom: true, avatar_url: true } },
                villes: { select: { nom: true } },
                ...(userId ? {
                    annonce_likes: {
                        where: { chercheur_id: userId },
                        select: { id: true }
                    }
                } : {})
            },
        });

        const items = annonces.slice(0, limit);
        const nextCursor = annonces.length > limit ? items[items.length - 1]?.id ?? null : null;

        const itemsWithLikeStatus = items.map(annonce => ({
            ...annonce,
            isLiked: userId ? annonce.annonce_likes.length > 0 : false
        }));

        return {
            data: itemsWithLikeStatus,
            meta: {
                nextCursor: nextCursor,
                hasMore: annonces.length > limit,
                total: annonces.length,
            },
        };
    }

    static async getFeedPersonnalise(chercheurId: string, query: { cursor?: string; limit?: string }) {
        const limit = Math.min(parseInt(query.limit || '20', 10), 50);

        const cacheKey = `feed:v3:${chercheurId}`;
        const cached = await redis.get(cacheKey);
        if (cached && !query.cursor) return JSON.parse(cached);

        const explicitPrefs = await RecommandationService.getPreferences(chercheurId);

        if (!RecommandationService.hasCompletePreferences(explicitPrefs)) {
            return {
                data: [],
                meta: {
                    nextCursor: null,
                    hasMore: false,
                    total: 0,
                    incompletePreferences: true,
                },
            };
        }

        const userProfile = await RecommandationService.buildUserProfile(chercheurId, explicitPrefs);

        const publishedAnnonces = await prisma.annonces.findMany({
            where: {
                statut: 'publiee',
                offreur_id: { not: chercheurId },
                service: explicitPrefs.service,
                ville_id: explicitPrefs.ville_id,
                prix: {
                    gte: explicitPrefs.prix_min,
                    lte: explicitPrefs.prix_max,
                },
            },
            include: {
                annonce_photos: { orderBy: { ordre: 'asc' }, take: 1 },
                profiles: { select: { id: true, nom: true, prenom: true, avatar_url: true } },
                villes: { select: { nom: true } },
                annonce_likes: {
                    where: { chercheur_id: chercheurId },
                    select: { id: true },
                },
            },
        });

        const viewedIds = await prisma.annonce_vues.findMany({
            where: { chercheur_id: chercheurId },
            select: { annonce_id: true },
        });
        const viewedSet = new Set(viewedIds.map((v) => v.annonce_id));

        const pool = publishedAnnonces.filter(
            (a) => !viewedSet.has(a.id) && RecommandationService.matchesAllPrefs(a, explicitPrefs),
        );

        const scored = pool.map((annonce) => {
            const annonceVector = RecommandationService.buildFeatureVector(annonce);
            const similarity = RecommandationService.cosineSimilarity(userProfile, annonceVector);

            const refDate = annonce.published_at ?? annonce.created_at;
            const ageDays = refDate
                ? (Date.now() - refDate.getTime()) / (24 * 60 * 60 * 1000)
                : 365;
            const recencyScore = Math.max(0, 1 - ageDays / 180);
            const combinedScore = 0.55 * similarity + 0.45 * Math.max(0, recencyScore);

            return {
                ...annonce,
                score: combinedScore,
                isLiked: annonce.annonce_likes.length > 0,
            };
        });

        scored.sort((a, b) => b.score - a.score);

        const startIndex = query.cursor
            ? scored.findIndex((a) => a.id === query.cursor) + 1
            : 0;
        const paginatedResults = scored.slice(startIndex, startIndex + limit);

        const result = {
            data: paginatedResults,
            meta: {
                nextCursor: paginatedResults.length === limit ? paginatedResults[paginatedResults.length - 1].id : null,
                hasMore: startIndex + limit < scored.length,
                total: scored.length,
            },
        };

        if (!query.cursor) {
            await redis.set(cacheKey, jsonSafeStringify(result), 'EX', 300);
        }

        return result;
    }

    static async getSimilaires(chercheurId: string, query: { limit?: number }) {
        const limit = Math.min(Number(query.limit || 12), 50);

        const lastVue = await prisma.annonce_vues.findFirst({
            where: { chercheur_id: chercheurId },
            orderBy: { viewed_at: 'desc' },
            select: { annonce_id: true }
        });

        if (!lastVue) {
            return {
                data: [],
                meta: { total: 0 }
            };
        }

        const targetAnnonce = await prisma.annonces.findUnique({
            where: { id: lastVue.annonce_id, statut: 'publiee' }
        });

        if (!targetAnnonce) {
            return {
                data: [],
                meta: { total: 0 }
            };
        }

        const targetVector = RecommandationService.buildFeatureVector(targetAnnonce);

        const candidates = await prisma.annonces.findMany({
            where: {
                statut: 'publiee',
                id: { not: targetAnnonce.id } 
            },
            include: {
                annonce_photos: { orderBy: { ordre: 'asc' }, take: 1 },
                profiles: { select: { id: true, nom: true, prenom: true, avatar_url: true } },
                villes: { select: { nom: true } },
                annonce_likes: {
                    where: { chercheur_id: chercheurId },
                    select: { id: true }
                }
            }
        });

        const scored = candidates.map((annonce) => {
            const candidateVector = RecommandationService.buildFeatureVector(annonce);
            const similarity = RecommandationService.cosineSimilarity(targetVector, candidateVector);

            return {
                ...annonce,
                similarity,
                isLiked: annonce.annonce_likes.length > 0
            };
        });

        scored.sort((a, b) => b.similarity - a.similarity);

        const similarAnnonces = scored.filter(a => a.similarity > 0).slice(0, limit);

        return {
            data: similarAnnonces,
            meta: {
                total: similarAnnonces.length
            }
        };
    }

    private static async buildUserProfile(chercheurId: string, explicitPrefs?: RecommendationPreferences): Promise<FeatureVector> {

        const [historique, likes, sauvegardes] = await Promise.all([
            prisma.historique_recherches.findMany({
                where: { chercheur_id: chercheurId },
                orderBy: { created_at: 'desc' },
                take: 50,
                select: { annonce_id: true, action_type: true },
            }),
            prisma.annonce_likes.findMany({
                where: { chercheur_id: chercheurId },
                select: { annonce_id: true },
                take: 50,
            }),
            prisma.annonces_sauvegardees.findMany({
                where: { chercheur_id: chercheurId },
                select: { annonce_id: true },
                take: 50,
            }),
        ]);

        const annonceIds = new Set<string>();
        historique.forEach((h) => annonceIds.add(h.annonce_id));
        likes.forEach((l) => annonceIds.add(l.annonce_id));
        sauvegardes.forEach((s) => annonceIds.add(s.annonce_id));

        if (annonceIds.size === 0) {
            // Profil neutre si aucune interaction
            const neutral: FeatureVector = {
                typeBien: new Array(PROPERTY_TYPES.length).fill(1 / PROPERTY_TYPES.length),
                prixNorm: 0.5,
                service: 0.5,
                villeId: 0,
                surfaceNorm: 0.5,
            };
            if (explicitPrefs?.service) neutral.service = explicitPrefs.service === 'location' ? 1 : 0;
            if (explicitPrefs?.ville_id) neutral.villeId = explicitPrefs.ville_id;
            if (explicitPrefs?.prix_min !== undefined || explicitPrefs?.prix_max !== undefined) {
                const pMin = explicitPrefs.prix_min ?? 0;
                const pMax = explicitPrefs.prix_max ?? MAX_PRIX;
                neutral.prixNorm = Math.min(((pMin + pMax) / 2) / MAX_PRIX, 1);
            }
            return neutral;
        }

        const annonces = await prisma.annonces.findMany({
            where: { id: { in: Array.from(annonceIds) } },
            select: { type_bien: true, prix: true, service: true, ville_id: true, surface_m2: true },
        });

        const typeCounts = new Array(PROPERTY_TYPES.length).fill(0);
        let totalPrix = 0;
        let serviceLocation = 0;
        let totalSurface = 0;
        const villeCounts = new Map<number, number>();

        for (const ann of annonces) {
            const typeIndex = PROPERTY_TYPES.indexOf(ann.type_bien);
            if (typeIndex >= 0) typeCounts[typeIndex]++;

            totalPrix += Number(ann.prix);
            if (ann.service === 'location') serviceLocation++;
            totalSurface += Number(ann.surface_m2);

            villeCounts.set(ann.ville_id, (villeCounts.get(ann.ville_id) || 0) + 1);
        }

        const n = annonces.length;
        const totalTypeCount = typeCounts.reduce((a: number, b: number) => a + b, 0) || 1;

        const profile: FeatureVector = {
            typeBien: typeCounts.map((c: number) => c / totalTypeCount),
            prixNorm: Math.min((totalPrix / n) / MAX_PRIX, 1),
            service: serviceLocation / n,
            villeId: [...villeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 0,
            surfaceNorm: Math.min((totalSurface / n) / MAX_SURFACE, 1),
        };
        if (explicitPrefs?.service) profile.service = explicitPrefs.service === 'location' ? 1 : 0;
        if (explicitPrefs?.ville_id) profile.villeId = explicitPrefs.ville_id;
        if (explicitPrefs?.prix_min !== undefined || explicitPrefs?.prix_max !== undefined) {
            const pMin = explicitPrefs.prix_min ?? 0;
            const pMax = explicitPrefs.prix_max ?? MAX_PRIX;
            profile.prixNorm = Math.min(((pMin + pMax) / 2) / MAX_PRIX, 1);
        }
        return profile;
    }

    private static buildFeatureVector(annonce: {
        type_bien: string; prix: unknown; service: string;
        ville_id: number; surface_m2: unknown;
    }): FeatureVector {
        const typeBien = new Array(PROPERTY_TYPES.length).fill(0);
        const typeIndex = PROPERTY_TYPES.indexOf(annonce.type_bien);
        if (typeIndex >= 0) typeBien[typeIndex] = 1;

        return {
            typeBien,
            prixNorm: Math.min(Number(annonce.prix) / MAX_PRIX, 1),
            service: annonce.service === 'location' ? 1 : 0,
            villeId: annonce.ville_id,
            surfaceNorm: Math.min(Number(annonce.surface_m2) / MAX_SURFACE, 1),
        };
    }

    private static cosineSimilarity(a: FeatureVector, b: FeatureVector): number {
       
        const vecA = [
            ...a.typeBien,                    
            a.prixNorm,                       
            a.service,                     
            a.villeId === b.villeId ? 1 : 0,   
            a.surfaceNorm,                     
        ];
        const vecB = [
            ...b.typeBien,
            b.prixNorm,
            b.service,
            1, 
            b.surfaceNorm,
        ];

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];  
            normA += vecA[i] * vecA[i];       
            normB += vecB[i] * vecB[i];        
        }

        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);

        if (normA === 0 || normB === 0) return 0;

        return dotProduct / (normA * normB);
    }
}
