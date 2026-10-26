import { useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { partagesApi } from '../../lib/api';

type SharePlatform = 'whatsapp' | 'telegram' | 'facebook' | 'email' | 'copier_lien';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  annonceId: string;
  url: string;
  titre?: string;
}

function buildPlatformUrl(platform: Exclude<SharePlatform, 'copier_lien'>, url: string, titre?: string): string {
  const t = titre?.trim() ? titre.trim() : 'Annonce ImmoPlan';
  const text = `${t} — ${url}`;
  const u = encodeURIComponent(url);
  const te = encodeURIComponent(text);

  switch (platform) {
    case 'whatsapp':
      return `https://wa.me/?text=${te}`;
    case 'telegram':
      return `https://t.me/share/url?url=${u}&text=${encodeURIComponent(t)}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    case 'email':
      return `mailto:?subject=${encodeURIComponent(t)}&body=${te}`;
    default:
      return url;
  }
}

export function ShareModal({ isOpen, onClose, annonceId, url, titre }: ShareModalProps) {
  const { toast } = useToast();

  const items = useMemo(
    () =>
      [
        { id: 'whatsapp', label: 'WhatsApp' },
        { id: 'telegram', label: 'Telegram' },
        { id: 'facebook', label: 'Facebook' },
        { id: 'email', label: 'Email' },
      ] as const,
    [],
  );

  const record = async (plateforme: SharePlatform) => {
    try {
      await partagesApi.partager(annonceId, { plateforme });
    } catch {
      // best effort
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      await record('copier_lien');
      toast('Lien copié', 'success');
      onClose();
    } catch {
      toast('Impossible de copier le lien', 'error');
    }
  };

  const handlePlatform = async (platform: Exclude<SharePlatform, 'copier_lien'>) => {
    const shareUrl = buildPlatformUrl(platform, url, titre);
    await record(platform);
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Partager" size="sm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          style={{
            padding: 12,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-elevated)',
            color: 'var(--text-muted)',
            fontSize: '0.82rem',
            wordBreak: 'break-all',
          }}
        >
          {url}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {items.map((it) => (
            <Button key={it.id} type="button" variant="secondary" onClick={() => handlePlatform(it.id)}>
              {it.label}
            </Button>
          ))}
        </div>

        <Button type="button" onClick={handleCopy} fullWidth>
          Copier le lien
        </Button>
      </div>
    </Modal>
  );
}

