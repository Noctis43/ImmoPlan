import { motion } from 'framer-motion';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PageTransition } from '../../components/layout/PageTransition';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { useToast } from '../../components/ui/Toast';
import { authApi, profilesApi } from '../../lib/api';
import { connectSocket, notifySocketAuthChanged } from '../../lib/socket';
import { useAuthStore } from '../../store/auth';
import { useTranslation } from 'react-i18next';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/annonces';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!email) errs.email = t('login.emailRequired');
    if (!password) errs.password = t('login.passwordRequired');
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const { data } = await authApi.login(email, password);
      // Extraire data.data selon le format { data: { profile, accessToken, refreshToken } } renvoyé par le backend
      const loginPayload = data.data || data;
      const { accessToken, refreshToken } = loginPayload;
      
      // Enregistrer temporairement les tokens pour que profilesApi.getMe passe le middleware JWT
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      
      const { data: profileData } = await profilesApi.getMe();
      const rawProfile = profileData?.data?.profile || profileData?.profile || profileData?.data || profileData;
      
      login(rawProfile, accessToken, refreshToken);
      connectSocket(accessToken);
      notifySocketAuthChanged();
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (msg?.includes('2FA') || msg?.includes('2fa')) {
        toast(t('login.twoFaRequired'), 'info');
        navigate('/2fa');
      } else {
        toast(msg ?? t('login.invalidCredentials'), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ width: 52, height: 52, background: 'var(--accent-amber)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0A0A0F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <h1 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: '2rem', fontWeight: 700 }}>
              Immo<span style={{ color: 'var(--accent-amber)' }}>Plan</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: '0.9rem' }}>{t('login.welcome')}</p>
          </div>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', padding: '32px', boxShadow: 'var(--shadow-float)' }}
          >
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Input id="email" label={t('login.email')} type="email" placeholder={t('login.emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} autoComplete="email" />
              <PasswordInput id="password" label={t('login.password')} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} autoComplete="current-password" />

              <div style={{ textAlign: 'right' }}>
                <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--accent-amber)' }}>{t('login.forgotPassword')}</Link>
              </div>

              <Button type="submit" fullWidth isLoading={loading} size="lg">{t('ui.login')}</Button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('login.or')}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
            </div>

            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => authApi.googleLogin()}
              style={{ display: 'flex', gap: '10px', marginTop: '10px' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              {t('login.continueGoogle')}
            </Button>
          </motion.div>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {t('login.noAccount')}{' '}
            <Link to="/register" style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>{t('ui.register')}</Link>
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
