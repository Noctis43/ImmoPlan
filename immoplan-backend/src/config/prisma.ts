import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
    ]: [{emit: 'event', level: 'error' }],
});

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

prisma.$on('query' as never, (e: unknown) => {
    const event = e as { query: string; duration: number};
    logger.debug(`Prisma Query: ${event.query} (${event.duration}ms)`);
});

prisma.$on('error' as never, (e: unknown) => {
    const event = e as { message: string };
    logger.error(`Prisma Error: ${event.message}`);
});