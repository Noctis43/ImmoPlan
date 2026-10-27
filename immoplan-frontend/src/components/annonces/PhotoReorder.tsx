import { useState } from 'react';
import { motion } from 'framer-motion';
import { annoncesApi } from '../../lib/api';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/Button';
import type { AnnoncePhoto } from './AnnonceCard';

interface PhotoReorderProps {
  annonceId: string;
  photos: AnnoncePhoto[];
  onReordered?: (photos: AnnoncePhoto[]) => void;
}

export function PhotoReorder({ annonceId, photos: initialPhotos, onReordered }: PhotoReorderProps) {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<AnnoncePhoto[]>(
    [...initialPhotos].sort((a, b) => a.ordre - b.ordre)
  );
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const handleDragStart = (idx: number) => setDragIdx(idx);

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const reordered = [...photos];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    setPhotos(reordered);
    setDragIdx(idx);
  };

  const handleDrop = () => setDragIdx(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      // photoIds: number[] — BigInt IDs from annonce_photos
      const photoIds = photos.map((p) => Number(p.id));
      await annoncesApi.reorderPhotos(annonceId, photoIds);
      const saved = photos.map((p, i) => ({ ...p, ordre: i }));
      onReordered?.(saved);
      toast("Ordre des photos enregistré !", 'success');
    } catch {
      toast("Erreur lors de l'enregistrement", 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Réordonner les photos
        </h4>
        <Button size="sm" onClick={handleSave} isLoading={saving}>
          Enregistrer l&apos;ordre
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {photos.map((p, i) => (
          <motion.div
            key={p.id}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => handleDragOver(e as unknown as React.DragEvent, i)}
            onDrop={handleDrop}
            animate={{ opacity: dragIdx === i ? 0.5 : 1, scale: dragIdx === i ? 0.95 : 1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            style={{
              position: 'relative', width: 100, height: 80,
              borderRadius: 'var(--radius-md)', overflow: 'hidden',
              border: `2px solid ${dragIdx === i ? 'var(--accent-amber)' : 'var(--border-dim)'}`,
              cursor: 'grab', flexShrink: 0,
            }}
          >
            <img src={p.thumbnail_url ?? p.cloudinary_url} alt={`Photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{
              position: 'absolute', top: 4, left: 4,
              background: 'rgba(0,0,0,0.6)', borderRadius: '50%',
              width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.68rem', color: '#fff', fontWeight: 700,
            }}>
              {i + 1}
            </div>
            {i === 0 && (
              <div style={{
                position: 'absolute', bottom: 4, right: 4,
                background: 'var(--accent-amber)', borderRadius: 'var(--radius-sm)',
                padding: '1px 5px', fontSize: '0.6rem', color: '#0A0A0F', fontWeight: 700,
              }}>
                Couv.
              </div>
            )}
          </motion.div>
        ))}
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Glissez-déposez pour modifier l&apos;ordre. La première photo sera la photo de couverture.
      </p>
    </div>
  );
}
