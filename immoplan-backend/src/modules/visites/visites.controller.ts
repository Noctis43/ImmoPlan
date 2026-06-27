import { Request, Response } from 'express';
import { VisitesService } from './visites.service';
import { AuthentificatedRequest } from '../../types/express';

export class VisitesController {
    // Crée une demande de visite pour une annonce.
    static async create(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const visite = await VisitesService.create(user.sub, req.body);
        res.status(201).json({ data: visite });
    }

    //écupère les visites de l'utilisateur connecté
    static async getMyVisites(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const visites = await VisitesService.getMyVisites(user.sub);
        res.json({ data: visites });
    }

    //Confirme ou contre-propose une date de visite par l'offreur.
    static async confirmer(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const visite = await VisitesService.confirmer(req.params.id, user.sub, req.body);
        res.json({ data: visite });
    }

    //Accepte la contre-proposition de date proposée
    static async accepterContreProposition(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const visite = await VisitesService.accepterContreProposition(req.params.id, user.sub);
        res.json({ data: visite });
    }

    //Annule une visite avec motif d'annulation.
    static async annuler(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const visite = await VisitesService.annuler(req.params.id, user.sub, req.body.raison_annulation);
        res.json({ data: visite });
    }

    //Marque une visite confirmée comme effectuée.
    static async effectuer(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const visite = await VisitesService.marquerEffectuee(req.params.id, user.sub);
        res.json({ data: visite });
    }
}