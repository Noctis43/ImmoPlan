import { z } from 'zod';

export const annonceIdParam = z.object({ params: z.object({ id: z.string().uuid() }) });

export const createAvisSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        note: z.number().int().min(1).max(5),
        commentaire: z.string().max(1000).optional(),
    }),
});

export const updateAvisSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        note: z.number().int().min(1).max(5).optional(),
        commentaire: z.string().max(1000).optional(),
    }),
});

export const avisIdParam = z.object({ params: z.object({ id: z.string().uuid() }) });
export const offreurIdParam = z.object({ params: z.object({ id: z.string().uuid() }) });
