import crypto from 'crypto';
import fs from 'fs/promises';
import { prisma } from '../../config/prisma';
import { redis } from '../../config/redis';
import { AppError } from '../../middlewares/error.middleware';
import { CloudinaryService } from '../../services/cloudinary.service';
import { jsonSafeStringify } from '../../utils/jsonSafe';
import { buildPaginationResponse, parsePagination } from '../../utils/pagination';
import { isInBBox, parsePointFromText } from '../../utils/geoUtils';

const CACHE_TTL = 60;

export class AnnoncesService {

    // Crée un nouvelle annonce
    static async create(offreurId: string, data: {
        service: string; type_bien: string; ville_id: number; quartier_id?: number; adresse: string; lat: number; lng: number; surface_m2: number; nb_chambres: number; nb_sejours: number; nb_cuisines: number; nb_douches_wc: number; prix: number; prix_unite?: string | null; titre: string; description?: string }) {
            const result = await prisma.$queryRaw<Array<{ id: string }>>`
                INSERT INTO annonces (
                    offreur_id, statut, service, type_bien, ville_id, quartier_id,
                    adresse, geom, surface_m2, nb_chambres, nb_sejours, nb_cuisines, nb_douches_wc,
                    prix, prix_unite, titre, description
                ) VALUES (
                    ${offreurId}::uuid, 'brouillon', ${data.service}::service_type, ${data.type_bien}::property_type,
                    ${data.ville_id}, ${data.quartier_id || null},
                    ${data.adresse}, ${`POINT(${data.lng} ${data.lat})`},
                    ${data.surface_m2}, ${data.nb_chambres}, ${data.nb_sejours}, ${data.nb_cuisines}, ${data.nb_douches_wc},
                    ${data.prix}, ${data.prix_unite || null}, ${data.titre}, ${data.description || null}
                ) RETURNING id
            `;
        return prisma.annonces.findUnique({
            where: { id: result[0].id },
            include: { annonce_photos: { orderBy: { ordre: 'asc' } } },
        });
    }

    // Retourn le feed public
    static async getFeed(query: { cursor?: string; limit?: string; service?: string }, userId?: string) {
        const { cursor, limit } = parsePagination(query);
        const serviceFilter = query.service === 'vente' || query.service === 'location' ? query.service : undefined;

        const cacheKey = userId ? `feed:publiee:${serviceFilter ?? 'all'}:${cursor || 'start'}:${limit}:user:${userId}` : `feed:publiee:${serviceFilter ?? 'all'}:${cursor || 'start'}:${limit}`;
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const where: any = { statut: 'publiee' };
        if (serviceFilter) {
            where.service = serviceFilter;
        }

        if (cursor) {
            where.published_at = { lt: new Date(cursor) };
        }

        const annonces = await prisma.annonces.findMany({
            where,
            orderBy: { published_at: 'desc' },
            take: limit + 1,
            include: {
                annonce_photos: { orderBy: { ordre: 'asc' }, take: 3 },
                profiles: { select: { id: true, nom: true, prenom: true, avatar_url: true } },
                ...(userId ? {
                    annonce_likes: {
                        where: { chercheur_id: userId },
                        select: { id: true }
                    }
                } : {})
            },
        });

        const annoncesWithLikeStatus = annonces.map(annonce => ({
            ...annonce,
            isLiked: userId ? annonce.annonce_likes.length > 0 : false
        }));

        const result = buildPaginationResponse(
            annoncesWithLikeStatus, limit,
            (item: any) => {
                return item.published_at?.toISOString() || item.created_at.toISOString();
            },
        );

        await redis.set(cacheKey, jsonSafeStringify(result), 'EX', CACHE_TTL);
        return result;
    }

    // Retourne le détail complet d'une annonce
    static async getById(id: string, userId?: string, userType?: 'chercheur' | 'offreur') {
        const annonce = await prisma.annonces.findUnique({
            where: { id },
            include: {
                annonce_photos: { orderBy: { ordre: 'asc' } },
                profiles: { select: { id: true, nom: true, prenom: true, avatar_url: true, profile_type: true } },
                villes: { select: { id: true, nom: true } },
                quartiers: { select: { id: true, nom: true, geom: true } },
                ...(userId ? {
                    annonce_likes: {
                        where: { chercheur_id: userId },
                        select: { id: true }
                    }
                } : {})
            },
        });

        if (!annonce) throw new AppError('Annonce introuvable', 404, 'NOT_FOUND');

        if (userId && userType === 'chercheur' && annonce.offreur_id === userId) {
            throw new AppError('Un chercheur ne peut pas voir ses propres annonces', 403, 'FORBIDDEN');
        }

        const annonceWithLikeStatus = {
            ...annonce,
            isLiked: userId ? annonce.annonce_likes?.length > 0 : false
        };

        return annonceWithLikeStatus;
    }

