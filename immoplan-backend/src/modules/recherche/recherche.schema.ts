import { z } from 'zod';

export const rechercheSchema = z.object({
    query: z.object({
        q: z.string().optional(),
        service: z.enum(['location', 'vente']).optional(),
        type_bien: z.string().optional(),
        prix_min: z.coerce.number().positive().optional(),
        prix_max: z.coerce.number().positive().optional(),
        surface_min: z.coerce.number().positive().optional(),
        surface_max: z.coerce.number().positive().optional(),
        nb_chambres_min: z.coerce.number().int().min(0).optional(),
        ville_id: z.coerce.number().int().positive().optional(),
        quartier_id: z.coerce.number().int().positive().optional(),
        lat: z.coerce.number().optional(),
        lng: z.coerce.number().optional(),
        rayon_km: z.coerce.number().positive().optional(),
        disponible: z.coerce.boolean().optional(),
        sort: z.enum(['prix_asc', 'prix_desc', 'date_desc', 'note_desc']).optional(),
        cursor: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(100).optional(),
    }),
});
