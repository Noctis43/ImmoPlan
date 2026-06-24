import { Request, Response } from 'express';
import { ProfilesService } from './profiles.service';
import { AuthenticatedRequest } from '../../types/express';

export class ProfilesController {
    //Récupère le profil complet de l'utilisateur connecté.
    static async getMe(req: Request, res: Response): Promise<void> {
        const user = (req as AuthenticatedRequest).user;
        const profile = await ProfilesService.getMe(user.sub);
        res.json({ data: profile });
    }

    //Met à jour le profil de l'utilisateur connecté.
    static async updateMe(req: Request, res: Response): Promise<void> {
        const user = (req as AuthenticatedRequest).user;
        const profile = await ProfilesService.updateMe(user.sub, req.body);
        res.json({ data: profile });
    }

    //Met à jour l'avatar de l'utilisateur connecté.
    static async updateAvatar(req: Request, res: Response): Promise<void> {
        const user = (req as AuthenticatedRequest).user;
        
        if (!req.file) {
          res.status(400).json({ error: 'Fichier avatar requis', code: 'FILE_REQUIRED' });
          return;
        }
        
        const profile = await ProfilesService.updateAvatar(user.sub, req.file.path);
        res.json({ data: profile });
    }

    //Récupère la liste des offreurs avec recherche par nom.
    static async getOffreurs(req: Request, res: Response): Promise<void> {
        const user = (req as AuthenticatedRequest).user;
        const search = req.query.search as string | undefined;
        const offreurs = await ProfilesService.getAllOffreurs(search, user.sub);
        res.json({ data: offreurs });
    }

    //Récupère le profil public d'un utilisateur par son ID.
    static async getPublicProfile(req: Request, res: Response): Promise<void> {
        const profile = await ProfilesService.getPublicProfileFull(req.params.id);
        res.json({ data: profile });
    }

    //Enregistre une visite de profil et crée une notification.
    static async visitProfile(req: Request, res: Response): Promise<void> {
        const user = (req as AuthenticatedRequest).user;
        const result = await ProfilesService.recordProfileVisit(user.sub, req.params.id);
        res.json({ data: result });
    }
}