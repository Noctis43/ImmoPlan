import { z } from 'zod';

export const notificationIdParam = z.object({ params: z.object({ id: z.string().uuid() }) });
