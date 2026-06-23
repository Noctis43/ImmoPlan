import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthentificatedRequest } from '../../types/express';

export class AuthController {
    /** Inscrit un nouvel utilisateur et retourne les tokens JWT. */
    static async register(req: Request, res: Response): Promise<void> {
        const result = await AuthService.register(req.body);
        res.status(201).json({
            data: {
                profile: {
                    id: result.profile.id,
                    email: result.profile.email,
                    nom: result.profile.nom,
                    prenom: result.profile.prenom,
                    profile_type: result.profile.profile_type,
                },
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
            },
        });
    }

     /** Authentifie un utilisateur avec email/mot de passe. */
    static async login(req: Request, res: Response): Promise<void> {
        const { email, password } = req.body;
        const result = await AuthService.login(email, password);
        res.json({
            data: {
                profile: {
                    id: result.profile.id,
                    email: result.profile.email,
                    nom: result.profile.nom,
                    prenom: result.profile.prenom,
                    profile_type: result.profile.profile_type,
                },
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
            },
        });
    }

    /** Déconnecte l'utilisateur en invalidant ses tokens. */
    static async logout(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        if (user?.sub) {
            const ttlRestant = (user.exp ?? 0) - Math.floor(Date.now() / 1000);
            await AuthService.logout(user.sub, user.jti, ttlRestant > 0 ? ttlRestant : 0);
        }
        res.json({ data: { message: 'Déconnexion réussie' } });
    }

    /** Rafraîchit les tokens avec un refresh token valide. */
    static async refresh(req: Request, res: Response): Promise<void> {
        const { refreshToken } = req.body;
        const result = await AuthService.refresh(refreshToken);
        res.json({
            data: {
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
            },
        });
    }

    /** Envoie un code 2FA par email à l'utilisateur connecté. */
    static async send2FA(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        await AuthService.send2FA(user.sub);
        res.json({ data: { message: 'Code 2FA envoyé par email' } });
    }
    
     /** Vérifie un code 2FA saisi par l'utilisateur. */
    static async verify2FA(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        await AuthService.verify2FA(user.sub, req.body.code);
        res.json({ data: { message: 'Vérification 2FA réussie', verified: true } });
    }

    /** Envoie un email de réinitialisation de mot de passe. */
    static async forgotPassword(req: Request, res: Response): Promise<void> {
        await AuthService.forgotPassword(req.body.email);
        res.json({ data: { message: 'Si cet email existe, un lien de réinitialisation a été envoyé' } });
    }

     /** Réinitialise le mot de passe avec un token signé. */
    static async resetPassword(req: Request, res: Response): Promise<void> {
        await AuthService.resetPassword(req.body.token, req.body.password);
        res.json({ data: { message: 'Mot de passe réinitialisé avec succès' } });
    }

    /** Modifie le mot de passe après vérification de l'ancien. */
    static async changePassword(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
        await AuthService.changePassword(user.sub, currentPassword, newPassword);
        res.json({ data: { message: 'Mot de passe modifié avec succès' } });
    }

     /** Supprime définitivement le compte de l'utilisateur connecté. */
    static async deleteMe(req: Request, res: Response): Promise<void> {
        const user = (req as AuthentificatedRequest).user;
        const ttlRestant = user.exp - Math.floor(Date.now() / 1000);
        await AuthService.deleteAccount(user.sub, user.jti, ttlRestant > 0 ? ttlRestant : 0);
        res.status(204).send();
    }
}