    //Récupère les annonces publiées d'un offreur spécifique.
    static async getAnnoncesByOffreur(offreurId: string, query: { cursor?: string; limit?: string }, userId?: string) {
        const { cursor, limit } = parsePagination(query);

        const annonces = await prisma.annonces.findMany({
            where: { 
                offreur_id: offreurId,
                statut: 'publiee'
            },
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
            orderBy: [
                { published_at: 'desc' },
                { created_at: 'desc' },
            ],
            ...(cursor
                ? {
                    cursor: { id: cursor },
                    skip: 1,
                  }
            : {}),
            take: limit + 1,
        });

        const annoncesWithLikeStatus = annonces.map(annonce => ({
            ...annonce,
            isLiked: userId ? annonce.annonce_likes.length > 0 : false
        }));

        const items = annoncesWithLikeStatus.slice(0, limit);
        const nextCursor = annonces.length > limit ? items[items.length - 1]?.id || null : null;

        return buildPaginationResponse(annoncesWithLikeStatus, limit, (item: any) => item.id, annonces.length);
    }

    //Invalide le cache Redis des feeds et recherches.
    private static async invalidateCache() {
        const keys = await redis.keys('feed:*');
        const searchKeys = await redis.keys('search:*');
        const allKeys = [...keys, ...searchKeys];
        
        if (allKeys.length > 0) {
            await redis.del(...allKeys);
        }
    }

    //Modifie une annonce avec vérification de propriété et contrainte photos.
    static async update(id: string, offreurId: string, data: Record<string, unknown>) {
        const annonce = await prisma.annonces.findUnique({
            where: { id },
            include: { _count: { select: { annonce_photos: true } } }
        });

        if (!annonce) throw new AppError('Annonce introuvable', 404, 'NOT_FOUND');
        if (annonce.offreur_id !== offreurId) throw new AppError('Accès interdit', 403, 'FORBIDDEN');

        if ((data.statut === 'publiee' || (annonce.statut === 'publiee' && data.statut === undefined)) && annonce._count.annonce_photos < 3) {
            throw new AppError(`Une annonce publiée doit avoir au moins 3 photos (actuel: ${annonce._count.annonce_photos})`, 422, 'MISSING_PHOTOS');
        }

        const { lat, lng, ...rest } = data as { lat?: number; lng?: number; [key: string]: unknown };
        if (lat !== undefined && lng !== undefined) {
            await prisma.$executeRaw`
                UPDATE annonces 
                SET geom = ${`POINT(${lng} ${lat})`}
                WHERE id = ${id}::uuid
            `;
        }

        const updated = await prisma.annonces.update({
            where: { id },
            data: rest,
        });

        await this.invalidateCache();
        return updated;
    }

    //Change le statut d'une annonce avec validation des contraintes.
    static async changeStatut(id: string, offreurId: string, statut: string) {
        const annonce = await prisma.annonces.findUnique({ 
            where: { id },
            include: { _count: { select: { annonce_photos: true } } }
        });
        if (!annonce) throw new AppError('Annonce introuvable', 404, 'NOT_FOUND');
        if (annonce.offreur_id !== offreurId) throw new AppError('Accès interdit', 403, 'FORBIDDEN');

        if (statut === 'publiee' && annonce._count.annonce_photos < 3) {
            throw new AppError(`Une annonce publiée doit avoir au moins 3 photos (actuel: ${annonce._count.annonce_photos})`, 422, 'MISSING_PHOTOS');
        }

        if (statut === 'vendue_louee') {
            const hasVisiteRequest = await prisma.visites.count({
                where: { annonce_id: id },
            });

            if (hasVisiteRequest < 1) {
                throw new AppError(
                    'Une annonce ne peut être marquée vendue/louée que si elle a au moins une demande de visite',
                    422,
                    'VISITE_REQUIRED',
                );
            }
        }

        const updated = await prisma.annonces.update({
            where: { id },
            data: { statut: statut as any },
        });

        await this.invalidateCache();
        return updated;
    }

    //Annonces de l'offreur connecté (tous statuts)
    static async getMyAnnonces(offreurId: string) {
        return prisma.annonces.findMany({
            where: { offreur_id: offreurId },
            include: {
                annonce_photos: { orderBy: { ordre: 'asc' }, take: 1 },
            },
            orderBy: { created_at: 'desc' },
        });
    }

