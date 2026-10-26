import { useState, ReactNode, useId } from 'react';
import { motion } from 'framer-motion';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (id: string) => void;
  children?: (activeTab: string) => ReactNode;
}

export function Tabs({ tabs, defaultTab, onChange, children }: TabsProps) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id ?? '');
  const groupId = useId();

  const handleSelect = (id: string) => {
    setActive(id);
    onChange?.(id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="tabs-inline-scroll" style={{ width: '100%', maxWidth: '100%' }}>
      <div
        role="tablist"
        aria-label="Onglets"
        style={{
          display: 'flex',
          gap: 4,
          background: 'var(--bg-secondary)',
          padding: 4,
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          width: 'fit-content',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${groupId}-${tab.id}`}
            aria-controls={`panel-${groupId}-${tab.id}`}
            aria-selected={active === tab.id}
            onClick={() => handleSelect(tab.id)}
            className="tabs-tab"
            style={{
              position: 'relative',
              padding: '8px 18px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'none',
              color: active === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: active === tab.id ? 600 : 400,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'color var(--transition-fast)',
              zIndex: 1,
            }}
          >
            {active === tab.id && (
              <motion.span
                layoutId={`tab-bg-${groupId}`}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-dim)',
                  zIndex: -1,
                  boxShadow: 'var(--shadow-card)',
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      </div>

      {children && (
        <div
          role="tabpanel"
          id={`panel-${groupId}-${active}`}
          aria-labelledby={`tab-${groupId}-${active}`}
        >
          {children(active)}
        </div>
      )}
    </div>
  );
}
