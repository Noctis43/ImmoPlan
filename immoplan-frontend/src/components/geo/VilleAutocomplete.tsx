import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { geoApi } from '../../lib/api';
import { unwrapArray } from '../../lib/unwrap';

export type VilleOption = { id: number; nom: string; code_postal?: string | null };

type Props = {
  label: string;
  valueId: string;
  valueLabel: string;
  onChange: (villeId: string, villeNom: string) => void;
  placeholder?: string;
  required?: boolean;
  hintRecognized?: string;
  hintSelect?: string;
};

function normalize(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export function VilleAutocomplete({
  label,
  valueId,
  valueLabel,
  onChange,
  placeholder,
  required,
  hintRecognized,
  hintSelect,
}: Props) {
  const [query, setQuery] = useState(valueLabel);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { data: searchData, isFetching } = useQuery({
    queryKey: ['geo', 'villes', 'search', query],
    queryFn: () => geoApi.searchVilles(query.trim()).then((r) => r.data),
    enabled: open && query.trim().length >= 2,
    staleTime: 60_000,
  });

  const suggestions = useMemo(() => {
    const fromApi = unwrapArray<VilleOption>(searchData);
    if (fromApi.length > 0) return fromApi;
    return [];
  }, [searchData]);

  useEffect(() => {
    setQuery(valueLabel);
  }, [valueLabel]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const pick = (v: VilleOption) => {
    onChange(String(v.id), v.nom);
    setQuery(v.nom);
    setOpen(false);
  };

  const onInputChange = (text: string) => {
    setQuery(text);
    setOpen(true);
    if (!text.trim()) {
      onChange('', '');
      return;
    }
    if (valueId && normalize(text) !== normalize(valueLabel)) {
      onChange('', '');
    }
  };

  const showList = open && query.trim().length >= 2;

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <label
        htmlFor="ville-autocomplete-input"
        style={{
          fontSize: '0.72rem',
          fontWeight: 600,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          display: 'block',
          marginBottom: 6,
        }}
      >
        {label}
        {required ? ' *' : ''}
      </label>
      <input
        id="ville-autocomplete-input"
        type="text"
        value={query}
        onChange={(e) => onInputChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        required={required}
        style={{
          width: '100%',
          height: 42,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-dim)',
          borderRadius: 'var(--radius-md)',
          padding: '0 12px',
          color: 'var(--text-primary)',
          fontSize: '0.875rem',
          outline: 'none',
        }}
      />
      {showList && (
        <ul
          role="listbox"
          style={{
            position: 'absolute',
            zIndex: 40,
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            maxHeight: 220,
            overflowY: 'auto',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-dim)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            listStyle: 'none',
            padding: 4,
            margin: 0,
          }}
        >
          {isFetching && suggestions.length === 0 && (
            <li style={{ padding: '10px 12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>…</li>
          )}
          {!isFetching && suggestions.length === 0 && (
            <li style={{ padding: '10px 12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Aucune ville trouvée
            </li>
          )}
          {suggestions.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(v)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 12px',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  background: valueId === String(v.id) ? 'var(--accent-amber-dim)' : 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                {v.nom}
                {v.code_postal ? (
                  <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: '0.75rem' }}>
                    {v.code_postal}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
      {(hintRecognized || hintSelect) && (
        <p style={{ fontSize: '0.75rem', color: valueId ? 'var(--accent-teal, #00D4AA)' : 'var(--text-muted)', marginTop: 6 }}>
          {valueId ? hintRecognized : hintSelect}
        </p>
      )}
    </div>
  );
}
