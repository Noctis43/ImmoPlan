import { prisma } from '../../config/prisma';
import { redis } from '../../config/redis';
import { AppError } from '../../middlewares/error.middleware';
import { getIO } from '../../socket';
import { Queue } from 'bullmq';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { Stack } from '../../algorithms/stack';

const notificationQueue = new Queue('notifications', {
    connection: {
        host: new URL(env.REDIS_URL).hostname,
        port: parseInt(new URL(env.REDIS_URL).port || '6379'),
    },
});

const HISTORY_KEY = (userId: string) => `history:${userId}`;
const HISTORY_MAX_SIZE = 20;

export class InteractionsService {
    
    //Enregistre une vue d'un chercheur sur une annonce avec notification à l'offreur.
    static async registerVue(annonceId: string, chercheurId: string) {
        try {
            const annonce = await prisma.annonces.findUnique({ 
                where: { id: annonceId }, 
                select: { offreur_id: true, titre: true } 
            });

            if (!annonce) {
                throw new AppError('Annonce introuvable', 404, 'NOT_FOUND');
            }

            if (annonce.offreur_id === chercheurId) {
                throw new AppError('Un chercheur ne peut pas voir ses propres annonces', 403, 'FORBIDDEN');
            }

            const existingVue = await prisma.annonce_vues.findUnique({
                where: {
                    annonce_id_chercheur_id: {
                        annonce_id: annonceId,
                        chercheur_id: chercheurId,
                    },
                },
            });

            if (existingVue) {
                const updatedVue = await prisma.annonce_vues.update({
                    where: { id: existingVue.id },
                    data: { viewed_at: new Date() }
                });
                return {
                    id: updatedVue.id.toString(),
                    annonce_id: updatedVue.annonce_id,
                    chercheur_id: updatedVue.chercheur_id,
                    viewed_at: updatedVue.viewed_at,
                    isNew: false,
                };
            }

            const vue = await prisma.annonce_vues.create({
                data: {
                    annonce_id: annonceId,
                    chercheur_id: chercheurId,
                },
            });

            await prisma.annonces.update({
                where: { id: annonceId },
                data: { nb_vues: { increment: 1 } },
            });

            if (annonce) {
                const notification = await prisma.notifications.create({
                    data: {
                        destinataire_id: annonce.offreur_id,
                        type: 'vue_annonce',
                        titre: 'Nouvelle vue',
                        corps: `Quelqu'un a consulté votre annonce "${annonce.titre}"`,
                        annonce_id: annonceId,
                        action_url: `/annonces/${annonceId}`,
                    },
                });
                
                await notificationQueue.add('notify', {
                    notificationId: notification.id,
                    destinataireId: annonce.offreur_id,
                    type: 'vue_annonce',
                    titre: notification.titre,
                    corps: notification.corps,
                });
            }

            return {
                id: vue.id.toString(),
                annonce_id: vue.annonce_id,
                chercheur_id: vue.chercheur_id,
                viewed_at: vue.viewed_at,
                isNew: true,
            };
        } catch (error) {
            throw error; 
        }
    }

