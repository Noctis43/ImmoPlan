import { NotificationFeed } from '../components/notifications/NotificationFeed';
import { PageTransition } from '../components/layout/PageTransition';
import { useTranslation } from 'react-i18next';

export default function Notifications() {
  const { t } = useTranslation();
  return (
    <PageTransition>
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <h1 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: '1.8rem', fontWeight: 700 }}>
          {t('nav.notifications')}
        </h1>
        <NotificationFeed />
      </div>
    </PageTransition>
  );
}
