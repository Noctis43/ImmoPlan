import { z } from 'zod';

export const updateProfileSchema = z.object({
    body: z.object({
        nom: z.string().min(1).optional(),
        prenom: z.string().min(1).optional(),
        telephone: z.string().regex(/^03[0-9]{8}$/).optional(),
        bio: z.string().optional(),
        localisation_ville: z.string().optional(),
        localisation_quartier: z.string().optional(),
    }),
});

export const profileIdSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
});