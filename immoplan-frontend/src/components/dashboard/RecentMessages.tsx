import { Link } from 'react-router-dom';
import type { Conversation } from '../../store/chat';
import { useAuthStore } from '../../store/auth';
import { useTranslation } from 'react-i18next';
import { formatRelativeDate } from '../../lib/locale';

interface RecentMessagesProps {
  conversations: Conversation[];
}

export function RecentMessages({ conversations }: RecentMessagesProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();

  return (
    <section className="dashboard-panel dashboard-panel--messages">
      <div className="dashboard-panel__header">
        <h3 className="dashboard-panel__title">{t('messagesPanel.title')}</h3>
        <Link to="/messagerie" className="dashboard-panel__link">{t('messagesPanel.seeAll')}</Link>
      </div>
      {conversations.length === 0 ? (
        <p className="dashboard-messages__empty">{t('messagesPanel.none')}</p>
      ) : (
        <div className="dashboard-messages__list">
          {conversations.slice(0, 6).map((conv) => {
            const other = user?.id === conv.offreur_id ? conv.chercheur : conv.offreur;
            return (
              <Link
                key={conv.id}
                to={`/messagerie/${conv.id}`}
                className="dashboard-messages__item"
              >
                <div className="dashboard-messages__avatar">
                  {other?.avatar_url
                    ? <img src={other.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span className="dashboard-messages__avatar-fallback">{other?.prenom?.[0]}{other?.nom?.[0]}</span>
                  }
                </div>
                <div className="dashboard-messages__text">
                  <div className="dashboard-messages__name">
                    {other?.prenom} {other?.nom}
                  </div>
                  <div className="dashboard-messages__subject">
                    {conv.annonce?.titre ?? '—'}
                  </div>
                </div>
                {conv.last_message_at && (
                  <span className="dashboard-messages__time">
                    {formatRelativeDate(new Date(conv.last_message_at), i18n.resolvedLanguage)}
                  </span>
                )}
                {(conv.unread_count ?? 0) > 0 && (
                  <span className="dashboard-messages__unread">
                    {conv.unread_count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