    //Enregistre une vue d'un offreur sur une annonce avec notification
    static async registerVueOffreur(annonceId: string, offreurId: string) {
        try {
            const annonce = await prisma.annonces.findUnique({ 
                where: { id: annonceId }, 
                select: { offreur_id: true, titre: true } 
            });

            if (!annonce) {
                throw new AppError('Annonce introuvable', 404, 'NOT_FOUND');
            }

            if (annonce.offreur_id === offreurId) {
                throw new AppError('Un offreur ne peut pas voir ses propres annonces', 403, 'FORBIDDEN');
            }

            const existingVue = await prisma.annonce_vues.findUnique({
                where: {
                    annonce_id_chercheur_id: {
                        annonce_id: annonceId,
                        chercheur_id: offreurId,
                    },
                },
            });

            if (existingVue) {
                const updatedVue = await prisma.annonce_vues.update({
                    where: { id: existingVue.id },
                    data: { viewed_at: new Date() }
                });
                return {
                    id: updatedVue.id.toString(),
                    annonce_id: updatedVue.annonce_id,
                    chercheur_id: updatedVue.chercheur_id,
                    viewed_at: updatedVue.viewed_at,
                    isNew: false,
                };
            }

            const vue = await prisma.annonce_vues.create({
                data: {
                    annonce_id: annonceId,
                    chercheur_id: offreurId,
                },
            });

            await prisma.annonces.update({
                where: { id: annonceId },
                data: { nb_vues: { increment: 1 } },
            });

            if (annonce) {
                const notification = await prisma.notifications.create({
                    data: {
                        destinataire_id: annonce.offreur_id,
                        type: 'vue_annonce',
                        titre: 'Nouvelle vue',
                        corps: `Un autre offreur a consulté votre annonce "${annonce.titre}"`,
                        annonce_id: annonceId,
                        action_url: `/annonces/${annonceId}`,
                    },
                });
                
                await notificationQueue.add('notify', {
                    notificationId: notification.id,
                    destinataireId: annonce.offreur_id,
                    type: 'vue_annonce',
                    titre: notification.titre,
                    corps: notification.corps,
                });
            }

            try {
                const io = getIO();
                io.to(`annonce:${annonceId}`).emit('annonce:vue', { annonceId, chercheurId: offreurId });
            } catch {}

            return {
                id: vue.id.toString(),
                annonce_id: vue.annonce_id,
                chercheur_id: vue.chercheur_id,
                viewed_at: vue.viewed_at,
                isNew: true,
            };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error('Erreur lors de l\'enregistrement de la vue offreur:', error);
            throw new AppError('Erreur lors de l\'enregistrement de la vue', 500, 'INTERNAL_ERROR');
        }
    }

    //Retourne la liste et le compteur des vues d'une annonce.
    static async getVues(annonceId: string) {
        const [vues, count] = await Promise.all([
            prisma.annonce_vues.findMany({
                where: { annonce_id: annonceId },
                include: { profiles: { select: { id: true, nom: true, prenom: true, avatar_url: true } } },
                orderBy: { viewed_at: 'desc' },
                take: 50,
            }),
            prisma.annonce_vues.count({ where: { annonce_id: annonceId } }),
        ]);

        const serializedVues = vues.map(vue => ({
            ...vue,
            id: vue.id.toString(),
            chercheur_id: vue.chercheur_id.toString(),
            annonce_id: vue.annonce_id.toString(),
            viewed_at: vue.viewed_at,
        }));

        return { vues: serializedVues, };
    }

    //Ajoute un like sur une annonce avec notification à l'offreur.
    static async likeAnnonce(annonceId: string, chercheurId: string) {
        const existingLike = await prisma.annonce_likes.findUnique({
            where: {
                annonce_id_chercheur_id: {
                    annonce_id: annonceId,
                    chercheur_id: chercheurId,
                }
            }
        });

        if (existingLike) {
            return {
                id: existingLike.id.toString(),
                annonce_id: existingLike.annonce_id,
                chercheur_id: existingLike.chercheur_id,
                liked_at: existingLike.liked_at,
            };
        }

        const like = await prisma.annonce_likes.create({
            data: { annonce_id: annonceId, chercheur_id: chercheurId },
        });

        await prisma.annonces.update({
            where: { id: annonceId },
            data: { nb_likes: { increment: 1 } },
        });

        await prisma.historique_recherches.create({
            data: { 
                chercheur_id: chercheurId,
                action_type: 'like',
                annonce_id: annonceId 
            }
        });

        const annonce = await prisma.annonces.findUnique({ where: { id: annonceId }, select: { offreur_id: true, titre: true } });
        
        if (annonce) {
            const notification = await prisma.notifications.create({
                data: {
                    destinataire_id: annonce.offreur_id,
                    type: 'like',
                    titre: 'Nouveau like',
                    corps: `Quelqu'un a aimé votre annonce "${annonce.titre}"`,
                    annonce_id: annonceId,
                    action_url: `/annonces/${annonceId}`,
                },
            });
            
            await notificationQueue.add('notify', {
                notificationId: notification.id,
                destinataireId: annonce.offreur_id,
                type: 'like',
                titre: notification.titre,
                corps: notification.corps,
            });
        }

        try {
            const io = getIO();
            io.to(`annonce:${annonceId}`).emit('annonce:like', { annonceId, chercheurId });
        } catch { /* Socket pas encore prêt */ }

        try {
            const feedKeys = await redis.keys('feed:*');
            const searchKeys = await redis.keys('search:*');
            const allKeys = [...feedKeys, ...searchKeys];
            
            if (allKeys.length > 0) {
                await redis.del(...allKeys);
                console.log(`Cache invalidé: ${allKeys.length} clés supprimées`);
            }
        } catch (error) {
            logger.error('Erreur lors de l\'invalidation du cache:', error);
        }

        return {
            id: like.id.toString(),
            annonce_id: like.annonce_id,
            chercheur_id: like.chercheur_id,
            liked_at: like.liked_at,
        };
    }

