import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '../ui/Badge';
import { useAuthStore } from '../../store/auth';
import { interactionsApi } from '../../lib/api';
import { useToast } from '../ui/Toast';
import { ShareModal } from '../share/ShareModal';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '../../lib/locale';

export type AnnonceStatus = 'brouillon' | 'publiee' | 'suspendue' | 'archivee' | 'vendue_louee';
export type ServiceType = 'location' | 'vente';
export type PropertyType = 'appartement' | 'maison' | 'villa' | 'studio' | 'duplex' | 'bureau' | 'local_commercial' | 'terrain' | 'entrepot' | 'autre';

export interface AnnoncePhoto {
  id: number;
  cloudinary_url: string;
  thumbnail_url?: string;
  ordre: number;
}

export interface Annonce {
  id: string;
  offreur_id: string;
  statut: AnnonceStatus;
  service: ServiceType;
  type_bien: PropertyType;
  ville_id: number;
  quartier_id?: number;
  adresse: string;
  surface_m2: number;
  nb_chambres: number;
  nb_sejours: number;
  nb_cuisines: number;
  nb_douches_wc: number;
  prix: number;
  prix_unite?: string;
  titre: string;
  description?: string;
  nb_vues: number;
  nb_likes: number;
  nb_avis: number;
  note_moyenne?: number;
  published_at?: string;
  created_at: string;
  annonce_photos?: AnnoncePhoto[];
  profiles?: { id: string; nom: string; prenom: string; avatar_url?: string; localisation_ville?: string };
  villes?: { id: number; nom: string };
  quartiers?: { id: number; nom: string };
  isLiked?: boolean; // Changé de _isLiked à isLiked pour correspondre au backend
  isSaved?: boolean; // Ajouté pour correspondre à l'utilisation dans Feed.tsx
}

const STATUS_BADGE: Record<AnnonceStatus, { labelKey: string; variant: 'amber' | 'teal' | 'red' | 'muted' | 'blue' | 'green' }> = {
  brouillon: { labelKey: 'annonce.draft', variant: 'muted' },
  publiee: { labelKey: 'annonce.published', variant: 'teal' },
  suspendue: { labelKey: 'annonce.suspended', variant: 'red' },
  archivee: { labelKey: 'annonce.archived', variant: 'muted' },
  vendue_louee: { labelKey: 'annonce.soldRented', variant: 'blue' },
};

interface AnnonceCardProps {
  annonce: Annonce;
  showStatus?: boolean;
  compact?: boolean;
}

function readBooleanField(source: unknown, keys: string[]): boolean {
  if (!source || typeof source !== 'object') return false;
  const obj = source as Record<string, unknown>;
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') return true;
      if (normalized === 'false' || normalized === '0') return false;
    }
  }
  return false;
}

function readNumberField(source: unknown, keys: string[], fallback = 0): number {
  if (!source || typeof source !== 'object') return fallback;
  const obj = source as Record<string, unknown>;
  for (const key of keys) {
    const value = Number(obj[key]);
    if (Number.isFinite(value)) return value;
  }
  return fallback;
}

