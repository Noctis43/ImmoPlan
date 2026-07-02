import { Request, Response } from 'express';
import { RecommandationService } from './recommandation.service';
import { AuthentificatedRequest } from '../../types/express';

export class RecommandationController {
    // Retourne le feed personnalisé basé sur les préférences et l'historique du chercheur. 
    static async getFeedPerso(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const result = await RecommandationService.getFeedPersonnalise(user.sub, req.query as { cursor?: string; limit?: string });
        res.json(result);
    }

    // Retourne les annonces similaires à la dernière annonce vue par le chercheur. 
    static async getSimilaires(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const limit = req.query.limit ? Number(req.query.limit) : undefined;
        const result = await RecommandationService.getSimilaires(user.sub, { limit });
        res.json(result);
    }

    // Retourne les annonces tendances (vues + likes + récence). 
    static async getTendances(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const result = await RecommandationService.getTendances(req.query as { cursor?: string; limit?: string }, user?.sub);
        res.json(result);
    }

    // Récupère les préférences de recommandation du chercheur. 
    static async getPreferences(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const prefs = await RecommandationService.getPreferences(user.sub);
        res.json({ data: prefs });
    }

    // Met à jour les préférences de recommandation du chercheur. 
    static async updatePreferences(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const prefs = await RecommandationService.setPreferences(user.sub, req.body);
        res.json({ data: prefs });
    }
}
