import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type ShellLayoutContextValue = {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
};

const ShellLayoutContext = createContext<ShellLayoutContextValue | null>(null);

export function ShellLayoutProvider({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const toggleMobileNav = useCallback(() => setMobileNavOpen((v) => !v), []);

  return (
    <ShellLayoutContext.Provider value={{ mobileNavOpen, setMobileNavOpen, toggleMobileNav }}>
      {children}
    </ShellLayoutContext.Provider>
  );
}

export function useShellLayout() {
  const ctx = useContext(ShellLayoutContext);
  if (!ctx) throw new Error('useShellLayout doit être utilisé dans AppShell');
  return ctx;
}
