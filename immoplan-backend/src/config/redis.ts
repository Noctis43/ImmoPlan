import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

export const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
        const delay = Math.min(times * 200, 5000);
        logger.warn(`Redis reconnexion tentative ${times}, delais ${delay}ms`);
        return delay;
    },
    lazyConnect: false,
});

redis.on('connect', () => {
    logger.info('Connexion Redis établie');
});

redis.on('error', (err: Error) => {
    logger.error(` Erreur Redis: ${err.message}`);
});

redis.on('close', () => {
    logger.warn(' Connexion fermée');
});