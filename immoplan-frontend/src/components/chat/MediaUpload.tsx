import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useToast } from '../ui/Toast';

interface MediaUploadProps {
  onFile: (file: File) => void;
}

const ACCEPTED: Record<string, string[]> = {
  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  'video/*': ['.mp4', '.mov'],
  'application/pdf': ['.pdf'],
};

export function MediaUpload({ onFile }: MediaUploadProps) {
  const { toast } = useToast();

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) onFile(accepted[0]);
    },
    [onFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    onDropRejected: () => toast('Fichier trop volumineux ou type non supporté', 'error'),
  });

  return (
    <button
      type="button"
      {...getRootProps()}
      aria-label="Joindre un fichier"
      title="Joindre un fichier (image, vidéo, PDF — max 10 Mo)"
      style={{
        background: isDragActive ? 'var(--accent-amber-dim)' : 'var(--bg-elevated)',
        border: `1px solid ${isDragActive ? 'var(--accent-amber)' : 'var(--border-dim)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '10px',
        color: isDragActive ? 'var(--accent-amber)' : 'var(--text-muted)',
        cursor: 'none',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all var(--transition-fast)',
      }}
    >
      <input {...getInputProps()} />
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
      </svg>
    </button>
  );
}
