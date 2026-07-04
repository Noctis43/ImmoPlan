import { Request, Response } from 'express';
import { StatistiquesService } from './statistiques.service';
import { AuthentificatedRequest } from '../../types/express';

export class StatistiquesController {
  // Retourne les statistiques globales du tableau de bord pour l'offreur. 
  static async getDashboard(req: Request, res: Response): Promise<void> {
    const user = (req as AuthentificatedRequest).user;
    const result = await StatistiquesService.getDashboard(user.sub);
    res.json({ data: result });
  }

  // Retourne les performances détaillées par annonce pour l'offreur. 
  static async getPerformances(req: Request, res: Response): Promise<void> {
    const user = (req as AuthentificatedRequest).user;
    const result = await StatistiquesService.getPerformances(user.sub, req.query as { limit?: string });
    res.json({ data: result });
  }
}

