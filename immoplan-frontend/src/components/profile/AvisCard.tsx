import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface Avis {
  id: string;
  note: number;
  commentaire?: string;
  created_at: string;
  profiles_avis_chercheur_idToprofiles?: { id: string; nom: string; prenom: string; avatar_url?: string };
  annonces?: { id: string; titre: string };
}

interface AvisCardProps {
  avis: Avis;
}

export function AvisCard({ avis }: AvisCardProps) {
  const auteur = avis.profiles_avis_chercheur_idToprofiles;
  return (
    <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', padding: '18px', border: '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
        <Link to={auteur ? `/profil/${auteur.id}` : '#'} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-amber-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', textDecoration: 'none' }}>
          {auteur?.avatar_url
            ? <img src={auteur.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-amber)' }}>{auteur?.prenom?.[0]}{auteur?.nom?.[0]}</span>
          }
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{auteur?.prenom} {auteur?.nom}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <div style={{ display: 'flex', gap: 2 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill={i < avis.note ? '#F5A623' : 'none'} stroke="#F5A623" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              ))}
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {formatDistanceToNow(new Date(avis.created_at), { addSuffix: true, locale: fr })}
            </span>
          </div>
        </div>
      </div>
      {avis.commentaire && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{avis.commentaire}</p>}
      {avis.annonces && (
        <Link to={`/annonces/${avis.annonces.id}`} style={{ fontSize: '0.75rem', color: 'var(--accent-amber)', marginTop: 8, display: 'block' }}>
          Re: {avis.annonces.titre}
        </Link>
      )}
    </div>
  );
}
