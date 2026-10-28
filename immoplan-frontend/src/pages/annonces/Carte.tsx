import { useMemo, useState, Fragment, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { MapView } from '../../components/map/MapView';
import { AnnonceCard } from '../../components/annonces/AnnonceCard';
import { Skeleton } from '../../components/ui/Skeleton';
import { annoncesApi, interactionsApi } from '../../lib/api';
import { PageTransition } from '../../components/layout/PageTransition';
import type { Annonce } from '../../components/annonces/AnnonceCard';
import { unwrapArray } from '../../lib/unwrap';
import { useAuthStore } from '../../store/auth';
import { useTranslation } from 'react-i18next';
import { Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'framer-motion';
import { formatNumber } from '../../lib/locale';

interface Bounds { sw_lat: number; sw_lng: number; ne_lat: number; ne_lng: number; }

const createZoneIcon = (count: number) => L.divIcon({
  className: '',
  html: `<div style="display:flex;align-items:center;justify-content:center;background:var(--accent-amber);color:#0a0a0f;width:34px;height:34px;border-radius:50%;border:2px solid var(--bg-card);box-shadow:0 3px 8px rgba(0,0,0,0.4);font-family:'Clash Display',sans-serif;font-weight:700;font-size:0.8rem;cursor:pointer">
    ${count}
  </div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -18],
});

function MapController({ center }: { center: [number, number] | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (!center) return;
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    const targetZoom = currentZoom < 13 ? 14 : currentZoom;
    
    const isZoomDiff = Math.abs(currentZoom - targetZoom) > 0.01;
    const isCenterDiff = Math.abs(currentCenter.lat - center[0]) > 0.0001 || Math.abs(currentCenter.lng - center[1]) > 0.0001;
    
    if (isZoomDiff || isCenterDiff) {
      map.setView(center, targetZoom, {
        animate: true,
        duration: 0.8
      });
    }
  }, [center ? `${center[0]},${center[1]}` : null, map]);
  
  return null;
}

export default function Carte() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [debouncedBounds, setDebouncedBounds] = useState<Bounds | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  // Debounce the bounds to limit API calls and avoid HTTP 429 errors
  useEffect(() => {
    if (!bounds) return;
    
    // Apply immediately on the first load to avoid layout lag
    if (!debouncedBounds) {
      setDebouncedBounds(bounds);
      return;
    }

    const handler = setTimeout(() => {
      setDebouncedBounds(bounds);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [bounds]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['annonces/carte', debouncedBounds],
    queryFn: () => debouncedBounds
      ? annoncesApi.getCarte(debouncedBounds).then((r) => r.data)
      : Promise.resolve({ annonces: [] }),
    enabled: !!debouncedBounds,
    placeholderData: keepPreviousData,
  });

  const annonces: Annonce[] = unwrapArray<Annonce>(data);

  // Group ads by neighborhood (quartier) or coordinate clusters
  const zones = useMemo(() => {
    const map = new Map<string, Annonce[]>();
    
    annonces.forEach((a) => {
      const qId = a.quartier_id 
        ? String(a.quartier_id) 
        : `zone-${(a as any).latitude ?? -18.9137}-${(a as any).longitude ?? 47.5361}`;
      
      if (!map.has(qId)) {
        map.set(qId, []);
      }
      map.get(qId)!.push(a);
    });

    const list: Array<{
      id: string;
      nom: string;
      latitude: number;
      longitude: number;
      annonces: Annonce[];
    }> = [];

    map.forEach((annList, qId) => {
      const first = annList[0] as any;
      const nom = first.quartier_nom || first.quartiers?.nom || first.ville_nom || first.villes?.nom || 'Zone indéterminée';
      
      // On privilégie la position théorique du quartier pour le centre de la zone
      let lat = Number(first.quartier_latitude);
      let lng = Number(first.quartier_longitude);
      
      if (!lat || !lng) {
        const validCoords = annList.filter((a: any) => a.latitude && a.longitude);
        if (validCoords.length > 0) {
          lat = validCoords.reduce((acc, curr: any) => acc + Number(curr.latitude), 0) / validCoords.length;
          lng = validCoords.reduce((acc, curr: any) => acc + Number(curr.longitude), 0) / validCoords.length;
        } else {
          lat = -18.9137;
          lng = 47.5361;
        }
      }

      list.push({
        id: qId,
        nom,
        latitude: lat,
        longitude: lng,
        annonces: annList,
      });
    });

    return list;
  }, [annonces]);

  const selectedZone = useMemo(() => {
    if (!selectedZoneId) return null;
    return zones.find(z => z.id === selectedZoneId) || null;
  }, [zones, selectedZoneId]);  const activeAnnonces = useMemo(() => {
    return selectedZone ? selectedZone.annonces : [];
  }, [selectedZone]);

  const displayedAnnonces = useMemo(() => activeAnnonces.slice(0, 12), [activeAnnonces]);
  const displayedAnnonceIds = useMemo(() => displayedAnnonces.map((a) => a.id), [displayedAnnonces]);

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

  const likedRows = Array.isArray(likedIdsData?.data)
    ? likedIdsData.data
    : Array.isArray(likedIdsData)
      ? likedIdsData
      : [];
  const likedIdsSet = new Set(likedRows.map((id: unknown) => String(id)));

  const savedRows = Array.isArray(savedRowsData?.data)
    ? savedRowsData.data
    : Array.isArray(savedRowsData)
      ? savedRowsData
      : [];
  const savedIdsSet = new Set(
    savedRows
      .map((row: unknown) => {
        if (!row || typeof row !== 'object') return null;
        const obj = row as Record<string, unknown>;
        return obj.annonce_id ?? obj.annonceId ?? (obj.annonces as Record<string, unknown> | undefined)?.id ?? null;
      })
      .filter(Boolean)
      .map((id: unknown) => String(id))
  );

  const { data: likesCountsMap } = useQuery({
    queryKey: ['interactions', 'likes-counts', 'carte', displayedAnnonceIds],
    enabled: displayedAnnonceIds.length > 0,
    staleTime: 15000,
    queryFn: async () => {
      const entries = await Promise.all(
        displayedAnnonceIds.map(async (id) => {
          try {
            const res = await interactionsApi.getLikes(id);
            const count = Number(res.data?.data?.count ?? res.data?.count ?? 0);
            return [id, Number.isFinite(count) ? count : 0] as const;
          } catch {
            return [id, 0] as const;
          }
        })
      );
      return Object.fromEntries(entries) as Record<string, number>;
    },
  });

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderRadius: 'var(--radius-xl)' }}>
        <div className="page-header-feed" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          padding: '14px 20px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
          marginBottom: 4
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--accent-amber-dim)',
              color: 'var(--accent-amber)'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
                <line x1="8" y1="2" x2="8" y2="18"></line>
                <line x1="16" y1="6" x2="16" y2="22"></line>
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: '1.05rem', fontFamily: "'Clash Display', sans-serif", fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                {isLoading 
                  ? t('mapPage.loading') 
                  : selectedZone 
                    ? `${selectedZone.nom}` 
                    : t('mapPage.title', 'Carte des biens')
                }
              </h1>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                {isLoading 
                  ? 'Recherche en cours...' 
                  : selectedZone 
                    ? `${selectedZone.annonces.length} annonce${selectedZone.annonces.length > 1 ? 's' : ''} trouvée${selectedZone.annonces.length > 1 ? 's' : ''}` 
                    : t('mapPage.inArea', { count: annonces.length })
                }
              </p>
            </div>
          </div>
          {selectedZoneId && (
            <button
              onClick={() => setSelectedZoneId(null)}
              style={{
                background: 'var(--accent-amber-dim)',
                border: '1px solid var(--accent-amber)',
                color: 'var(--accent-amber)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: "'Clash Display', sans-serif"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--accent-amber)';
                e.currentTarget.style.color = '#0a0a0f';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--accent-amber-dim)';
                e.currentTarget.style.color = 'var(--accent-amber)';
              }}
            >
              Voir tout le secteur
            </button>
          )}
        </div>

        {/* Map panel (en haut, pleine largeur) */}
        <div style={{ position: 'relative', height: 'clamp(340px, 62vh, 760px)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
          {/* Indicator of fetching in background (Premium Glassmorphic Spinner) */}
          {isFetching && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 1000,
                background: 'rgba(10, 10, 15, 0.65)',
                backdropFilter: 'blur(8px)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '50%',
                width: 38,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  border: '2px solid rgba(245, 166, 35, 0.2)',
                  borderTopColor: 'var(--accent-amber)'
                }}
              />
            </motion.div>
          )}
          <MapView
            onBoundsChange={(b) => {
              setBounds(b);
            }}
            style={{ height: '100%', borderRadius: 0 }}
          >
            {selectedZone && (
              <MapController center={[selectedZone.latitude, selectedZone.longitude]} />
            )}
            {zones.map((zone) => (
              <Fragment key={zone.id}>
                <Circle
                  center={[zone.latitude, zone.longitude]}
                  radius={500}
                  pathOptions={{
                    color: selectedZoneId === zone.id ? 'var(--accent-amber)' : 'rgba(245, 166, 35, 0.6)',
                    fillColor: 'var(--accent-amber)',
                    fillOpacity: selectedZoneId === zone.id ? 0.3 : 0.15,
                    weight: selectedZoneId === zone.id ? 3 : 1.5,
                  }}
                  eventHandlers={{
                    click: () => setSelectedZoneId(zone.id),
                  }}
                />
                <Marker
                  position={[zone.latitude, zone.longitude]}
                  icon={createZoneIcon(zone.annonces.length)}
                  eventHandlers={{
                    click: () => setSelectedZoneId(zone.id),
                  }}
                >
                  <Popup>
                    <div style={{ textAlign: 'center', padding: '2px' }}>
                      <h4 style={{ margin: '0 0 4px', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{zone.nom}</h4>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {zone.annonces.length} annonce${zone.annonces.length > 1 ? 's' : ''} disponible${zone.annonces.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              </Fragment>
            ))}
          </MapView>
          {isLoading && (
            <div style={{ position: 'absolute', left: 12, right: 12, bottom: 12, display: 'grid', gap: 8 }}>
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} style={{ height: 52, borderRadius: 12 }} />
              ))}
            </div>
          )}
        </div>
        {!selectedZoneId ? (
          <div style={{
            textAlign: 'center',
            padding: '24px 20px',
            color: 'var(--text-muted)',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-subtle)',
            marginTop: 8
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 8px', opacity: 0.6, color: 'var(--accent-amber)' }}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <p style={{ fontWeight: 650, fontSize: '0.85rem', margin: 0 }}>Sélectionnez un quartier sur la carte pour voir ses annonces</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Statistiques et Moyennes de prix dans le quartier */}
            {selectedZone && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '20px',
                  boxShadow: 'var(--shadow-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--accent-amber-dim)',
                    color: 'var(--accent-amber)'
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                      <polyline points="17 6 23 6 23 12"></polyline>
                    </svg>
                  </div>
                  <h3 style={{
                    fontFamily: "'Clash Display', sans-serif",
                    fontSize: '1rem',
                    fontWeight: 650,
                    margin: 0,
                    color: 'var(--text-primary)'
                  }}>
                    Prix Moyens — {selectedZone.nom}
                  </h3>
                </div>
                
                {/* 2 Cards Grid for averages */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 12,
                  marginTop: 4
                }}>
                  {/* Vente card */}
                  <div style={{
                    background: 'rgba(245, 166, 35, 0.03)',
                    border: '1px solid rgba(245, 166, 35, 0.12)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        background: 'rgba(245, 166, 35, 0.15)',
                        color: 'var(--accent-amber)',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        Achat / Vente
                      </span>
                    </div>
                    {(() => {
                      const avgVente = (data as any)?.data?.averages?.[selectedZoneId]?.moyenneVente;
                      return avgVente ? (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{
                            fontFamily: "'Clash Display', sans-serif",
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            color: 'var(--accent-amber)',
                            whiteSpace: 'nowrap'
                          }}>
                            {formatNumber(Number(avgVente))}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Ar en moyenne
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>
                          Aucune vente dans cette zone
                        </span>
                      );
                    })()}
                  </div>

                  {/* Location card */}
                  <div style={{
                    background: 'rgba(0, 212, 170, 0.03)',
                    border: '1px solid rgba(0, 212, 170, 0.12)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        background: 'rgba(0, 212, 170, 0.15)',
                        color: 'var(--accent-teal)',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        Loyer / Location
                      </span>
                    </div>
                    {(() => {
                      const avgLoc = (data as any)?.data?.averages?.[selectedZoneId]?.moyenneLocation;
                      return avgLoc ? (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{
                            fontFamily: "'Clash Display', sans-serif",
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            color: 'var(--accent-teal)',
                            whiteSpace: 'nowrap'
                          }}>
                            {formatNumber(Number(avgLoc))}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Ar / mois en moyenne
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>
                          Aucune location dans cette zone
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </motion.div>
            )}

            {!isLoading && activeAnnonces.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  display: 'flex',
                  gap: 12,
                  overflowX: 'auto',
                  padding: '4px 4px 10px',
                  scrollSnapType: 'x mandatory',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                {displayedAnnonces.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      minWidth: 300,
                      maxWidth: 340,
                      scrollSnapAlign: 'start',
                    }}
                  >
                    <AnnonceCard
                      annonce={{
                        ...a,
                        nb_likes: Number(likesCountsMap?.[a.id] ?? a.nb_likes ?? 0),
                        isLiked: likedIdsSet.has(String(a.id)),
                        isSaved: savedIdsSet.has(String(a.id)),
                      }}
                      compact
                    />
                  </div>
                ))}
              </motion.div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                Aucune annonce publiée dans ce secteur.
              </div>
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
