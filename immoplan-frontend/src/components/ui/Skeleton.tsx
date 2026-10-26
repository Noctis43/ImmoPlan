import { CSSProperties } from 'react';

interface SkeletonProps {
  style?: CSSProperties;
  className?: string;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}

export function Skeleton({ style, className, width, height, circle }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className ?? ''}`}
      style={{
        width,
        height: height ?? 16,
        borderRadius: circle ? '50%' : undefined,
        ...style,
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <Skeleton style={{ height: 200 }} />
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Skeleton style={{ height: 20, width: '60%' }} />
        <Skeleton style={{ height: 14, width: '40%' }} />
        <Skeleton style={{ height: 14, width: '80%' }} />
      </div>
    </div>
  );
}
