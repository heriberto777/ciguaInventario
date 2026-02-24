import { create } from 'zustand';
import { persist, StorageValue } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  companyId: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setHasHydrated: (state: boolean) => void;
}

// Custom storage que solo persiste los datos, no las funciones
const customStorage = {
  getItem: (name: string) => {
    const item = localStorage.getItem(name);
    if (!item) return null;
    try {
      return JSON.parse(item);
    } catch (e) {
      console.error('Failed to parse stored auth state:', e);
      return null;
    }
  },
  setItem: (name: string, value: StorageValue<AuthState>) => {
    try {
      // Solo guardar los datos, no las funciones
      const dataToStore = {
        state: {
          user: value.state.user,
          accessToken: value.state.accessToken,
          refreshToken: value.state.refreshToken,
          isAuthenticated: value.state.isAuthenticated,
          _hasHydrated: true,
        },
        version: value.version,
      };
      localStorage.setItem(name, JSON.stringify(dataToStore));
    } catch (e) {
      console.error('Failed to store auth state:', e);
    }
  },
  removeItem: (name: string) => {
    localStorage.removeItem(name);
  },
};

export const useAuthStore = create<AuthState>(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setAuth: (user, accessToken, refreshToken) =>
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          _hasHydrated: true,
        }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),

      setTokens: (accessToken, refreshToken) =>
        set({
          accessToken,
          refreshToken,
        }),

      setHasHydrated: (state: boolean) =>
        set({
          _hasHydrated: state,
        }),
    }),
    {
      name: 'auth-store',
      storage: customStorage as any,
      onRehydrateStorage: () => (state) => {
        // Marcar hidratación como completa después de restaurar del storage
        if (state) {
          state._hasHydrated = true;
        }
      },
    }
  )
);
