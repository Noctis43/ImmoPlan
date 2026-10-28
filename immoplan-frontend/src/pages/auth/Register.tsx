import { AnimatePresence, motion } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PageTransition } from '../../components/layout/PageTransition';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { useToast } from '../../components/ui/Toast';
import { authApi, geoApi, profilesApi } from '../../lib/api';
import { VilleAutocomplete } from '../../components/geo/VilleAutocomplete';
import { connectSocket, notifySocketAuthChanged } from '../../lib/socket';
import { useAuthStore } from '../../store/auth';
import { getPasswordStrength } from '../../lib/passwordStrength';
import { useTranslation } from 'react-i18next';

// Fix default Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

type Step = 1 | 2 | 3 | 4;
type ProfileType = 'offreur' | 'chercheur';

interface Ville {
  id: number;
  nom: string;
  longitude: number | null;
  latitude: number | null;
  code_postal: string | null;
}

// Fonction pour parser les coordonnées depuis le format POINT(lng lat)
function parseCoordinates(geom: string | null): { longitude: number | null; latitude: number | null } {
  if (!geom) return { longitude: null, latitude: null };
  
  // Parser le format POINT(longitude latitude)
  const match = geom.match(/POINT\(([-\d.]+)\s+([-d.]+)\)/);
  if (match) {
    return {
      longitude: parseFloat(match[1]),
      latitude: parseFloat(match[2])
    };
  }
  
  return { longitude: null, latitude: null };
}

