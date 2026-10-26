import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, id, style, ...props }, ref) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
        {label && (
          <label
            htmlFor={id}
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {label}
          </label>
        )}

        <div style={{ position: 'relative' }}>
          {leftIcon && (
            <span
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={id}
            style={{
              width: '100%',
              padding: leftIcon ? '12px 14px 12px 42px' : rightIcon ? '12px 42px 12px 14px' : '12px 14px',
              background: 'var(--bg-elevated)',
              border: `1px solid ${error ? '#FF4D4D40' : 'var(--border-dim)'}`,
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              outline: 'none',
              transition: 'border-color var(--transition-fast)',
              ...style,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = error ? '#FF4D4D80' : 'var(--accent-amber)';
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = error ? '#FF4D4D40' : 'var(--border-dim)';
              props.onBlur?.(e);
            }}
            {...props}
          />

          {rightIcon && (
            <span
              style={{
                position: 'absolute',
                right: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {rightIcon}
            </span>
          )}
        </div>

        {error && (
          <span style={{ fontSize: '0.78rem', color: '#FF4D4D' }}>{error}</span>
        )}
        {hint && !error && (
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{hint}</span>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
