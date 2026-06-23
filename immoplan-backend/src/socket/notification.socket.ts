import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';

export function setupNoficationSocket(io: SocketIOServer, socket: Socket): void {
    const userId = socket.data.user.sub;

    socket.on('annonce:subscribe', (data: { annonceId: string}) => {
        const { annonceId } = data;
        socket.join(`annonce:${annonceId}`);
        logger.debug(`${userId} abonné aux updates de annonce:${annonceId}`);
    });

    socket.on('annonce:unsubscribe', (data: { annonceId: string }) => {
        const { annonceId } = data;
        socket.leave(`annonce:${annonceId}`);
        logger.debug(`${userId} désabonné de annonce:${annonceId}`);
    });

    socket.on('notification:mark_read', (data: { notificationId: string }) => {
        io.to(`user:${userId}`).emit('notification:read_ack', {
            notificationId: data.notificationId,
        });
    });
}