import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '../../hooks/useChat';
import { useAuthStore } from '../../store/auth';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { MediaUpload } from './MediaUpload';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useState } from 'react';
import type { Conversation } from '../../store/chat';
import { useTranslation } from 'react-i18next';

interface ChatWindowProps {
  conversation: Conversation;
}

export function ChatWindow({ conversation }: ChatWindowProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { messages, typingUsers, loadMessages, sendMessage, sendMedia, emitTyping, markRead } = useChat(conversation.id);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages(conversation.id);
  }, [conversation.id, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (messages.length) markRead(conversation.id);
  }, [messages.length, conversation.id, markRead]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setSending(true);
    try {
      await sendMessage(conversation.id, input.trim());
      setInput('');
    } catch {
      // toast handled by hook
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = useCallback(() => {
    emitTyping(conversation.id);
  }, [conversation.id, emitTyping]);

  const otherUser = user?.id === conversation.offreur_id ? conversation.chercheur : conversation.offreur;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--accent-amber-dim)', border: '2px solid var(--accent-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
          {otherUser?.avatar_url
            ? <img src={otherUser.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-amber)' }}>{otherUser?.prenom?.[0]}{otherUser?.nom?.[0]}</span>
          }
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{otherUser?.prenom} {otherUser?.nom}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
            {t('chat.subjectPrefix')} {conversation.annonce?.titre ?? '—'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} isMine={msg.sender_id === user?.id} />
          ))}
        </AnimatePresence>

        {typingUsers.filter((id) => id !== user?.id).length > 0 && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 10, alignItems: 'flex-end', flexShrink: 0 }}>
        <MediaUpload onFile={(file) => sendMedia(conversation.id, file)} />
        <div style={{ flex: 1 }}>
          <Input
            placeholder={t('chat.writeMessage')}
            value={input}
            onChange={(e) => { setInput(e.target.value); handleTyping(); }}
            onKeyDown={handleKeyDown}
            aria-label={t('chat.message')}
          />
        </div>
        <Button onClick={handleSend} isLoading={sending} size="sm" disabled={!input.trim()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </Button>
      </div>
    </div>
  );
}
