import { create } from 'zustand';

export type NotificationType =
  | 'message'
  | 'like'
  | 'avis'
  | 'demande_visite'
  | 'visite_confirmee'
  | 'visite_annulee'
  | 'nouvelle_annonce'
  | 'vue_annonce';

export interface Notification {
  id: string;
  destinataire_id: string;
  type: NotificationType;
  titre: string;
  corps?: string;
  annonce_id?: string;
  message_id?: string;
  visite_id?: string;
  avis_id?: string;
  action_url?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (notifications: Notification[], unreadCount: number) => void;
  addNotification: (notification: Notification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  setUnreadCount: (count: number) => void;
  clear: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: [],
  unreadCount: 0,

  setNotifications: (notifications, unreadCount) =>
    set({ notifications, unreadCount }),

  addNotification: (notification) =>
    set((state) => {
      if (state.notifications.some((n) => n.id === notification.id)) return state;
      return {
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + (notification.is_read ? 0 : 1),
      };
    }),

  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        is_read: true,
        read_at: n.read_at ?? new Date().toISOString(),
      })),
      unreadCount: 0,
    })),

  remove: (id) =>
    set((state) => {
      const notif = state.notifications.find((n) => n.id === id);
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: notif && !notif.is_read
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      };
    }),

  setUnreadCount: (count) => set({ unreadCount: count }),

  clear: () => set({ notifications: [], unreadCount: 0 }),
}));
