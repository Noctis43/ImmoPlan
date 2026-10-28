import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { annoncesApi, geoApi } from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/auth';
import { PageTransition } from '../../components/layout/PageTransition';
import { useDropzone } from 'react-dropzone';
import type { AxiosError } from 'axios';
import type { AnnonceStatus, ServiceType, PropertyType, Annonce } from '../../components/annonces/AnnonceCard';
import { unwrapArray, unwrapEntity } from '../../lib/unwrap';
import { useTranslation } from 'react-i18next';

/** Centre par défaut (Antananarivo) si aucune géoloc n'est saisie. */
const DEFAULT_LAT = -18.9149;
const DEFAULT_LNG = 47.5316;

const TYPE_BIENS: PropertyType[] = ['appartement', 'maison', 'villa', 'studio', 'duplex', 'bureau', 'local_commercial', 'terrain', 'entrepot', 'autre'];
const labelStyle: React.CSSProperties = { fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 };
const selectStyle: React.CSSProperties = { width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-md)', padding: '10px 12px', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none' };

export default function Publier() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const { user } = useAuthStore();
  const { toast } = useToast();

  const [form, setForm] = useState({
    titre: '', description: '', service: 'vente' as ServiceType, type_bien: 'appartement' as PropertyType,
    prix: '', prix_unite: '', adresse: '', surface_m2: '', nb_chambres: '0', nb_sejours: '1',
    nb_cuisines: '1', nb_douches_wc: '1',     ville_id: '', quartier_id: '',
  });
  const [photos, setPhotos] = useState<File[]>([]);
  /** URLs existantes (édition) + previews blob pour les nouveaux fichiers */
  const [previews, setPreviews] = useState<string[]>([]);
  /** Nombre d’images déjà sur le serveur (préfixes non retirables sans API dédiée) */
  const [existingPreviewCount, setExistingPreviewCount] = useState(0);
  const [hydratedEdit, setHydratedEdit] = useState(false);
  const [villeSearch, setVilleSearch] = useState('');
  const [quartierSearch, setQuartierSearch] = useState('');
  const [editTargetStatut, setEditTargetStatut] = useState<AnnonceStatus>('brouillon');

  const { data: existingData, isLoading: loadingEdit } = useQuery({
    queryKey: ['annonce', 'publier-edit', editId],
    queryFn: () => annoncesApi.getById(editId!).then((r) => r.data),
    enabled: !!editId,
  });

  const { data: villesData } = useQuery({ queryKey: ['geo', 'villes', 'publier'], queryFn: () => geoApi.getVilles().then((r) => r.data) });
  const { data: quartiersData } = useQuery({
    queryKey: ['geo', 'quartiers', 'publier', form.ville_id],
    queryFn: () => geoApi.getQuartiers(form.ville_id).then((r) => r.data),
    enabled: !!form.ville_id,
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const annonceExistante = unwrapEntity<Annonce>(existingData, ['annonce']) ?? (existingData as Annonce | undefined);

  useEffect(() => {
    if (!editId || !annonceExistante?.id) return;
    if (user?.id !== annonceExistante.offreur_id) {
      toast(t('publish.cannotEdit'), 'error');
      navigate(`/annonces/${editId}`);
      return;
    }
    if (hydratedEdit) return;
    setForm({
      titre: annonceExistante.titre ?? '',
      description: annonceExistante.description ?? '',
      service: (annonceExistante.service as ServiceType) ?? 'vente',
      type_bien: (annonceExistante.type_bien as PropertyType) ?? 'appartement',
      prix: String(annonceExistante.prix ?? ''),
      prix_unite: annonceExistante.prix_unite ?? '',
      adresse: annonceExistante.adresse ?? '',
      surface_m2: String(annonceExistante.surface_m2 ?? ''),
      nb_chambres: String(annonceExistante.nb_chambres ?? 0),
      nb_sejours: String(annonceExistante.nb_sejours ?? 1),
      nb_cuisines: String(annonceExistante.nb_cuisines ?? 1),
      nb_douches_wc: String(annonceExistante.nb_douches_wc ?? 1),
      ville_id: String(annonceExistante.ville_id ?? ''),
      quartier_id: annonceExistante.quartier_id != null ? String(annonceExistante.quartier_id) : '',
    });
    const urls = [...(annonceExistante.annonce_photos ?? [])]
      .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
      .map((p) => p.cloudinary_url)
      .filter(Boolean) as string[];
    setPreviews(urls);
    setExistingPreviewCount(urls.length);
    setEditTargetStatut((annonceExistante.statut as AnnonceStatus) ?? 'brouillon');
    setHydratedEdit(true);
  }, [editId, annonceExistante, user?.id, hydratedEdit, navigate, toast]);

  const villesList = unwrapArray<{ id: number; nom: string }>(villesData);
  const quartiersList = unwrapArray<{ id: number; nom: string }>(quartiersData);

  const normalize = (value: string) => value.trim().toLowerCase();

  const resolveVilleId = (label: string): string => {
    const query = normalize(label);
    if (!query) return '';
    const exact = villesList.find((v) => normalize(v.nom) === query);
    if (exact) return String(exact.id);
    const starts = villesList.filter((v) => normalize(v.nom).startsWith(query));
    if (starts.length === 1) return String(starts[0].id);
    return '';
  };

  const resolveQuartierId = (label: string): string => {
    const query = normalize(label);
    if (!query) return '';
    const exact = quartiersList.find((q) => normalize(q.nom) === query);
    if (exact) return String(exact.id);
    const starts = quartiersList.filter((q) => normalize(q.nom).startsWith(query));
    if (starts.length === 1) return String(starts[0].id);
    return '';
  };

  useEffect(() => {
    const nextVilleId = resolveVilleId(villeSearch);
    if (nextVilleId !== form.ville_id) {
      setForm((f) => ({ ...f, ville_id: nextVilleId, quartier_id: '' }));
      setQuartierSearch('');
    }
  }, [villeSearch, villesList, form.ville_id]);

  useEffect(() => {
    const nextQuartierId = resolveQuartierId(quartierSearch);
    if (nextQuartierId !== form.quartier_id) {
      setForm((f) => ({ ...f, quartier_id: nextQuartierId }));
    }
  }, [quartierSearch, quartiersList, form.quartier_id]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => {
      setPhotos((p) => [...p, ...accepted].slice(0, Math.max(0, 10 - existingPreviewCount)));
      setPreviews((p) => [...p, ...accepted.map((f) => URL.createObjectURL(f))].slice(0, 10));
    },
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 10,
    maxSize: 5 * 1024 * 1024,
  });

  const mutation = useMutation({
    mutationFn: async (targetStatut: AnnonceStatus) => {
      const prixUnite =
        form.prix_unite.trim().toLowerCase() === 'mois' ? 'mois' : undefined;
      const payload = {
        service: form.service,
        type_bien: form.type_bien,
        titre: form.titre.trim(),
        description: form.description.trim() || undefined,
        adresse: form.adresse.trim(),
        lat: DEFAULT_LAT,
        lng: DEFAULT_LNG,
        prix: Number(form.prix),
        prix_unite: prixUnite,
        surface_m2: Number(form.surface_m2),
        nb_chambres: Number(form.nb_chambres),
        nb_sejours: Number(form.nb_sejours),
        nb_cuisines: Number(form.nb_cuisines),
        nb_douches_wc: Number(form.nb_douches_wc),
        ville_id: Number(form.ville_id),
        quartier_id: form.quartier_id ? Number(form.quartier_id) : undefined,
      };

      let annonceId: string;

      if (editId) {
        const { data: body } = await annoncesApi.update(editId, payload);
        const updated = unwrapEntity<{ id: string }>(body, ['annonce']);
        annonceId = updated?.id ?? editId;
        if (photos.length) {
          const fd = new FormData();
          photos.forEach((p) => fd.append('photos', p));
          await annoncesApi.uploadPhotos(annonceId, fd);
        }
      } else {
        const { data: body } = await annoncesApi.create(payload);
        const created = unwrapEntity<{ id: string }>(body, ['annonce']);
        const newId = created?.id ?? (body as { id?: string }).id;
        if (!newId) throw new Error('MISSING_ID');
        annonceId = newId;
        if (photos.length) {
          const fd = new FormData();
          photos.forEach((p) => fd.append('photos', p));
          await annoncesApi.uploadPhotos(annonceId, fd);
        }
      }

      const nbPhotosExistantes = editId ? (annonceExistante?.annonce_photos?.length ?? 0) : 0;
      const totalPhotos = nbPhotosExistantes + photos.length;

      let toastKind: 'published' | 'saved' | 'needs_photos' = 'saved';
      if (targetStatut === 'publiee') {
        if (totalPhotos < 3) {
          toastKind = 'needs_photos';
        } else {
          await annoncesApi.changeStatut(annonceId, 'publiee');
          toastKind = 'published';
        }
      } else if (editId) {
        await annoncesApi.changeStatut(annonceId, targetStatut);
      }
      return { annonceId, toastKind };
    },
    onSuccess: ({ annonceId, toastKind }) => {
      if (toastKind === 'published') toast(t('publish.toasts.published'), 'success');
      else if (toastKind === 'needs_photos') {
        toast(t('publish.toasts.needPhotos'), 'warning');
      } else toast(t('publish.toasts.saved'), 'success');
      navigate(`/annonces/${annonceId}`);
    },
    onError: (err: unknown) => {
      const axiosErr = err as AxiosError<{ error?: string; message?: string }>;
      const apiMessage = axiosErr.response?.data?.error ?? axiosErr.response?.data?.message;
      if (apiMessage) {
        toast(apiMessage, 'error');
        return;
      }
      toast(t('publish.toasts.publishError'), 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent, statut: AnnonceStatus) => {
    e.preventDefault();
    if (!form.titre.trim() || form.titre.trim().length < 5) {
      toast(t('publish.toasts.titleMin'), 'warning');
      return;
    }
    if (!form.prix || !form.surface_m2 || !form.ville_id || !form.adresse.trim()) {
      toast(t('publish.toasts.requiredMissing'), 'warning');
      return;
    }
    mutation.mutate(statut);
  };

  if (user?.profile_type !== 'offreur') {
    return (
      <PageTransition>
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <h1 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: '1.5rem', fontWeight: 700 }}>{t('publish.hostOnlyTitle')}</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 10 }}>{t('publish.hostOnlyText')}</p>
        </div>
      </PageTransition>
    );
  }

  if (editId && loadingEdit && !hydratedEdit) {
    return (
      <PageTransition>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 48 }}>{t('publish.loadingAd')}</p>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div style={{ maxWidth: 740, margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 'clamp(1.35rem, 4vw, 1.8rem)', fontWeight: 700, marginBottom: 28 }}>
          {editId ? t('publish.editTitle') : t('publish.createTitle')}
        </h1>

        <form style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Titre + service + type */}
          <div className="publier-card" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('publish.generalInfo')}</h2>
            <Input label={t('publish.titleLabel')} placeholder={t('publish.titlePlaceholder')} value={form.titre} onChange={(e) => set('titre', e.target.value)} required />
            <div className="form-grid-2">
              <div>
                <label style={labelStyle}>{t('publish.service')} *</label>
                <select style={selectStyle} value={form.service} onChange={(e) => set('service', e.target.value)}>
                  <option value="vente">{t('annonce.sale')}</option>
                  <option value="location">{t('annonce.rent')}</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>{t('publish.propertyType')} *</label>
                <select style={selectStyle} value={form.type_bien} onChange={(e) => set('type_bien', e.target.value)}>
                  {TYPE_BIENS.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="description" style={labelStyle}>{t('detail.description')}</label>
              <textarea id="description" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder={t('publish.descriptionPlaceholder')} rows={4}
                style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '0.875rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }} />
            </div>
          </div>

          {/* Localisation */}
          <div className="publier-card" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('publish.location')}</h2>
            <div className="form-grid-2">
              <div>
                <label style={labelStyle}>{t('settings.city')} *</label>
                <Input
                  label=""
                  placeholder={t('publish.cityPlaceholder')}
                  value={villeSearch}
                  onChange={(e) => setVilleSearch(e.target.value)}
                  list="publier-villes-suggestions"
                  required
                />
                <datalist id="publier-villes-suggestions">
                  {villesList.map((v) => (
                    <option key={`ville-sug-${v.id}`} value={v.nom} />
                  ))}
                </datalist>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  {form.ville_id ? t('publish.cityRecognized') : t('publish.citySelectSuggestion')}
                </p>
              </div>
              <div>
                <label style={labelStyle}>{t('settings.neighborhood')}</label>
                <Input
                  label=""
                  placeholder={t('publish.neighborhoodPlaceholder')}
                  value={quartierSearch}
                  onChange={(e) => setQuartierSearch(e.target.value)}
                  list="publier-quartiers-suggestions"
                />
                <datalist id="publier-quartiers-suggestions">
                  {quartiersList.map((q) => (
                    <option key={`quartier-sug-${q.id}`} value={q.nom} />
                  ))}
                </datalist>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  {form.quartier_id ? t('publish.neighborhoodRecognized') : t('publish.neighborhoodOptional')}
                </p>
              </div>
            </div>
            <Input label={t('publish.address')} placeholder={t('publish.addressPlaceholder')} value={form.adresse} onChange={(e) => set('adresse', e.target.value)} required />
          </div>

          {/* Caractéristiques */}
          <div className="publier-card" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('publish.features')}</h2>
            <div className="form-grid-3">
              <Input label={t('detail.specs.surface') + ' (m²) *'} type="number" min={1} value={form.surface_m2} onChange={(e) => set('surface_m2', e.target.value)} required />
              <Input label={t('detail.specs.rooms')} type="number" min={0} value={form.nb_chambres} onChange={(e) => set('nb_chambres', e.target.value)} />
              <Input label={t('detail.specs.livingRooms')} type="number" min={0} value={form.nb_sejours} onChange={(e) => set('nb_sejours', e.target.value)} />
              <Input label={t('detail.specs.kitchens')} type="number" min={0} value={form.nb_cuisines} onChange={(e) => set('nb_cuisines', e.target.value)} />
              <Input label={t('detail.specs.showerToilet')} type="number" min={0} value={form.nb_douches_wc} onChange={(e) => set('nb_douches_wc', e.target.value)} />
            </div>
          </div>

          {/* Prix */}
          <div className="publier-card" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('publish.price')}</h2>
            <div className="form-grid-2-asym">
              <Input label={t('publish.priceAr')} type="number" min={0} placeholder={t('publish.pricePlaceholder')} value={form.prix} onChange={(e) => set('prix', e.target.value)} required />
              <Input label={t('publish.unitOptional')} placeholder={t('publish.unitPlaceholder')} value={form.prix_unite} onChange={(e) => set('prix_unite', e.target.value)} />
            </div>
          </div>

          {/* Photos */}
          <div className="publier-card" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('publish.photos', { count: photos.length })}</h2>
            <div {...getRootProps()} style={{ border: `2px dashed ${isDragActive ? 'var(--accent-amber)' : 'var(--border-dim)'}`, borderRadius: 'var(--radius-lg)', padding: '32px', textAlign: 'center', cursor: 'none', background: isDragActive ? 'var(--accent-amber-dim)' : 'transparent', transition: 'all var(--transition-fast)' }}>
              <input {...getInputProps()} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{isDragActive ? t('publish.dropHere') : t('publish.dragOrClick')}</p>
            </div>
            {previews.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {previews.map((url, i) => (
                  <div key={i} style={{ position: 'relative', width: 80, height: 60, borderRadius: 8, overflow: 'hidden' }}>
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => {
                      if (i < existingPreviewCount) {
                        toast(t('publish.removeOnlinePhotosInfo'), 'info');
                        return;
                      }
                      const j = i - existingPreviewCount;
                      setPhotos((p) => p.filter((_, k) => k !== j));
                      setPreviews((p) => p.filter((_, k) => k !== i));
                    }}
                      style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 18, height: 18, color: '#fff', cursor: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0 }}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          {editId && (
            <div className="publier-card" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('publish.statusTitle')}</h2>
              <div className="form-grid-2">
                <div>
                  <label style={labelStyle}>{t('publish.newStatus')}</label>
                  <select
                    style={selectStyle}
                    value={editTargetStatut}
                    onChange={(e) => setEditTargetStatut(e.target.value as AnnonceStatus)}
                  >
                    <option value="brouillon">{t('annonce.draft')}</option>
                    <option value="publiee">{t('annonce.published')}</option>
                    <option value="suspendue">{t('annonce.suspended')}</option>
                    <option value="archivee">{t('annonce.archived')}</option>
                    <option value="vendue_louee">{t('annonce.soldRented')}</option>
                  </select>
                </div>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                {t('publish.soldNeedsVisit')}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {editId ? (
              <Button type="button" onClick={(e) => handleSubmit(e, editTargetStatut)} isLoading={mutation.isPending} style={{ flex: '1 1 200px', minWidth: 0 }}>
                {t('publish.saveAndApply')}
              </Button>
            ) : (
              <>
                <Button type="button" variant="secondary" onClick={(e) => handleSubmit(e, 'brouillon')} isLoading={mutation.isPending} style={{ flex: '1 1 200px' }}>
                  {t('publish.saveDraft')}
                </Button>
                <Button type="button" onClick={(e) => handleSubmit(e, 'publiee')} isLoading={mutation.isPending} style={{ flex: '1 1 200px', minWidth: 0 }}>
                  {t('nav.publish')}
                </Button>
              </>
            )}
          </div>
        </form>
      </div>
    </PageTransition>
  );
}
