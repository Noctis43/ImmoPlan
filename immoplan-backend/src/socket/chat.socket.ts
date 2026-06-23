import { Server as SocketIOServer, Socket } from 'socket.io';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';


export function setupChatSocket(io: SocketIOServer, socket: Socket): void {
    const userId = socket.data.user.sub;

    socket.on('conversation:join', async (data: {conversationId: string }) => {
        try {
            const {conversationId } = data;
            const conversation = await prisma.conversations.findFirst({
                where: {
                    id: conversationId,
                    OR:[
                        { offreur_id: userId},
                        { chercheur_id: userId},
                    ],
                },
            });

            if (!conversation) {
                socket.emit('error' , { message: 'Conversation introuvable ou accès refusé'});
                return;
            }

            const roomName = `conv:${conversationId}`;
            socket.join(roomName);

            await prisma.messages.updateMany({
                where: {
                    conversation_id: conversationId,
                    sender_id: { not: userId},
                    statut: 'envoye',
                },
                data: { statut: 'delivre'},
            });

            socket.emit('conversation:joined', { conversationId});
            logger.debug(`${userId} a rejoin conv:${conversationId}`);
        } catch (error) {
            logger.error(`conversation:join error: ${ (error as Error).message}`);
            socket.emit('error', { message: 'Erreur lors de la connexion à la conversation'});
        }
    });

    socket.on('message:send', async (data: { conversationId: string, contenu: string, mediaUrl?: string, mediaType?: string}) => {
        try {
            const { conversationId, contenu, mediaUrl, mediaType } = data;
            const conversation = await prisma.conversations.findFirst({
                where: {
                    id: conversationId,
                    OR: [
                        { offreur_id: userId},
                        { chercheur_id: userId},
                    ],
                },
            });

            if(!conversation) {
                socket.emit('error', { message: 'Conversation introuvable'});
                return;
            }

            const message = await prisma.messages.create({
                data: {
                    conversation_id: conversationId,
                    sender_id: userId,
                    contenu,
                    media_url: mediaUrl || null,
                    media_type: mediaType || null,
                    statut: 'envoye',
                },
            });

            io.to(`conv:${conversationId}`).emit('message:new', {
                id: message.id,
                conversationId,
                senderId: userId,
                contenu: message.contenu,
                mediaUrl: message.media_url,
                mediaType: message.media_type,
                statut: message.statut,
                createdAt: message.created_at,
            });

            const recipientId = conversation.offreur_id === userId ? conversation.chercheur_id : conversation.offreur_id;
            const notification = await prisma.notifications.create({
                data: {
                    destinataire_id = recipientId,
                    type: 'message',
                    titre: 'Nouveau message',
                    corps: contenu.substring(0, 100),
                    annonce_id: conversation.annonce_id,
                    message_id: message.id,
                    action_url: `/messagerie/${conversationId}`,
                },
            });

            io.to(`user:${recipientId}`).emit('notification:new', notification);
            logger.debug(`Message envoyé dans conv:${conversationId} par ${userId}`);
        } catch (error) {
            logger.error(`message:send error: ${(error as Error).message}`);
            socket.emit('error',  {message: 'Erreur lors de l\'envoi du message'});
        }
    });

    socket.on('message:read', async (data: { conversationId: string}) => {
        try {
            const { conversationId } = data;

            await prisma.messages.updateMany({
                where: {
                    conversation_id: conversationId,
                    sender_id: {not: userId},
                    statut: { not: 'lu'},
                },
                data: {
                    statut: 'lu',
                    read_at: new Date(),
                },
            });

            io.to(`conv:${conversationId}`).emit('message:read_ack', {
                conversationId,
                readBy: userId,
                readAt: new Date(),
            });
        } catch (error) {
            logger.error(`message:read error: ${(error as Error).message}`);
        }
    });

    socket.on('user:typing', (data: { conversationId: string; isTyping: boolean }) => {
        const { conversationId, isTyping } = data;
        socket.to(`conv:${conversationId}`).emit('user:typing', {
            userId,
            conversationId,
            isTyping,
        });
    });
}