    //Retire un like d'une annonce avec mise à jour du compteur.
    static async unlikeAnnonce(annonceId: string, chercheurId: string) {
        const deleted = await prisma.annonce_likes.deleteMany({
            where: { annonce_id: annonceId, chercheur_id: chercheurId },
        });

        if (deleted.count > 0) {
            await prisma.$executeRaw`
                UPDATE annonces
                SET nb_likes = GREATEST(nb_likes - 1, 0)
                WHERE id = ${annonceId}::uuid
            `;
        }

        try {
            const feedKeys = await redis.keys('feed:*');
            const searchKeys = await redis.keys('search:*');
            const allKeys = [...feedKeys, ...searchKeys];

            if (allKeys.length > 0) {
                await redis.del(...allKeys);
                console.log(`Cache invalidé (unlike): ${allKeys.length} clés supprimées`);
            }
        } catch (error) {
            logger.error('Erreur lors de l\'invalidation du cache:', error);
        }
    }

    //Retourne le nombre de likes d'une annonce.
    static async getLikesCount(annonceId: string) {
        const count = await prisma.annonce_likes.count({ where: { annonce_id: annonceId } });
        return { count };
    }

    //Retourne les IDs des annonces likées par l'utilisateur connecté.
    static async getMyLikedAnnonceIds(userId: string) {
        const likes = await prisma.annonce_likes.findMany({
            where: { chercheur_id: userId },
            select: { annonce_id: true },
            orderBy: { liked_at: 'desc' },
        });
        return likes.map((row) => row.annonce_id);
    }

    //Récupère les avis pour une annonce spécifique.
    static async getAnnonceAvis(annonceId: string) {
        return prisma.avis.findMany({
            where: { annonce_id: annonceId },
            include: {
                profiles_avis_chercheur_idToprofiles: { select: { id: true, nom: true, prenom: true, avatar_url: true } },
            },
            orderBy: { created_at: 'desc' },
        });
    }

    //Récupère les points d'intérêt autour d'une annonce
    static async getAnnoncePOI(annonceId: string) {
        return []; // Renvoie un tableau vide pour l'instant pour satisfaire le composant UI Detail.tsx sans erreur.
    }

    //Crée un avis sur une annonce avec notification à l'offreur.
    static async createAvis(annonceId: string, chercheurId: string, data: { note: number; commentaire?: string }) {
        const annonce = await prisma.annonces.findUnique({ where: { id: annonceId }, select: { offreur_id: true, titre: true } });
        if (!annonce) throw new AppError('Annonce introuvable', 404, 'NOT_FOUND');
    
        const avis = await prisma.avis.create({
            data: {
                annonce_id: annonceId,
                offreur_id: annonce.offreur_id,
                chercheur_id: chercheurId,
                note: data.note,
                commentaire: data.commentaire || null,
            },
        });
    
        const notification = await prisma.notifications.create({
            data: {
                destinataire_id: annonce.offreur_id,
                type: 'avis',
                titre: 'Nouvel avis',
                corps: `Note ${data.note}/5 sur "${annonce.titre}"`,
                annonce_id: annonceId,
                avis_id: avis.id,
                action_url: `/annonces/${annonceId}`,
            },
        });
        
        await notificationQueue.add('notify', {
            notificationId: notification.id,
            destinataireId: annonce.offreur_id,
            type: 'avis',
            titre: notification.titre,
            corps: notification.corps,
        });
    
        return avis;
    }

    //Modifie son propre avis après vérification de propriété.
    static async updateAvis(avisId: string, chercheurId: string, data: { note?: number; commentaire?: string }) {
        const avis = await prisma.avis.findUnique({ where: { id: avisId } });
        if (!avis) throw new AppError('Avis introuvable', 404, 'NOT_FOUND');
        if (avis.chercheur_id !== chercheurId) throw new AppError('Accès interdit', 403, 'FORBIDDEN');
    
        return prisma.avis.update({ where: { id: avisId }, data });
    }

