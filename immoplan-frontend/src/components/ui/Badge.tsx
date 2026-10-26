import { HTMLAttributes } from 'react';

type BadgeVariant = 'amber' | 'teal' | 'red' | 'blue' | 'muted' | 'green';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const STYLES: Record<BadgeVariant, React.CSSProperties> = {
  amber: { background: 'var(--accent-amber-dim)', color: 'var(--accent-amber)', border: '1px solid var(--accent-amber-dim)' },
  teal: { background: 'var(--accent-teal-dim)', color: 'var(--accent-teal)', border: '1px solid var(--accent-teal-dim)' },
  red: { background: '#FF4D4D18', color: '#FF4D4D', border: '1px solid #FF4D4D20' },
  blue: { background: '#4D9FFF18', color: '#4D9FFF', border: '1px solid #4D9FFF20' },
  green: { background: '#22C55E18', color: '#22C55E', border: '1px solid #22C55E20' },
  muted: { background: 'var(--border-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-dim)' },
};

export function Badge({ variant = 'amber', dot = false, children, style, ...props }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: 'var(--radius-full)',
        fontSize: '0.72rem',
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        ...STYLES[variant],
        ...style,
      }}
      {...props}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'currentColor',
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
}
