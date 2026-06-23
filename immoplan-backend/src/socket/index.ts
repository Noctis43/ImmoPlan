import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { setupChatSocket } from './chat.socket';
import { setupNotificationSocket } from './notification.socket';

let io: SocketIOServer;

export function getIO(): SocketIOServer {
    if (!io) {
        throw new Error('Socket.IO n\'est pas initialisé');
    }
    return io;
}

/**
 * @param Server
 * @returns
*/
export function intializeSocket(server: HTTPServer): SocketIOServer {
    io = new SocketIOServer(server, {
        cors: {
            origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()),
            methodes: ['GET', 'POST'],
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    io.use((socket, next) => {
        let token = socket.handshake.auth?.token as string | undefined;
        if (!token || !String(token).trim()) {
            const authHeader = socket.handshake.headers.authorization;
            if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
                token = authHeader.slice(7).trim();
            }
        }

        if (!token) {
            next(new Error('Token d\'authentification requis'));
            return;
        }

        try {
            const playload = jwt.verify(token, env.JWT_SECRET) as Express.User;
            socket.data.user = playload;
            next();
        } catch {
            next(new Error('Token invalide ou expiré'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.data.user.sub;
        logger.info(`Socket connecté: ${userId} (${socket.id})`);

        socket.join(`user:${userId}`);

        setupChatSocket(io, socket);
        setupNotificationSocket(io, socket);

        socket.on('disconnect', (reason) => {
            logger.info(`Socket déconnecté: ${userId} (${reason})`);
        });

        socket.on('error', (error) => {
            logger.error(`Socket error pour ${userId}: ${error.message}`);
        });
    });

    logger.info('Socket.IO initialisé');
    return io;
}