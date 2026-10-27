import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AnnoncePhoto } from './AnnonceCard';

interface PhotoGalleryProps {
  photos: AnnoncePhoto[];
  title?: string;
}

export function PhotoGallery({ photos, title }: PhotoGalleryProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!photos.length) return null;

  const sorted = [...photos].sort((a, b) => a.ordre - b.ordre);
  const active = sorted[activeIdx];

  return (
    <>
      <div style={{ userSelect: 'none' }}>
        {/* Main photo */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16/9',
            overflow: 'hidden',
            borderRadius: 'var(--radius-xl)',
            background: 'var(--bg-secondary)',
            cursor: 'zoom-in',
          }}
          onClick={() => setLightboxOpen(true)}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={activeIdx}
              src={active.cloudinary_url}
              alt={title ?? 'Photo'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </AnimatePresence>
          {/* Counter */}
          <div style={{
            position: 'absolute', bottom: 14, right: 14,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
            borderRadius: 'var(--radius-full)', padding: '4px 14px',
            fontSize: '0.8rem', color: '#fff', fontWeight: 600,
          }}>
            {activeIdx + 1} / {sorted.length}
          </div>
          {/* Prev / Next */}
          {sorted.length > 1 && (
            <>
              {activeIdx > 0 && (
                <button
                  aria-label="Photo précédente"
                  onClick={(e) => { e.stopPropagation(); setActiveIdx((i) => i - 1); }}
                  style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'none' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
              )}
              {activeIdx < sorted.length - 1 && (
                <button
                  aria-label="Photo suivante"
                  onClick={(e) => { e.stopPropagation(); setActiveIdx((i) => i + 1); }}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'none' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              )}
            </>
          )}
        </div>

        {/* Thumbnails */}
        {sorted.length > 1 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto', padding: '4px 0' }}>
            {sorted.map((p, i) => (
              <button
                key={p.id}
                aria-label={`Photo ${i + 1}`}
                aria-pressed={i === activeIdx}
                onClick={() => setActiveIdx(i)}
                style={{
                  flexShrink: 0, width: 72, height: 52,
                  borderRadius: 'var(--radius-md)', overflow: 'hidden',
                  border: `2px solid ${i === activeIdx ? 'var(--accent-amber)' : 'transparent'}`,
                  cursor: 'none', padding: 0, background: 'none',
                  transition: 'border-color var(--transition-fast)',
                }}
              >
                <img src={p.thumbnail_url ?? p.cloudinary_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9998,
              background: 'rgba(0,0,0,0.92)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', padding: 24,
            }}
          >
            <img
              src={active.cloudinary_url}
              alt={title}
              style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 'var(--radius-md)' }}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              aria-label="Fermer"
              onClick={() => setLightboxOpen(false)}
              style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, color: '#fff', cursor: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
