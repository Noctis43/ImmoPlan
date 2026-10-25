import { create } from 'zustand';
import { unwrapArray } from '../lib/unwrap';

export type MessageStatus = 'envoye' | 'delivre' | 'lu';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  contenu: string;
  statut: MessageStatus;
  media_url?: string;
  media_type?: string;
  created_at: string;
  read_at?: string;
}

export interface Conversation {
  id: string;
  annonce_id: string;
  offreur_id: string;
  chercheur_id: string;
  last_message_at?: string;
  created_at: string;
  annonce?: { id: string; titre: string; annonce_photos?: { cloudinary_url: string }[] };
  offreur?: { id: string; nom: string; prenom: string; avatar_url?: string };
  chercheur?: { id: string; nom: string; prenom: string; avatar_url?: string };
  _count?: { messages: number };
  unread_count?: number;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  typingUsers: Record<string, string[]>;

  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  markMessagesRead: (conversationId: string) => void;
  updateLastMessageAt: (conversationId: string, timestamp: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  typingUsers: {},

  setConversations: (conversations) => set({ conversations }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: Array.isArray(messages) ? messages : unwrapArray<Message>(messages),
      },
    })),

  addMessage: (message) =>
    set((state) => {
      const raw = state.messages[message.conversation_id];
      const convMessages = Array.isArray(raw) ? raw : [];
      const exists = convMessages.some((m) => m.id === message.id);
      if (exists) return state;
      return {
        messages: {
          ...state.messages,
          [message.conversation_id]: [...convMessages, message],
        },
      };
    }),

  setTyping: (conversationId, userId, isTyping) =>
    set((state) => {
      const current = state.typingUsers[conversationId] ?? [];
      const updated = isTyping
        ? [...new Set([...current, userId])]
        : current.filter((id) => id !== userId);
      return { typingUsers: { ...state.typingUsers, [conversationId]: updated } };
    }),

  markMessagesRead: (conversationId) =>
    set((state) => {
      const raw = state.messages[conversationId];
      const arr = Array.isArray(raw) ? raw : [];
      return {
        messages: {
          ...state.messages,
          [conversationId]: arr.map((m) => ({
            ...m,
            statut: 'lu' as MessageStatus,
          })),
        },
      };
    }),

  updateLastMessageAt: (conversationId, timestamp) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, last_message_at: timestamp } : c
      ),
    })),
}));