export function AnnonceCard({ annonce, showStatus = false, compact = false }: AnnonceCardProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const likedFromAnnonce = readBooleanField(annonce, ['isLiked', 'is_liked', 'liked']);
  const savedFromAnnonce = readBooleanField(annonce, ['isSaved', 'is_saved', 'saved']);
  const likeCountFromAnnonce = readNumberField(annonce, ['nb_likes', 'nbLikes', 'likes_count'], 0);
  const [liked, setLiked] = useState(likedFromAnnonce);
  const [saved, setSaved] = useState(savedFromAnnonce);
  const [likeCount, setLikeCount] = useState(likeCountFromAnnonce);
  const [shareOpen, setShareOpen] = useState(false);
  const [isLikeMutating, setIsLikeMutating] = useState(false);

  // Synchroniser l'état avec les props quand ils changent
  useEffect(() => {
    if (!isLikeMutating) {
      setLiked(likedFromAnnonce);
    }
    setSaved(savedFromAnnonce);
    setLikeCount(likeCountFromAnnonce);
  }, [annonce, likedFromAnnonce, savedFromAnnonce, likeCountFromAnnonce, isLikeMutating]);

  const sortedPhotos = [...(annonce.annonce_photos ?? [])].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
  const photo = sortedPhotos[0];
  /** Vignette SQL (carte / certains endpoints) sans tableau `annonce_photos`. */
  const carteThumbnail = (annonce as unknown as { thumbnail?: string | null }).thumbnail;
  const photoUrl =
    photo?.cloudinary_url ||
    photo?.thumbnail_url ||
    (typeof carteThumbnail === 'string' && carteThumbnail ? carteThumbnail : null) ||
    `https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80`;

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) { toast(t('annonce.connectLike'), 'info'); return; }
    
    const prev = liked;
    setIsLikeMutating(true);
    
    try {
      if (prev) {
        await interactionsApi.unlike(annonce.id);
        setLiked(false);
        const likesRes = await interactionsApi.getLikes(annonce.id);
        const count = Number(likesRes.data?.data?.count ?? likesRes.data?.count ?? 0);
        setLikeCount(Number.isFinite(count) ? count : 0);
        toast(t('annonce.likeRemoved'), 'success');
      } else {
        await interactionsApi.like(annonce.id);
        setLiked(true);
        const likesRes = await interactionsApi.getLikes(annonce.id);
        const count = Number(likesRes.data?.data?.count ?? likesRes.data?.count ?? 0);
        setLikeCount(Number.isFinite(count) ? count : 0);
        toast(t('annonce.likeAdded'), 'success');
      }
      
      // Invalider le cache React Query pour forcer la mise à jour
      queryClient.invalidateQueries({ queryKey: ['annonces'] });
      queryClient.invalidateQueries({ queryKey: ['annonce', annonce.id] });
      queryClient.invalidateQueries({ queryKey: ['interactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['statistiques/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['annonces/me'] });
    } catch (error) {
      console.error('Erreur lors du like/unlike:', error);
      toast(t('annonce.actionError'), 'error');
      setLiked(prev); // Restaurer l'état précédent en cas d'erreur
    } finally {
      setIsLikeMutating(false);
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) { toast(t('annonce.connectSave'), 'info'); return; }
    if (user.profile_type !== 'chercheur') { toast(t('annonce.seekerOnly'), 'info'); return; }
    
    const prev = saved;
    setSaved(!prev);
    
    try {
      if (prev) {
        await interactionsApi.unsauvegarder(annonce.id);
        toast(t('annonce.removedSaves'), 'success');
      } else {
        await interactionsApi.sauvegarder(annonce.id);
        toast(t('annonce.addedSaves'), 'success');
      }
      
      // Invalider le cache React Query pour forcer la mise à jour
      queryClient.invalidateQueries({ queryKey: ['annonces'] });
      queryClient.invalidateQueries({ queryKey: ['interactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (error) {
      console.error('Erreur lors du save/unsave:', error);
      toast(t('annonce.unauthorizedProfile'), 'error');
      setSaved(prev); // Restaurer l'état précédent en cas d'erreur
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast(t('annonce.connectShare'), 'info');
      return;
    }
    setShareOpen(true);
  };

  return (
    <motion.article
      className="annonce-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      whileHover={{ y: -4 }}
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        annonceId={annonce.id}
        url={`${window.location.origin}/annonces/${annonce.id}`}
        titre={annonce.titre}
      />
      <Link to={`/annonces/${annonce.id}`} style={{ display: 'block', textDecoration: 'none' }}>
        {/* Photo */}
        <div style={{ position: 'relative', aspectRatio: compact ? '16/9' : '4/3', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
          <img
            src={photoUrl}
            alt={annonce.titre}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            loading="lazy"
          />
          {/* Badges overlay */}
          <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Badge variant={annonce.service === 'vente' ? 'amber' : 'teal'}>
              {annonce.service === 'vente' ? t('annonce.sale') : t('annonce.rent')}
            </Badge>
            {showStatus && <Badge variant={STATUS_BADGE[annonce.statut].variant}>{t(STATUS_BADGE[annonce.statut].labelKey)}</Badge>}
          </div>
          {/* Photo count */}
          {sortedPhotos.length > 1 && (
            <div style={{
              position: 'absolute', bottom: 10, right: 10,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              borderRadius: 'var(--radius-sm)', padding: '3px 8px',
              fontSize: '0.72rem', color: '#fff', display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              {sortedPhotos.length}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
              <h3 style={{
                fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {annonce.titre}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {annonce.villes?.nom ?? '—'}{annonce.quartiers ? `, ${annonce.quartiers.nom}` : ''}
              </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <span style={{ fontFamily: "'Clash Display', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
                {formatNumber(Number(annonce.prix), i18n.resolvedLanguage)}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>
                Ar{annonce.prix_unite ? `/${annonce.prix_unite}` : ''}
              </span>
            </div>
          </div>

          {/* Specs row */}
          <div style={{ display: 'flex', gap: 14, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
            {[
              { icon: '⊞', val: `${annonce.surface_m2} m²` },
              annonce.nb_chambres > 0 ? { icon: '🛏', val: `${annonce.nb_chambres} ${t('annonce.roomsShort')}` } : null,
              { icon: '🏠', val: annonce.type_bien },
            ].filter(Boolean).map((spec, i) => (
              <span key={i} style={{ fontSize: '0.77rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                {spec!.val}
              </span>
            ))}
          </div>
        </div>
      </Link>

      {/* Actions (outside Link to prevent nesting) */}
      <div style={{
        display: 'flex', gap: 8, padding: '0 16px 14px',
      }}>
        <button
          aria-label={liked ? t('annonce.unlike') : t('annonce.like')}
          aria-pressed={liked}
          onClick={handleLike}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: '1px solid var(--border-dim)',
            borderRadius: 'var(--radius-md)', padding: '6px 10px',
            color: liked ? 'var(--accent-amber)' : 'var(--text-muted)',
            cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500,
            transition: 'all var(--transition-fast)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          {likeCount}
        </button>
        <button
          aria-label={saved ? t('annonce.unsave') : t('annonce.save')}
          aria-pressed={saved}
          onClick={handleSave}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: '1px solid var(--border-dim)',
            borderRadius: 'var(--radius-md)', padding: '6px 10px',
            color: saved ? 'var(--accent-teal)' : 'var(--text-muted)',
            cursor: 'pointer', fontSize: '0.78rem',
            transition: 'all var(--transition-fast)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
        <button
          type="button"
          aria-label={t('annonce.share')}
          onClick={handleShare}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: '1px solid var(--border-dim)',
            borderRadius: 'var(--radius-md)', padding: '6px 10px',
            color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: '0.78rem',
            transition: 'all var(--transition-fast)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        </button>
      </div>
    </motion.article>
  );
}
