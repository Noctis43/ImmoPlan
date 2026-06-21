import { firebaseMessaging } from '../config/firebase';
import { logger } from '../utils/logger';

export class FirebaseService {
    /**
     * @param token
     * @param title
     * @param body
     * @param data
    */

    static async sendPushNotification(token: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
        try {
            await firebaseMessaging.send({
                token,
                notification: {
                    title,
                    body,
                },
                data: data || {},
                android: {
                    priority: 'high',
                    notification: {
                        channelId: 'immoplan_default',
                        sound: 'default',
                    },
                },
                apns: {
                    playload: {
                        aps: {
                            sound: 'default',
                            badge: 1,
                        },
                    },
                },
            });
            logger.debug(`FCM notification envoyée au token: ${token.substring(0, 20)}...`);
        } catch (error) {
            const err = error as Error;
            logger.error(`Erreur FCM: ${err.message}`);
        }
    }


    /**
     * @param tokens
     * @param title
     * @param body
     * @param data
    */
    static async sendMulticast(tokens: string[], title: string, body: string, data?: Record<string, string>): Promise<void> {
        if (tokens.length === 0) return;

        try {
            await (firebaseMessaging as any).sendEachForMulticast({tokens, notification: {title, body}, data: data || {}});
            logger.debug(`FCM multicast envoyé à ${tokens.length} appareils`);
        } catch (error) {
            const err = error as Error;
            logger.error(`Erreur FCM multicast: ${err.message}`);
        }
    }
}