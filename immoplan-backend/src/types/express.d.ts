import { Request } from 'express';

declare global {
    namespace Express {
        interface User {

            sub: string;
            authUserId: string;
            profileType: 'offreur' | 'chercheur';
            /**Issued at */
            iat: number;
            exp: number;
            jti?: string;
        }
    }
}

export interface AuthentificatedRequest extends Request {
    user: Express.User;
}

export {};