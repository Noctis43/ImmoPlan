import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { messagerieApi } from '../lib/api';
import { ChatWindow } from '../components/chat/ChatWindow';
import { PageTransition } from '../components/layout/PageTransition';
import { useAuthStore } from '../store/auth';
import { useChatStore } from '../store/chat';
import { Skeleton } from '../components/ui/Skeleton';
import type { Conversation } from '../store/chat';
import { unwrapArray, unwrapEntity } from '../lib/unwrap';
import { normalizeConversation } from '../lib/conversationUtils';
import { useTranslation } from 'react-i18next';
import { formatRelativeDate } from '../lib/locale';

function isConversationId(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export default function Messagerie() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { setConversations } = useChatStore();

  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagerieApi.getConversations().then((r) => r.data),
  });

  /** Référence stable tant que `data` (React Query) ne change pas — évite setConversations en boucle. */
  const conversations: Conversation[] = useMemo(() => {
    const rawList = unwrapArray<Record<string, unknown>>(data);
    return rawList.map((row) => normalizeConversation(row));
  }, [data]);

  const { data: convByIdRaw } = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => messagerieApi.getById(id!).then((r) => unwrapEntity<Record<string, unknown>>(r.data) ?? (r.data as Record<string, unknown>)),
    enabled: Boolean(id && user && isConversationId(id)),
    retry: false,
  });

  const activeConv = useMemo(() => {
    if (!id) return undefined;
    const fromList = conversations.find((c) => c.id === id);
    if (fromList) return fromList;
    if (convByIdRaw && typeof convByIdRaw === 'object') {
      return normalizeConversation(convByIdRaw as Record<string, unknown>);
    }
    return undefined;
  }, [id, conversations, convByIdRaw]);

  useEffect(() => {
    if (conversations.length) setConversations(conversations);
  }, [conversations, setConversations]);

  return (
    <PageTransition>
      <div className="messagerie-page">
        {/* Conversations list */}
        <div style={{ borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{t('nav.messages')}</h2>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)' }}><Skeleton style={{ height: 50, borderRadius: 10 }} /></div>)
              : conversations.map((conv) => {
                  const other = user?.id === conv.offreur_id ? conv.chercheur : conv.offreur;
                  const isActive = conv.id === id;
                  return (
                    <button key={conv.id} onClick={() => navigate(`/messagerie/${conv.id}`)}
                      style={{ width: '100%', display: 'flex', gap: 12, padding: '12px 14px', border: 'none', borderBottom: '1px solid var(--border-subtle)', background: isActive ? 'var(--accent-amber-dim)' : 'transparent', borderLeft: isActive ? '2px solid var(--accent-amber)' : '2px solid transparent', cursor: 'none', textAlign: 'left', transition: 'all var(--transition-fast)' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-elevated)', border: '2px solid var(--border-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                        {other?.avatar_url ? <img src={other.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>{other?.prenom?.[0]}{other?.nom?.[0]}</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: (conv.unread_count ?? 0) > 0 ? 700 : 500, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{other?.prenom} {other?.nom}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.annonce?.titre ?? '—'}</div>
                        {conv.last_message_at && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{formatRelativeDate(new Date(conv.last_message_at), i18n.resolvedLanguage)}</div>}
                      </div>
                      {(conv.unread_count ?? 0) > 0 && <span style={{ background: 'var(--accent-amber)', color: '#0A0A0F', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 700, flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 }}>{conv.unread_count}</span>}
                    </button>
                  );
                })
            }
            {!isLoading && conversations.length === 0 && (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('chat.none')}</div>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div style={{ overflow: 'hidden' }}>
          {activeConv ? (
            <ChatWindow conversation={activeConv} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: 12 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ opacity: 0.4 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <p style={{ fontWeight: 500 }}>{t('chat.selectConversation')}</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
