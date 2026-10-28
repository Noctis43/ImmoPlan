import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { PageTransition } from '../../components/layout/PageTransition';
import { motion } from 'framer-motion';
import { getPasswordStrength } from '../../lib/passwordStrength';
import { useTranslation } from 'react-i18next';

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!strength.canSubmit) { toast(t('reset.weakPassword'), 'warning'); return; }
    if (password !== confirm) { toast(t('reset.mismatch'), 'error'); return; }
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      toast(t('reset.success'), 'success');
      navigate('/login');
    } catch {
      toast(t('reset.invalidToken'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', padding: '36px', boxShadow: 'var(--shadow-float)' }}>
            <h1 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: '1.4rem', fontWeight: 700, marginBottom: 20 }}>{t('reset.title')}</h1>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <PasswordInput id="password" label={t('settings.newPassword')} placeholder={t('reset.passwordPlaceholder')} value={password} onChange={(e) => setPassword(e.target.value)} required />
              <div style={{ marginTop: -6 }}>
                <div style={{ height: 8, background: 'var(--bg-elevated)', borderRadius: 999, overflow: 'hidden', border: '1px solid var(--border-dim)' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.max(10, (strength.score / 5) * 100)}%`,
                      background: strength.color,
                      transition: 'all 160ms ease',
                    }}
                  />
                </div>
                <p style={{ fontSize: '0.75rem', marginTop: 6, color: strength.color }}>
                  {t('settings.strength')}: {strength.label}
                </p>
              </div>
              <PasswordInput id="confirm" label={t('settings.confirm')} placeholder={t('reset.confirmPlaceholder')} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              <Button type="submit" fullWidth isLoading={loading}>{t('reset.action')}</Button>
            </form>
            <div style={{ marginTop: 16 }}>
              <Link to="/login" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>← {t('common.backToLogin')}</Link>
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
