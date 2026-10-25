/**
 * Normalise les réponses API du backend (`{ data: T[] }`, etc.) vers un tableau sûr pour `.map`.
 */
export function unwrapArray<T>(raw: unknown): T[] {
    if (raw == null) return [];
    if (Array.isArray(raw)) return raw as T[];
    if (typeof raw === 'object') {
      const o = raw as Record<string, unknown>;
      for (const key of [
        'data',
        'annonces',
        'avis',
        'conversations',
        'visites',
        'pois',
        'items',
        'results',
        'messages',
        'notifications',
        'prixMoyens',
        'villes',
        'quartiers',
      ] as const) {
        const v = o[key];
        if (Array.isArray(v)) return v as T[];
      }
      const d = o.data;
      if (d != null && typeof d === 'object' && !Array.isArray(d)) {
        return unwrapArray<T>(d);
      }
    }
    return [];
  }
  
  /**
   * Extrait un objet unique depuis `{ data: X }` ou clés alternatives (`profile`, `annonce`, `stats`…).
   */
  export function unwrapEntity<T>(raw: unknown, altKeys: string[] = ['profile', 'annonce', 'stats', 'conversation', 'message']): T | undefined {
    if (raw == null) return undefined;
    if (typeof raw !== 'object') return raw as T;
    const o = raw as Record<string, unknown>;
    const d = o.data;
    if (d != null && typeof d === 'object' && !Array.isArray(d)) return d as T;
    for (const k of altKeys) {
      const v = o[k];
      if (v != null && typeof v === 'object' && !Array.isArray(v)) return v as T;
    }
    return raw as T;
  }
  