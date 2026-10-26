import { createContext, useContext, useState, useCallback, ReactNode, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const ICONS: Record<ToastType, ReactNode> = {
  success: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  error: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  info: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  warning: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

const COLORS: Record<ToastType, { bg: string; text: string; border: string }> = {
  success: { bg: '#22C55E14', text: '#22C55E', border: '#22C55E30' },
  error: { bg: '#FF4D4D14', text: '#FF4D4D', border: '#FF4D4D30' },
  info: { bg: 'var(--accent-amber-dim)', text: 'var(--accent-amber)', border: 'var(--accent-amber-dim)' },
  warning: { bg: '#F59E0B14', text: '#F59E0B', border: '#F59E0B30' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const _id = useId();

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${_id}-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, [_id]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            zIndex: 'var(--z-toast)',
            maxWidth: 380,
            width: '100%',
          }}
        >
          <AnimatePresence mode="popLayout">
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                role="alert"
                initial={{ opacity: 0, x: 60, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '14px 16px',
                  background: 'var(--bg-card)',
                  border: `1px solid ${COLORS[t.type].border}`,
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-float)',
                }}
              >
                <span style={{ color: COLORS[t.type].text, flexShrink: 0, marginTop: 1 }}>
                  {ICONS[t.type]}
                </span>
                <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {t.message}
                </span>
                <button
                  aria-label="Fermer"
                  onClick={() => dismiss(t.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'none', padding: 2, flexShrink: 0 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}
