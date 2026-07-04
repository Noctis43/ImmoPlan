import { prisma } from '../../config/prisma';

export class StatistiquesService {
    // Calcule les statistiques globales (vues, likes, avis, note) pour un offreur. 
    static async getDashboard(offreurId: string) {
        const annonces = await prisma.annonces.findMany({
            where: { offreur_id: offreurId },
            select: { nb_vues: true, nb_likes: true, nb_avis: true, note_moyenne: true },
        });

        const total_annonces = annonces.length;
        const total_vues = annonces.reduce((sum, a) => sum + (a.nb_vues || 0), 0);
        const total_likes = annonces.reduce((sum, a) => sum + (a.nb_likes || 0), 0);
        const total_avis = annonces.reduce((sum, a) => sum + (a.nb_avis || 0), 0);

        const noted = annonces.filter((a) => a.note_moyenne !== null);
        const note_moyenne_globale =
            noted.length > 0
                ? noted.reduce((sum, a) => sum + Number(a.note_moyenne || 0), 0) / noted.length
                : null;

        return {
            offreur_id: offreurId,
            total_annonces,
            total_vues,
            total_likes,
            total_avis,
            note_moyenne_globale,
        };
    }

    // Retourne les performances des annonces triées par vues décroissantes. 
    static async getPerformances(offreurId: string, query: { limit?: string }) {
        const limit = Math.min(parseInt(query.limit || '10', 10), 50);
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
                published_at: true,
            },
            orderBy: [{ nb_vues: 'desc' }, { nb_likes: 'desc' }, { created_at: 'desc' }],
            take: limit,
        });
    }
}

