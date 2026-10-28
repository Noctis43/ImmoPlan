import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useMemo, useCallback, useState } from 'react';
import { annoncesApi, interactionsApi } from '../../lib/api';
import { AnnonceGrid } from '../../components/annonces/AnnonceGrid';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { PageTransition } from '../../components/layout/PageTransition';
import { Skeleton } from '../../components/ui/Skeleton';
import { Tabs } from '../../components/ui/Tabs';
import { useAuthStore } from '../../store/auth';
import { unwrapArray } from '../../lib/unwrap';
import type { Annonce } from '../../components/annonces/AnnonceCard';
import { useTranslation } from 'react-i18next';

/** Une page du feed (alignée sur le backend : `{ data, meta }` → annonces + meta curseur). */
type FeedPage = {
  annonces: unknown[];
  meta: { nextCursor?: string | null; hasMore?: boolean };
};

type ServiceTab = 'all' | 'vente' | 'location' | 'favoris';

function normalizeAnnonce(raw: unknown): Annonce {
  const a = raw as Record<string, unknown>;
  const nbVues = Number(a.nb_vues ?? a.nbVues ?? a.vues_count ?? 0);
  const nbLikes = Number(a.nb_likes ?? a.nbLikes ?? a.likes_count ?? 0);
  const isLiked = Boolean(a.isLiked ?? a.is_liked ?? false);
  const isSaved = Boolean(a.isSaved ?? a.is_saved ?? false);
  return {
    ...(a as unknown as Annonce),
    nb_vues: Number.isFinite(nbVues) ? nbVues : 0,
    nb_likes: Number.isFinite(nbLikes) ? nbLikes : 0,
    isLiked,
    isSaved,
  };
}

export default function Feed() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [serviceTab, setServiceTab] = useState<ServiceTab>('all');
  const SERVICE_TABS = [
    { id: 'all', label: t('feed.tabs.all') },
    { id: 'vente', label: t('feed.tabs.sale') },
    { id: 'location', label: t('feed.tabs.rent') },
    { id: 'favoris', label: t('feed.tabs.favorites') },
  ];

  const queryFn = useCallback(async (pageParam: string | undefined): Promise<FeedPage> => {
    const r = await annoncesApi.getFeed({
      cursor: pageParam,
      limit: 12,
      ...(serviceTab !== 'all' ? { service: serviceTab } : {}),
    });
    const body = r.data as { data?: unknown[]; meta?: FeedPage['meta']; annonces?: unknown[] } | undefined;
    const items = Array.isArray(body?.data)
      ? body.data
      : Array.isArray(body?.annonces)
        ? body.annonces
        : [];
    const meta = body?.meta ?? {};
    return {
      annonces: items,
      meta: {
        nextCursor: meta.nextCursor ?? null,
        hasMore: Boolean(meta.hasMore),
      },
    };
  }, [serviceTab]);

  const isFavoris = serviceTab === 'favoris';

  const { data: savedData, isLoading: favorisLoading } = useQuery({
    queryKey: ['interactions', 'sauvegardes'],
    queryFn: () => interactionsApi.getSauvegardes().then((r) => r.data),
    enabled: isFavoris && user?.profile_type === 'chercheur',
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['annonces', 'infinite-feed', serviceTab],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => queryFn(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: FeedPage) => {
      if (!lastPage?.meta?.hasMore || lastPage.meta.nextCursor == null) return undefined;
      return lastPage.meta.nextCursor;
    },
    enabled: !isFavoris,
  });

  const favorisAnnonces = useMemo(() => {
    const rows = unwrapArray<Record<string, unknown>>(savedData);
    const out: Annonce[] = [];
    for (const row of rows) {
      const a = row.annonces as Annonce | undefined;
      if (a && typeof a === 'object') out.push({ ...normalizeAnnonce(a), isSaved: true });
    }
    return out;
  }, [savedData]);

  const annonces = useMemo(
    () =>
      (data?.pages.flatMap((p) => (Array.isArray(p?.annonces) ? p.annonces : [])) ?? []).map((a) =>
        normalizeAnnonce(a)
      ),
    [data]
  );

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: fetchNextPage,
    hasNextPage: !!hasNextPage,
    isFetching: isFetchingNextPage,
  });

  return (
    <PageTransition>
      <div className="feed-page">
        <div className="page-header-feed">
          <h1 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 'clamp(1.35rem, 4.5vw, 1.8rem)', fontWeight: 700 }}>
            {t('feed.title')} <span style={{ color: 'var(--accent-amber)' }}>{t('feed.titleHighlight')}</span>
          </h1>
          <Tabs tabs={SERVICE_TABS} defaultTab="all" onChange={(id) => setServiceTab(id as ServiceTab)} />
        </div>

        <div className="feed-page__body">
          {isFavoris ? (
            user?.profile_type !== 'chercheur' ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>
                {t('feed.seekersOnlyFavorites')}
              </p>
            ) : (
              <AnnonceGrid annonces={favorisAnnonces} isLoading={favorisLoading} />
            )
          ) : (
            <>
              <AnnonceGrid annonces={annonces as Parameters<typeof AnnonceGrid>[0]['annonces']} isLoading={isLoading} />

              {isFetchingNextPage && (
                <div className="annonce-grid">
                  {[1, 2, 3].map((i) => <Skeleton key={i} style={{ height: 320, borderRadius: 16 }} />)}
                </div>
              )}

              <div ref={sentinelRef} aria-hidden="true" style={{ height: 4 }} />
            </>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
