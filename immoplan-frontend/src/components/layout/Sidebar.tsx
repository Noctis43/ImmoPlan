import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/auth';
import { useTranslation } from 'react-i18next';

interface NavItem {
  to: string;
  labelKey: string;
  icon: JSX.Element;
  offreurOnly?: boolean;
  chercheurOnly?: boolean;
}

const HOME_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const SEARCH_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const MAP_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>;
const STAR_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const MSG_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const CAL_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const BELL_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const DASH_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
const PLUS_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const HISTORY_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13a9 9 0 1 0 .5-5.5L3 8"/><path d="M12 7v5l3 2"/></svg>;
const USERS_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;

const navItems: NavItem[] = [
  { to: '/annonces', labelKey: 'nav.annonces', icon: HOME_ICON },
  { to: '/annonces/carte', labelKey: 'nav.map', icon: MAP_ICON },
  { to: '/recherche', labelKey: 'nav.search', icon: SEARCH_ICON },
  { to: '/recommandations', labelKey: 'nav.recommendations', icon: STAR_ICON },
  { to: '/messagerie', labelKey: 'nav.messages', icon: MSG_ICON },
  { to: '/visites', labelKey: 'nav.visits', icon: CAL_ICON },
  { to: '/historique', labelKey: 'nav.history', icon: HISTORY_ICON, chercheurOnly: true },
  { to: '/trouver-offreur', labelKey: 'nav.findProvider', icon: USERS_ICON },
  { to: '/notifications', labelKey: 'nav.notifications', icon: BELL_ICON },
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: DASH_ICON, offreurOnly: true },
  { to: '/annonces/publier', labelKey: 'nav.publish', icon: PLUS_ICON, offreurOnly: true },
];

interface SidebarProps {
  /** Fermer le tiroir mobile après navigation */
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isOffreur = user?.profile_type === 'offreur';
  const isChercheur = user?.profile_type === 'chercheur';

  const visible = navItems.filter((item) => {
    if (item.offreurOnly && !isOffreur) return false;
    if (item.chercheurOnly && !isChercheur) return false;
    return true;
  });

  return (
    <nav
      aria-label={t('ui.mainNav')}
      className="app-sidebar"
    >
      {user && (
        <div className="app-sidebar__profile">
          <div className="app-sidebar__profile-avatar">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span className="app-sidebar__profile-initials">
                {user.prenom?.[0]}{user.nom?.[0]}
              </span>
            )}
          </div>
          <div className="app-sidebar__profile-text">
            <div className="app-sidebar__profile-name">
              {user.prenom} {user.nom}
            </div>
            <div className="app-sidebar__profile-role">
              {user.profile_type ? t(`roles.${user.profile_type}`, user.profile_type) : ''}
            </div>
          </div>
        </div>
      )}

      {visible.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/annonces'}
          onClick={() => onNavigate?.()}
          className={({ isActive }) => `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
        >
          {({ isActive }) => (
            <>
              <motion.span className="app-sidebar__link-icon"
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                {item.icon}
              </motion.span>
              {t(item.labelKey)}
              {item.to === '/annonces/publier' && (
                <span className="app-sidebar__new-badge">
                  NEW
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
