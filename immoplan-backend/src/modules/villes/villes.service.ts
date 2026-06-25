import { prisma } from '../../config/prisma';

export class VillesService {

    // retourne toute les villes
    static async getAllVilles() {
        return prisma.$queryRaw`
          SELECT id, nom, code_postal, geom
          FROM villes
          ORDER BY nom
        `;
    }

    //recherche des villes/ nom
    static async searchVilles(q: string, limit = 15) {
        const term = q.trim();
        if (term.length < 2) return [];
    
        return prisma.villes.findMany({
            where: {
                nom: { contains: term, mode: 'insensitive' },
            },
            select: { 
                id: true,
                nom: true, 
                code_postal: true 
            },
            orderBy: { nom: 'asc' },
            take: Math.min(limit, 25),
        });
    }

    //retournes les quartiers d'une villes
    static async getQuartiersByVille(villeId: number) {
        return prisma.quartiers.findMany({
            where: { ville_id: villeId },
            orderBy: { nom: 'asc' },
        });
    }

    //Calcule les prix moyen au m2 par ville
    static async getPrixMoyens(filters: { villeId?: number; service?: string; typeBien?: string}) {
        const conditions: string[] = ["a.statut = 'publiee'"];
        const params: unknown[] = [];
    
        if (filters.villeId) {
            conditions.push(`a.ville_id = $${params.length + 1}`);
            params.push(filters.villeId);
        }
        
        if (filters.service) {
            conditions.push(`a.service = $${params.length + 1}::service_type`);
            params.push(filters.service);
        }
        
        if (filters.typeBien) {
            conditions.push(`a.type_bien = $${params.length + 1}::property_type`);
            params.push(filters.typeBien);
        }
    
        const query = `
            SELECT 
                v.nom as ville, 
                ROUND(AVG(a.prix / NULLIF(a.surface_m2, 0))) as prix_moyen,
                COUNT(a.id)::int as nb_annonces
            FROM annonces a
            JOIN villes v ON a.ville_id = v.id
            WHERE ${conditions.join(' AND ')}
            GROUP BY v.id, v.nom
            ORDER BY nb_annonces DESC
            LIMIT 10
        `;
        return prisma.$queryRawUnsafe(query, ...params);
    }
}