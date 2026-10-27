import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/auth';
import { useNotificationsStore } from '../../store/notifications';
import { useTheme } from '../../hooks/useTheme';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useShellLayout } from '../../contexts/ShellLayoutContext';
import { authApi } from '../../lib/api';
import { destroySocket } from '../../lib/socket';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type AppLanguage } from '../../lib/i18n';

export function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { unreadCount } = useNotificationsStore();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const isCompactNav = useMediaQuery('(max-width: 1023px)');
  const { toggleMobileNav } = useShellLayout();

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* silent */ }
    destroySocket();
    logout();
    navigate('/login');
  };

  return (
    <header className="app-navbar">
      <div className="app-navbar__left">
        {isCompactNav && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={toggleMobileNav}
            aria-label={t('ui.openNav')}
            className="app-navbar__menu-btn"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </motion.button>
        )}
        <Link to={isAuthenticated ? '/annonces' : '/'} className="app-navbar__brand">
        <motion.div
          whileHover={{ rotate: 8 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="app-navbar__brand-mark"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A0A0F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </motion.div>
          <span className="app-navbar__brand-text">
          Immo<span style={{ color: 'var(--accent-amber)' }}>Plan</span>
        </span>
      </Link>
      </div>

      <div className="app-navbar__right" data-compact={isCompactNav ? 'true' : 'false'}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={toggle}
          aria-label={theme === 'dark' ? t('ui.themeToLight') : t('ui.themeToDark')}
          className="app-navbar__icon-btn app-navbar__theme-toggle"
        >
          {theme === 'dark' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          )}
        </motion.button>

        <label className="sr-only" htmlFor="language-select">{t('ui.language')}</label>
        <select
          id="language-select"
          className="app-navbar__icon-btn"
          aria-label={t('ui.language')}
          value={(i18n.resolvedLanguage ?? i18n.language ?? 'fr').slice(0, 2)}
          onChange={(e) => i18n.changeLanguage(e.target.value as AppLanguage)}
          style={{ padding: '6px 8px', minWidth: 68 }}
        >
          {SUPPORTED_LANGUAGES.map((language) => (
            <option key={language} value={language}>{language.toUpperCase()}</option>
          ))}
        </select>

        {isAuthenticated ? (
          <>
            <Link to="/notifications" aria-label={`${unreadCount} ${t('nav.notifications')}`} className="app-navbar__notification-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unreadCount > 0 && (
                <span className="app-navbar__notification-badge">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            <Link
              to="/settings"
              className="app-navbar__profile-link"
              aria-label={t('ui.myProfile')}
            >
              <div className="app-navbar__profile-avatar" data-has-image={user?.avatar_url ? 'true' : 'false'}>
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={`${user.prenom} ${user.nom}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  `${user?.prenom?.[0] ?? ''}${user?.nom?.[0] ?? ''}`
                )}
              </div>
              {!isCompactNav && (
                <span className="app-navbar__profile-name">
                  {user?.prenom}
                </span>
              )}
            </Link>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              aria-label={t('ui.logout')}
              className="app-navbar__icon-btn app-navbar__logout-btn"
              data-compact={isCompactNav ? 'true' : 'false'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </motion.button>
          </>
        ) : (
          <div className="app-navbar__auth-actions">
            <Link to="/login" className="app-navbar__auth-link app-navbar__auth-link--login">
              {t('ui.login')}
            </Link>
            <Link to="/register" className="app-navbar__auth-link app-navbar__auth-link--register">
              {t('ui.register')}
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
