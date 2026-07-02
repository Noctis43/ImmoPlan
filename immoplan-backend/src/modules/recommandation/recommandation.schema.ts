import { z } from 'zod';
export const feedPersoSchema = z.object({
    query: z.object({
        cursor: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(50).optional(),
    }),
});

export const tendancesSchema = z.object({
    query: z.object({
        cursor: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(50).optional(),
    }),
});

export const recommandationPreferencesSchema = z.object({
    body: z.object({
        prix_min: z.coerce.number().positive(),
        prix_max: z.coerce.number().positive(),
        service: z.enum(['vente', 'location']),
        ville_id: z.coerce.number().int().positive(),
    }).refine((d) => d.prix_min <= d.prix_max, {
        message: 'La fourchette de prix est invalide',
        path: ['prix_max'],
    }),
});
