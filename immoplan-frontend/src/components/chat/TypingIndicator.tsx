import { motion } from 'framer-motion';

export function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 0 4px' }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ y: [0, -5, 0] }}
          transition={{
            type: 'spring',
            stiffness: 250,
            damping: 12,
            repeat: Infinity,
            delay: i * 0.15,
            repeatDelay: 0.3,
          }}
          style={{
            display: 'block',
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'var(--text-muted)',
          }}
        />
      ))}
    </div>
  );
}
