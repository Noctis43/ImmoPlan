import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Annonce, AnnonceCard } from './AnnonceCard';
import { SkeletonCard } from '../ui/Skeleton';
import { interactionsApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth';

interface AnnonceGridProps {
  annonces: Annonce[];
  isLoading?: boolean;
  showStatus?: boolean;
}

export function AnnonceGrid({ annonces, isLoading = false, showStatus = false }: AnnonceGridProps) {
  const { isAuthenticated, user } = useAuthStore();
  const { data: likedIdsData } = useQuery({
    queryKey: ['interactions', 'likes'],
    queryFn: () => interactionsApi.getMyLikes().then((r) => r.data),
    enabled: isAuthenticated && !!user,
    staleTime: 15000,
  });
  const { data: savedRowsData } = useQuery({
    queryKey: ['interactions', 'sauvegardes'],
    queryFn: () => interactionsApi.getSauvegardes().then((r) => r.data),
    enabled: isAuthenticated && user?.profile_type === 'chercheur',
    staleTime: 15000,
  });

  const likedIdsSet = useMemo(() => {
    const rows = Array.isArray(likedIdsData?.data)
      ? likedIdsData.data
      : Array.isArray(likedIdsData)
        ? likedIdsData
        : [];
    return new Set(rows.map((id: unknown) => String(id)));
  }, [likedIdsData]);

  const savedIdsSet = useMemo(() => {
    const rows = Array.isArray(savedRowsData?.data)
      ? savedRowsData.data
      : Array.isArray(savedRowsData)
        ? savedRowsData
        : [];

    const ids = rows
      .map((row: unknown) => {
        if (!row || typeof row !== 'object') return null;
        const obj = row as Record<string, unknown>;
        return obj.annonce_id ?? obj.annonceId ?? (obj.annonces as Record<string, unknown> | undefined)?.id ?? null;
      })
      .filter(Boolean)
      .map((id: unknown) => String(id));

    return new Set(ids);
  }, [savedRowsData]);

  const annoncesWithInteractions = useMemo(
    () =>
      annonces.map((a) => ({
        ...a,
        isLiked:
          Boolean((a as Annonce & { is_liked?: boolean; liked?: boolean }).isLiked) ||
          Boolean((a as Annonce & { is_liked?: boolean; liked?: boolean }).is_liked) ||
          Boolean((a as Annonce & { is_liked?: boolean; liked?: boolean }).liked) ||
          likedIdsSet.has(String(a.id)),
        isSaved:
          Boolean((a as Annonce & { is_saved?: boolean; saved?: boolean }).isSaved) ||
          Boolean((a as Annonce & { is_saved?: boolean; saved?: boolean }).is_saved) ||
          Boolean((a as Annonce & { is_saved?: boolean; saved?: boolean }).saved) ||
          savedIdsSet.has(String(a.id)),
      })),
    [annonces, likedIdsSet, savedIdsSet]
  );

  if (isLoading) {
    return (
      <div className="annonce-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (!annonces.length) {
    return (
      <div style={{ textAlign: 'center', padding: 'clamp(40px, 12vw, 80px) 20px', color: 'var(--text-muted)' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ margin: '0 auto 16px', opacity: 0.4 }}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <p style={{ fontSize: '1rem', fontWeight: 500 }}>Aucune annonce trouvée</p>
        <p style={{ fontSize: '0.85rem', marginTop: 6 }}>Essayez de modifier vos filtres</p>
      </div>
    );
  }

  return (
    <div className="annonce-grid">
      {annoncesWithInteractions.map((a) => (
        <AnnonceCard key={a.id} annonce={a} showStatus={showStatus} />
      ))}
    </div>
  );
}
