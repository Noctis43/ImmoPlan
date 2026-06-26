import { Request, Response } from 'express';
import { AnnoncesService } from './annonces.service';
import { AuthentificatedRequest } from '../../types/express';

export class AnnoncesController {
    //Crée une nouvelle annonce
    static async create(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const annonce = await AnnoncesService.create(user.sub, req.body);
        res.status(201).json({ data: annonce });
    }

    //Récupère le feed public paginé ou les annonces par offreur.
    static async getFeed(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        
        if (req.query.offreur_id) {
            const userId = user?.sub;
            const annonces = await AnnoncesService.getAnnoncesByOffreur(
                req.query.offreur_id as string,
                req.query as { cursor?: string; limit?: string },
                userId,
            );
            res.json(annonces);
        } else {
            const userId = user?.sub;
            const result = await AnnoncesService.getFeed(
                req.query as { cursor?: string; limit?: string; service?: string },
                userId,
            );
            res.json(result);
        }
    }

    //Récupère le détail complet d'une annonce par son ID.
    static async getById(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const userId = user?.sub;
        const userType = user?.profileType;
        const annonce = await AnnoncesService.getById(req.params.id, userId, userType);
        res.json({ data: annonce });
    }

    //Modifie une annonce existante (vérifie la propriété).
    static async update(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const annonce = await AnnoncesService.update(req.params.id, user.sub, req.body);
        res.json({ data: annonce });
    }

    //Change le statut d'une annonce.
    static async changeStatut(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const annonce = await AnnoncesService.changeStatut(req.params.id, user.sub, req.body.statut);
        res.json({ data: annonce });
    }

    //Récupère toutes les annonces de l'offreur connecté (tous statuts)
    static async getMyAnnonces(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const annonces = await AnnoncesService.getMyAnnonces(user.sub);
        res.json({ data: annonces });
    }

    //Upload des photos pour une annonce (max 15).
    static async uploadPhotos(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const files = req.files as Express.Multer.File[];
        
        if (!files || files.length === 0) {
            res.status(400).json({ error: 'Au moins une photo requise', code: 'FILE_REQUIRED' });
            return;
        }
        
        const photos = await AnnoncesService.uploadPhotos(req.params.id, user.sub, files);
        res.status(201).json({ data: photos });
    }

    //Réordonne les photos d'une annonce.
    static async reorderPhotos(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const photos = await AnnoncesService.reorderPhotos(req.params.id, user.sub, req.body.photoIds);
        res.json({ data: photos });
    }

    //Récupère les annonces dans une bounding box pour l'affichage carte.
    static async getCarte(req: Request, res: Response): Promise<void> {
        const { sw_lng, sw_lat, ne_lng, ne_lat } = req.query;
        const result = await AnnoncesService.getCarte({
            swLng: Number(sw_lng),
            swLat: Number(sw_lat),
            neLng: Number(ne_lng),
            neLat: Number(ne_lat),
        });
        res.json({ data: result });
    }
}