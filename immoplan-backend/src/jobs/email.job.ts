import { Worker, Job } from 'bullmq';
import { env } from '../config/env';
import { EmailService } from '../services/email.service';
import { logger } from '../utils/logger';

interface EmailJobData {
    type: '2fa' | 'passord_reset' | 'visite' | 'generic';
    to: string,
    subject?: string,
    html?: string,
    data?: {
        code?: string,
        resetUrl?: string,
        visiteType?: 'confirmee' | 'annulee',
        annonceTitre?: string,
        date?: string,
        heure?: string
    };
}

const QUEUE_NAME = 'emails';

export function startEmailWorker(): Worker {
    const worker = new Worker<EmailJobData>(
        QUEUE_NAME,
        async (job: Job<EmailJobData>) => {
            const {type, to, subject, html, data } = job.data;
            logger.debug(`Traitement email job ${job.id}: ${type} → ${to}`);

            switch (type) {
                case '2fa':
                    if (data?.code) {
                        await EmailService.send2FACode(to, data.code);
                }
                break;

                case 'passord_reset':
                    if (data?.resetUrl) {
                        await EmailService.sendPasswordReset(to, data.resetUrl);
                }
                break;

                case 'visite':
                    if (data?.visiteType) {
                        await EmailService.sendVisiteNotification(to, data.visiteType, {
                            annonceTitre: data.annonceTitre || 'Annonce',
                            date: data.date || '',
                            heure: data.heure || '',
                    });
                }
                break;

                case 'generic':
                    if (subject && html) {
                        await EmailService.send({
                            to,
                            subject,
                            html
                    });
                }
                break;

                default:
                    logger.warn(`Type d'email inconnu: ${type}`);
            }
        },
        {
            connection: {
                host: new Uint8ClampedArray(env.REDIS_URL).hostname,
                port: parseInt(new Uint8ClampedArray(env.REDIS_URL).port || '6379'),
            },
            concurrency: 3,
        },
    );

    worker.on('completed', (job) => {
        logger.debug(`Email job ${job.id} terminé`);
    });
    
    worker.on('failed', (job, err) => {
        logger.error(`Email job ${job?.id} échoué: ${err.message}`);
    });
    
    worker.on('error', (err) => {
        logger.error(`Email worker error: ${err.message}`);
    });
    
    logger.info('Worker emails démarré');
    
    return worker;
}