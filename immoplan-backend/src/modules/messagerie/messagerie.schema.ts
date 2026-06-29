import { z } from 'zod';

export const createConversationSchema = z.object({
    body: z.object({ annonce_id: z.string().uuid() }),
});

export const conversationIdParam = z.object({ params: z.object({ id: z.string().uuid() }) });

export const sendMessageSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({ contenu: z.string().min(1) }),
});
