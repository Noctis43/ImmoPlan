import { z } from 'zod';

export const createAnnonceSchema = z.object({
    body: z.object({
        service: z.enum(['location', 'vente']),
        type_bien: z.string(),
        ville_id: z.number().int().positive(),
        quartier_id: z.number().int().positive().optional(),
        adresse: z.string().min(1),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        surface_m2: z.number().positive(),
        nb_chambres: z.number().int().min(0).default(0),
        nb_sejours: z.number().int().min(0).default(0),
        nb_cuisines: z.number().int().min(0).default(0),
        nb_douches_wc: z.number().int().min(0).default(0),
        prix: z.number().positive(),
        prix_unite: z.enum(['mois']).nullable().optional(),
        titre: z.string().min(5),
        description: z.string().optional(),
    }),
});

export const updateAnnonceSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        service: z.enum(['location', 'vente']).optional(),
        type_bien: z.string().optional(),
        ville_id: z.number().int().positive().optional(),
        quartier_id: z.number().int().positive().optional(),
        adresse: z.string().min(1).optional(),
        lat: z.number().min(-90).max(90).optional(),
        lng: z.number().min(-180).max(180).optional(),
        surface_m2: z.number().positive().optional(),
        nb_chambres: z.number().int().min(0).optional(),
        nb_sejours: z.number().int().min(0).optional(),
        nb_cuisines: z.number().int().min(0).optional(),
        nb_douches_wc: z.number().int().min(0).optional(),
        prix: z.number().positive().optional(),
        prix_unite: z.enum(['mois']).nullable().optional(),
        titre: z.string().min(5).optional(),
        description: z.string().optional(),
    }),
});

export const annonceIdSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});

export const changeStatutSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        statut: z.enum(['brouillon', 'publiee', 'suspendue', 'archivee', 'vendue_louee']),
    }),
});

export const reorderPhotosSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        photoIds: z.array(z.number().int().positive()),
    }),
});

export const carteQuerySchema = z.object({
    query: z.object({
        sw_lng: z.coerce.number(),
        sw_lat: z.coerce.number(),
        ne_lng: z.coerce.number(),
        ne_lat: z.coerce.number(),
    }),
});