import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { rechercheApi } from '../lib/api';
import { SearchFilters, type SearchFiltersValues } from '../components/search/SearchFilters';
import { SearchResults } from '../components/search/SearchResults';
import { PageTransition } from '../components/layout/PageTransition';
import { unwrapArray } from '../lib/unwrap';
import type { Annonce } from '../components/annonces/AnnonceCard';

export default function Recherche() {
  const [filters, setFilters] = useState<SearchFiltersValues>({});
  const [searchTriggered, setSearchTriggered] = useState(false);

  useEffect(() => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      const prevOverflow = mainContent.style.overflowY;
      mainContent.style.overflowY = 'hidden';
      return () => {
        mainContent.style.overflowY = prevOverflow;
      };
    }
  }, []);

  const { data, isLoading, refetch, error } = useQuery({
    queryKey: ['recherche', 'bfs_bst', filters],
    queryFn: async () => {
      const r = await rechercheApi.search(filters);
      return r.data;
    },
    enabled: searchTriggered,
  });

  const annonces = unwrapArray(data);

  const handleSearch = () => {
    setSearchTriggered(true);
    refetch();
  };

  const resultCount =
    data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data: unknown }).data)
      ? (data as { data: unknown[] }).data.length
      : annonces.length;

  return (
    <PageTransition>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        height: 'calc(100vh - var(--app-shell-header-height, 64px) - 2 * var(--page-gutter-y, 24px) - 10px)',
        maxHeight: 'calc(100dvh - var(--app-shell-header-height, 64px) - 2 * var(--page-gutter-y, 24px) - 10px)',
        overflow: 'hidden'
      }}>
        <h1 className="page-title-fluid" style={{ fontFamily: "'Clash Display',sans-serif", fontWeight: 700, margin: 0 }}>
          Recherche <span style={{ color: 'var(--accent-amber)' }}>intelligente</span>
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', gap: 16 }}>
          <div>
            <SearchFilters values={filters} onChange={setFilters} onSearch={handleSearch} isLoading={isLoading} />
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 4, paddingBottom: 20 }}>
            {!searchTriggered ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ margin: '0 auto 16px', opacity: 0.4 }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <p style={{ fontWeight: 500 }}>Configurez vos filtres et lancez la recherche</p>
              </div>
            ) : (
              <>
                {error && (
                  <p style={{ color: 'var(--accent-red, #ef4444)', marginBottom: 16, fontSize: '0.9rem' }}>
                    Impossible de charger les résultats. Vérifiez le backend et les paramètres.
                  </p>
                )}
                <SearchResults annonces={annonces as Annonce[]} isLoading={isLoading} total={resultCount} />
              </>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
