import { AnimatePresence } from 'framer-motion';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { useTranslation } from 'react-i18next';

interface NotificationFeedProps {
  isLoading?: boolean;
}

export function NotificationFeed({ isLoading = false }: NotificationFeedProps) {
  const { t } = useTranslation();
  const { notifications, unreadCount, markOneRead, markAllAsRead, deleteNotification } = useNotifications();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} style={{ height: 70, borderRadius: 12 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header actions */}
      {unreadCount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            {t('notificationsPage.markAllRead', { count: unreadCount })}
          </Button>
        </div>
      )}

      {/* Feed */}
      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ margin: '0 auto 12px', opacity: 0.4 }}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <p style={{ fontWeight: 500 }}>{t('notificationsPage.none')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <AnimatePresence mode="popLayout">
            {notifications.map((notif) => (
              <NotificationItem
                key={notif.id}
                notification={notif}
                onRead={markOneRead}
                onDelete={deleteNotification}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
