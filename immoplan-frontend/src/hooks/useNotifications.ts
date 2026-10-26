import { useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import { useNotificationsStore } from '../store/notifications';
import { notificationsApi } from '../lib/api';
import type { Notification } from '../store/notifications';
import { useToast } from '../components/ui/Toast';

/** Unifie le payload Prisma (chat) et celui du worker BullMQ (snake_case / camelCase). */
function normalizeSocketNotification(raw: unknown): Notification | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  const id = p.id != null ? String(p.id) : '';
  if (!id) return null;

  const createdRaw = p.created_at ?? p.createdAt;
  let created_at: string;
  if (typeof createdRaw === 'string') created_at = createdRaw;
  else if (createdRaw instanceof Date) created_at = createdRaw.toISOString();
  else created_at = new Date().toISOString();

  const type = (typeof p.type === 'string' ? p.type : 'message') as Notification['type'];

  return {
    id,
    destinataire_id: p.destinataire_id != null ? String(p.destinataire_id) : '',
    type,
    titre: typeof p.titre === 'string' ? p.titre : '',
    corps: p.corps != null ? String(p.corps) : undefined,
    annonce_id: p.annonce_id != null ? String(p.annonce_id) : undefined,
    message_id: p.message_id != null ? String(p.message_id) : undefined,
    visite_id: p.visite_id != null ? String(p.visite_id) : undefined,
    avis_id: p.avis_id != null ? String(p.avis_id) : undefined,
    action_url:
      (typeof p.action_url === 'string' && p.action_url) ||
      (typeof p.actionUrl === 'string' && p.actionUrl) ||
      undefined,
    is_read: Boolean(p.is_read),
    read_at: typeof p.read_at === 'string' ? p.read_at : undefined,
    created_at,
  };
}

export function useNotifications() {
  const socket = useSocket();
  const { toast } = useToast();
  const {
    notifications,
    unreadCount,
    setNotifications,
    addNotification,
    markRead,
    markAllRead,
    remove,
    setUnreadCount,
  } = useNotificationsStore();

  // Load initial notifications + count (nécessite un JWT — évite 401 avant réhydratation / sans session)
  const loadNotifications = useCallback(async () => {
    if (typeof window === 'undefined' || !localStorage.getItem('access_token')) {
      return;
    }
    try {
      const [notifRes, countRes] = await Promise.all([
        notificationsApi.getAll({ limit: 50 }),
        notificationsApi.getCount(),
      ]);
      const rawNotifs = notifRes.data?.data || notifRes.data?.notifications || notifRes.data;
      const notifs: Notification[] = Array.isArray(rawNotifs) ? rawNotifs : [];
      
      const rawCount = countRes.data?.data?.count ?? countRes.data?.data ?? countRes.data?.count ?? countRes.data;
      const count: number = typeof rawCount === 'number' ? rawCount : 0;
      
      setNotifications(notifs, count);
    } catch {
      // silent
    }
  }, [setNotifications]);

  // Socket listener for new notifications
  useEffect(() => {
    if (!socket) return;

    const handleNew = (payload: unknown) => {
      const notification = normalizeSocketNotification(payload);
      if (!notification) return;
      addNotification(notification);
      if (!notification.is_read && notification.type === 'message') {
        toast(notification.titre || 'Nouveau message', 'info');
      }
    };

    const handleReadAck = (data: { id?: string; notificationId?: string }) => {
      const id = data.notificationId ?? data.id;
      if (id) markRead(id);
    };

    socket.on('notification:new', handleNew);
    socket.on('notification:read_ack', handleReadAck);

    return () => {
      socket.off('notification:new', handleNew);
      socket.off('notification:read_ack', handleReadAck);
    };
  }, [socket, addNotification, markRead, toast]);

  const markOneRead = useCallback(
    async (id: string) => {
      // Optimistic
      markRead(id);
      try {
        await notificationsApi.markOne(id);
        if (socket) socket.emit('notification:mark_read', { notificationId: id });
      } catch {
        // revert not needed in simple UI
      }
    },
    [markRead, socket]
  );

  const markAllAsRead = useCallback(async () => {
    markAllRead();
    try {
      await notificationsApi.markAll();
    } catch {
      // silent
    }
  }, [markAllRead]);

  const deleteNotification = useCallback(
    async (id: string) => {
      remove(id);
      try {
        await notificationsApi.deleteOne(id);
      } catch {
        // silent
      }
    },
    [remove]
  );

  return {
    notifications,
    unreadCount,
    loadNotifications,
    markOneRead,
    markAllAsRead,
    deleteNotification,
    setUnreadCount,
  };
}
