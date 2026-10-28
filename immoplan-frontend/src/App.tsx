import { useEffect } from 'react';
import { AppRouter } from './router';
import { CustomCursor } from './components/layout/CustomCursor';
import { healthApi } from './lib/api';
import { useAuthStore } from './store/auth';
import { profilesApi } from './lib/api';

export default function App() {
  const { logout, isAuthenticated, accessToken } = useAuthStore();

  // Persist theme preference
  useEffect(() => {
    const saved = localStorage.getItem('immoplan-theme') ?? 'dark';
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  // Vérifier l'authentification au démarrage
  useEffect(() => {
    const checkAuth = async () => {
      // S'il y a un token mais qu'on pense être authentifié, vérifier si le token est valide
      if (accessToken && isAuthenticated) {
        try {
          // Tenter de récupérer le profil pour vérifier si le token est valide
          await profilesApi.getMe();
        } catch (error) {
          // Si le token est invalide, déconnecter l'utilisateur
          console.log('Token invalide, déconnexion...');
          logout();
        }
      }
    };

    checkAuth();
  }, [accessToken, isAuthenticated, logout]);

  useEffect(() => {
    healthApi.ping().catch(() => {});
  }, []);

  return (
    <>
      <CustomCursor />
      <AppRouter />
    </>
  );
}
