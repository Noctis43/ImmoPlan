import { Request, Response } from 'express';
import { MessagerieService } from './messagerie.service';
import { AuthentificatedRequest } from '../../types/express';

export class MessagerieController {
  
    // Crée ou récupère une conversation existante pour une annonce. 
    static async createConversation(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const conv = await MessagerieService.getOrCreateConversation(user.sub, req.body.annonce_id);
        res.status(201).json({ data: conv });
    }
  
    // Récupère la liste des conversations de l'utilisateur connecté. 
    static async getMyConversations(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const convs = await MessagerieService.getMyConversations(user.sub);
        res.json({ data: convs });
    }
  
    // Récupère les détails d'une conversation par son ID. 
    static async getConversationById(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const conv = await MessagerieService.getConversationById(req.params.id, user.sub);
        res.json({ data: conv });
    }
  
    // Récupère l'historique des messages d'une conversation (cursor-based). 
    static async getMessages(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const result = await MessagerieService.getMessages(req.params.id, user.sub, req.query as { cursor?: string; limit?: string });
        res.json(result);
    }
  
    // Envoie un message textuel dans une conversation. 
    static async sendMessage(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const message = await MessagerieService.sendMessage(req.params.id, user.sub, req.body.contenu);
        res.status(201).json({ data: message });
    }
  
    // Marque tous les messages d'une conversation comme lus pour l'utilisateur. 
    static async markAsRead(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        await MessagerieService.markAsRead(req.params.id, user.sub);
        res.json({ data: { message: 'Messages marqués comme lus' } });
    }
  
    // Envoie un média (image/document) dans une conversation via Cloudinary. 
    static async sendMedia(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        if (!req.file) { res.status(400).json({ error: 'Fichier requis', code: 'FILE_REQUIRED' }); return; }
        const message = await MessagerieService.sendMedia(req.params.id, user.sub, req.file);
        res.status(201).json({ data: message });
    }

}
