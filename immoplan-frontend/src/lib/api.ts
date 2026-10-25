import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// En dev, on privilégie le proxy Vite ("/api") pour éviter CORS.
// En prod (ou si besoin), VITE_API_URL peut surcharger la baseURL.
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/** API de vérification de la santé du backend. */
export const healthApi = {
  /** Vérifie que le backend répond (GET /api/health). */
  ping: () => api.get('/health'),
};

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token!);
  });
  failedQueue = [];
};

/** Applique le Bearer de façon compatible AxiosHeaders (axios ≥ 1). */
function setBearerHeader(config: InternalAxiosRequestConfig, token: string): void {
  const h = config.headers;
  if (!h) {
    config.headers = { Authorization: `Bearer ${token}` } as InternalAxiosRequestConfig['headers'];
    return;
  }
  const headers = h as InternalAxiosRequestConfig['headers'] & { set?: (k: string, v: string) => void };
  if (typeof headers.set === 'function') {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
}

// Request interceptor: attach JWT ; ne pas forcer JSON sur FormData (multipart + boundary)
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      setBearerHeader(config, token);
    }
    if (config.data instanceof FormData && config.headers) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: silent refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Ne pas tenter de refresh sur ces routes (évite boucles / déconnexion propre)
    if (
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/logout') ||
      originalRequest.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          setBearerHeader(originalRequest, token as string);
          return api(originalRequest);
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (!refreshToken) {
        isRefreshing = false;
        processQueue(error, null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await api.post('/auth/refresh', { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = (data as any).data ?? {};
        if (!accessToken) {
          throw error;
        }
        localStorage.setItem('access_token', accessToken);
        if (newRefreshToken) {
          localStorage.setItem('refresh_token', newRefreshToken);
        }
        window.dispatchEvent(new Event('immoplan:token-updated'));
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        setBearerHeader(originalRequest, accessToken);
        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// ================================================
// AUTH
// ================================================
export const authApi = {
  /** Inscription d'un nouvel utilisateur. */
  register: (data: any) => api.post('/auth/register', data),
  /** Connexion par email/mot de passe. */
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  /** Déconnexion (invalidation des tokens). */
  logout: () => api.post('/auth/logout'),
  /** Redirection vers la page de connexion Google OAuth2. */
  googleLogin: () => { window.location.href = `${BASE_URL}/auth/google`; },
  /** Envoi d'un code 2FA par email. */
  send2FA: () => api.post('/auth/2fa/send'),
  /** Vérification du code 2FA. */
  verify2FA: (code: string) => api.post('/auth/2fa/verify', { code }),
  /** Demande de réinitialisation de mot de passe. */
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  /** Réinitialisation du mot de passe avec un token. */
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
  /** Changement de mot de passe après vérification de l'ancien. */
  changePassword: (currentPassword: string, newPassword: string) => api.patch('/auth/change-password', { currentPassword, newPassword }),
  /** Suppression définitive du compte. */
  deleteAccount: () => api.delete('/auth/me'),
};

// ================================================
// PROFILES
// ================================================
export const profilesApi = {
  /** Récupère le profil complet de l'utilisateur connecté. */
  getMe: () => api.get('/profiles/me'),
  /** Met à jour les informations du profil. */
  updateMe: (data: any) => api.put('/profiles/me', data),
  /** Upload d'un avatar (multipart). */
  uploadAvatar: (formData: FormData) => api.put('/profiles/me/avatar', formData),
  /** Récupère le profil public d'un utilisateur. */
  getProfile: (id: string) => api.get(`/profiles/${id}`),
  /** Récupère le profil public par ID (alias). */
  getById: (id: string) => api.get(`/profiles/${id}`),
  /** Liste les offreurs avec recherche optionnelle. */
  getOffreurs: (search?: string) => api.get('/profiles/offreurs', { params: { search } }),
  /** Enregistre une visite de profil. */
  visitProfile: (id: string) => api.post(`/profiles/${id}/visit`),
};

// ================================================
// GEO
// ================================================
export const geoApi = {
  /** Récupère toutes les villes. */
  getVilles: () => api.get('/geo/villes'),
  /** Recherche de villes par nom (autocomplete). */
  searchVilles: (q: string) => api.get('/geo/villes/search', { params: { q } }),
  /** Récupère les quartiers d'une ville. */
  getQuartiers: (villeId: string) => api.get(`/geo/villes/${villeId}/quartiers`),
  /** Récupère les prix moyens au m² par ville. */
  getPrixMoyens: (params?: any) => api.get('/geo/prix-moyens', { params }),
};

// ================================================
// ANNONCES
// ================================================
export const annoncesApi = {
  /** Crée une nouvelle annonce. */
  create: (data: any) => api.post('/annonces', data),
  /** Récupère le feed public paginé. */
  getFeed: (params?: any) => api.get('/annonces', { params }),
  /** Récupère le détail d'une annonce. */
  getById: (id: string) => api.get(`/annonces/${id}`),
  /** Modifie une annonce. */
  update: (id: string, data: any) => api.put(`/annonces/${id}`, data),
  /** Change le statut d'une annonce. */
  changeStatut: (id: string, statut: string) => api.patch(`/annonces/${id}/statut`, { statut }),
  /** Récupère mes annonces (offreur connecté). */
  getMesAnnonces: () => api.get('/annonces/me/annonces'),
  /** Récupère mes annonces avec pagination. */
  getMes: (params?: any) => api.get('/annonces/me/annonces', { params }),
  /** Récupère les annonces d'un offreur par son ID. */
  getByProfile: (profileId: string, params?: any) => api.get(`/annonces?offreur_id=${profileId}`, { params }),
  /** Upload de photos pour une annonce (multipart). */
  uploadPhotos: (id: string, formData: FormData) => api.post(`/annonces/${id}/photos`, formData),
  /** Réordonne les photos d'une annonce. */
  reorderPhotos: (id: string, photoIds: number[]) =>
    api.patch(`/annonces/${id}/photos/reorder`, { photoIds }),
  /** Récupère les annonces pour la carte (bounding box). */
  getCarte: (params?: any) => api.get('/annonces/carte', { params }),
};

// ================================================
// INTERACTIONS
// ================================================
export const interactionsApi = {
  /** Enregistre une vue (chercheur). */
  addVue: (annonceId: string) => api.post(`/interactions/annonces/${annonceId}/vue`),
  /** Enregistre une vue (offreur). */
  addVueOffreur: (annonceId: string) => api.post(`/interactions/annonces/${annonceId}/vue/offreur`),
  /** Récupère les vues d'une annonce. */
  getVues: (annonceId: string) => api.get(`/interactions/annonces/${annonceId}/vues`),
  /** Ajoute un like. */
  like: (annonceId: string) => api.post(`/interactions/annonces/${annonceId}/like`),
  /** Retire un like. */
  unlike: (annonceId: string) => api.delete(`/interactions/annonces/${annonceId}/like`),
  /** Récupère le nombre de likes. */
  getLikes: (annonceId: string) => api.get(`/interactions/annonces/${annonceId}/likes`),
  /** Récupère les IDs des annonces likées par l'utilisateur. */
  getMyLikes: () => api.get('/interactions/me/likes'),
  /** Récupère les avis d'une annonce. */
  getAvis: (annonceId: string, params?: any) => api.get(`/interactions/annonces/${annonceId}/avis`, { params }),
  /** Récupère les avis d'un offreur. */
  getAvisByProfile: (profileId: string) => api.get(`/interactions/offreurs/${profileId}/avis`),
  /** Récupère les points d'intérêt autour d'une annonce. */
  getPOI: (annonceId: string) => api.get(`/interactions/annonces/${annonceId}/poi`),
  /** Soumet un avis sur une annonce. */
  submitAvis: (annonceId: string, data: any) => api.post(`/interactions/annonces/${annonceId}/avis`, data),
  /** Modifie un avis existant. */
  updateAvis: (avisId: string, data: any) => api.put(`/interactions/avis/${avisId}`, data),
  /** Récupère les avis sur un offreur. */
  getOffreurAvis: (offreurId: string) => api.get(`/interactions/offreurs/${offreurId}/avis`),
  /** Sauvegarde une annonce dans les favoris. */
  sauvegarder: (annonceId: string) => api.post(`/interactions/annonces/${annonceId}/sauvegarder`),
  /** Retire une annonce des favoris. */
  unsauvegarder: (annonceId: string) => api.delete(`/interactions/annonces/${annonceId}/sauvegarder`),
  /** Récupère les annonces sauvegardées. */
  getSauvegardes: () => api.get('/interactions/me/sauvegardes'),
  /** Récupère l'historique de navigation. */
  getHistorique: () => api.get('/interactions/me/historique'),
  /** Vide l'historique de navigation. */
  clearHistorique: () => api.delete('/interactions/me/historique'),
  /** Ajoute une annonce dans l'historique. */
  touchHistorique: (annonceId: string) => api.post(`/interactions/annonces/${annonceId}/historique`),
};

// ================================================
// VISITES
// ================================================
export const visitesApi = {
  /** Crée une demande de visite. */
  create: (data: any) => api.post('/visites', data),
  /** Récupère toutes les visites. */
  getAll: (params?: any) => api.get('/visites/me', { params }),
  /** Récupère mes visites (alias). */
  getMes: (params?: any) => api.get('/visites/me', { params }),
  /** Confirme ou contre-propose une visite. */
  confirm: (
    id: string,
    data: { mode: 'accepter_demande' } | { mode: 'contre_proposer'; date_confirmee: string; heure_confirmee: string }
  ) => api.patch(`/visites/${id}/confirmer`, data),
  /** Confirme ou contre-propose (alias). */
  confirmer: (
    id: string,
    data: { mode: 'accepter_demande' } | { mode: 'contre_proposer'; date_confirmee: string; heure_confirmee: string }
  ) => api.patch(`/visites/${id}/confirmer`, data),
  /** Accepte une contre-proposition de visite. */
  accepterContreProposition: (id: string) => api.patch(`/visites/${id}/accepter-contre-proposition`, {}),
  /** Annule une visite avec motif optionnel. */
  cancel: (id: string, motif?: string) =>
    api.patch(`/visites/${id}/annuler`, { raison_annulation: motif?.trim() || 'Annulation demandée' }),
  /** Annule une visite (version explicite). */
  annuler: (id: string, data: { raison_annulation: string }) => api.patch(`/visites/${id}/annuler`, data),
  /** Marque une visite comme effectuée. */
  effectuer: (id: string) => api.patch(`/visites/${id}/effectuer`),
};

// ================================================
// MESSAGERIE
// ================================================
export const messagerieApi = {
  /** Crée ou récupère une conversation pour une annonce. */
  createOrGet: (data: any) => api.post('/conversations', data),
  /** Crée une nouvelle conversation. */
  createConversation: (data: any) => api.post('/conversations', data),
  /** Récupère les conversations de l'utilisateur. */
  getConversations: (params?: any) => api.get('/conversations', { params }),
  /** Récupère une conversation par son ID. */
  getById: (id: string) => api.get(`/conversations/${id}`),
  /** Récupère les messages paginés d'une conversation. */
  getMessages: (id: string, params?: any) => api.get(`/conversations/${id}/messages`, { params }),
  /** Envoie un message textuel. */
  sendMessage: (id: string, data: any) => api.post(`/conversations/${id}/messages`, data),
  /** Marque les messages comme lus. */
  markLu: (id: string) => api.patch(`/conversations/${id}/messages/lu`),
  /** Envoie un média dans une conversation. */
  sendMedia: (id: string, formData: FormData) => api.post(`/conversations/${id}/messages/media`, formData),
};

// ================================================
// NOTIFICATIONS
// ================================================
export const notificationsApi = {
  /** Récupère les notifications paginées. */
  getAll: (params?: any) => api.get('/notifications', { params }),
  /** Récupère le nombre de notifications non lues. */
  getCount: () => api.get('/notifications/count'),
  /** Marque une notification comme lue. */
  markOne: (id: string) => api.patch(`/notifications/${id}/lire`),
  /** Marque toutes les notifications comme lues. */
  markAll: () => api.patch('/notifications/lire-tout'),
  /** Supprime une notification. */
  deleteOne: (id: string) => api.delete(`/notifications/${id}`),
};

// ================================================
// PARTAGES
// ================================================
export const partagesApi = {
  /** Enregistre le partage d'une annonce sur une plateforme. */
  partager: (annonceId: string, data: any) => api.post(`/partages/annonces/${annonceId}/partager`, data),
};

// ================================================
// DASHBOARD
// ================================================
export const dashboardApi = {
  /** Récupère les statistiques globales. */
  getStats: () => api.get('/dashboard/stats'),
  /** Récupère les performances par annonce. */
  getPerformances: () => api.get('/dashboard/annonces/performances'),
  /** Récupère l'agenda des visites. */
  getAgenda: () => api.get('/dashboard/visites/agenda'),
  /** Récupère les messages récents non lus. */
  getMessagesRecents: () => api.get('/dashboard/messages/recents'),
};

// ================================================
// RECHERCHE
// ================================================
export const rechercheApi = {
  /** Recherche multi-critères d'annonces. */
  search: (params?: any) => api.get('/recherche', { params }),
};

// ================================================
// RECOMMANDATION
// ================================================
export const recommandationApi = {
  /** Récupère le feed personnalisé basé sur les préférences. */
  getFeedPersonalise: (params?: Record<string, unknown>) => api.get('/recommandation/feed-personnalise', { params }),
  /** Récupère les annonces tendances. */
  getTendances: (params?: Record<string, unknown>) => api.get('/recommandation/tendances', { params }),
  /** Récupère les annonces similaires à la dernière vue. */
  getSimilaires: (params?: Record<string, unknown>) => api.get('/recommandation/similaires', { params }),
  /** Récupère les préférences de recommandation. */
  getPreferences: () => api.get('/recommandation/preferences'),
  /** Met à jour les préférences de recommandation. */
  updatePreferences: (data: {
    prix_min: number;
    prix_max: number;
    service: 'vente' | 'location';
    ville_id: number;
  }) => api.put('/recommandation/preferences', data),
};

// ================================================
// STATISTIQUES
// ================================================
export const statistiquesApi = {
  /** Récupère les statistiques globales du tableau de bord. */
  getDashboard: () => api.get('/statistiques/dashboard'),
  /** Récupère les performances détaillées par annonce. */
  getPerformances: (params?: Record<string, unknown>) => api.get('/statistiques/performances', { params }),
};

export default api;
