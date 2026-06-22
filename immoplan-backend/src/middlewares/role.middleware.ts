import { Request, Response, NextFunction } from 'express';

/**
 * @param roles
*/
export function requireRole(...roles: Array<'offreur' | 'chercheur'>) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                error: 'Authentification requise',
                code:  'AUTH_REQURED'
            });
            return;
        }

        const profileType = req.user.profileType ?? (req.user as unknown as {
            profile_type?: 'offreur' | 'chercheur'
        }).profile_type;

        if (!profileType || !roles.includes(profileType)) {
            res.status(403).json({
                error: `Accès réservé aux profils: ${roles.join(', ')}`
            });
            return;
        }
        next();
    };
}