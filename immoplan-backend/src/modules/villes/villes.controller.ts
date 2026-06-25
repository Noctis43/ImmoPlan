import { Request, Response } from 'express';
import { VillesService } from './villes.service';

export class VillesController {
    // Retourne la liste de toutes les villes
    static async getVilles(_req: Request, res: Response): Promise<void> {
        const villes = await VillesService.getAllVilles();
        res.json({ data: villes });
    }

    //Recherche des villes par nom
    static async searchVilles(req: Request, res: Response): Promise<void> {
        const q = String(req.query.q ?? '');
        const villes = await VillesService.searchVilles(q);
        res.json({ data: villes });
    }

    //Retourne les quartiers d'une ville donnée
    static async getQuartiers(req: Request, res: Response): Promise<void> {
        const quartiers = await VillesService.getQuartiersByVille(Number(req.params.id));
        res.json({ data: quartiers });
    }

    //Retourne les prix moyens au m2 par ville
    static async getPrixMoyens(req: Request, res: Response): Promise<void> {
        const { ville_id, service, type_bien } = req.query;
        const data = await VillesService.getPrixMoyens({
            villeId: ville_id ? Number(ville_id) : undefined,
            service: service as string | undefined,
            typeBien: type_bien as string | undefined,
        });
        res.json({ data });
    }
}