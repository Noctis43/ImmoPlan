import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { profilesApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import { useToast } from '../ui/Toast';
import { unwrapEntity } from '../../lib/unwrap';

export function AvatarUpload() {
  const { user, setUser } = useAuthStore();
  const { toast } = useToast();
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      setPreview(url);
      const formData = new FormData();
      formData.append('avatar', file);
      setUploading(true);
      try {
        const { data } = await profilesApi.uploadAvatar(formData);
        const profile = unwrapEntity<{ avatar_url?: string | null }>(data);
        setUser({ ...user!, avatar_url: profile?.avatar_url ?? user!.avatar_url });
        toast('Photo de profil mise à jour !', 'success');
      } catch {
        toast("Erreur lors du téléversement", 'error');
        setPreview(null);
      } finally {
        setUploading(false);
      }
    },
    [user, setUser, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    onDropRejected: () => toast('Image trop grande (max 5 Mo) ou format invalide', 'error'),
  });

  const currentPhoto = preview ?? user?.avatar_url;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <motion.div
        whileHover={{ scale: 1.04 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        {...(getRootProps() as any)}
        role="button"
        aria-label="Changer la photo de profil"
        style={{
          width: 100, height: 100, borderRadius: '50%',
          border: `2px dashed ${isDragActive ? 'var(--accent-amber)' : 'var(--border-dim)'}`,
          background: isDragActive ? 'var(--accent-amber-dim)' : 'var(--bg-elevated)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', cursor: 'none', position: 'relative',
        }}
      >
        <input {...getInputProps()} />
        {currentPhoto ? (
          <img src={currentPhoto} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        )}
        {uploading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 24, height: 24, border: '2px solid var(--accent-amber)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}
      </motion.div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        Glissez une image ou cliquez — JPG/PNG/WebP, max 5 Mo
        <br />Traité par Cloudinary
      </p>
    </div>
  );
}
