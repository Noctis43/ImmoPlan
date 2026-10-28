import { useQuery } from '@tanstack/react-query';
import { annoncesApi, statistiquesApi, messagerieApi, dashboardApi } from '../lib/api';
import { StatCard } from '../components/dashboard/StatCard';
import { PerformanceChart } from '../components/dashboard/PerformanceChart';
import { VisitAgenda } from '../components/dashboard/VisitAgenda';
import { RecentMessages } from '../components/dashboard/RecentMessages';
import { AnnonceGrid } from '../components/annonces/AnnonceGrid';
import { PageTransition } from '../components/layout/PageTransition';
import { useAuthStore } from '../store/auth';
import type { Annonce } from '../components/annonces/AnnonceCard';
import type { Conversation } from '../store/chat';
import type { VisiteAgendaItem } from '../components/dashboard/VisitAgenda';
import { Tabs } from '../components/ui/Tabs';
import { Link } from 'react-router-dom';
import { unwrapArray, unwrapEntity } from '../lib/unwrap';
import { normalizeConversation } from '../lib/conversationUtils';
import { useTranslation } from 'react-i18next';
import { visitesApi } from '../lib/api';

function normalizeHeureAgenda(h: unknown): string {
  if (h == null) return '09:00:00';
  const s = String(h);
  if (/^\d{1,2}:\d{2}/.test(s) && !s.includes('T')) {
    const m = s.match(/^(\d{1,2}):(\d{2})/);
    if (m) return `${m[1].padStart(2, '0')}:${m[2]}:00`;
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
  }
  return '09:00:00';
}

function mapAgendaVisite(raw: Record<string, unknown>): VisiteAgendaItem {
  const heureStr = normalizeHeureAgenda(raw.heure_confirmee ?? raw.heure_debut);
  const dateS = raw.date_souhaitee;
  const dateSouhaitee =
    typeof dateS === 'string'
      ? dateS
      : dateS instanceof Date
        ? dateS.toISOString().slice(0, 10)
        : String(dateS);

  return {
    id: String(raw.id),
    annonce_id: String(raw.annonce_id),
    date_souhaitee: dateSouhaitee,
    date_confirmee: raw.date_confirmee ? String(raw.date_confirmee).slice(0, 10) : undefined,
    heure_debut: heureStr,
    heure_confirmee: raw.heure_confirmee ? normalizeHeureAgenda(raw.heure_confirmee) : undefined,
    duree_minutes: Number(raw.duree_minutes ?? 30),
    statut: raw.statut as VisiteAgendaItem['statut'],
    annonces: raw.annonces as VisiteAgendaItem['annonces'],
    profiles_visites_chercheur_idToprofiles: raw.profiles_visites_chercheur_idToprofiles as VisiteAgendaItem['profiles_visites_chercheur_idToprofiles'],
  };
}

function toSafeNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function normalizeAnnonceMetrics(a: Annonce): Annonce {
  const raw = a as Annonce & {
    nbVues?: number;
    nbLikes?: number;
    vues_count?: number;
    likes_count?: number;
  };
  return {
    ...a,
    nb_vues: toSafeNumber(raw.nb_vues ?? raw.nbVues ?? raw.vues_count),
    nb_likes: toSafeNumber(raw.nb_likes ?? raw.nbLikes ?? raw.likes_count),
  };
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isOffreur = user?.profile_type === 'offreur';
  const DASH_TABS = [
    { id: 'overview', label: t('dashboard.tabs.overview') },
    { id: 'annonces', label: t('dashboard.tabs.myAds') },
    { id: 'agenda', label: t('dashboard.tabs.agenda') },
  ];

  const { data: statsData } = useQuery({
    queryKey: ['statistiques/dashboard'],
    queryFn: () => statistiquesApi.getDashboard().then((r) => r.data),
    enabled: isOffreur,
  });

  const { data: perfStatsData } = useQuery({
    queryKey: ['statistiques/performances'],
    queryFn: () => statistiquesApi.getPerformances({ limit: 10 }).then((r) => r.data),
    enabled: isOffreur,
  });

  const { data: dashStatsData } = useQuery({
    queryKey: ['dashboard/stats'],
    queryFn: () => dashboardApi.getStats().then((r) => r.data),
    enabled: isOffreur,
  });

  useQuery({
    queryKey: ['dashboard/performances'],
    queryFn: () => dashboardApi.getPerformances().then((r) => r.data),
    enabled: isOffreur,
  });

  const { data: agendaData } = useQuery({
    queryKey: ['dashboard/agenda'],
    queryFn: () => dashboardApi.getAgenda().then((r) => r.data),
    enabled: isOffreur,
  });

  const { data: allVisitesData } = useQuery({
    queryKey: ['visites', 'dashboard-total'],
    queryFn: () => visitesApi.getMes().then((r) => r.data),
    enabled: isOffreur,
  });

  useQuery({
    queryKey: ['dashboard/messages-recents'],
    queryFn: () => dashboardApi.getMessagesRecents().then((r) => r.data),
    enabled: isOffreur,
  });

  const { data: annoncesData, isLoading: annoncesLoading } = useQuery({
    queryKey: ['annonces/me'],
    queryFn: () => annoncesApi.getMes({ limit: 20 }).then((r) => r.data),
    enabled: isOffreur,
  });

  const { data: convData } = useQuery({
    queryKey: ['conversations', 'dashboard-preview'],
    queryFn: () => messagerieApi.getConversations({ limit: 6 }).then((r) => r.data),
    enabled: isOffreur,
  });

  const stats = unwrapEntity<Record<string, unknown>>(statsData, ['stats']) ?? statsData?.stats ?? statsData ?? {};
  const dashStats = unwrapEntity<Record<string, unknown>>(dashStatsData) ?? {};
  const mesAnnonces = unwrapArray<Annonce>(annoncesData).map(normalizeAnnonceMetrics);
  const conversations: Conversation[] = unwrapArray<Record<string, unknown>>(convData).map((row) =>
    normalizeConversation(row)
  );

  const agendaRows = unwrapArray<Record<string, unknown>>(agendaData);
  const visites = agendaRows.map(mapAgendaVisite);
  const allVisitesRows = unwrapArray<Record<string, unknown>>(allVisitesData);
  const totalVisites = allVisitesRows.filter((v) => String(v.offreur_id ?? '') === String(user?.id ?? '')).length;
  const visitesByAnnonceId = visites.reduce<Record<string, number>>((acc, v) => {
    const key = String(v.annonce_id);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const perfRows = unwrapArray<{ titre: string; nb_vues: number; nb_likes: number }>(perfStatsData);
  const perf =
    perfRows.length > 0
      ? perfRows.map((a) => {
          const annonceId = String((a as unknown as { id?: string | number }).id ?? '');
          return {
            titre: a.titre,
            nb_vues: a.nb_vues,
            nb_likes: a.nb_likes,
            visites: annonceId ? (visitesByAnnonceId[annonceId] ?? 0) : 0,
          };
        })
      : mesAnnonces.map((a) => ({
          titre: a.titre,
          nb_vues: a.nb_vues,
          nb_likes: a.nb_likes,
          visites: visitesByAnnonceId[String(a.id)] ?? 0,
        }));

  const totalVues = toSafeNumber(stats.total_vues ?? dashStats.total_vues) || mesAnnonces.reduce((s: number, a: { nb_vues: number }) => s + toSafeNumber(a.nb_vues), 0);
  const totalLikes = toSafeNumber(stats.total_likes ?? dashStats.total_likes) || mesAnnonces.reduce((s: number, a: { nb_likes: number }) => s + toSafeNumber(a.nb_likes), 0);

  if (user?.profile_type !== 'offreur') {
    return (
      <PageTransition>
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <h1 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: '1.5rem', fontWeight: 700 }}>{t('dashboard.onlyHostTitle')}</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 10 }}>{t('dashboard.onlyHostText')}</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="dashboard-page">
        <div className="dashboard-hero">
          <div className="dashboard-hero__text">
            <h1 className="page-title-fluid dashboard-hero__title">
              {t('dashboard.hello', { name: user?.prenom ?? '' })}
            </h1>
            <p className="dashboard-hero__subtitle">{t('dashboard.subtitle')}</p>
          </div>
          <Link to="/annonces/publier" className="dashboard-hero__cta">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {t('dashboard.newAd')}
          </Link>
        </div>

        {/* Stats cards */}
        <div className="stat-cards-grid">
          <StatCard label={t('dashboard.stats.activeAds')} value={stats.annonces_publiees ?? mesAnnonces.filter((a: { statut: string }) => a.statut === 'publiee').length} color="var(--accent-amber)"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>} />
          <StatCard label={t('dashboard.stats.totalViews')} value={totalVues} color="#4D9FFF" delta={stats.vues_delta}
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>} />
          <StatCard label={t('dashboard.stats.likes')} value={totalLikes} color="#FF4D4D"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>} />
          <StatCard label={t('dashboard.stats.visits')} value={totalVisites} color="var(--accent-teal)"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>} />
        </div>

        <Tabs tabs={DASH_TABS} defaultTab="overview">
          {(activeTab) => (
            <>
              {activeTab === 'overview' && (
                <div className="dashboard-overview-grid">
                  <div className="dashboard-overview-left-col">
                    {perf.length > 0 && <PerformanceChart data={perf} />}
                    <RecentMessages conversations={conversations} />
                  </div>
                  <VisitAgenda visites={visites} />
                </div>
              )}
              {activeTab === 'annonces' && (
                <AnnonceGrid annonces={mesAnnonces} isLoading={annoncesLoading} showStatus />
              )}
              {activeTab === 'agenda' && (
                <VisitAgenda visites={visites} />
              )}
            </>
          )}
        </Tabs>
      </div>
    </PageTransition>
  );
}