/** Helper component: recenter map when coordinates change */
function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 12, { animate: true });
  }, [map, lat, lng]);
  return null;
}

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const passwordStrength = getPasswordStrength(password);
  // Step 2
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [profileType, setProfileType] = useState<ProfileType>('chercheur');
  // Step 3 (localisation)
  const [locVilleId, setLocVilleId] = useState('');
  const [locVilleSearch, setLocVilleSearch] = useState('');
  // Step 4 (préférences recommandation chercheur)
  const [prefPrixMin, setPrefPrixMin] = useState('');
  const [prefPrixMax, setPrefPrixMax] = useState('');
  const [prefService, setPrefService] = useState<'vente' | 'location' | ''>('');
  const [prefVilleId, setPrefVilleId] = useState('');
  const [prefVilleLabel, setPrefVilleLabel] = useState('');

  const { data: villesData } = useQuery({
    queryKey: ['geo', 'villes', 'register'],
    queryFn: () => geoApi.getVilles().then((r) => r.data),
  });

  const villes: Ville[] = useMemo(() => {
    const raw = Array.isArray(villesData?.data) ? villesData.data : Array.isArray(villesData) ? villesData : [];
    return raw as Ville[];
  }, [villesData]);

  const normalize = (value: string) => value.trim().toLowerCase();

  const resolveVilleId = (label: string): string => {
    const query = normalize(label);
    if (!query) return '';
    const exact = villes.find((v) => normalize(v.nom) === query);
    if (exact) return String(exact.id);
    const starts = villes.filter((v) => normalize(v.nom).startsWith(query));
    if (starts.length === 1) return String(starts[0].id);
    return '';
  };

  // Find selected city for map display
  const selectedVille = useMemo(() => {
    if (!locVilleId) return null;
    const ville = villes.find((v) => String(v.id) === locVilleId);
    if (!ville) return null;
    
    // Parser les coordonnées depuis le format POINT
    const coords = parseCoordinates(String(ville.longitude || ''));
    return {
      ...ville,
      longitude: coords.longitude,
      latitude: coords.latitude
    };
  }, [locVilleId, villes]);

  useEffect(() => {
    setLocVilleId(resolveVilleId(locVilleSearch));
  }, [locVilleSearch, villes]);

  const goNext = () => {
    if (step === 1) {
      if (!email || !password || !confirmPassword) { toast(t('register.fillAllFields'), 'warning'); return; }
      if (password !== confirmPassword) { toast(t('register.passwordMismatch'), 'error'); return; }
      if (!passwordStrength.canSubmit) {
        toast(t('register.weakPasswordLong'), 'error');
        return;
      }
    }
    if (step === 2) {
      if (!nom || !prenom || !telephone || !dateNaissance) { toast(t('register.fillAllFields'), 'warning'); return; }
      if (!/^03[0-9]{8}$/.test(telephone)) { toast(t('register.phoneFormat'), 'error'); return; }
    }
    if (step === 4 && profileType === 'chercheur') {
      const min = prefPrixMin.trim() ? Number(prefPrixMin) : undefined;
      const max = prefPrixMax.trim() ? Number(prefPrixMax) : undefined;
      if ((min !== undefined && Number.isNaN(min)) || (max !== undefined && Number.isNaN(max))) {
        toast(t('settings.toasts.invalidPrice'), 'error');
        return;
      }
      if (min !== undefined && max !== undefined && min > max) {
        toast(t('settings.toasts.invalidRange'), 'error');
        return;
      }
      if (!prefService || !prefVilleId) {
        toast(t('register.chooseServiceCity'), 'warning');
        return;
      }
      if (!prefPrixMin.trim() || !prefPrixMax.trim()) {
        toast(t('settings.toasts.invalidPrice'), 'warning');
        return;
      }
    }
    if (step < (profileType === 'chercheur' ? 4 : 3)) setStep((s) => (s + 1) as Step);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.register({
        email, password, confirmPassword,
        nom, prenom, telephone,
        date_naissance: dateNaissance,
        profile_type: profileType,
        recommandation_preferences: profileType === 'chercheur'
          ? {
              prix_min: prefPrixMin.trim() ? Number(prefPrixMin) : undefined,
              prix_max: prefPrixMax.trim() ? Number(prefPrixMax) : undefined,
              service: prefService || undefined,
              ville_id: prefVilleId ? Number(prefVilleId) : undefined,
            }
          : undefined,
      });
      // Handle nested data structures correctly
      const registerPayload = data.data || data;
      const { accessToken, refreshToken } = registerPayload;
      
      // Required before passing the JWT middleware for getMe() 
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      
      const { data: profileData } = await profilesApi.getMe();
      const rawProfile = profileData?.data?.profile || profileData?.profile || profileData?.data || profileData;
      login(rawProfile, accessToken, refreshToken);
      connectSocket(accessToken);
      notifySocketAuthChanged();
      toast(t('register.success'), 'success');
      navigate('/annonces');
    } catch (err: unknown) {
      console.log('Erreur inscription complète:', err);
      
      // Extraire le message d'erreur de différentes manières possibles
      let errorMessage = t('register.error');
      
      if (err && typeof err === 'object' && 'response' in err) {
        const errorResponse = (err as any).response;
        if (errorResponse?.data) {
          // Essayer différentes clés possibles pour le message
          errorMessage = errorResponse.data.message || 
                          errorResponse.data.error || 
                          errorResponse.data.error?.message ||
                          `Erreur ${errorResponse.status}: ${errorResponse.statusText}`;
        }
      } else if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = (err as any).message;
      }
      
      // Cas spécifique pour l'email déjà utilisé
      if (errorMessage.includes('email') || errorMessage.includes('EMAIL_EXISTS')) {
        errorMessage = t('register.emailAlreadyUsed');
      }
      
      toast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const STEPS = profileType === 'chercheur' 
    ? [t('register.steps.account'), t('register.steps.profile'), t('register.steps.location'), t('register.steps.preferences')]
    : [t('register.steps.account'), t('register.steps.profile'), t('register.steps.location')];

  const selectStyle: React.CSSProperties = {
    width: '100%',
    height: 42,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-dim)',
    borderRadius: 'var(--radius-md)',
    padding: '0 12px',
    color: 'var(--text-primary)',
    fontSize: '0.875rem',
  };

  return (
    <PageTransition>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: 500 }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: '1.8rem', fontWeight: 700 }}>
              {t('register.title')} <span style={{ color: 'var(--accent-amber)' }}>ImmoPlan</span>
            </h1>
          </div>

          {/* Stepper */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
            {STEPS.map((label, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: step > i + 1 ? 'var(--accent-teal)' : step === i + 1 ? 'var(--accent-amber)' : 'var(--bg-elevated)', border: `2px solid ${step === i + 1 ? 'var(--accent-amber)' : step > i + 1 ? 'var(--accent-teal)' : 'var(--border-dim)'}`, color: step === i + 1 ? '#0A0A0F' : step > i + 1 ? '#0A0A0F' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                    {step > i + 1 ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: step === i + 1 ? 'var(--accent-amber)' : 'var(--text-muted)', fontWeight: step === i + 1 ? 600 : 400 }}>{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: step > i + 1 ? 'var(--accent-teal)' : 'var(--border-dim)', marginBottom: 20, transition: 'background 0.3s' }} />
                )}
              </div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', padding: '32px', boxShadow: 'var(--shadow-float)' }}
          >
            <form onSubmit={step === (profileType === 'chercheur' ? 4 : 3) ? handleSubmit : (e) => { e.preventDefault(); goNext(); }}>
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ type: 'spring', stiffness: 380, damping: 28 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <Input id="email" label={t('login.email')} type="email" placeholder={t('login.emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} required />
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        {t('register.emailHint')}
                      </p>
                    </div>
                    <PasswordInput id="password" label={t('login.password')} placeholder={t('reset.passwordPlaceholder')} value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <div style={{ marginTop: -6 }}>
                      <div style={{ height: 8, background: 'var(--bg-elevated)', borderRadius: 999, overflow: 'hidden', border: '1px solid var(--border-dim)' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.max(10, (passwordStrength.score / 5) * 100)}%`,
                            background: passwordStrength.color,
                            transition: 'all 160ms ease',
                          }}
                        />
                      </div>
                      <p style={{ fontSize: '0.75rem', marginTop: 6, color: passwordStrength.color }}>
                        {t('settings.strength')}: {passwordStrength.label}
                      </p>
                    </div>
                    <PasswordInput id="confirmPassword" label={t('register.confirmPassword')} placeholder={t('reset.confirmPlaceholder')} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                  </motion.div>
                )}
                {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ type: 'spring', stiffness: 380, damping: 28 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <Input id="prenom" label={t('settings.firstName')} placeholder="Jean" value={prenom} onChange={(e) => setPrenom(e.target.value)} required />
                      <Input id="nom" label={t('settings.lastName')} placeholder="Dupont" value={nom} onChange={(e) => setNom(e.target.value)} required />
                    </div>
                    <Input id="telephone" label={t('register.phoneWithFormat')} placeholder="0320000000" value={telephone} onChange={(e) => setTelephone(e.target.value)} required />
                    <Input id="dateNaissance" label={t('register.birthDate')} type="date" value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} required />
                    <div>
                      <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{t('register.accountType')}</p>
                      <div style={{ display: 'flex', gap: 10 }}>
                        {(['chercheur', 'offreur'] as ProfileType[]).map((pt) => (
                          <Button key={pt} type="button" onClick={() => setProfileType(pt)}
                            variant={profileType === pt ? 'primary' : 'secondary'}
                            style={{ flex: 1 }}>
                            {pt === 'chercheur' ? `🔍 ${t('roles.chercheur')}` : `🏠 ${t('roles.offreur')}`}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
                {step === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ type: 'spring', stiffness: 380, damping: 28 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {t('register.cityStepHelp')}
                    </p>
                    <div>
                      <label htmlFor="locVilleId" style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                        {t('settings.city')}
                      </label>
                      <Input
                        id="locVilleSearch"
                        label=""
                        placeholder={t('register.typeToFilterCities')}
                        value={locVilleSearch}
                        onChange={(e) => setLocVilleSearch(e.target.value)}
                        list="register-villes-suggestions"
                      />
                      <datalist id="register-villes-suggestions">
                        {villes.map((v) => (
                          <option key={`sug-${v.id}`} value={v.nom} />
                        ))}
                      </datalist>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                        {locVilleId ? t('publish.cityRecognized') : t('publish.citySelectSuggestion')}
                      </p>
                    </div>

                    {/* Leaflet Map */}
                    <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', height: 220, border: '1px solid var(--border-dim)' }}>
                      {selectedVille && selectedVille.latitude && selectedVille.longitude ? (
                        <MapContainer
                          center={[selectedVille.latitude, selectedVille.longitude]}
                          zoom={12}
                          style={{ height: '100%', width: '100%' }}
                          scrollWheelZoom={false}
                          attributionControl={false}
                        >
                          <TileLayer
                            attribution=""
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                          <Marker position={[selectedVille.latitude, selectedVille.longitude]} />
                          <MapRecenter lat={selectedVille.latitude} lng={selectedVille.longitude} />
                        </MapContainer>
                      ) : (
                        <div style={{ height: '100%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', flexDirection: 'column', gap: 8 }}>
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                            <line x1="8" y1="2" x2="8" y2="18" />
                            <line x1="16" y1="6" x2="16" y2="22" />
                          </svg>
                          {t('register.selectCityForMap')}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
                {step === 4 && (
                  <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ type: 'spring', stiffness: 380, damping: 28 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {profileType === 'chercheur' ? (
                      <>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                          {t('register.preferencesHelp')}
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <Input id="prefPrixMin" label={t('settings.minPrice')} type="number" value={prefPrixMin} onChange={(e) => setPrefPrixMin(e.target.value)} />
                          <Input id="prefPrixMax" label={t('settings.maxPrice')} type="number" value={prefPrixMax} onChange={(e) => setPrefPrixMax(e.target.value)} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <label htmlFor="prefService" style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                              {t('settings.service')}
                            </label>
                            <select
                              id="prefService"
                              value={prefService}
                              onChange={(e) => setPrefService(e.target.value as 'vente' | 'location')}
                              style={selectStyle}
                            >
                              <option value="">{t('register.choose')}</option>
                              <option value="vente">{t('annonce.sale')}</option>
                              <option value="location">{t('annonce.rent')}</option>
                            </select>
                          </div>
                          <VilleAutocomplete
                            label={t('settings.city')}
                            valueId={prefVilleId}
                            valueLabel={prefVilleLabel}
                            onChange={(id, nom) => {
                              setPrefVilleId(id);
                              setPrefVilleLabel(nom);
                            }}
                            placeholder={t('publish.cityPlaceholder')}
                            required
                            hintRecognized={t('publish.cityRecognized')}
                            hintSelect={t('publish.citySelectSuggestion')}
                          />
                        </div>
                      </>
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        {t('settings.preferencesSeekerOnly')}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                {step > 1 && (
                  <Button type="button" variant="secondary" style={{ flex: 1 }} onClick={() => setStep((s) => (s - 1) as Step)}>
                    {t('register.back')}
                  </Button>
                )}
                <Button type="submit" style={{ flex: 1 }} isLoading={loading}>
                  {step === (profileType === 'chercheur' ? 4 : 3) ? t('register.createMyAccount') : t('register.continue')}
                </Button>
              </div>
            </form>
          </motion.div>

          <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {t('register.alreadyAccount')}{' '}
            <Link to="/login" style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>{t('ui.login')}</Link>
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
