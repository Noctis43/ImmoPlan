import { useState } from 'react';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { interactionsApi } from '../../lib/api';

interface AvisFormProps {
  annonceId: string;
  existingAvisId?: string;
  existingNote?: number;
  existingCommentaire?: string;
  onSuccess?: () => void;
}

export function AvisForm({ annonceId, existingAvisId, existingNote = 0, existingCommentaire = '', onSuccess }: AvisFormProps) {
  const { toast } = useToast();
  const [note, setNote] = useState(existingNote);
  const [hovered, setHovered] = useState(0);
  const [commentaire, setCommentaire] = useState(existingCommentaire);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (note < 1) { toast('Sélectionnez une note', 'warning'); return; }
    setLoading(true);
    try {
      if (existingAvisId) {
        await interactionsApi.updateAvis(existingAvisId, { note, commentaire });
        toast('Avis modifié !', 'success');
      } else {
        await interactionsApi.submitAvis(annonceId, { note, commentaire });
        toast('Avis publié !', 'success');
      }
      onSuccess?.();
    } catch {
      toast("Erreur lors de l'envoi de l'avis", 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          Note (1-5)
        </p>
        <div style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1} étoile${i > 0 ? 's' : ''}`}
              onMouseEnter={() => setHovered(i + 1)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setNote(i + 1)}
              style={{ background: 'none', border: 'none', cursor: 'none', padding: 2 }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24"
                fill={(hovered || note) > i ? '#F5A623' : 'none'}
                stroke="#F5A623" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="commentaire" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
          Commentaire (optionnel)
        </label>
        <textarea
          id="commentaire"
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          placeholder="Partagez votre expérience..."
          rows={3}
          style={{
            width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)',
            borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--text-primary)',
            fontSize: '0.875rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit',
          }}
        />
      </div>

      <Button type="submit" isLoading={loading} size="sm">
        {existingAvisId ? 'Modifier' : 'Publier'} l&apos;avis
      </Button>
    </form>
  );
}
