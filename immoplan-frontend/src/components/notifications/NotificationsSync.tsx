import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { useNotificationsStore } from '../../store/notifications';
import { useNotifications } from '../../hooks/useNotifications';

/**
 * Garde les notifications à jour partout dans l’app (cloche, temps réel) :
 * - charge la liste + le compteur dès que la session est prête ;
 * - réécoute Socket en continu (pas seulement sur la page /notifications) ;
 * - rafraîchit au retour sur l’onglet et à chaque visite de /notifications.
 */
export function NotificationsSync() {
  const { isAuthenticated } = useAuthStore();
  const { loadNotifications } = useNotifications();
  const clear = useNotificationsStore((s) => s.clear);
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      clear();
      return;
    }
    const run = () => {
      if (!localStorage.getItem('access_token')) return;
      loadNotifications();
    };
    if (useAuthStore.persist.hasHydrated()) {
      run();
      return;
    }
    const unsub = useAuthStore.persist.onFinishHydration(() => run());
    return unsub;
  }, [isAuthenticated, loadNotifications, clear]);

  useEffect(() => {
    if (!isAuthenticated || !localStorage.getItem('access_token')) return;
    if (location.pathname !== '/notifications') return;
    loadNotifications();
  }, [location.pathname, isAuthenticated, loadNotifications]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (!localStorage.getItem('access_token')) return;
      loadNotifications();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [isAuthenticated, loadNotifications]);

  return null;
}
