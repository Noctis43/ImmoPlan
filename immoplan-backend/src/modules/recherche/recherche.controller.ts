import { Request, Response } from 'express';
import { RechercheService } from './recherche.service';

export class RechercheController {
    // Recherche multi-critères d'annonces avec BFS sur les quartiers et BST pour le tri par prix.
    static async search(req: Request, res: Response): Promise<void> {
        const result = await RechercheService.search(req.query as Record<string, string>);
        res.json(result);
    }
}
