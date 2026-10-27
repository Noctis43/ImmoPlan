import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useNotificationsStore } from '../../store/notifications';
import { useTranslation } from 'react-i18next';

export function NotificationBell() {
  const { t } = useTranslation();
  const { unreadCount } = useNotificationsStore();

  return (
    <Link to="/notifications" aria-label={`${t('nav.notifications')}${unreadCount > 0 ? ` — ${t('notificationsPage.unreadCount', { count: unreadCount })}` : ''}`} style={{ position: 'relative', color: 'var(--text-muted)', display: 'inline-flex' }}>
      <motion.div
        animate={unreadCount > 0 ? { rotate: [0, -12, 12, -8, 8, 0] } : {}}
        transition={{ type: 'spring', duration: 0.6, repeat: Infinity, repeatDelay: 5 }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      </motion.div>
      {unreadCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          style={{
            position: 'absolute', top: -6, right: -6,
            background: 'var(--accent-amber)', color: '#0A0A0F',
            borderRadius: '50%', width: 17, height: 17,
            fontSize: '0.62rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </motion.span>
      )}
    </Link>
  );
}
