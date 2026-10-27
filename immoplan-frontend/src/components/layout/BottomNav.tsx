import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useAuthStore } from "../../store/auth";

type BottomNavItem =
  | { type: "link"; to: string; label: string; icon: ReactNode }
  | { type: "action"; label: string; icon: ReactNode; onPress: () => void };

function IconButton({
  children,
  active,
  onClick,
  ariaLabel,
}: {
  children: ReactNode;
  active?: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="app-bottom-nav__btn"
      aria-label={ariaLabel}
      whileTap={{ scale: 0.98 }}
      data-active={active ? "true" : "false"}
    >
      {children}
    </motion.button>
  );
}

export function BottomNav() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isMobile = useMediaQuery("(max-width: 1023px)");

  // If no auth, keep mobile screen clean (login/register handles its own UI)
  if (!user) return null;

  if (!isMobile) return null;

  const HOME_ICON = (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
  const SEARCH_ICON = (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
  const MAP_ICON = (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
  const MSG_ICON = (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
  const MENU_ICON = (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );

  const items: BottomNavItem[] = [
    {
      type: "link",
      to: "/annonces",
      label: t("nav.annonces"),
      icon: HOME_ICON,
    },
    {
      type: "link",
      to: "/recherche",
      label: t("nav.search"),
      icon: SEARCH_ICON,
    },
    {
      type: "link",
      to: "/annonces/carte",
      label: t("nav.map"),
      icon: MAP_ICON,
    },
    {
      type: "link",
      to: "/messagerie",
      label: t("nav.messages"),
      icon: MSG_ICON,
    },
  ];

  return (
    <nav className="app-bottom-nav" aria-label={t("ui.mainNav")}>
      <div className="app-bottom-nav__inner">
        {items.map((item) => {
          if (item.type === "action") {
            return (
              <div key={item.label} className="app-bottom-nav__item">
                <IconButton onClick={item.onPress} ariaLabel={item.label}>
                  <span className="app-bottom-nav__icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="app-bottom-nav__label">{item.label}</span>
                </IconButton>
              </div>
            );
          }

          return (
            <div key={item.to} className="app-bottom-nav__item">
              <NavLink
                to={item.to}
                end={item.to === "/annonces"}
                className="app-bottom-nav__link"
              >
                {({ isActive }) => {
                  return (
                    <IconButton
                      onClick={() => {}}
                      ariaLabel={item.label}
                      active={isActive}
                    >
                      <span className="app-bottom-nav__icon" aria-hidden="true">
                        {item.icon}
                      </span>
                      <span className="app-bottom-nav__label">
                        {item.label}
                      </span>
                    </IconButton>
                  );
                }}
              </NavLink>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
