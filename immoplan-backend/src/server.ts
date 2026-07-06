import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { intializeSocket} from './socket';
import { startNotificationWorker } from './jobs/notification.job';
import { startEmailWorker } from './jobs/email.job';
import { logger } from './utils/logger';

async function main(): Promise<void> {
    try {
        const app = createApp();

        const server = http.createServer(app);

        intializeSocket(server);

        startNotificationWorker();
        startEmailWorker();

        server.listen(env.PORT, '0.0.0.0', () => {
            logger.info(`
  ╔═══════════════════════════════════════════╗
  ║       ImmoPlan Backend v1.0.0             ║
  ║       Port: ${String(env.PORT).padEnd(28)}║
  ║       Env: ${env.NODE_ENV.padEnd(29)}     ║
  ║       Socket.IO: ✔                        ║
  ║       Workers: ✔                           ║
  ╚═══════════════════════════════════════════╝
      `);
        });

        const gracefulShutdown = async (signal: string) => {
            logger.info(`Signal ${signal} reçu, arrêt gracieux...`);
            server.close(() => {
                logger.info('Serveur HTTP fermé');
                process.exit(0);
            });

            setTimeout(() => {
                logger.warn('Arrêt forcé après timeout');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        process.on('unhandledRejection', (reason: Error) => {
            logger.error(`Unhandled Rejection: ${reason.message}`, reason);
        });

        process.on('uncaughtException', (error: Error) => {
            logger.error(`Uncaught Exception: ${error.message}`, error);
            process.exit(1);
        });
    } catch (error) {
        logger.error('Erreur au démarrage:', error);
        process.exit(1);
    }
}

main();
