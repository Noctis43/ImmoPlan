import { AnnonceGrid } from '../annonces/AnnonceGrid';
import type { Annonce } from '../annonces/AnnonceCard';

interface SearchResultsProps {
  annonces: Annonce[];
  isLoading?: boolean;
  total?: number;
}

export function SearchResults({ annonces, isLoading, total }: SearchResultsProps) {
  return (
    <div>
      {total != null && !isLoading && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
          <strong style={{ color: 'var(--accent-amber)' }}>{total}</strong> résultat{total !== 1 ? 's' : ''} trouvé{total !== 1 ? 's' : ''}
        </p>
      )}
      <AnnonceGrid annonces={annonces} isLoading={isLoading} />
    </div>
  );
}
