import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { forwardRef, type CSSProperties, type ReactNode } from 'react';
import type { Notification, NotificationType } from '../../store/notifications';
import { useTranslation } from 'react-i18next';
import { formatRelativeDate } from '../../lib/locale';

const TYPE_ICONS: Record<string, ReactNode> = {
  message: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  like: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  avis: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  demande_visite: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  visite_confirmee: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  visite_annulee: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  nouvelle_annonce: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>,
  vue_annonce: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
};

function resolveAppPath(actionUrl: string): string {
  if (actionUrl.startsWith('/conversations/')) {
    return actionUrl.replace(/^\/conversations\//, '/messagerie/');
  }
  if (actionUrl.startsWith('/visites/')) {
    return '/visites';
  }
  return actionUrl;
}

const TYPE_COLORS: Record<string, string> = {
  message: 'var(--accent-amber)',
  like: '#FF4D4D',
  avis: '#F59E0B',
  demande_visite: '#4D9FFF',
  visite_confirmee: 'var(--accent-teal)',
  visite_annulee: '#FF4D4D',
  nouvelle_annonce: 'var(--accent-amber)',
  vue_annonce: 'var(--text-muted)',
};

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export const NotificationItem = forwardRef<HTMLDivElement, NotificationItemProps>(
  function NotificationItem({ notification, onRead, onDelete }, ref) {
    const { t, i18n } = useTranslation();
    const type = notification.type as NotificationType;
    const color = TYPE_COLORS[type] ?? 'var(--text-muted)';
    const icon = TYPE_ICONS[type] ?? TYPE_ICONS.vue_annonce;

    const inner = (
      <>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: color + '20', color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: notification.is_read ? 400 : 600, fontSize: '0.875rem', color: 'var(--text-primary)', margin: 0 }}>
            {notification.titre}
          </p>
          {notification.corps && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {notification.corps}
            </p>
          )}
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {formatRelativeDate(new Date(notification.created_at), i18n.resolvedLanguage)}
          </p>
        </div>
        <button
          type="button"
          aria-label={t('notifications.delete')}
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(notification.id); }}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0, padding: 4 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </>
    );

    const rowStyle: CSSProperties = {
      display: 'flex',
      gap: 14,
      padding: '14px 16px',
      background: notification.is_read ? 'transparent' : 'var(--accent-amber-dim)',
      borderRadius: 'var(--radius-md)',
      border: `1px solid ${notification.is_read ? 'var(--border-subtle)' : 'var(--accent-amber-dim)'}`,
      cursor: 'pointer',
      transition: 'all var(--transition-fast)',
    };

    if (notification.action_url) {
      return (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8, height: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          style={{ borderRadius: 'var(--radius-md)' }}
        >
          <Link
            to={resolveAppPath(notification.action_url)}
            onClick={() => !notification.is_read && onRead(notification.id)}
            style={{ ...rowStyle, textDecoration: 'none', color: 'inherit', display: 'flex' }}
          >
            {inner}
          </Link>
        </motion.div>
      );
    }

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -8, height: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        style={rowStyle}
        onClick={() => !notification.is_read && onRead(notification.id)}
      >
        {inner}
      </motion.div>
    );
  },
);
