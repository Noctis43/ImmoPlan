import { prisma } from '../../config/prisma';
import { redis } from '../../config/redis';
import { BST } from '../../algorithms/bst';
import { buildGraph, bfsByLevel } from '../../algorithms/bfs';
import { parsePagination, buildPaginationResponse, type PaginatioResponse } from '../../utils/pagination';
import { jsonSafeStringify } from '../../utils/jsonSafe';
import {
    harversineDistanceMeters,
    parsePointFromText,
    sqlHaversineWithinMeters,
    sqlPointCoords,
} from '../../utils/geoUtils';
import crypto from 'crypto';

interface AnnonceResult {
    id: string;
    prix: number;
    created_at: Date;
    [key: string]: unknown;
}

// Colonnes annonces . 
const ANNONCES_SELECT = `
    a.id, a.offreur_id, a.statut, a.service, a.type_bien, a.ville_id, a.quartier_id, a.adresse,
    a.surface_m2, a.nb_chambres, a.nb_sejours, a.nb_cuisines, a.nb_douches_wc,
    a.prix, a.prix_unite, a.titre, a.description, a.nb_vues, a.nb_likes, a.nb_avis, a.note_moyenne,
    a.created_at, a.updated_at, a.published_at, a.archived_at
`.trim();

function prixToNumber(prix: unknown): number {
    if (prix == null) return 0;
    if (typeof prix === 'number') return prix;
    if (typeof prix === 'string') return Number(prix);
    if (
        typeof prix === 'object' &&
        prix !== null &&
        'toNumber' in prix &&
        typeof (prix as { toNumber: () => number }).toNumber === 'function'
    ) {
        return (prix as { toNumber: () => number }).toNumber();
    }
    return Number(String(prix));
}

export class RechercheService {
    
