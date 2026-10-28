import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authApi } from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { PageTransition } from '../../components/layout/PageTransition';
import { useTranslation } from 'react-i18next';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast(t('forgot.emailRequired'), 'warning'); return; }
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch {
      toast(t('forgot.sendError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', padding: '36px', boxShadow: 'var(--shadow-float)', textAlign: 'center' }}>
            {sent ? (
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 350, damping: 24 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-teal-dim)', border: '2px solid var(--accent-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-teal)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h2 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: '1.3rem', fontWeight: 700, marginBottom: 10 }}>{t('forgot.sentTitle')}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('forgot.sentText')}</p>
              </motion.div>
            ) : (
              <>
                <h1 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: '1.4rem', fontWeight: 700, marginBottom: 8 }}>{t('forgot.title')}</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.875rem' }}>{t('forgot.subtitle')}</p>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <Input id="email" label={t('login.email')} type="email" placeholder={t('login.emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <Button type="submit" fullWidth isLoading={loading}>{t('forgot.sendLink')}</Button>
                </form>
              </>
            )}
            <div style={{ marginTop: 20 }}>
              <Link to="/login" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>← {t('common.backToLogin')}</Link>
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
