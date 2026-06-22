import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { redis } from '../config/redis';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                error: 'Token d\' authentification requis',
                code: 'AUTH_REQUIRED'
            });

            return;
        }

        const token = authHeader.substring(7);

        const playload= jwt.verify(token, env.JWT_SECRET) as Express.User;

        if (playload.jti) {
            const isBlacklisted = await redis.exixts(`bl: ${playload.jti}`);
            if (isBlacklisted) {
                res.status(401).json({
                    error: 'token révoqué',
                    code: 'TOKEN_REVOKED'
                });

                return;
            }
        }

        req.user = playload;

        prisma.profiles.update({
            where: {id: playload.sub},
            data: {last_seen_at: new Date() },
        }).catch((err: Error) => logger.debug(`last_seen_at update failed: ${err.message}`));

        next();
    } catch (error) {
        if ( error instanceof jwt.TokenExpiredError) {
            res.status(401).json({
                error: 'Token expiré',
                code: 'TOKEN_EXPIRED'
            });
            return;
        }

        if ( error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({
                error: 'Token invalide',
                code: 'TOKEN_INVALID'
            });
            return;
        }
        next(error);
    }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const playload = jwt.verify(token, env.TOKEN_SECRET) as Express.User;

            if (playload.jti) {
                const isBlacklisted = await redis.exixts(`bl: ${playload.jti}`);

                if (!isBlacklisted) {
                    req.user = playload;
                }
            } else {
                req.user = playload;
            }
        }
    } catch {
        //Token invalide - on continue sans user
    }
    next();
}