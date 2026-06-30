import { Request, Response } from 'express';
import { NotificationsService } from './notifications.service';
import { AuthentificatedRequest } from '../../types/express';

export class NotificationsController {
    
    // Récupère les notifications de l'utilisateur connecté (paginées). 
    static async getMyNotifications(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const notifications = await NotificationsService.getMyNotifications(user.sub, req.query as { cursor?: string; limit?: string });
        res.json({ data: notifications });
    }
    
    // Retourne le nombre de notifications non lues. 
    static async getUnreadCount(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const count = await NotificationsService.getUnreadCount(user.sub);
        res.json({ data: { count } });
    }
    
    // Marque une notification comme lue. 
    static async markAsRead(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const notif = await NotificationsService.markAsRead(req.params.id, user.sub);
        res.json({ data: notif });
    }
    
    // Marque toutes les notifications comme lues. 
    static async markAllAsRead(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        await NotificationsService.markAllAsRead(user.sub);
        res.json({ data: { message: 'Toutes les notifications marquées comme lues' } });
    }
    
    // Supprime une notification. 
    static async deleteNotification(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        await NotificationsService.deleteNotification(req.params.id, user.sub);
        res.json({ data: { message: 'Notification supprimée' } });
    }
}
