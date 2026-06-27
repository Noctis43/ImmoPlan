import { z } from 'zod';

export const createVisiteSchema = z.object({
    body: z.object({
        annonce_id: z.string().uuid(),
        date_souhaitee: z.string().refine((val) => new Date(val) >= new Date(new Date().toDateString()), 'La date doit être future'),
        heure_debut: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM'),
        duree_minutes: z.number().int().min(15).max(240).default(30),
        message_demande: z.string().max(500).optional(),
    }),
});

export const visiteIdParam = z.object({ params: z.object({ id: z.string().uuid() }) });

export const confirmerSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.discriminatedUnion('mode', [
        z.object({ mode: z.literal('accepter_demande') }),
        z.object({
            mode: z.literal('contre_proposer'),
            date_confirmee: z.string(),
            heure_confirmee: z.string().regex(/^\d{2}:\d{2}$/),
        }),
    ]),
});

export const annulerSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({ raison_annulation: z.string().min(1).max(500) }),
});

export const accepterContrePropositionSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});