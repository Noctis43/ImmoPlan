import { prisma } from '../../config/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { parsePagination } from '../../utils/pagination';
import { CloudinaryService } from '../../services/cloudinary.service';
import { Stack } from '../../algorithms/stack';
import { getIO } from '../../socket';

const convInclude = {
    annonces: { select: { id: true, titre: true } },
    profiles_conversations_offreur_idToprofiles: {
        select: { id: true, nom: true, prenom: true, avatar_url: true },
    },
    profiles_conversations_chercheur_idToprofiles: {
        select: { id: true, nom: true, prenom: true, avatar_url: true },
    },
} as const;

export type ConversationDto = {
    id: string;
    annonce_id: string;
    offreur_id: string;
    chercheur_id: string;
    last_message_at?: string;
    created_at: string;
    annonce?: { id: string; titre: string };
    offreur?: { id: string; nom: string; prenom: string; avatar_url?: string | null };
    chercheur?: { id: string; nom: string; prenom: string; avatar_url?: string | null };
};

export class MessagerieService {

    //Convertir une conversation Prisma en format DTO stable pour l'API
    private static serializeConversation(
        conv: {
            id: string;
            annonce_id: string;
            offreur_id: string;
            chercheur_id: string;
            last_message_at: Date | null;
            created_at: Date;
            annonces?: { id: string; titre: string } | null;
            profiles_conversations_offreur_idToprofiles?: {
                id: string;
                nom: string;
                prenom: string;
                avatar_url: string | null;
            } | null;
            profiles_conversations_chercheur_idToprofiles?: {
                id: string;
                nom: string;
                prenom: string;
                avatar_url: string | null;
            } | null;
        },
    ): ConversationDto {
        return {
            id: conv.id,
            annonce_id: conv.annonce_id,
            offreur_id: conv.offreur_id,
            chercheur_id: conv.chercheur_id,
            last_message_at: conv.last_message_at?.toISOString() ?? undefined,
            created_at: conv.created_at.toISOString(),
            annonce: conv.annonces ? { id: conv.annonces.id, titre: conv.annonces.titre } : undefined,
            offreur: conv.profiles_conversations_offreur_idToprofiles ?? undefined,
            chercheur: conv.profiles_conversations_chercheur_idToprofiles ?? undefined,
        };
    }

    //Crée ou récupère une conversation existante pour une annonce.
    static async getOrCreateConversation(userId: string, annonceId: string): Promise<ConversationDto> {
        const annonce = await prisma.annonces.findUnique({
            where: { id: annonceId },
            select: { offreur_id: true },
        });

        if (!annonce) throw new AppError('Annonce introuvable', 404, 'NOT_FOUND');

        const isOffreur = userId === annonce.offreur_id;
        const offreurId = annonce.offreur_id;
        const chercheurId = isOffreur ? '' : userId;
        if (isOffreur) throw new AppError("L'offreur ne peut pas initier une conversation sur sa propre annonce", 400, 'SELF_CONVERSATION');

        let conversation = await prisma.conversations.findFirst({
            where: { annonce_id: annonceId, offreur_id: offreurId, chercheur_id: chercheurId },
            include: convInclude,
        });

        if (!conversation) {
            const created = await prisma.conversations.create({
                data: { annonce_id: annonceId, offreur_id: offreurId, chercheur_id: chercheurId },
            });
            conversation = await prisma.conversations.findUnique({
                where: { id: created.id },
                include: convInclude,
            });
        }

        if (!conversation) throw new AppError('Conversation introuvable', 500, 'INTERNAL');
        return this.serializeConversation(conversation);
    }

    //Récupère les conversations de l'utilisateur avec le dernier message
    static async getMyConversations(userId: string): Promise<ConversationDto[]> {
        const rows = await prisma.conversations.findMany({
            where: { OR: [{ offreur_id: userId }, { chercheur_id: userId }] },
            include: {
                ...convInclude,
                messages: {
                    orderBy: { created_at: 'desc' },
                    take: 1,
                    select: { contenu: true, created_at: true, sender_id: true, statut: true },
                },
            },
            orderBy: { last_message_at: { sort: 'desc', nulls: 'last' } },
        });

        return rows.map((c) => this.serializeConversation(c));
    }

    //Récupère une conversation par son ID
    static async getConversationById(conversationId: string, userId: string): Promise<ConversationDto> {
        const conv = await prisma.conversations.findFirst({
            where: { id: conversationId, OR: [{ offreur_id: userId }, { chercheur_id: userId }] },
            include: convInclude,
        });
        
        if (!conv) throw new AppError('Conversation introuvable', 404, 'NOT_FOUND');
        return this.serializeConversation(conv);
    }

