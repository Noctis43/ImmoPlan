import { Request, Response } from 'express';
import { InteractionsService } from './interactions.service';
import { AuthentificatedRequest } from '../../types/express';

export class InteractionsController {
    // Enregistre une vue unique d'un chercheur sur une annonce. 
    static async registerVue(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        await InteractionsService.registerVue(req.params.id, user.sub);
        res.status(201).json({ data: { message: 'Vue enregistrée' } });
    }

  // Enregistre une vue unique d'un offreur sur une annonce. 
    static async registerVueOffreur(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        await InteractionsService.registerVueOffreur(req.params.id, user.sub);
        res.status(201).json({ data: { message: 'Vue enregistrée' } });
    }

    // Récupère la liste et le compteur des vues d'une annonce. 
    static async getVues(req: Request, res: Response): Promise<void> {
        const result = await InteractionsService.getVues(req.params.id);
        res.json({ data: result });
    }

    // Ajoute un like sur une annonce. 
    static async like(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const like = await InteractionsService.likeAnnonce(req.params.id, user.sub);
        res.status(201).json({ data: like });
    }

    // Retire un like d'une annonce. 
    static async unlike(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        await InteractionsService.unlikeAnnonce(req.params.id, user.sub);
        res.json({ data: { message: 'Like retiré' } });
    }

    // Retourne le nombre de likes d'une annonce. 
    static async getLikesCount(req: Request, res: Response): Promise<void> {
        const result = await InteractionsService.getLikesCount(req.params.id);
        res.json({ data: result });
    }

    // Retourne les IDs des annonces likées par l'utilisateur connecté. 
    static async getMyLikes(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const likedAnnonceIds = await InteractionsService.getMyLikedAnnonceIds(user.sub);
        res.json({ data: likedAnnonceIds });
    }

    // Crée un avis sur une annonce. 
    static async createAvis(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const avis = await InteractionsService.createAvis(req.params.id, user.sub, req.body);
        res.status(201).json({ data: avis });
    }

    // Modifie son propre avis sur une annonce. 
    static async updateAvis(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const avis = await InteractionsService.updateAvis(req.params.id, user.sub, req.body);
        res.json({ data: avis });
    }

    // Récupère tous les avis d'un offreur. 
    static async getOffreurAvis(req: Request, res: Response): Promise<void> {
        const avis = await InteractionsService.getOffreurAvis(req.params.id);
        res.json({ data: avis });
    }

    // Récupère les avis pour une annonce spécifique. 
    static async getAnnonceAvis(req: Request, res: Response): Promise<void> {
        const result = await InteractionsService.getAnnonceAvis(req.params.id);
        res.json({ data: result });
    }

    // Récupère les points d'intérêt autour d'une annonce. 
    static async getAnnoncePOI(req: Request, res: Response): Promise<void> {
        const result = await InteractionsService.getAnnoncePOI(req.params.id);
        res.json({ data: result });
    }

    // Sauvegarde une annonce dans les favoris du chercheur. 
    static async save(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        await InteractionsService.saveAnnonce(req.params.id, user.sub);
        res.status(201).json({ data: { message: 'Annonce sauvegardée' } });
    }

    // Retire une annonce des favoris du chercheur. 
    static async unsave(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        await InteractionsService.unsaveAnnonce(req.params.id, user.sub);
        res.json({ data: { message: 'Sauvegarde retirée' } });
    }

    // Récupère les annonces sauvegardées par le chercheur connecté. 
    static async getMySaved(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const saved = await InteractionsService.getMySaved(user.sub);
        res.json({ data: saved });
    }

    // Récupère l'historique de navigation du chercheur (Stack LIFO). 
    static async getHistorique(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const historique = await InteractionsService.getHistorique(user.sub);
        res.json({ data: historique });
    }

    // Vide l'historique de navigation du chercheur. 
    static async clearHistorique(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        await InteractionsService.clearHistorique(user.sub);
        res.json({ data: { message: 'Historique vidé' } });
    }

    // Ajoute une annonce dans l'historique de navigation. 
    static async touchHistorique(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        await InteractionsService.touchHistorique(req.params.id, user.sub);
        res.status(201).json({ data: { message: 'Historique mis à jour' } });
    }
}
