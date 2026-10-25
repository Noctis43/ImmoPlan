import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ProfileType = 'offreur' | 'chercheur';

export interface Profile {
  id: string;
  auth_user_id: string;
  email: string;
  nom: string;
  prenom: string;
  telephone: string;
  date_naissance: string;
  profile_type: ProfileType;
  avatar_url?: string;
  avatar_cloudinary_id?: string;
  localisation_ville?: string;
  localisation_quartier?: string;
  is_active: boolean;
  is_verified: boolean;
  last_seen_at?: string;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: Profile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: Profile, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setUser: (user: Profile) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (user, accessToken, refreshToken) => {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      setUser: (user) => set({ user }),

      setTokens: (accessToken, refreshToken) => {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        set({ accessToken, refreshToken });
      },
    }),
    {
      name: 'immoplan-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