    //Upload des photos sur Cloudinary pour une annonce.
    static async uploadPhotos(id: string, offreurId: string, files: Express.Multer.File[]) {
        const annonce = await prisma.annonces.findUnique({ where: { id } });
        if (!annonce) throw new AppError('Annonce introuvable', 404, 'NOT_FOUND');
        if (annonce.offreur_id !== offreurId) throw new AppError('Accès interdit', 403, 'FORBIDDEN');

        const existingCount = await prisma.annonce_photos.count({ where: { annonce_id: id } });
        if (existingCount + files.length > 15) {
            throw new AppError(`Maximum 15 photos par annonce (existantes: ${existingCount})`, 422, 'MAX_PHOTOS');
        }

        const photos = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            try {
                const result = await CloudinaryService.upload(file.path, `annonces/${id}`);
                const photo = await prisma.annonce_photos.create({
                    data: {
                        annonce_id: id,
                        cloudinary_url: result.url,
                        cloudinary_public_id: result.publicId,
                        thumbnail_url: result.thumbnailUrl,
                        ordre: existingCount + i,
                    },
                });
                photos.push(photo);
            } finally {
                await fs.unlink(file.path).catch(() => {});
            }
        }
        
        await this.invalidateCache();
        return photos;
    }

    //Réordonne les photos d'une annonce par ordre de préférence.
    static async reorderPhotos(annonceId: string, offreurId: string, photoIds: number[]) {
        const annonce = await prisma.annonces.findUnique({ where: { id: annonceId } });
        if (!annonce) throw new AppError('Annonce introuvable', 404, 'NOT_FOUND');
        if (annonce.offreur_id !== offreurId) throw new AppError('Accès interdit', 403, 'FORBIDDEN');

        const updates = photoIds.map((photoId, index) =>
            prisma.annonce_photos.updateMany({
                where: { id: photoId, annonce_id: annonceId },
                data: { ordre: index },
            }),
        );

        await prisma.$transaction(updates);
        await this.invalidateCache();
        return prisma.annonce_photos.findMany({
            where: { annonce_id: annonceId },
            orderBy: { ordre: 'asc' },
        });
    }

    //Retourne les annonces avec leurs moyennes de prix dans une bounding box géographique.
    static async getCarte(bbox: { swLng: number; swLat: number; neLng: number; neLat: number }) {
        const rawAnnonces = await prisma.$queryRaw<any[]>`
            SELECT a.id, a.titre, a.service, a.type_bien, a.prix, a.prix_unite,
                a.surface_m2, a.nb_chambres, a.note_moyenne, a.nb_vues,
                a.quartier_id, a.ville_id,
                a.geom as "geom",
                q.nom as "quartier_nom",
                q.geom as "quartier_geom",
                v.nom as "ville_nom",
                (SELECT cloudinary_url FROM annonce_photos WHERE annonce_id = a.id ORDER BY ordre LIMIT 1) as thumbnail
            FROM annonces a
            LEFT JOIN quartiers q ON a.quartier_id = q.id
            JOIN villes v ON a.ville_id = v.id
            WHERE a.statut = 'publiee'
            LIMIT 500
        `;

        const annoncesMapped = rawAnnonces.map(a => {
            const adCoords = parsePointFromText(a.geom, false);
            const qCoords = parsePointFromText(a.quartier_geom, true);
            return {
                ...a,
                longitude: adCoords?.lng ?? null,
                latitude: adCoords?.lat ?? null,
                quartier_longitude: qCoords?.lng ?? null,
                quartier_latitude: qCoords?.lat ?? null
            };
        });

        const filteredAnnonces = annoncesMapped.filter((a) => {
            const lng = a.quartier_longitude ?? a.longitude;
            const lat = a.quartier_latitude ?? a.latitude;
            if (lng === null || lat === null) return false;
            return isInBBox({ lng, lat }, bbox);
        });

        const averagesRaw = await prisma.annonces.groupBy({
            by: ['quartier_id', 'service'],
            where: {
                statut: 'publiee',
                quartier_id: { not: null },
            },
            _sum: {
                prix: true,
            },
            _count: {
                prix: true,
            },
        });

        const averages: Record<string, { moyenneVente?: number; moyenneLocation?: number }> = {};

        for (const group of averagesRaw) {
            if (group.quartier_id === null) continue;
            const qId = String(group.quartier_id);
            
            if (!averages[qId]) {
                averages[qId] = {};
            }
      
            const sum = group._sum.prix ? Number(group._sum.prix) : 0;
            const count = group._count.prix ?? 0;
            const average = count > 0 ? sum / count : 0;
      
            if (group.service === 'vente') {
                averages[qId].moyenneVente = average;
            } else if (group.service === 'location') {
                averages[qId].moyenneLocation = average;
            }
        }

        return {
            annonces: filteredAnnonces,
            averages
        };
    }
}