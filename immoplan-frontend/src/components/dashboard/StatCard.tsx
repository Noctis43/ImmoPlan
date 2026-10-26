import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  delta?: string;
  positive?: boolean;
  color?: string;
}

export function StatCard({ label, value, icon, delta, positive, color = 'var(--accent-amber)' }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      whileHover={{ y: -3 }}
      className="dashboard-stat-card"
      style={{ ['--stat-accent' as string]: color }}
    >
      <div className="dashboard-stat-card__glow" />

      <div className="dashboard-stat-card__top">
        <div className="dashboard-stat-card__icon">
          {icon}
        </div>
        {delta && (
          <span className="dashboard-stat-card__delta" data-positive={positive ? 'true' : 'false'}>
            {positive ? '+' : ''}{delta}
          </span>
        )}
      </div>

      <div className="dashboard-stat-card__content">
        <div className="dashboard-stat-card__value">
          {typeof value === 'number' ? value.toLocaleString('fr-MG') : value}
        </div>
        <div className="dashboard-stat-card__label">
          {label}
        </div>
      </div>
    </motion.div>
  );
}
