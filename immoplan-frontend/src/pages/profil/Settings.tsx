import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth';
import { profilesApi, authApi, recommandationApi, geoApi } from '../../lib/api';
import { VilleAutocomplete } from '../../components/geo/VilleAutocomplete';
import { destroySocket } from '../../lib/socket';
import { AvatarUpload } from '../../components/profile/AvatarUpload';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { PageTransition } from '../../components/layout/PageTransition';
import { Tabs } from '../../components/ui/Tabs';
import { unwrapEntity } from '../../lib/unwrap';
import { getPasswordStrength } from '../../lib/passwordStrength';
import { useTranslation } from 'react-i18next';

export default function Settings() {
  const { t } = useTranslation();
  const { user, setUser, logout } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [profileForm, setProfileForm] = useState({
    nom: user?.nom ?? '',
    prenom: user?.prenom ?? '',
    telephone: user?.telephone ?? '',
    bio: (user as unknown as Record<string, string>)?.bio ?? '',
    localisation_ville: user?.localisation_ville ?? '',
    localisation_quartier: user?.localisation_quartier ?? '',
  });

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const newPwStrength = getPasswordStrength(pwForm.newPassword);
  const [recoForm, setRecoForm] = useState({
    prix_min: '',
    prix_max: '',
    service: '' as '' | 'vente' | 'location',
    ville_id: '',
    ville_label: '',
  });

  const isChercheur = user?.profile_type === 'chercheur';
  const TABS = [
    { id: 'profil', label: t('settings.tabs.profile') },
    { id: 'securite', label: t('settings.tabs.security') },
    { id: 'preferences', label: t('settings.tabs.preferences') },
  ];

  const { data: recoPrefsData } = useQuery({
    queryKey: ['recommandation', 'preferences'],
    queryFn: () => recommandationApi.getPreferences().then((r) => r.data),
    enabled: isChercheur,
  });
  const { data: villesData } = useQuery({
    queryKey: ['geo', 'villes', 'settings'],
    queryFn: () => geoApi.getVilles().then((r) => r.data),
    enabled: isChercheur,
  });
  const villes = Array.isArray(villesData?.data) ? villesData.data : Array.isArray(villesData) ? villesData : [];

  useEffect(() => {
    if (!recoPrefsData) return;
    const p = (recoPrefsData as { data?: Record<string, unknown> })?.data ?? (recoPrefsData as Record<string, unknown>);
    const villeId = p.ville_id != null ? String(p.ville_id) : '';
    const villeFromList = villes.find((v: { id: number }) => String(v.id) === villeId);
    setRecoForm({
      prix_min: p.prix_min != null ? String(p.prix_min) : '',
      prix_max: p.prix_max != null ? String(p.prix_max) : '',
      service: (p.service as '' | 'vente' | 'location' | undefined) ?? '',
      ville_id: villeId,
      ville_label: villeFromList?.nom ?? '',
    });
  }, [recoPrefsData, villes]);

  const profileMutation = useMutation({
    mutationFn: () => {
      const tel = profileForm.telephone.trim();
      if (tel && !/^03[0-9]{8}$/.test(tel)) {
        throw new Error('BAD_PHONE');
      }
      const payload: Record<string, unknown> = {
        nom: profileForm.nom.trim() || undefined,
        prenom: profileForm.prenom.trim() || undefined,
        bio: profileForm.bio.trim() || undefined,
        localisation_ville: profileForm.localisation_ville.trim() || undefined,
        localisation_quartier: profileForm.localisation_quartier.trim() || undefined,
      };
      if (tel) payload.telephone = tel;
      return profilesApi.updateMe(payload);
    },
    onSuccess: (res) => {
      const updated = unwrapEntity<Record<string, unknown>>(res.data) ?? res.data;
      if (updated && typeof updated === 'object') setUser({ ...user!, ...updated });
      toast(t('settings.toasts.profileUpdated'), 'success');
      qc.invalidateQueries({ queryKey: ['profil'] });
    },
    onError: (err: Error) => {
      if (err.message === 'BAD_PHONE') toast(t('settings.toasts.phoneFormat'), 'warning');
      else toast(t('settings.toasts.updateError'), 'error');
    },
  });

  const pwMutation = useMutation({
    mutationFn: () => {
      if (pwForm.newPassword !== pwForm.confirmPassword) throw new Error('mismatch');
      if (!newPwStrength.canSubmit) throw new Error('weak');
      return authApi.changePassword(pwForm.currentPassword, pwForm.newPassword);
    },
    onSuccess: () => { toast(t('settings.toasts.passwordUpdated'), 'success'); setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); },
    onError: (err: Error) => {
      if (err.message === 'mismatch') toast(t('settings.toasts.passwordMismatch'), 'error');
      else if (err.message === 'weak') toast(t('settings.toasts.passwordWeak'), 'error');
      else toast(t('settings.toasts.currentPasswordWrong'), 'error');
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => authApi.deleteAccount(),
    onSuccess: () => {
      destroySocket();
      logout();
    },
    onError: () => toast(t('settings.toasts.deleteError'), 'error'),
  });

  const recoMutation = useMutation({
    mutationFn: () => {
      const prixMin = recoForm.prix_min.trim() ? Number(recoForm.prix_min) : undefined;
      const prixMax = recoForm.prix_max.trim() ? Number(recoForm.prix_max) : undefined;
      if ((prixMin !== undefined && Number.isNaN(prixMin)) || (prixMax !== undefined && Number.isNaN(prixMax))) {
        throw new Error('BAD_PRICE');
      }
      if (prixMin !== undefined && prixMax !== undefined && prixMin > prixMax) {
        throw new Error('BAD_RANGE');
      }
      if (!recoForm.service) throw new Error('MISSING_SERVICE');
      if (!recoForm.ville_id) throw new Error('MISSING_VILLE');
      if (prixMin === undefined || prixMax === undefined) throw new Error('MISSING_PRICE');
      return recommandationApi.updatePreferences({
        prix_min: prixMin,
        prix_max: prixMax,
        service: recoForm.service,
        ville_id: Number(recoForm.ville_id),
      });
    },
    onSuccess: () => {
      toast(t('settings.toasts.preferencesUpdated'), 'success');
      qc.invalidateQueries({ queryKey: ['recommandation', 'preferences'] });
      qc.invalidateQueries({ queryKey: ['recommandations/personalise'] });
    },
    onError: (err: Error) => {
      if (err.message === 'BAD_PRICE' || err.message === 'MISSING_PRICE') toast(t('settings.toasts.invalidPrice'), 'error');
      else if (err.message === 'BAD_RANGE') toast(t('settings.toasts.invalidRange'), 'error');
      else if (err.message === 'MISSING_SERVICE' || err.message === 'MISSING_VILLE') {
        toast(t('publish.citySelectSuggestion'), 'warning');
      }
      else toast(t('settings.toasts.preferencesError'), 'error');
    },
  });

  const set = (key: string, val: string) => setProfileForm((f) => ({ ...f, [key]: val }));

  return (
    <PageTransition>
      <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>
        <h1 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: '1.8rem', fontWeight: 700 }}>
          {t('settings.title')}
        </h1>

        <Tabs tabs={TABS} defaultTab="profil">
          {(activeTab) => (
            <>
              {activeTab === 'profil' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', padding: '28px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('settings.profilePhoto')}</h2>
                    <AvatarUpload />
                  </div>

                  <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', padding: '28px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('settings.personalInfo')}</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <Input label={t('settings.firstName')} value={profileForm.prenom} onChange={(e) => set('prenom', e.target.value)} />
                      <Input label={t('settings.lastName')} value={profileForm.nom} onChange={(e) => set('nom', e.target.value)} />
                    </div>
                    <Input label={t('settings.phone')} value={profileForm.telephone} onChange={(e) => set('telephone', e.target.value)} />
                    <div>
                      <label htmlFor="bio" style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>{t('settings.bio')}</label>
                      <textarea id="bio" value={profileForm.bio} onChange={(e) => set('bio', e.target.value)} rows={3}
                        style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '0.875rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <Input label={t('settings.city')} value={profileForm.localisation_ville} onChange={(e) => set('localisation_ville', e.target.value)} />
                      <Input label={t('settings.neighborhood')} value={profileForm.localisation_quartier} onChange={(e) => set('localisation_quartier', e.target.value)} />
                    </div>
                    <Button onClick={() => profileMutation.mutate()} isLoading={profileMutation.isPending}>{t('settings.save')}</Button>
                  </div>
                </div>
              )}

              {activeTab === 'securite' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', padding: '28px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('settings.changePassword')}</h2>
                    <PasswordInput label={t('settings.currentPassword')} value={pwForm.currentPassword} onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))} />
                    <PasswordInput label={t('settings.newPassword')} value={pwForm.newPassword} onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))} />
                    <div style={{ marginTop: -6 }}>
                      <div style={{ height: 8, background: 'var(--bg-elevated)', borderRadius: 999, overflow: 'hidden', border: '1px solid var(--border-dim)' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.max(10, (newPwStrength.score / 5) * 100)}%`,
                            background: newPwStrength.color,
                            transition: 'all 160ms ease',
                          }}
                        />
                      </div>
                      <p style={{ fontSize: '0.75rem', marginTop: 6, color: newPwStrength.color }}>
                        {t('settings.strength')}: {newPwStrength.label}
                      </p>
                    </div>
                    <PasswordInput label={t('settings.confirm')} value={pwForm.confirmPassword} onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))} />
                    <Button onClick={() => pwMutation.mutate()} isLoading={pwMutation.isPending}>{t('settings.changePasswordAction')}</Button>
                  </div>

                  <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', padding: '28px', border: '1px solid #FF4D4D30', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FF4D4D', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('settings.dangerZone')}</h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t('settings.deleteWarning')}</p>
                    <Button
                      variant="danger"
                      onClick={() => { if (window.confirm(t('settings.deleteConfirm'))) deleteAccountMutation.mutate(); }}
                      isLoading={deleteAccountMutation.isPending}
                    >
                      {t('settings.deleteAccount')}
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === 'preferences' && (
                <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', padding: '28px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {isChercheur ? (
                    <>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        {t('settings.preferencesHelp')}
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Input label={t('settings.minPrice')} type="number" value={recoForm.prix_min} onChange={(e) => setRecoForm((f) => ({ ...f, prix_min: e.target.value }))} />
                        <Input label={t('settings.maxPrice')} type="number" value={recoForm.prix_max} onChange={(e) => setRecoForm((f) => ({ ...f, prix_max: e.target.value }))} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label htmlFor="prefServiceSettings" style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                            {t('settings.service')}
                          </label>
                          <select
                            id="prefServiceSettings"
                            value={recoForm.service}
                            onChange={(e) => setRecoForm((f) => ({ ...f, service: e.target.value as '' | 'vente' | 'location' }))}
                            style={{ width: '100%', height: 42, background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-md)', padding: '0 12px', color: 'var(--text-primary)', fontSize: '0.875rem' }}
                          >
                            <option value="">{t('register.choose')}</option>
                            <option value="vente">{t('annonce.sale')}</option>
                            <option value="location">{t('annonce.rent')}</option>
                          </select>
                        </div>
                        <VilleAutocomplete
                          label={t('settings.city')}
                          valueId={recoForm.ville_id}
                          valueLabel={recoForm.ville_label}
                          onChange={(id, nom) => setRecoForm((f) => ({ ...f, ville_id: id, ville_label: nom }))}
                          placeholder={t('publish.cityPlaceholder')}
                          required
                          hintRecognized={t('publish.cityRecognized')}
                          hintSelect={t('publish.citySelectSuggestion')}
                        />
                      </div>
                      <Button onClick={() => recoMutation.mutate()} isLoading={recoMutation.isPending}>
                        {t('settings.savePreferences')}
                      </Button>
                    </>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {t('settings.preferencesSeekerOnly')}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </Tabs>
      </div>
    </PageTransition>
  );
}