    //Récupère les messages paginés d'une conversation 
    static async getMessages(conversationId: string, userId: string, query: { cursor?: string; limit?: string }) {
        const conv = await prisma.conversations.findFirst({
            where: { id: conversationId, OR: [{ offreur_id: userId }, { chercheur_id: userId }] },
        });
        if (!conv) throw new AppError('Conversation introuvable', 404, 'NOT_FOUND');

        const { cursor, limit } = parsePagination(query, 50);

        const where: { conversation_id: string; created_at?: { lt: Date } } = { conversation_id: conversationId };
        if (cursor) where.created_at = { lt: new Date(cursor) };

        const batch = await prisma.messages.findMany({
            where,
            orderBy: { created_at: 'desc' },
            take: limit + 1,
        });

        const hasMore = batch.length > limit;
        const slice = hasMore ? batch.slice(0, limit) : batch;
        const ascStack = new Stack<(typeof slice)[number]>();

        for (const msg of slice) ascStack.push(msg);
        const data = ascStack.toArray();
        const nextCursor = hasMore && slice.length > 0 ? slice[slice.length - 1].created_at.toISOString() : null;

        return {
            data,
            meta: {
                nextCursor,
                hasMore,
            },
        };
    }

    //Envoie un message dans une conversation avec notification et émission socket 
    static async sendMessage(conversationId: string, userId: string, contenu: string) {
        const conv = await prisma.conversations.findFirst({
            where: { id: conversationId, OR: [{ offreur_id: userId }, { chercheur_id: userId }] },
            include: { annonces: { select: { titre: true } } },
        });
        if (!conv) throw new AppError('Conversation introuvable', 404, 'NOT_FOUND');

        const message = await prisma.messages.create({
            data: { conversation_id: conversationId, sender_id: userId, contenu },
        });

        const recipientId = conv.offreur_id === userId ? conv.chercheur_id : conv.offreur_id;
        const notification = await prisma.notifications.create({
            data: {
                destinataire_id: recipientId,
                type: 'message',
                titre: 'Nouveau message',
                corps: contenu.slice(0, 100),
                annonce_id: conv.annonce_id,
                message_id: message.id,
                action_url: `/messagerie/${conversationId}`,
            },
        });

        try {
            const io = getIO();
            io.to(`user:${recipientId}`).emit('notification:new', notification);
            io.to(`conv:${conversationId}`).emit('message:new', {
                id: message.id,
                conversation_id: message.conversation_id,
                sender_id: message.sender_id,
                contenu: message.contenu,
                media_url: message.media_url,
                media_type: message.media_type,
                statut: message.statut,
                created_at: message.created_at.toISOString(),
            });
        } catch {
            //socket indisponible
        }

        return message;
    }

    // Marque tous les messages non lus d'une conversation comme lus
    static async markAsRead(conversationId: string, userId: string) {
        await prisma.messages.updateMany({
            where: { conversation_id: conversationId, sender_id: { not: userId }, statut: { not: 'lu' } },
            data: { statut: 'lu', read_at: new Date() },
        });
    }

    //Envoie un média dans une conversation via cloudinary.
    static async sendMedia(conversationId: string, userId: string, file: Express.Multer.File) {
        const conv = await prisma.conversations.findFirst({
            where: { id: conversationId, OR: [{ offreur_id: userId }, { chercheur_id: userId }] },
            include: { annonces: { select: { titre: true } } },
        });

        if (!conv) throw new AppError('Conversation introuvable', 404, 'NOT_FOUND');

        const result = await CloudinaryService.upload(file.path, 'messages');

        const message = await prisma.messages.create({
            data: {
                conversation_id: conversationId,
                sender_id: userId,
                contenu: '[Média]',
                media_url: result.url,
                media_type: file.mimetype.startsWith('image') ? 'image' : 'document',
            },
        });

        const recipientId = conv.offreur_id === userId ? conv.chercheur_id : conv.offreur_id;
        const notification = await prisma.notifications.create({
            data: {
                destinataire_id: recipientId,
                type: 'message',
                titre: 'Nouveau message',
                corps: 'Piece jointe',
                annonce_id: conv.annonce_id,
                message_id: message.id,
                action_url: `/messagerie/${conversationId}`,
            },
        });

        try {
            const io = getIO();
            io.to(`user:${recipientId}`).emit('notification:new', notification);
            io.to(`conv:${conversationId}`).emit('message:new', {
                id: message.id,
                conversation_id: message.conversation_id,
                sender_id: message.sender_id,
                contenu: message.contenu,
                media_url: message.media_url,
                media_type: message.media_type,
                statut: message.statut,
                created_at: message.created_at.toISOString(),
            });
        } catch {
            //socket indisponible
        }

        return message;
    }
}