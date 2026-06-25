import { z } from 'zod';

export const villeIdSchema = z.object({ params: z.object({ id: z.coerce.number().int().positive() }) });

export const villeSearchSchema = z.object({
    query: z.object({
        q: z.string().min(2).max(80),
    }),
});

export const prixMoyensSchema = z.object({
    query: z.object({
        ville_id: z.coerce.number().int().positive().optional(),
        service: z.enum(['location', 'vente']).optional(),
        type_bien: z.string().optional(),
    }),
});
