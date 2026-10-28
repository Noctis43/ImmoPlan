import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { visitesApi } from '../lib/api';
import type { VisiteAgendaItem } from '../components/dashboard/VisitAgenda';
import { PageTransition } from '../components/layout/PageTransition';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { Tabs } from '../components/ui/Tabs';
import { unwrapArray } from '../lib/unwrap';
import { toHHMM } from '../lib/format';
import { useAuthStore } from '../store/auth';
import { useTranslation } from 'react-i18next';
import { formatDateByOptions } from '../lib/locale';

function statutLabel(statut: string, t: (k: string) => string): string {
  switch (statut) {
    case 'en_attente':
      return t('visits.status.pending');
    case 'contre_proposee':
      return t('visits.status.counter');
    case 'confirmee':
      return t('visits.status.confirmed');
    case 'effectuee':
      return t('visits.status.done');
    case 'annulee':
      return t('visits.status.cancelled');
    default:
      return statut.replace(/_/g, ' ');
  }
}

function ymd(v: unknown): string {
  if (v == null || v === '') return '—';
  if (typeof v === 'string') return v.length >= 10 ? v.slice(0, 10) : v;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

export default function Visites() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const TABS = [
    { id: 'all', label: t('visits.tabs.all') },
    { id: 'en_attente', label: t('visits.tabs.pending') },
    { id: 'contre_proposee', label: t('visits.tabs.counter') },
    { id: 'confirmee', label: t('visits.tabs.confirmed') },
    { id: 'effectuee', label: t('visits.tabs.done') },
  ];

  const qc = useQueryClient();
  const { user } = useAuthStore();

  const [modalVisite, setModalVisite] = useState<VisiteAgendaItem | null>(null);
  const [cpDate, setCpDate] = useState('');
  const [cpHeure, setCpHeure] = useState('09:00');

  const { data, isLoading } = useQuery({
    queryKey: ['visites'],
    queryFn: () => visitesApi.getAll().then((r) => r.data),
  });

  const confirmerMutation = useMutation({
    mutationFn: (
      payload:
        | { id: string; mode: 'accepter_demande' }
        | { id: string; mode: 'contre_proposer'; date_confirmee: string; heure_confirmee: string }
    ) => {
      const { id, ...body } = payload;
      return visitesApi.confirm(id, body);
    },
    onSuccess: (_, v) => {
      toast(v.mode === 'contre_proposer' ? t('visits.toasts.counterSent') : t('visits.toasts.confirmed'), 'success');
      qc.invalidateQueries({ queryKey: ['visites'] });
      qc.invalidateQueries({ queryKey: ['dashboard/agenda'] });
    },
    onError: () => toast(t('visits.toasts.replyError'), 'error'),
  });

  const accepterContreMutation = useMutation({
    mutationFn: (id: string) => visitesApi.accepterContreProposition(id),
    onSuccess: () => {
      toast(t('visits.toasts.slotAccepted'), 'success');
      qc.invalidateQueries({ queryKey: ['visites'] });
      qc.invalidateQueries({ queryKey: ['dashboard/agenda'] });
    },
    onError: () => toast(t('visits.toasts.acceptError'), 'error'),
  });

  const annulerMutation = useMutation({
    mutationFn: ({ id, motif }: { id: string; motif?: string }) => visitesApi.cancel(id, motif),
    onSuccess: () => { toast(t('visits.toasts.cancelled'), 'info'); qc.invalidateQueries({ queryKey: ['visites'] }); qc.invalidateQueries({ queryKey: ['dashboard/agenda'] }); },
    onError: () => toast(t('visits.toasts.error'), 'error'),
  });

  const effectuerMutation = useMutation({
    mutationFn: (id: string) => visitesApi.effectuer(id),
    onSuccess: () => { toast(t('visits.toasts.markedDone'), 'success'); qc.invalidateQueries({ queryKey: ['visites'] }); qc.invalidateQueries({ queryKey: ['dashboard/agenda'] }); },
    onError: () => toast(t('visits.toasts.closeError'), 'error'),
  });

  const visites: VisiteAgendaItem[] = unwrapArray<VisiteAgendaItem>(data);

  const openContreModal = (v: VisiteAgendaItem) => {
    const ymd = typeof v.date_souhaitee === 'string' ? v.date_souhaitee.slice(0, 10) : String(v.date_souhaitee).slice(0, 10);
    setCpDate(ymd);
    setCpHeure(toHHMM(String(v.heure_debut ?? '')) || '09:00');
    setModalVisite(v);
  };

  const submitContreProposition = () => {
    if (!modalVisite || !cpDate.trim()) {
      toast(t('visits.toasts.enterDate'), 'warning');
      return;
    }
    const hh = toHHMM(cpHeure);
    if (!/^\d{2}:\d{2}$/.test(hh)) {
      toast(t('visits.toasts.invalidHour'), 'warning');
      return;
    }
    confirmerMutation.mutate(
      {
        id: modalVisite.id,
        mode: 'contre_proposer',
        date_confirmee: cpDate,
        heure_confirmee: hh,
      },
      { onSuccess: () => setModalVisite(null) }
    );
  };

  const offreurId = (v: VisiteAgendaItem) => (v as VisiteAgendaItem & { offreur_id?: string }).offreur_id;
  const chercheurId = (v: VisiteAgendaItem) => (v as VisiteAgendaItem & { chercheur_id?: string }).chercheur_id;

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <h1 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: '1.8rem', fontWeight: 700 }}>
          {t('visits.title')} <span style={{ color: 'var(--accent-amber)' }}>{t('visits.titleHighlight')}</span>
        </h1>

        <Tabs tabs={TABS} defaultTab="all">
          {(activeTab) => {
            const filtered = activeTab === 'all' ? visites : visites.filter((v) => v.statut === activeTab);
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {isLoading ? (
                  <div style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>{t('visits.loading')}</div>
                ) : filtered.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                    <p style={{ fontWeight: 500 }}>{t('visits.noneInCategory')}</p>
                  </div>
                ) : filtered.map((v) => (
                  <div key={v.id} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '20px', border: '1px solid var(--border-subtle)', display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, marginBottom: 6 }}>{v.annonces?.titre ?? t('visits.noTitle')}</p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Badge variant={
                          v.statut === 'confirmee' ? 'teal' : v.statut === 'annulee' ? 'red' : v.statut === 'effectuee' ? 'muted' : v.statut === 'contre_proposee' ? 'blue' : 'amber'
                        }>
                          {statutLabel(v.statut, t)}
                        </Badge>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {v.statut === 'en_attente' ? (
                            <>{t('visits.requested')}: {formatDateByOptions(new Date(ymd(v.date_souhaitee)), { dateStyle: 'medium' }, i18n.resolvedLanguage)} {t('visits.at')} {toHHMM(String(v.heure_debut ?? ''))} · {v.duree_minutes} min</>
                          ) : v.statut === 'contre_proposee' ? (
                            <>{t('visits.proposedByHost')}: {formatDateByOptions(new Date(ymd(v.date_confirmee)), { dateStyle: 'medium' }, i18n.resolvedLanguage)} {t('visits.at')} {toHHMM(String(v.heure_confirmee ?? ''))} · {v.duree_minutes} min</>
                          ) : (
                            <>{formatDateByOptions(new Date(ymd(v.date_confirmee ?? v.date_souhaitee)), { dateStyle: 'medium' }, i18n.resolvedLanguage)} {t('visits.at')} {toHHMM(String(v.heure_confirmee ?? v.heure_debut ?? ''))} · {v.duree_minutes} min</>
                          )}
                        </span>
                      </div>
                      {v.statut === 'contre_proposee' && (
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 8 }}>
                          {t('visits.initialRequest')}: {formatDateByOptions(new Date(ymd(v.date_souhaitee)), { dateStyle: 'medium' }, i18n.resolvedLanguage)} {t('visits.at')} {toHHMM(String(v.heure_debut ?? ''))}
                        </p>
                      )}
                    </div>
                    {v.statut === 'en_attente' && user?.id === offreurId(v) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <Button size="sm" type="button" variant="teal" onClick={() => confirmerMutation.mutate({ id: v.id, mode: 'accepter_demande' })} isLoading={confirmerMutation.isPending}>
                          {t('visits.actions.acceptRequested')}
                        </Button>
                        <Button size="sm" type="button" variant="secondary" onClick={() => openContreModal(v)} isLoading={confirmerMutation.isPending}>
                          {t('visits.actions.proposeOther')}
                        </Button>
                        <Button size="sm" type="button" variant="danger" onClick={() => annulerMutation.mutate({ id: v.id })} isLoading={annulerMutation.isPending}>
                          {t('visits.actions.reject')}
                        </Button>
                      </div>
                    )}
                    {v.statut === 'contre_proposee' && user?.id === chercheurId(v) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <Button size="sm" type="button" variant="teal" onClick={() => accepterContreMutation.mutate(v.id)} isLoading={accepterContreMutation.isPending}>
                          {t('visits.actions.acceptSlot')}
                        </Button>
                        <Button size="sm" type="button" variant="danger" onClick={() => annulerMutation.mutate({ id: v.id })} isLoading={annulerMutation.isPending}>
                          {t('visits.actions.reject')}
                        </Button>
                      </div>
                    )}
                    {user?.id === offreurId(v) && v.peutChangerStatut && (
                      <Button size="sm" type="button" variant="secondary" onClick={() => effectuerMutation.mutate(v.id)} isLoading={effectuerMutation.isPending}>
                        {t('visits.actions.markDone')}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            );
          }}
        </Tabs>
      </div>

      <Modal isOpen={!!modalVisite} onClose={() => setModalVisite(null)} title={t('visits.modal.title')} size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            {t('visits.modal.desc')}
          </p>
          <Input label={t('visits.modal.date')} type="date" value={cpDate} onChange={(e) => setCpDate(e.target.value)} />
          <Input label={t('visits.modal.time')} type="time" value={cpHeure} onChange={(e) => setCpHeure(e.target.value)} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={() => setModalVisite(null)}>{t('visits.modal.cancel')}</Button>
            <Button type="button" onClick={submitContreProposition} isLoading={confirmerMutation.isPending}>{t('visits.modal.send')}</Button>
          </div>
        </div>
      </Modal>
    </PageTransition>
  );
}
