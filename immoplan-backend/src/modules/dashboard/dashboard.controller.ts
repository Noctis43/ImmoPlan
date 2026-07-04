import { Request, Response } from 'express';
import { DashboardService } from './dashboard.service';
import { AuthentificatedRequest } from '../../types/express';

export class DashboardController {
    // Retourne les statistiques globales de l'offreur connecté. 
    static async getStats(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const stats = await DashboardService.getStats(user.sub);
        res.json({ data: stats });
    }
    // Retourne les performances détaillées par annonce. 
    static async getPerformances(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const performances = await DashboardService.getAnnoncesPerformances(user.sub);
        res.json({ data: performances });
    }
    // Retourne l'agenda des visites à venir pour l'offreur. 
    static async getVisitesAgenda(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const visites = await DashboardService.getVisitesAgenda(user.sub);
        res.json({ data: visites });
    }
    // Retourne les conversations récentes avec messages non lus. 
    static async getRecentMessages(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const messages = await DashboardService.getRecentMessages(user.sub);
        res.json({ data: messages });
    }
}
