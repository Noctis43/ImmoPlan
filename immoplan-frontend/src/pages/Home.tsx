import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { annoncesApi, geoApi, recommandationApi } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { AnnonceGrid } from '../components/annonces/AnnonceGrid';
import { PageTransition } from '../components/layout/PageTransition';
import { unwrapArray } from '../lib/unwrap';
import type { Annonce } from '../components/annonces/AnnonceCard';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '../lib/locale';

type PrixMoyenRow = { ville: string; prix_moyen: number; nb_annonces: number };

export default function Home() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();

  /** Clé distincte de `useInfiniteQuery` sur /annonces — ne pas partager `['annonces/feed']` (structures de cache incompatibles). */
  const { data: feedData, isLoading: feedLoading } = useQuery({
    queryKey: ['annonces', 'home-preview'],
    queryFn: () => annoncesApi.getFeed({ limit: 6 }).then((r) => r.data),
  });

  const { data: prixData } = useQuery({
    queryKey: ['prix-moyens'],
    queryFn: () => geoApi.getPrixMoyens().then((r) => r.data),
  });

  const { data: recoData } = useQuery({
    queryKey: ['recommandations/home'],
    queryFn: () => recommandationApi.getFeedPersonalise({ limit: 3 }).then((r) => r.data),
    enabled: isAuthenticated && user?.profile_type === 'chercheur',
  });

  const annonces = unwrapArray<Annonce>(feedData);
  const recos = unwrapArray<Annonce>(recoData);
  const prixMoyens = unwrapArray<PrixMoyenRow>(prixData);

  return (
    <PageTransition>
      {/* Hero */}
      <section className="gradient-mesh home-hero" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Aurora orbs */}
        <div style={{ position: 'absolute', top: '20%', left: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, #F5A62318 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, #00D4AA12 0%, transparent 70%)', pointerEvents: 'none' }} />

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 280, damping: 28 }} style={{ maxWidth: 700, zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent-amber-dim)', border: '1px solid var(--accent-amber-dim)', borderRadius: 99, padding: '5px 14px', marginBottom: 24 }}>
            <span style={{ color: 'var(--accent-amber)', fontSize: '0.78rem', fontWeight: 600 }}>{t('home.badge')}</span>
          </div>
          <h1 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 'clamp(2.2rem, 6vw, 4rem)', fontWeight: 700, lineHeight: 1.05, marginBottom: 20, color: 'var(--text-primary)' }}>
            {t('home.titlePrefix')} <span className="gradient-text-amber">{t('home.titleHighlight')}</span> {t('home.titleSuffix')}
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: 36, maxWidth: 520, margin: '0 auto 36px' }}>
            {t('home.subtitle')}
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to={isAuthenticated ? '/annonces' : '/login'}
              style={{ padding: '14px 30px', background: 'var(--accent-amber)', color: '#0A0A0F', borderRadius: 'var(--radius-lg)', fontWeight: 700, fontSize: '1rem', fontFamily: "'Clash Display',sans-serif" }}
            >
              {t('home.seeAds')}
            </Link>
            <Link
              to={isAuthenticated ? '/annonces/carte' : '/login'}
              style={{ padding: '14px 30px', background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-lg)', fontWeight: 600, fontSize: '0.95rem' }}
            >
              {t('home.exploreMap')}
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Prix moyens */}
      {prixMoyens.length > 0 && (
        <section className="home-section" style={{ paddingTop: 60, paddingBottom: 60, maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 'clamp(1.25rem, 3.5vw, 1.6rem)', fontWeight: 700, marginBottom: 24 }}>
            {t('home.averagePrices')} <span className="gradient-text-amber">{t('home.byCity')}</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 160px), 1fr))', gap: 16 }}>
            {prixMoyens.slice(0, 6).map((item: { ville: string; prix_moyen: number; nb_annonces: number }) => (
              <motion.div key={item.ville} whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '20px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{item.ville}</div>
                <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
                  {formatNumber(Number(item.prix_moyen), i18n.resolvedLanguage)} Ar
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{t('home.adCount', { count: item.nb_annonces })}</div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Feed public */}
      <section className="home-section" style={{ paddingTop: 60, paddingBottom: 60, maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 'clamp(1.25rem, 3.5vw, 1.6rem)', fontWeight: 700 }}>{t('home.recentAds')}</h2>
          <Link to="/annonces" style={{ fontSize: '0.875rem', color: 'var(--accent-amber)', fontWeight: 600 }}>{t('home.seeAll')} →</Link>
        </div>
        <AnnonceGrid annonces={annonces} isLoading={feedLoading} />
      </section>

      {/* Recommandations (auth only) */}
      {isAuthenticated && recos.length > 0 && (
        <section className="home-section" style={{ paddingTop: 60, paddingBottom: 60, maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 'clamp(1.25rem, 3.5vw, 1.6rem)', fontWeight: 700, marginBottom: 24 }}>
            {t('home.forYou', { name: user?.prenom ?? '' })}
          </h2>
          <AnnonceGrid annonces={recos} />
        </section>
      )}

      {/* CTA if not logged in */}
      {!isAuthenticated && (
        <section style={{ padding: '80px 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: 560, margin: '0 auto', background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', padding: '48px', border: '1px solid var(--border-dim)', boxShadow: 'var(--shadow-glow)' }}>
            <h2 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: '1.8rem', fontWeight: 700, marginBottom: 12 }}>{t('home.ctaTitle')}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>{t('home.ctaText')}</p>
            <Link to="/register" style={{ display: 'inline-block', padding: '13px 32px', background: 'var(--accent-amber)', color: '#0A0A0F', borderRadius: 'var(--radius-lg)', fontWeight: 700, fontSize: '0.95rem' }}>
              {t('home.ctaButton')}
            </Link>
          </div>
        </section>
      )}
    </PageTransition>
  );
}