    //Récupère tous les avis d'un offreur.
    static async getOffreurAvis(offreurId: string) {
        return prisma.avis.findMany({
            where: { offreur_id: offreurId },
            include: {
                profiles_avis_chercheur_idToprofiles: { select: { id: true, nom: true, prenom: true, avatar_url: true } },
                annonces: { select: { id: true, titre: true } },
            },
            orderBy: { created_at: 'desc' },
        });
    }

    //Ajoute une annonce aux favoris du chercheur.
    static async saveAnnonce(annonceId: string, chercheurId: string) {
        
        await prisma.annonces_sauvegardees.create({
            data: { chercheur_id: chercheurId, annonce_id: annonceId },
        });
    
        
        await prisma.historique_recherches.create({
            data: { chercheur_id: chercheurId, action_type: 'sauvegarde', annonce_id: annonceId },
        });
    }

    //Retire une annonce des favoris du chercheur.
    static async unsaveAnnonce(annonceId: string, chercheurId: string) {
        await prisma.annonces_sauvegardees.deleteMany({
            where: { chercheur_id: chercheurId, annonce_id: annonceId },
        });
    }

    //Récupère les annonces sauvegardées par le chercheur avec leurs photos.
    static async getMySaved(chercheurId: string) {
        const saved = await prisma.annonces_sauvegardees.findMany({
            where: { chercheur_id: chercheurId },
            include: {
                annonces: {
                    include: {
                        annonce_photos: { orderBy: { ordre: 'asc' }, take: 1 },
                        profiles: { select: { id: true, nom: true, prenom: true, avatar_url: true } },
                    },
                },
            },
            orderBy: { saved_at: 'desc' },
        });
        
        return saved.map(item => ({
            ...item,
            id: item.id.toString(),
            chercheur_id: item.chercheur_id.toString(),
            annonce_id: item.annonce_id.toString(),
            saved_at: item.saved_at,
        }));
    }

    //Ajoute une annonce dans l'historique de navigation via une Stack LIFO Redis.
    static async touchHistorique(annonceId: string, chercheurId: string) {
        
        await prisma.historique_recherches.create({
            data: { chercheur_id: chercheurId, action_type: 'vue_detail', annonce_id: annonceId },
        });

        const rawIds = await redis.lrange(HISTORY_KEY(chercheurId), 0, HISTORY_MAX_SIZE - 1);

        const stack = new Stack<string>(HISTORY_MAX_SIZE);
        const seen = new Set<string>();

        for (let i = rawIds.length - 1; i >= 0; i--) {
            const id = rawIds[i];
            
            if (seen.has(id) || id === annonceId) continue;
            seen.add(id);
            stack.push(id);
        }

        stack.push(annonceId);
        const latestFirst = stack.toArray();

        await redis.del(HISTORY_KEY(chercheurId));
        if (latestFirst.length > 0) {
            await redis.rpush(HISTORY_KEY(chercheurId), ...latestFirst);
        }
    }

    //Récupère l'historique de navigation via la Stack LIFO Redis.
    static async getHistorique(chercheurId: string) {
        const rawIds = await redis.lrange(HISTORY_KEY(chercheurId), 0, HISTORY_MAX_SIZE - 1);
        const stack = new Stack<string>(HISTORY_MAX_SIZE);
        const seen = new Set<string>();
    
        for (let i = rawIds.length - 1; i >= 0; i--) {
            const id = rawIds[i];
            
            if (seen.has(id)) continue;
            seen.add(id);
            stack.push(id);
        }
        const annonceIds = stack.toArray();

        if (annonceIds.length === 0) return [];
        
        const annonces = await prisma.annonces.findMany({
            where: { id: { in: annonceIds } },
            include: {
                annonce_photos: { orderBy: { ordre: 'asc' }, take: 1 },
                villes: { select: { nom: true } },
                annonce_likes: {
                    where: { chercheur_id: chercheurId },
                    select: { id: true }
                }
            },
        });

        const annonceMap = new Map(annonces.map((a) => [a.id, a]));
        return annonceIds.map((id) => {
            const annonce = annonceMap.get(id);
            if (!annonce) return null;
            return {
                ...annonce,
                isLiked: annonce.annonce_likes.length > 0
            };
        }).filter(Boolean);
    }

    //Vide l'historique de navigation .
    static async clearHistorique(chercheurId: string) {
        await redis.del(HISTORY_KEY(chercheurId));
        await prisma.historique_recherches.deleteMany({ where: { chercheur_id: chercheurId } });
    }
}