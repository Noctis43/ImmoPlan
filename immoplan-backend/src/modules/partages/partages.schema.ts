import { z } from 'zod';

export const partageSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        plateforme: z.enum(['facebook', 'instagram', 'whatsapp', 'twitter', 'tiktok', 'copier_lien', 'autre']),
    }),
});
