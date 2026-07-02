import { Request, Response } from 'express';
import { PartagesService } from './partages.service';
import { AuthentificatedRequest } from '../../types/express';

export class PartagesController {
  
    // Enregistre le partage d'une annonce sur une plateforme. 
  static async trackPartage(req: Request, res: Response): Promise<void> {
    const chercheurId = (req as AuthentificatedRequest).user?.sub;
    const partage = await PartagesService.trackPartage(req.params.id, req.body.plateforme, chercheurId);
    res.status(201).json({ data: partage });
  }
}
