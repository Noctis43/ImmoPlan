import { useEffect, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';
import { useChatStore } from '../store/chat';
import { messagerieApi } from '../lib/api';
import { useAuthStore } from '../store/auth';
import type { Message } from '../store/chat';
import { unwrapArray, unwrapEntity } from '../lib/unwrap';

function normalizeIncomingMessage(raw: unknown): Message | null {
  if (!raw || typeof raw !== 'object') return null;
  const payload = raw as Record<string, unknown>;
  const id = payload.id != null ? String(payload.id) : '';
  const conversationId = payload.conversation_id ?? payload.conversationId;
  const senderId = payload.sender_id ?? payload.senderId;
  const createdAt = payload.created_at ?? payload.createdAt;
  if (!id || !conversationId || !senderId) return null;

  return {
    id,
    conversation_id: String(conversationId),
    sender_id: String(senderId),
    contenu: typeof payload.contenu === 'string' ? payload.contenu : '',
    statut: (payload.statut as Message['statut']) ?? 'envoye',
    media_url: typeof payload.media_url === 'string' ? payload.media_url : (typeof payload.mediaUrl === 'string' ? payload.mediaUrl : undefined),
    media_type: typeof payload.media_type === 'string' ? payload.media_type : (typeof payload.mediaType === 'string' ? payload.mediaType : undefined),
    created_at:
      typeof createdAt === 'string'
        ? createdAt
        : createdAt instanceof Date
          ? createdAt.toISOString()
          : new Date().toISOString(),
  };
}

export function useChat(conversationId?: string) {
  const socket = useSocket();
  const { user } = useAuthStore();
  const {
    messages,
    typingUsers,
    addMessage,
    setMessages,
    setTyping,
    markMessagesRead,
    updateLastMessageAt,
  } = useChatStore();

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Join conversation room
  useEffect(() => {
    if (!socket || !conversationId) return;
    socket.emit('conversation:join', conversationId);
    return () => {
      // No explicit leave needed for persistent connection
    };
  }, [socket, conversationId]);

  // Listen for incoming messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (raw: unknown) => {
      const message = normalizeIncomingMessage(raw);
      if (!message) return;
      addMessage(message);
      updateLastMessageAt(message.conversation_id, message.created_at);
      // Auto mark-read if we're viewing this conversation
      if (message.conversation_id === conversationId && message.sender_id !== user?.id) {
        socket.emit('message:read', { conversationId: message.conversation_id });
      }
    };

    const handleReadAck = ({ conversationId: cid }: { conversationId: string }) => {
      markMessagesRead(cid);
    };

    const handleTyping = ({
      conversationId: cid,
      userId,
      isTyping,
    }: {
      conversationId: string;
      userId: string;
      isTyping: boolean;
    }) => {
      setTyping(cid, userId, isTyping);
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:read_ack', handleReadAck);
    socket.on('user:typing', handleTyping);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:read_ack', handleReadAck);
      socket.off('user:typing', handleTyping);
    };
  }, [socket, conversationId, user?.id, addMessage, markMessagesRead, setTyping, updateLastMessageAt]);

  // Load messages for a conversation
  const loadMessages = useCallback(
    async (cid: string) => {
      try {
        const { data: body } = await messagerieApi.getMessages(cid);
        /** Backend : `{ data: Message[], meta }` — pas `messages`. */
        const list = unwrapArray<Message>(body);
        setMessages(cid, list);
      } catch {
        setMessages(cid, []);
      }
    },
    [setMessages]
  );

  // Send a text message
  const sendMessage = useCallback(
    async (cid: string, contenu: string) => {
      if (!contenu.trim()) return;
      try {
        const { data: body } = await messagerieApi.sendMessage(cid, { contenu });
        const msg = unwrapEntity<Message>(body, ['message']) ?? normalizeIncomingMessage(unwrapEntity<Record<string, unknown>>(body, ['message']) ?? body);
        if (msg) addMessage(msg);
        updateLastMessageAt(cid, new Date().toISOString());
      } catch {
        // handled by toast in component
        throw new Error('Échec de l\'envoi');
      }
    },
    [addMessage, updateLastMessageAt]
  );

  // Send media message
  const sendMedia = useCallback(
    async (cid: string, file: File) => {
      const formData = new FormData();
      formData.append('media', file);
      const { data: body } = await messagerieApi.sendMedia(cid, formData);
      const msg = unwrapEntity<Message>(body, ['message']) ?? normalizeIncomingMessage(unwrapEntity<Record<string, unknown>>(body, ['message']) ?? body);
      if (msg) addMessage(msg);
      updateLastMessageAt(cid, new Date().toISOString());
    },
    [addMessage, updateLastMessageAt]
  );

  // Emit typing indicator with debounce
  const emitTyping = useCallback(
    (cid: string) => {
      if (!socket) return;
      socket.emit('user:typing', { conversationId: cid, isTyping: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('user:typing', { conversationId: cid, isTyping: false });
      }, 2000);
    },
    [socket]
  );

  // Mark messages as read
  const markRead = useCallback(
    async (cid: string) => {
      try {
        await messagerieApi.markLu(cid);
        if (socket) socket.emit('message:read', { conversationId: cid });
        markMessagesRead(cid);
      } catch {
        // silent
      }
    },
    [socket, markMessagesRead]
  );

  const rawMsgs = conversationId ? messages[conversationId] : undefined;
  const safeMessages = Array.isArray(rawMsgs) ? rawMsgs : [];

  return {
    messages: conversationId ? safeMessages : [],
    typingUsers: conversationId ? (typingUsers[conversationId] ?? []) : [],
    loadMessages,
    sendMessage,
    sendMedia,
    emitTyping,
    markRead,
  };
}
