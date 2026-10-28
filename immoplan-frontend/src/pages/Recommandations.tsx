import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { recommandationApi } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { AnnonceGrid } from '../components/annonces/AnnonceGrid';
import { PageTransition } from '../components/layout/PageTransition';
import { Tabs } from '../components/ui/Tabs';
import { unwrapArray } from '../lib/unwrap';

const TABS = [
  { id: 'personalisees', label: 'Pour vous' },
  { id: 'similaires', label: 'Similaires' },
  { id: 'tendances', label: 'Tendances' },
];

export default function Recommandations() {
  const { user } = useAuthStore();
  const isChercheur = user?.profile_type === 'chercheur';

  const { data: persoData, isLoading: persoLoading } = useQuery({
    queryKey: ['recommandations/personalise'],
    queryFn: () => recommandationApi.getFeedPersonalise({ limit: 12 }).then((r) => r.data),
    enabled: isChercheur,
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
    staleTime: 10000,
  });

  const { data: similData, isLoading: similLoading } = useQuery({
    queryKey: ['recommandations/similaires'],
    queryFn: () => recommandationApi.getSimilaires({ limit: 12 }).then((r) => r.data),
    enabled: isChercheur,
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
    staleTime: 10000,
  });

  const { data: tendData, isLoading: tendLoading } = useQuery({
    queryKey: ['recommandations/tendances'],
    queryFn: () => recommandationApi.getTendances().then((r) => r.data),
    refetchInterval: 20000,
    refetchIntervalInBackground: true,
    staleTime: 12000,
  });

  const persoMeta =
    persoData && typeof persoData === 'object' && 'meta' in persoData
      ? (persoData as { meta?: { incompletePreferences?: boolean } }).meta
      : undefined;
  const perso = unwrapArray(persoData);
  const tendances = unwrapArray(tendData);
  const similaires = unwrapArray(similData);

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <h1 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: '1.8rem', fontWeight: 700 }}>
          Recommandations <span style={{ color: 'var(--accent-amber)' }}>personnalisées</span>
        </h1>

        <Tabs tabs={TABS} defaultTab="personalisees">
          {(activeTab) => (
            <>
              {activeTab === 'personalisees' && (
                isChercheur ? (
                  perso.length === 0 && !persoLoading ? (
                    <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                      <p style={{ fontWeight: 500, marginBottom: 12 }}>
                        {persoMeta?.incompletePreferences
                          ? 'Complétez vos préférences de recommandation'
                          : 'Aucune annonce ne correspond à vos préférences'}
                      </p>
                      <p style={{ fontSize: '0.875rem', marginBottom: 16 }}>
                        {persoMeta?.incompletePreferences
                          ? 'Renseignez la ville (sélection dans la liste), le service (vente ou location) et une fourchette de prix, puis enregistrez.'
                          : 'Seules les annonces publiées, jamais consultées, et correspondant exactement à vos critères sont affichées ici.'}
                      </p>
                      <Link 
                        to="/settings" 
                        style={{ 
                          display: 'inline-block', 
                          padding: '10px 20px', 
                          background: 'var(--accent-amber)', 
                          color: '#0A0A0F', 
                          borderRadius: 'var(--radius-md)', 
                          fontWeight: 600, 
                          fontSize: '0.875rem',
                          textDecoration: 'none'
                        }}
                      >
                        Modifier mes préférences
                      </Link>
                    </div>
                  ) : (
                    <AnnonceGrid annonces={perso as Parameters<typeof AnnonceGrid>[0]['annonces']} isLoading={persoLoading} />
                  )
                ) : (
                  <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                    <p style={{ fontWeight: 500 }}>Réservé aux comptes chercheur</p>
                    <p style={{ fontSize: '0.875rem', marginTop: 8 }}>Le feed personnalisé analyse vos préférences en tant qu&apos;acheteur / locataire.</p>
                  </div>
                )
              )}
              {activeTab === 'tendances' && <AnnonceGrid annonces={tendances as Parameters<typeof AnnonceGrid>[0]['annonces']} isLoading={tendLoading} />}
              {activeTab === 'similaires' && (
                isChercheur ? (
                  similaires.length === 0 && !similLoading ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                      <p style={{ fontWeight: 500, marginBottom: 8 }}>Aucun bien similaire récent</p>
                      <p style={{ fontSize: '0.875rem' }}>Visitez d'abord le détail de quelques annonces pour que nous puissions analyser et afficher les biens similaires.</p>
                    </div>
                  ) : (
                    <AnnonceGrid annonces={similaires as Parameters<typeof AnnonceGrid>[0]['annonces']} isLoading={similLoading} />
                  )
                ) : (
                  <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                    <p style={{ fontWeight: 500 }}>Réservé aux comptes chercheur</p>
                  </div>
                )
              )}
            </>
          )}
        </Tabs>
      </div>
    </PageTransition>
  );
}
