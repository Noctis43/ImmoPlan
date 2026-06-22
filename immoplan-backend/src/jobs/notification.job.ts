import { Worker, Job } from 'bullmq';
import { env } from '../config/env';
import { getIO } from '../socket';
import { FirebaseService } from '../services/firebase.service';
import { EmailService } from '../services/email.service';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';


interface NotificationJobData {
    notificationId: string;
    destinataireId: string;
    type: string;
    titre: string;
    corps?: string;
    actionUrl?: string;
    emailData?: {
        email: string;
        annonceTitre?: string;
        date?: string;
        heure?: string;
    };
}


const QUEUE_NAME = 'notifications';

export function startNotificationWorker(): Worker {
    const worker = new Worker<NotificationJobData>(
        QUEUE_NAME,
        async (job: Job<NotificationJobData>) => {
            const { notificationId, destinataireId, type, titre, corps, actionUrl, emailData } = job.data;
            logger.debug(`Traitement notification job ${job.id}: ${type} → ${destinataireId}`);   

            try {
                const io = getIO();
                io.to(`user:${destinataireId}`).emit('notification:new', {
                    id: notificationId,
                    destinataire_id: destinataireId,
                    type,
                    titre,
                    corps,
                    action_url: actionUrl ?? undefined,
                    is_read: false,
                    created_at: new Date().toISOString(),
                });
            } catch (error) {
                logger.debug(`Socket.IO emit skipped: ${(error as Error).message}`);
            }

            try {
                const profile = await prisma.profiles.findUnique({
                    where: { id: destinataireId },
                    select: { id: true },
                });
                if (profile) {
                    logger.debug(`FCM push serait envoyé à ${destinataireId}`);
                }
            } catch {
        // Best-effort
            }

            const criticalTypes = ['message', 'visite_confirmee', 'visite_annulee'];
            if (criticalTypes.includes(type) && emailData?.email) {
                try {
                    if (type === 'visite_confirmee' || type === 'visite_annulee') {
                        await EmailService.sendVisiteNotification(emailData.email,type === 'visite_confirmee' ? 'confirmee' : 'annulee', { annonceTitre: emailData.annonceTitre || 'Annonce', date: emailData.date || '', heure: emailData.heure || ''});
                    } else {
                        await EmailService.send({
                            to: emailData.email,
                            subject: `ImmoPlan — ${titre}`,
                            html: `<p>${corps || titre}</p>`,
                        });
                    }
                } catch (error) {
                    logger.error(`Email notification error: ${(error as Error).message}`);
                }
            }
        },
        {
            connection: {
                host: new URL(env.REDIS_URL).hostname,
                port: parseInt(new URL(env.REDIS_URL).port || '6379'),
            },
            concurrency: 5,
        },
    );

    worker.on('completed', (job) => {
        logger.debug(`Notification job ${job.id} terminé`);
    });

    worker.on('failed', (job, err) => {
        logger.error(`Notification job ${job?.id} échoué: ${err.message}`);
    });

    worker.on('error', (err) => {
        logger.error(`Notification worker error: ${err.message}`);
    });

    logger.info('Worker notifications démarré');

    return worker;
}