    // Recherche multi-critères avec BFS sur les quartiers et BST pour le filtrage prix. 
    static async search(query: Record<string, string | undefined>) {
        const { cursor, limit } = parsePagination(query as { cursor?: string; limit?: string });

        const queryHash = crypto.createHash('md5').update(JSON.stringify(query)).digest('hex');
        const cacheKey = `recherche:${queryHash}`;
        try {
            const cached = await redis.get(cacheKey);
            if (cached) return JSON.parse(cached) as PaginatioResponse<AnnonceResult>;
        } catch {
        }

        const conditions: string[] = ["a.statut = 'publiee'", "a.geom IS NOT NULL", "a.geom <> ''"];
        const params: unknown[] = [];
        let paramIndex = 1;

        if (query.service) {
            conditions.push(`a.service = $${paramIndex}::service_type`);
            params.push(query.service);
            paramIndex++;
        }
        if (query.type_bien) {
            conditions.push(`a.type_bien = $${paramIndex}::property_type`);
            params.push(query.type_bien);
            paramIndex++;
        }
        if (query.ville_id) {
            conditions.push(`a.ville_id = $${paramIndex}`);
            params.push(Number(query.ville_id));
            paramIndex++;
        }
        if (query.surface_min) {
            conditions.push(`a.surface_m2 >= $${paramIndex}`);
            params.push(Number(query.surface_min));
            paramIndex++;
        }
        if (query.surface_max) {
            conditions.push(`a.surface_m2 <= $${paramIndex}`);
            params.push(Number(query.surface_max));
            paramIndex++;
        }
        if (query.nb_chambres_min) {
            conditions.push(`a.nb_chambres >= $${paramIndex}`);
            params.push(Number(query.nb_chambres_min));
            paramIndex++;
        }

        if (query.q) {
            conditions.push(
                `to_tsvector('french', coalesce(a.titre,'') || ' ' || coalesce(a.description,'')) @@ plainto_tsquery('french', $${paramIndex})`,
            );
            params.push(query.q);
            paramIndex++;
        }

        if (query.lat && query.lng && query.rayon_km) {
            const rayonM = Number(query.rayon_km) * 1000;
            const { lng: lngCol, lat: latCol } = sqlPointCoords('a.geom');
            conditions.push(
                sqlHaversineWithinMeters(
                    latCol,
                    lngCol,
                    `$${paramIndex + 1}`,
                    `$${paramIndex}`,
                    `$${paramIndex + 2}`,
                ),
            );
            params.push(Number(query.lng), Number(query.lat), rayonM);
            paramIndex += 3;
        }

        if (cursor) {
            conditions.push(`a.created_at < $${paramIndex}::timestamptz`);
            params.push(cursor);
            paramIndex++;
        }

        let orderBy = 'a.published_at DESC';
        if (query.sort === 'prix_asc') orderBy = 'a.prix ASC';
        if (query.sort === 'prix_desc') orderBy = 'a.prix DESC';
        if (query.sort === 'note_desc') orderBy = 'a.note_moyenne DESC NULLS LAST';

        let quartierIds: number[] = [];
        if (query.quartier_id) {
            quartierIds = [Number(query.quartier_id)];

            const countQuery = `SELECT COUNT(*) as cnt FROM annonces a WHERE ${conditions.join(' AND ')} AND a.quartier_id = $${paramIndex}`;
            const countResult = await prisma.$queryRawUnsafe<Array<{ cnt: bigint }>>(
                countQuery,
                ...params,
                Number(query.quartier_id),
            );
            const count = Number(countResult[0]?.cnt || 0);

            if (count < 5) {
                const villeId = query.ville_id ? Number(query.ville_id) : undefined;
                const edges = await RechercheService.getNeighborEdges(villeId);
                if (edges.length > 0) {
                    const graph = buildGraph(edges);
                    const levels = bfsByLevel(graph, Number(query.quartier_id), 3);
                    for (const [, nodeIds] of levels) {
                        quartierIds.push(...nodeIds);
                    }
                }
            }

            conditions.push(`a.quartier_id = ANY($${paramIndex}::int[])`);
            params.push(quartierIds);
            paramIndex++;
        }

        const sqlQuery = `
            SELECT ${ANNONCES_SELECT},
            v.nom as ville_nom, q.nom as quartier_nom,
            (SELECT cloudinary_url FROM annonce_photos WHERE annonce_id = a.id ORDER BY ordre LIMIT 1) as thumbnail
            FROM annonces a
            LEFT JOIN villes v ON v.id = a.ville_id
            LEFT JOIN quartiers q ON q.id = a.quartier_id
            WHERE ${conditions.join(' AND ')}
            ORDER BY ${orderBy}
            LIMIT $${paramIndex}
        `;
        params.push(limit + 1);

        let annonces = await prisma.$queryRawUnsafe<AnnonceResult[]>(sqlQuery, ...params);

        if (query.prix_min || query.prix_max) {
            const bst = new BST<AnnonceResult>();
            for (const annonce of annonces) {
                bst.insert(prixToNumber(annonce.prix), annonce);
            }
            const minPrix = query.prix_min ? Number(query.prix_min) : 0;
            const maxPrix = query.prix_max ? Number(query.prix_max) : Number.MAX_SAFE_INTEGER;
            annonces = bst.rangeSearch(minPrix, maxPrix);
        }

        const result = buildPaginationResponse(
            annonces,
            limit,
            (item) => new Date(item.created_at).toISOString(),
        );

        try {
            await redis.set(cacheKey, jsonSafeStringify(result), 'EX', 60);
        } catch {
        }
        return result;
    }

    // Construit les paires de quartiers voisins (distance Haversine, seuil 100 m). 
    private static async getNeighborEdges(villeId?: number): Promise<Array<[number, number]>> {
        const quartiers = await prisma.quartiers.findMany({
            where: villeId ? { ville_id: villeId } : undefined,
            select: { id: true, geom: true, zone: true },
        });

        const coords = new Map<number, { lng: number; lat: number }>();
        for (const q of quartiers) {
            const c = parsePointFromText(q.zone, true) ?? parsePointFromText(q.geom, true);
            if (c) coords.set(q.id, c);
        }

        const ids = [...coords.keys()].sort((a, b) => a - b);
        const edges: Array<[number, number]> = [];
        const thresholdM = 100;

        for (let i = 0; i < ids.length; i++) {
            for (let j = i + 1; j < ids.length; j++) {
                const a = coords.get(ids[i])!;
                const b = coords.get(ids[j])!;
                if (harversineDistanceMeters(a, b) <= thresholdM) {
                    edges.push([ids[i], ids[j]]);
                }
            }
        }

        return edges;
    }
}
