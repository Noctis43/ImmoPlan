import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import type { AxiosError } from 'axios';
import { annoncesApi, interactionsApi, messagerieApi, visitesApi } from '../../lib/api';
import { PhotoGallery } from '../../components/annonces/PhotoGallery';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { AvisCard, type Avis } from '../../components/profile/AvisCard';
import { AvisForm } from '../../components/profile/AvisForm';
import { POILayer, type POICategory, type POI, CATEGORY_LABELS } from '../../components/map/POILayer';
import { MapView } from '../../components/map/MapView';
import { Circle, Marker, Popup } from 'react-leaflet';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/auth';
import { PageTransition } from '../../components/layout/PageTransition';
import { Skeleton } from '../../components/ui/Skeleton';
import { Input } from '../../components/ui/Input';
import type { Annonce } from '../../components/annonces/AnnonceCard';
import { unwrapArray, unwrapEntity } from '../../lib/unwrap';
import { toHHMM } from '../../lib/format';
import { useTranslation } from 'react-i18next';
import { formatDateByOptions, formatNumber } from '../../lib/locale';

export default function Detail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [visiteModal, setVisiteModal] = useState(false);
  const [dateSouhaitee, setDateSouhaitee] = useState('');
  const [heureDébut, setHeureDébut] = useState('09:00');
  const [showAvisForm, setShowAvisForm] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState<POICategory[]>(Object.keys(CATEGORY_LABELS) as POICategory[]);
  const [liked, setLiked] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['annonce', id],
    queryFn: () => annoncesApi.getById(id!).then((r) => r.data),
    enabled: !!id,
  });

  const { data: avisData } = useQuery({
    queryKey: ['avis', id],
    queryFn: () => interactionsApi.getAvis(id!).then((r) => r.data),
    enabled: !!id,
  });

  const { data: poiData } = useQuery({
    queryKey: ['poi', id],
    queryFn: () => interactionsApi.getPOI(id!).then((r) => r.data),
    enabled: !!id,
  });

  const annonceForOwner = unwrapEntity<Annonce>(data, ['annonce']) ?? (data as Annonce | undefined);
  const isOwnerPreview = user?.id === annonceForOwner?.offreur_id;

  const { data: vuesData } = useQuery({
    queryKey: ['interactions', 'vues', id],
    queryFn: () => interactionsApi.getVues(id!).then((r) => r.data),
    enabled: !!id && !!user && isOwnerPreview,
  });
  const { data: likesData } = useQuery({
    queryKey: ['interactions', 'likes', id],
    queryFn: () => interactionsApi.getLikes(id!).then((r) => r.data),
    enabled: !!id,
  });
  const createConvMutation = useMutation({
    mutationFn: () => messagerieApi.createConversation({ annonce_id: id! }),
    onSuccess: (res) => {
      const conv = unwrapEntity<{ id: string }>(res.data);
      const convId = conv?.id;
      if (convId) navigate(`/messagerie/${convId}`);
    },
    onError: () => toast(t('detail.conversationError'), 'error'),
  });

  const visiteMutation = useMutation({
    mutationFn: () => {
      if (!dateSouhaitee.trim()) {
        throw new Error('DATE_REQUIRED');
      }
      const heure = toHHMM(heureDébut);
      if (!/^\d{2}:\d{2}$/.test(heure)) {
        throw new Error('HEURE_INVALID');
      }
      return visitesApi.create({
        annonce_id: id!,
        date_souhaitee: dateSouhaitee,
        heure_debut: heure,
        duree_minutes: 30,
      });
    },
    onSuccess: () => { toast(t('detail.visitSent'), 'success'); setVisiteModal(false); qc.invalidateQueries({ queryKey: ['visites'] }); },
    onError: (err: unknown) => {
      const axiosErr = err as AxiosError<{
        error?: string;
        message?: string;
        details?: Array<{ message?: string }>;
      }>;
      const apiData = axiosErr.response?.data;
      const validationDetail = apiData?.details?.[0]?.message;
      const apiMessage = validationDetail || apiData?.error || apiData?.message;
      if (apiMessage) {
        toast(apiMessage, 'error');
        return;
      }
      const typedErr = err as Error;
      if (typedErr.message === 'DATE_REQUIRED') toast(t('detail.chooseDate'), 'warning');
      else if (typedErr.message === 'HEURE_INVALID') toast(t('detail.invalidHour'), 'warning');
      else toast(t('detail.requestError'), 'error');
    },
  });

  /** Enregistre une vue (une seule fois) pour chercheur/offreur, sauf sur sa propre annonce. */
  const vueSentForKey = useRef<string | null>(null);
  useEffect(() => {
    if (!id || isLoading || !data) return;
    const annonceVue = unwrapEntity<Annonce>(data, ['annonce']) ?? (data as Annonce);
    if (!annonceVue?.offreur_id) return;
    if (!user) return;
    if (user.id === annonceVue.offreur_id) return;
    const key = `${id}:${user.id}`;
    if (vueSentForKey.current === key) return;
    vueSentForKey.current = key;
    const registerViewPromise =
      user.profile_type === 'offreur' ? interactionsApi.addVueOffreur(id) : interactionsApi.addVue(id);
    registerViewPromise
      .then(() => qc.invalidateQueries({ queryKey: ['annonce', id] }))
      .catch(() => {
        vueSentForKey.current = null;
      });
  }, [id, isLoading, data, user, qc]);

  /** Met à jour l'historique (Stack) à chaque ouverture de détail, sans toucher au compteur de vues. */
  useEffect(() => {
    if (!id || isLoading || !data) return;
    const annonceVue = unwrapEntity<Annonce>(data, ['annonce']) ?? (data as Annonce);
    if (!annonceVue?.offreur_id) return;
    if (!user || user.profile_type !== 'chercheur') return;
    if (user.id === annonceVue.offreur_id) return;
    interactionsApi.touchHistorique(id).catch(() => {
      // historique best-effort, ne bloque pas la page
    });
  }, [id, isLoading, data, user]);

  const annonce = (unwrapEntity<Annonce>(data, ['annonce']) ?? (data as Annonce | undefined)) as Annonce | undefined;
  const likesInner = unwrapEntity<{ count?: number }>(likesData);
  const [likesCount, setLikesCount] = useState(0);
  const annonceLiked = Boolean(
    (annonce as (Annonce & { is_liked?: boolean }) | undefined)?.isLiked ??
      (annonce as (Annonce & { is_liked?: boolean }) | undefined)?.is_liked ??
      false
  );
  useEffect(() => {
    setLiked(annonceLiked);
  }, [annonceLiked]);
  useEffect(() => {
    const next = Number(likesInner?.count ?? annonce?.nb_likes ?? 0);
    setLikesCount(Number.isFinite(next) ? next : 0);
  }, [likesInner?.count, annonce?.nb_likes]);

  const toggleLikeMutation = useMutation({
    mutationFn: async () => {
      if (!id) return 0;
      if (liked) await interactionsApi.unlike(id);
      else await interactionsApi.like(id);
      const r = await interactionsApi.getLikes(id);
      return Number(r.data?.data?.count ?? r.data?.count ?? 0);
    },
    onSuccess: (nextCount) => {
      setLiked((v) => !v);
      setLikesCount(Number.isFinite(nextCount) ? nextCount : 0);
      qc.invalidateQueries({ queryKey: ['annonce', id] });
      qc.invalidateQueries({ queryKey: ['annonces'] });
      qc.invalidateQueries({ queryKey: ['annonces/me'] });
      qc.invalidateQueries({ queryKey: ['dashboard/stats'] });
      qc.invalidateQueries({ queryKey: ['statistiques/dashboard'] });
    },
    onError: () => toast(t('detail.likeError'), 'error'),
  });

  if (isLoading) {
    return (
      <PageTransition>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Skeleton style={{ height: 400, borderRadius: 16 }} />
          <div className="detail-page__grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Skeleton style={{ height: 40, width: '60%' }} />
              <Skeleton style={{ height: 20, width: '40%' }} />
              <Skeleton style={{ height: 120 }} />
            </div>
            <Skeleton style={{ height: 200, borderRadius: 16 }} />
          </div>
        </div>
      </PageTransition>
    );
  }
  if (!annonce) {
    return (
      <PageTransition>
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <h1 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: '1.4rem', fontWeight: 700 }}>
            {t('detail.notFoundTitle')}
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
            {t('detail.notFoundText')}
          </p>
        </div>
      </PageTransition>
    );
  }

  const avis: Avis[] = unwrapArray<Avis>(avisData);
  const pois: POI[] = unwrapArray<POI>(poiData);
  const offreur = annonce?.profiles;
  const isOwner = user?.id === annonce?.offreur_id;

  const vuesInner = unwrapEntity<{ vues?: { profiles?: { prenom?: string; nom?: string }; viewed_at?: string }[] }>(vuesData);
  const vuesListe = Array.isArray(vuesInner?.vues) ? vuesInner.vues : [];
  const vuesCount = Number(annonce?.nb_vues ?? 0);
  const activeQuartier = (annonce as unknown as Record<string, unknown> | undefined)?.quartiers as
    | Record<string, unknown>
    | undefined;
  const parseQuartierCenter = (geomValue: unknown): { lat: number; lng: number } | null => {
    if (!geomValue) return null;
    const raw = String(geomValue).trim().replace(/^SRID=\d+;/i, '');

    // Format principal en base: "lat,lng"
    const csvMatch = raw.match(/^([-\d.]+)\s*,\s*([-\d.]+)$/);
    if (csvMatch) {
      const lat = Number(csvMatch[1]);
      const lng = Number(csvMatch[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }

    const pointMatch = raw.match(/^POINT\s*\(([-\d.]+)\s+([-\d.]+)\)$/i);
    if (pointMatch) {
      const lng = Number(pointMatch[1]);
      const lat = Number(pointMatch[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
    const coordRegex = /([-\d.]+)\s+([-\d.]+)/g;
    const pairs: Array<{ lng: number; lat: number }> = [];
    let match: RegExpExecArray | null = null;
    while ((match = coordRegex.exec(raw)) !== null) {
      const lng = Number(match[1]);
      const lat = Number(match[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) pairs.push({ lat, lng });
    }
    if (pairs.length === 0) return null;
    const lats = pairs.map((p) => p.lat);
    const lngs = pairs.map((p) => p.lng);
    return {
      lat: (Math.min(...lats) + Math.max(...lats)) / 2,
      lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    };
  };
  const quartierCenter = parseQuartierCenter(activeQuartier?.geom);
  const hasQuartierCenter = Boolean(quartierCenter);

  return (
    <PageTransition>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* Photos */}
        <PhotoGallery photos={annonce?.annonce_photos ?? []} title={annonce?.titre} />

        {/* Main grid */}
        <div className="detail-page__grid">
          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Title + badges */}
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <Badge variant={annonce?.service === 'vente' ? 'amber' : 'teal'}>{annonce?.service}</Badge>
                <Badge variant="muted">{annonce?.type_bien}</Badge>
                <Badge variant="muted">{annonce?.statut}</Badge>
              </div>
              <h1 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: '1.8rem', fontWeight: 700, marginBottom: 6 }}>{annonce?.titre}</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {annonce?.villes?.nom}{annonce?.quartiers ? ` · ${annonce.quartiers.nom}` : ''} · {annonce?.adresse}
              </p>
            </div>

            {/* Specs */}
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', padding: '20px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
              {[
                { l: t('detail.specs.surface'), v: `${annonce?.surface_m2} m²` },
                { l: t('detail.specs.rooms'), v: annonce?.nb_chambres },
                { l: t('detail.specs.livingRooms'), v: annonce?.nb_sejours },
                { l: t('detail.specs.kitchens'), v: annonce?.nb_cuisines },
                { l: t('detail.specs.showerToilet'), v: annonce?.nb_douches_wc },
              ].map((s) => (
                <div key={s.l} style={{ textAlign: 'center', minWidth: 80 }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{s.v}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Description */}
            {annonce?.description && (
              <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '20px', border: '1px solid var(--border-subtle)' }}>
                <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>{t('detail.description')}</h2>
                <p style={{ lineHeight: 1.7, color: 'var(--text-secondary)', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{annonce.description}</p>
              </div>
            )}

            {/* Map + POI */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '20px', border: '1px solid var(--border-subtle)' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>{t('detail.locationPoi')}</h2>
              <div style={{ height: 280, borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 12 }}>
                <MapView
                  center={hasQuartierCenter ? [quartierCenter!.lat, quartierCenter!.lng] : [-18.9137, 47.5361]}
                  zoom={15}
                  style={{ height: '100%', borderRadius: 0 }}
                >
                  {hasQuartierCenter && (
                    <>
                      <Marker position={[quartierCenter!.lat, quartierCenter!.lng]}>
                        <Popup>
                          <div>
                            <h3>{annonce?.quartiers?.nom}</h3>
                          </div>
                        </Popup>
                      </Marker>
                      <Circle
                        center={[quartierCenter!.lat, quartierCenter!.lng]}
                        radius={2000}
                        pathOptions={{ color: '#4D9FFF', fillColor: '#4D9FFF', fillOpacity: 0.1 }}
                      />
                    </>
                  )}
                  <POILayer pois={pois} visibleCategories={selectedPOI} />
                </MapView>
              </div>
              {!hasQuartierCenter && (
                <p style={{ marginTop: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {t('detail.noGeometry')}
                </p>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(Object.keys(CATEGORY_LABELS) as POICategory[]).map((cat) => (
                  <button key={cat} onClick={() => setSelectedPOI((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat])}
                    style={{ padding: '4px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 600, cursor: 'none', border: `1px solid ${selectedPOI.includes(cat) ? 'var(--accent-amber)' : 'var(--border-dim)'}`, background: selectedPOI.includes(cat) ? 'var(--accent-amber-dim)' : 'none', color: selectedPOI.includes(cat) ? 'var(--accent-amber)' : 'var(--text-muted)' }}>
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>

            {/* Avis */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '20px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('detail.reviews', { count: avis.length })}
                </h2>
                {user && !isOwner && <Button size="sm" variant="ghost" onClick={() => setShowAvisForm(true)}>{t('detail.leaveReview')}</Button>}
              </div>
              {showAvisForm && <div style={{ marginBottom: 20 }}><AvisForm annonceId={id!} onSuccess={() => { setShowAvisForm(false); qc.invalidateQueries({ queryKey: ['avis', id] }); }} /></div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {avis.map((a) => <AvisCard key={a.id} avis={a} />)}
                {avis.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('detail.noReviewYet')}</p>}
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Price card */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', padding: '24px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-float)' }}>
              <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: '2rem', fontWeight: 700, color: 'var(--accent-amber)', marginBottom: 4 }}>
                {formatNumber(Number(annonce?.prix ?? 0), i18n.resolvedLanguage)} Ar
              </div>
              {annonce?.prix_unite && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>/{annonce.prix_unite}</div>}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ verticalAlign: 'middle', marginRight: 4 }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  {t('detail.views', { count: vuesCount })}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ verticalAlign: 'middle', marginRight: 4, color: '#FF4D4D' }}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  {t('detail.likes', { count: likesCount })}
                </span>
              </div>
              {!isOwner && user && (
                <button
                  type="button"
                  onClick={() => toggleLikeMutation.mutate()}
                  disabled={toggleLikeMutation.isPending}
                  aria-pressed={liked}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginBottom: 12,
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-dim)',
                    background: liked ? 'var(--accent-amber-dim)' : 'transparent',
                    color: liked ? 'var(--accent-amber)' : 'var(--text-muted)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: toggleLikeMutation.isPending ? 0.7 : 1,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  {liked ? t('detail.unlike') : t('detail.like')}
                </button>
              )}

              {isOwner && vuesListe.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                  <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>{t('detail.latestViews')}</p>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {vuesListe.slice(0, 5).map((v, i) => (
                      <li key={i}>
                        {(v.profiles?.prenom ?? '')} {(v.profiles?.nom ?? '')}{' '}
                        {v.viewed_at ? formatDateByOptions(new Date(v.viewed_at), { dateStyle: 'short', timeStyle: 'short' }, i18n.resolvedLanguage) : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!isOwner && user && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Button fullWidth onClick={() => createConvMutation.mutate()} isLoading={createConvMutation.isPending}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 8 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    {t('detail.contactHost')}
                  </Button>
                  <Button fullWidth variant="secondary" onClick={() => setVisiteModal(true)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 8 }}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    {t('detail.requestVisit')}
                  </Button>
                </div>
              )}

              {isOwner && (
                <Link to={`/annonces/publier?edit=${id}`} style={{ display: 'block', textAlign: 'center', padding: '11px', background: 'var(--accent-amber-dim)', color: 'var(--accent-amber)', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.875rem' }}>
                  {t('detail.editAd')}
                </Link>
              )}
            </div>

            {/* Offreur card */}
            {offreur && (
              <ProfileHeader
                profile={{ ...offreur, date_naissance: '', profile_type: 'offreur' as const, is_verified: false } as any}
                noteMoyenne={annonce?.note_moyenne}
                nbAvis={annonce?.nb_avis}
                showContact={!isOwner && !!user}
                onContact={() => createConvMutation.mutate()}
              />
            )}
          </div>
        </div>
      </div>

      {/* Visite modal */}
      <Modal isOpen={visiteModal} onClose={() => setVisiteModal(false)} title={t('detail.requestVisit')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label={t('detail.desiredDate')} type="date" value={dateSouhaitee} onChange={(e) => setDateSouhaitee(e.target.value)} />
          <Input label={t('detail.startTime')} type="time" value={heureDébut} onChange={(e) => setHeureDébut(e.target.value)} />
          <Button type="button" onClick={() => visiteMutation.mutate()} isLoading={visiteMutation.isPending} fullWidth>{t('detail.sendRequest')}</Button>
        </div>
      </Modal>
    </PageTransition>
  );
}
