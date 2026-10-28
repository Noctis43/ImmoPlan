/** @type {import('./config').ElectronConfig} */
module.exports = {
    /** URL de santé du backend Express (lancé manuellement). */
    backendHealthUrl:
      process.env.IMMOPLAN_BACKEND_HEALTH_URL || 'http://127.0.0.1:3000/api/health',
  
    /** Cible du proxy API / Socket.IO (serveur statique en production packagée). */
    backendProxyTarget:
      process.env.IMMOPLAN_BACKEND_URL || 'http://127.0.0.1:3000',
  
    /** Dev : serveur Vite. */
    devRendererUrl: process.env.ELECTRON_RENDERER_URL || 'http://127.0.0.1:5173',
  
    /** Prod : port du mini-serveur HTTP local (fichiers + proxy). */
    staticPort: Number(process.env.ELECTRON_STATIC_PORT || 5174),
  
    /** Délai max d’attente du backend au démarrage (ms). */
    backendWaitTimeoutMs: Number(process.env.IMMOPLAN_BACKEND_WAIT_MS || 120_000),
  
    backendPollIntervalMs: 1_500,
  
    window: {
      width: 1280,
      height: 800,
      minWidth: 360,
      minHeight: 640,
    },
  };
  