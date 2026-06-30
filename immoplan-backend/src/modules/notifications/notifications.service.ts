import { prisma } from '../../config/prisma';
import { AppError } from '../../middlewares/error.middleware';

export class NotificationsService {
    
    // Récupère les notifications paginées de l'utilisateur (non lues en premier). 
    static async getMyNotifications(userId: string, query: { cursor?: string; limit?: string }) {
        const limit = Math.min(parseInt(query.limit || '20', 10), 100);
        const where: { destinataire_id: string; created_at?: { lt: Date } } = { destinataire_id: userId };
        if (query.cursor) where.created_at = { lt: new Date(query.cursor) };

        return prisma.notifications.findMany({
            where,
            orderBy: [{ is_read: 'asc' }, { created_at: 'desc' }],
            take: limit,
        });
    }

    // Retourne le nombre de notifications non lues. 
    static async getUnreadCount(userId: string) {
        return prisma.notifications.count({ where: { destinataire_id: userId, is_read: false } });
    }

    // Marque une notification comme lue (vérifie la propriété). 
    static async markAsRead(notificationId: string, userId: string) {
        const notif = await prisma.notifications.findUnique({ where: { id: notificationId } });
        if (!notif) throw new AppError('Notification introuvable', 404, 'NOT_FOUND');
        if (notif.destinataire_id !== userId) throw new AppError('Accès interdit', 403, 'FORBIDDEN');

        return prisma.notifications.update({
            where: { id: notificationId },
            data: { is_read: true, read_at: new Date() },
        });
    }

    // Marque toutes les notifications de l'utilisateur comme lues. 
    static async markAllAsRead(userId: string) {
        await prisma.notifications.updateMany({
            where: { destinataire_id: userId, is_read: false },
            data: { is_read: true, read_at: new Date() },
        });
    }

    // Supprime une notification (vérifie la propriété). 
    static async deleteNotification(notificationId: string, userId: string) {
        const notif = await prisma.notifications.findUnique({ where: { id: notificationId } });
        if (!notif) throw new AppError('Notification introuvable', 404, 'NOT_FOUND');
        if (notif.destinataire_id !== userId) throw new AppError('Accès interdit', 403, 'FORBIDDEN');

        await prisma.notifications.delete({ where: { id: notificationId } });
    }
}
