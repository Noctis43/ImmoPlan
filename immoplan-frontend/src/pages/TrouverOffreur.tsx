import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { profilesApi } from '../lib/api';
import { PageTransition } from '../components/layout/PageTransition';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuthStore } from '../store/auth';

interface Offreur {
  id: string;
  nom: string;
  prenom: string;
  avatar_url: string | null;
  localisation_ville: string | null;
  profile_type: string;
  created_at: string;
}

export default function TrouverOffreur() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  const debounceTimer = useMemo(() => {
    return (val: string) => {
      const timer = setTimeout(() => setDebouncedSearch(val), 350);
      return () => clearTimeout(timer);
    };
  }, []);

  const handleSearch = (val: string) => {
    setSearch(val);
    debounceTimer(val);
  };

  const { data: offreursData, isLoading } = useQuery({
    queryKey: ['offreurs', debouncedSearch],
    queryFn: () => profilesApi.getOffreurs(debouncedSearch || undefined).then((r) => r.data),
  });

  const offreurs: Offreur[] = useMemo(() => {
    const raw = offreursData?.data || offreursData || [];
    return Array.isArray(raw) ? raw : [];
  }, [offreursData]);

  // Filter out self on the frontend as well (in case backend doesn't exclude)
  const filtered = useMemo(() => {
    if (!user || user.profile_type !== 'offreur') return offreurs;
    return offreurs.filter((o) => o.id !== user.id);
  }, [offreurs, user]);

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header */}
        <div>
          <h1 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: '1.6rem', fontWeight: 700, marginBottom: 6 }}>
            Trouver un <span style={{ color: 'var(--accent-amber)' }}>Offreur</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Explorez les profils des offreurs sur ImmoPlan et visitez leur page pour en savoir plus.
          </p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            id="search-offreur"
            type="text"
            placeholder="Rechercher par nom ou prénom..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              width: '100%',
              height: 48,
              paddingLeft: 44,
              paddingRight: 16,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--text-primary)',
              fontSize: '0.925rem',
              outline: 'none',
              transition: 'border-color var(--transition-fast)',
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-amber)'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
          />
        </div>

        {/* Results */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} style={{ height: 80, borderRadius: 'var(--radius-lg)' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 12, opacity: 0.5 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p style={{ fontSize: '0.95rem', fontWeight: 500 }}>Aucun offreur trouvé</p>
            {search && <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Essayez un autre terme de recherche.</p>}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map((offreur, index) => (
                <motion.div
                  key={offreur.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 28, delay: index * 0.04 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '16px 20px',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-subtle)',
                    transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-amber)';
                    e.currentTarget.style.boxShadow = '0 0 0 1px rgba(245,166,35,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: 'var(--accent-amber-dim)',
                    border: '2px solid var(--accent-amber)',
                    overflow: 'hidden', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {offreur.avatar_url ? (
                      <img src={offreur.avatar_url} alt={`${offreur.prenom} ${offreur.nom}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ color: 'var(--accent-amber)', fontWeight: 700, fontSize: '1rem' }}>
                        {offreur.prenom?.[0]}{offreur.nom?.[0]}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {offreur.prenom} {offreur.nom}
                    </div>
                    {offreur.localisation_ville && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                        </svg>
                        {offreur.localisation_ville}
                      </div>
                    )}
                  </div>

                  {/* Visit button */}
                  <button
                    id={`visit-offreur-${offreur.id}`}
                    onClick={() => navigate(`/profil/${offreur.id}`)}
                    style={{
                      padding: '8px 18px',
                      background: 'transparent',
                      border: '1.5px solid var(--accent-amber)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--accent-amber)',
                      fontWeight: 600,
                      fontSize: '0.825rem',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--accent-amber)';
                      e.currentTarget.style.color = '#0A0A0F';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--accent-amber)';
                    }}
                  >
                    Visiter
                  </button>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}

        {/* Count */}
        {!isLoading && filtered.length > 0 && (
          <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {filtered.length} offreur{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
          </p>
        )}
      </div>
    </PageTransition>
  );
}
