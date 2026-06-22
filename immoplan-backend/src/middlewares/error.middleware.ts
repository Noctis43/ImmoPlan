import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number, code: string) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
    return (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

export function errorHandler( err: Error, _req: Request, res: Response, next: NextFunction): void {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            error: err.message,
            code: err.code
        });
        return;
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        switch (err.code) {
            case 'P2002': {
                const target = (err.meta?.target as string[])?.join(', ') || 'champ unique';
                res.status(409).json({
                    error: `conflit: ${target} existe déjà`,
                    code: 'DUPLICATE_ENTRY'
                });
                return;
            }
            case 'P2025': {
                res.status(404).json({
                    error: 'Ressource introuvable',
                    code: 'NOT_FOUND'
                });
                return;
            }
            case 'P2003': {
                res.status(400).json({
                    error: 'Référence invalide: la ressource liée n\'existe pas',
                    code: 'FOREIGN_KEY_VIOLATION'
                });
                return;
            }
            case 'P0001': {
                const match = err.message.match(/message:\s*"([^"]+)"/);
                const triggerMessage = match ? match[1]: `Règle métier non respectée par la base de données`;
                res.status(422).json({
                    error: triggerMessage,
                    code: 'BUISNESS_RULE_VIOLATION',
                });
                return;
            }
            default:
                break;
        }
    }

    if (err instanceof Prisma.PrismaClientUnknownRequestError || (err.message && err.message.includes('RAISE EXCEPTION'))) {
        const raiseMatch = err.message.match(/ERROR:\s*(.+?)(?:\n|$)/);
        if (raiseMatch) {
            res.status(422).json({
                error: raiseMatch[1].trim(),
                code: 'BUISNESS_RULE_VIOLATION',
            });
            return;
        }
    }

    logger.error('Erreur non gérée:', err);

    res.status(500).json({
        error: env.NODE_ENV === 'production' ? 'Erreur interne du serveur' : err.message,
        code: 'INTERNAL_ERROR'
    });
}