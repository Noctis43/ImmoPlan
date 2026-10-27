import { Badge } from '../ui/Badge';
import type { Profile } from '../../store/auth';

interface ProfileHeaderProps {
  profile: Profile;
  noteMoyenne?: number;
  nbAvis?: number;
  showContact?: boolean;
  onContact?: () => void;
  email?: string;
  telephone?: string;
}

export function ProfileHeader({ profile, noteMoyenne, nbAvis, showContact, onContact, email, telephone }: ProfileHeaderProps) {
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', padding: '28px', border: '1px solid var(--border-subtle)', display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'var(--accent-amber-dim)', border: '3px solid var(--accent-amber)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'var(--shadow-amber)' }}>
        {profile.avatar_url
          ? <img src={profile.avatar_url} alt={`${profile.prenom} ${profile.nom}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-amber)' }}>{profile.prenom?.[0]}{profile.nom?.[0]}</span>
        }
      </div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{profile.prenom} {profile.nom}</h2>
          <Badge variant={profile.profile_type === 'offreur' ? 'amber' : 'teal'} dot>
            {profile.profile_type}
          </Badge>
          {profile.is_verified && (
            <span title="Vérifié" style={{ color: 'var(--accent-teal)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
            </span>
          )}
        </div>
        {profile.localisation_ville && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {profile.localisation_ville}
            {profile.localisation_quartier && `, ${profile.localisation_quartier}`}
          </p>
        )}

        {/* Contact info (email + telephone) */}
        {(email || telephone) && (
          <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
            {email && (
              <a href={`mailto:${email}`} style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none', transition: 'color 0.2s' }}
                 onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-amber)'}
                 onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                {email}
              </a>
            )}
            {telephone && (
              <a href={`tel:${telephone}`} style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none', transition: 'color 0.2s' }}
                 onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-amber)'}
                 onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                {telephone}
              </a>
            )}
          </div>
        )}

        {(noteMoyenne != null || nbAvis != null) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            {noteMoyenne != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < Math.round(noteMoyenne) ? '#F5A623' : 'none'} stroke="#F5A623" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                ))}
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-amber)' }}>{Number(noteMoyenne).toFixed(1)}</span>
              </div>
            )}
            {nbAvis != null && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>({nbAvis} avis)</span>}
          </div>
        )}
        {showContact && onContact && (
          <button
            onClick={onContact}
            style={{ marginTop: 14, padding: '9px 20px', background: 'var(--accent-amber)', color: '#0A0A0F', borderRadius: 'var(--radius-md)', border: 'none', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}
          >
            Contacter
          </button>
        )}
      </div>
    </div>
  );
}
