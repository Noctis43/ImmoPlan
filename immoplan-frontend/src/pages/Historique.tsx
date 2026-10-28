import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { interactionsApi } from '../lib/api';
import { PageTransition } from '../components/layout/PageTransition';
import { AnnonceGrid } from '../components/annonces/AnnonceGrid';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { unwrapArray } from '../lib/unwrap';
import type { Annonce } from '../components/annonces/AnnonceCard';
import { useAuthStore } from '../store/auth';
import { useTranslation } from 'react-i18next';

export default function Historique() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['interactions', 'historique'],
    queryFn: () => interactionsApi.getHistorique().then((r) => r.data),
    enabled: user?.profile_type === 'chercheur',
    // Rafraîchit automatiquement en arrière-plan pour refléter les nouvelles consultations.
    // Intervalle raisonnable pour ne pas surcharger le backend.
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
    staleTime: 10000,
  });

  const clearMutation = useMutation({
    mutationFn: () => interactionsApi.clearHistorique(),
    onSuccess: () => {
      toast(t('history.cleared'), 'success');
      qc.invalidateQueries({ queryKey: ['interactions', 'historique'] });
    },
    onError: () => toast(t('history.clearFailed'), 'error'),
  });

  if (user?.profile_type !== 'chercheur') {
    return (
      <PageTransition>
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <h1 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: '1.45rem', fontWeight: 700 }}>
            {t('history.reservedTitle')}
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
            {t('history.reservedText')}
          </p>
        </div>
      </PageTransition>
    );
  }

  const annonces = unwrapArray<Annonce>(data);

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title-fluid" style={{ fontFamily: "'Clash Display',sans-serif", fontWeight: 700 }}>
              {t('history.title')}
            </h1>
            <p style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {t('history.subtitle')}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => clearMutation.mutate()}
            isLoading={clearMutation.isPending}
            disabled={annonces.length === 0}
          >
            {t('history.clearButton')}
          </Button>
        </div>

        <AnnonceGrid annonces={annonces} isLoading={isLoading} />
      </div>
    </PageTransition>
  );
}

