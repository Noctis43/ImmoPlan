import { prisma } from '../../config/prisma';

export class PartagesService {
    // Enregistre un partage d'annonce (chercheur_id nullable pour anonyme). 
    static async trackPartage(annonceId: string, plateforme: string, chercheurId?: string) {
        const partage = await prisma.partages.create({
            data: { annonce_id: annonceId, plateforme, chercheur_id: chercheurId || null },
        });

        return {
            id: partage.id.toString(),
            annonce_id: partage.annonce_id,
            plateforme: partage.plateforme,
            chercheur_id: partage.chercheur_id,
            shared_at: partage.shared_at,
        };
    }

}
