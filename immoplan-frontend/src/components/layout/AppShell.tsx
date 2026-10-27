import { ReactNode, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ShellLayoutProvider,
  useShellLayout,
} from "../../contexts/ShellLayoutContext";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { NotificationsSync } from "../notifications/NotificationsSync";
import { BottomNav } from "./BottomNav";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

interface AppShellProps {
  children: ReactNode;
}

function AppShellInner({ children }: AppShellProps) {
  const { t } = useTranslation();
  const { mobileNavOpen, setMobileNavOpen } = useShellLayout();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  useEffect(() => {
    if (isDesktop) setMobileNavOpen(false);
  }, [isDesktop, setMobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  const closeDrawer = () => setMobileNavOpen(false);

  return (
    <div className="app-shell">
      <NotificationsSync />
      <div className="app-shell__navbar">
        <Navbar />
      </div>

      <BottomNav />

      <aside
        className="app-shell__sidebar app-shell__sidebar--desktop"
        aria-label={t("ui.sideNav")}
      >
        <Sidebar onNavigate={closeDrawer} />
      </aside>

      {mobileNavOpen && (
        <>
          <button
            type="button"
            className="app-shell__scrim"
            aria-label={t("ui.closeNav")}
            onClick={closeDrawer}
          />
          <aside
            className="app-shell__sidebar app-shell__sidebar--drawer"
            aria-label={t("ui.navMenu")}
            aria-modal="true"
          >
            <Sidebar onNavigate={closeDrawer} />
          </aside>
        </>
      )}

      <main id="main-content" className="app-shell__main">
        {children}
      </main>
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <ShellLayoutProvider>
      <AppShellInner>{children}</AppShellInner>
    </ShellLayoutProvider>
  );
}
