import { motion } from 'framer-motion';
import type { Message } from '../../store/chat';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
}

export function MessageBubble({ message, isMine }: MessageBubbleProps) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      style={{
        display: 'flex',
        justifyContent: isMine ? 'flex-end' : 'flex-start',
        marginBottom: 2,
      }}
    >
      <div
        style={{
          maxWidth: '72%',
          background: isMine ? 'var(--accent-amber)' : 'var(--bg-elevated)',
          color: isMine ? '#0A0A0F' : 'var(--text-primary)',
          borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          padding: '10px 14px',
          border: isMine ? 'none' : '1px solid var(--border-dim)',
        }}
      >
        {/* Media */}
        {message.media_url && (
          <div style={{ marginBottom: 6 }}>
            {message.media_type?.startsWith('image') ? (
              <img src={message.media_url} alt="media" style={{ maxWidth: '100%', borderRadius: 8, maxHeight: 240, objectFit: 'cover' }} />
            ) : (
              <a href={message.media_url} target="_blank" rel="noopener noreferrer" style={{ color: isMine ? '#0A0A0F' : 'var(--accent-amber)', fontSize: '0.8rem', textDecoration: 'underline' }}>
                {t('chat.attachment')}
              </a>
            )}
          </div>
        )}

        <p style={{ fontSize: '0.875rem', lineHeight: 1.5, margin: 0 }}>{message.contenu}</p>

        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 }}>
          <span style={{ fontSize: '0.65rem', opacity: 0.65 }}>
            {format(new Date(message.created_at), 'HH:mm')}
          </span>
          {isMine && (
            <span style={{ opacity: 0.7 }}>
              {message.statut === 'lu' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/><polyline points="20 6 9 17 4 12" transform="translate(4,0)"/></svg>
              ) : message.statut === 'delivre' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              )}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
