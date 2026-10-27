import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { geoApi } from '../../lib/api';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { unwrapArray } from '../../lib/unwrap';

export interface SearchFiltersValues {
  q?: string;
  service?: 'location' | 'vente' | '';
  type_bien?: string;
  prix_min?: number;
  prix_max?: number;
  surface_min?: number;
  nb_chambres_min?: number;
  ville_id?: number;
  quartier_id?: number;
}

interface SearchFiltersProps {
  values: SearchFiltersValues;
  onChange: (values: SearchFiltersValues) => void;
  onSearch: () => void;
  isLoading?: boolean;
}

const TYPE_BIENS = ['appartement', 'maison', 'villa', 'studio', 'duplex', 'bureau', 'local_commercial', 'terrain', 'entrepot', 'autre'];

export function SearchFilters({ values, onChange, onSearch, isLoading }: SearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const { data: villesData } = useQuery({
    queryKey: ['geo', 'villes', 'search-filters'],
    queryFn: () => geoApi.getVilles().then((r) => r.data),
  });

  const { data: quartiersData } = useQuery({
    queryKey: ['geo', 'quartiers', 'search-filters', values.ville_id],
    queryFn: () => geoApi.getQuartiers(String(values.ville_id!)).then((r) => r.data),
    enabled: !!values.ville_id,
  });

  const villesList = unwrapArray<{ id: number; nom: string }>(villesData);
  const quartiersList = unwrapArray<{ id: number; nom: string }>(quartiersData);

  const set = (key: keyof SearchFiltersValues, val: unknown) => onChange({ ...values, [key]: val || undefined });

  const inputStyle: React.CSSProperties = { background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-md)', padding: '10px 12px', color: 'var(--text-primary)', fontSize: '0.875rem', width: '100%', outline: 'none' };
  const labelStyle: React.CSSProperties = { fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 };

  const handleSearchClick = () => {
    setIsExpanded(false);
    onSearch();
  };

  // Badges d'état des filtres actifs
  const activeBadges: string[] = [];
  if (values.q) activeBadges.push(`"${values.q}"`);
  if (values.service) activeBadges.push(values.service === 'vente' ? 'Vente' : 'Location');
  if (values.type_bien) activeBadges.push(values.type_bien.replace('_', ' '));
  if (values.ville_id) {
    const villeObj = villesList.find(v => v.id === values.ville_id);
    if (villeObj) activeBadges.push(villeObj.nom);
  }
  if (values.quartier_id) {
    const quartierObj = quartiersList.find(q => q.id === values.quartier_id);
    if (quartierObj) activeBadges.push(quartierObj.nom);
  }
  if (values.prix_min || values.prix_max) {
    if (values.prix_min && values.prix_max) {
      activeBadges.push(`${values.prix_min} - ${values.prix_max} Ar`);
    } else if (values.prix_min) {
      activeBadges.push(`> ${values.prix_min} Ar`);
    } else {
      activeBadges.push(`< ${values.prix_max} Ar`);
    }
  }
  if (values.surface_min) activeBadges.push(`> ${values.surface_min} m²`);
  if (values.nb_chambres_min) activeBadges.push(`> ${values.nb_chambres_min} ch.`);

  return (
    <div className="search-filters-card" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: isExpanded ? 16 : 8, transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h3 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>Filtres de recherche</h3>
          {!isExpanded && activeBadges.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {activeBadges.map((badge, idx) => (
                <span key={idx} style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-dim)',
                  color: 'var(--accent-amber)',
                  borderRadius: 'var(--radius-full)',
                  textTransform: 'capitalize'
                }}>
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent-amber)',
            fontSize: '0.8rem',
            fontWeight: 650,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm)',
            transition: 'background var(--transition-fast)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          {isExpanded ? (
            <>
              Masquer
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
            </>
          ) : (
            <>
              Afficher
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </>
          )}
        </button>
      </div>

      {isExpanded && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, alignItems: 'end' }}>
          <div>
            <Input label="Mots-clés" placeholder="Titre, adresse..." value={values.q ?? ''} onChange={(e) => set('q', e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Service</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['', 'vente', 'location'] as const).map((s) => (
                <button key={s} onClick={() => set('service', s)}
                  style={{ flex: 1, padding: '10px 8px', borderRadius: 'var(--radius-md)', border: `1px solid ${values.service === s || (s === '' && !values.service) ? 'var(--accent-amber)' : 'var(--border-dim)'}`, background: values.service === s || (s === '' && !values.service) ? 'var(--accent-amber-dim)' : 'none', color: values.service === s || (s === '' && !values.service) ? 'var(--accent-amber)' : 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, cursor: 'none' }}>
                  {s === '' ? 'Tous' : s === 'vente' ? 'Vente' : 'Location'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Type de bien</label>
            <select style={inputStyle} value={values.type_bien ?? ''} onChange={(e) => set('type_bien', e.target.value)}>
              <option value="">Tous</option>
              {TYPE_BIENS.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Ville</label>
            <select style={inputStyle} value={values.ville_id ?? ''} onChange={(e) => set('ville_id', e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">Toutes</option>
              {villesList.map((v) => <option key={v.id} value={v.id}>{v.nom}</option>)}
            </select>
          </div>

          {values.ville_id && (
            <div>
              <label style={labelStyle}>Quartier</label>
              <select style={inputStyle} value={values.quartier_id ?? ''} onChange={(e) => set('quartier_id', e.target.value ? Number(e.target.value) : undefined)}>
                <option value="">Tous</option>
                {quartiersList.map((q) => <option key={q.id} value={q.id}>{q.nom}</option>)}
              </select>
            </div>
          )}

          <div className="search-filters__row2">
            <Input label="Prix min (Ar)" type="number" placeholder="0" value={values.prix_min ?? ''} onChange={(e) => set('prix_min', e.target.value ? Number(e.target.value) : undefined)} />
            <Input label="Prix max (Ar)" type="number" placeholder="∞" value={values.prix_max ?? ''} onChange={(e) => set('prix_max', e.target.value ? Number(e.target.value) : undefined)} />
          </div>

          <div className="search-filters__row2">
            <Input label="Surface min (m²)" type="number" placeholder="0" value={values.surface_min ?? ''} onChange={(e) => set('surface_min', e.target.value ? Number(e.target.value) : undefined)} />
            <Input label="Chambres min" type="number" placeholder="0" min={0} value={values.nb_chambres_min ?? ''} onChange={(e) => set('nb_chambres_min', e.target.value ? Number(e.target.value) : undefined)} />
          </div>

          <div>
            <Button fullWidth onClick={handleSearchClick} isLoading={isLoading}>
              Rechercher
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
