import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authApi } from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { PageTransition } from '../../components/layout/PageTransition';
import { useTranslation } from 'react-i18next';

export default function TwoFactor() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
    const timer = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[i] = digit;
    setCode(next);
    if (digit && i < 5) inputRefs.current[i + 1]?.focus();
    if (next.every((d) => d) && next.join('').length === 6) {
      verify(next.join(''));
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) inputRefs.current[i - 1]?.focus();
  };

  const verify = async (fullCode: string) => {
    setLoading(true);
    try {
      await authApi.verify2FA(fullCode);
      toast(t('twofa.success'), 'success');
      navigate('/annonces');
    } catch {
      toast(t('twofa.invalidCode'), 'error');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (countdown > 0) return;
    try {
      await authApi.send2FA();
      setCountdown(60);
      toast(t('twofa.codeSent'), 'success');
    } catch {
      toast(t('twofa.sendError'), 'error');
    }
  };

  return (
    <PageTransition>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 350, damping: 28 }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--accent-amber-dim)', border: '2px solid var(--accent-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="2" strokeLinecap="round"><rect x="5" y="11" width="14" height="10" rx="2" ry="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
            </div>
          </motion.div>
          <h1 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: '1.6rem', fontWeight: 700, marginBottom: 8 }}>{t('twofa.title')}</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>{t('twofa.subtitle')}</p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 28 }}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                aria-label={`${t('twofa.digit')} ${i + 1}`}
                style={{
                  width: 48, height: 56, textAlign: 'center', fontSize: '1.4rem', fontWeight: 700,
                  background: 'var(--bg-card)', border: `2px solid ${digit ? 'var(--accent-amber)' : 'var(--border-dim)'}`,
                  borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none',
                  transition: 'border-color var(--transition-fast)',
                }}
              />
            ))}
          </div>

          <Button fullWidth onClick={() => verify(code.join(''))} isLoading={loading} disabled={code.some((d) => !d)}>
            {t('twofa.verify')}
          </Button>

          <div style={{ marginTop: 20 }}>
            <button
              onClick={resend}
              style={{ background: 'none', border: 'none', color: countdown > 0 ? 'var(--text-muted)' : 'var(--accent-amber)', cursor: 'none', fontSize: '0.875rem' }}
              disabled={countdown > 0}
            >
              {countdown > 0 ? t('twofa.resendIn', { countdown }) : t('twofa.resend')}
            </button>
          </div>
          <div style={{ marginTop: 16 }}>
            <Link to="/login" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>← {t('common.backToLogin')}</Link>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
