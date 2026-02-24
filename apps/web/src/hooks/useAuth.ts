import { useAuthStore } from '@/store/auth';

export function useAuth() {
  const { isAuthenticated, user, login, logout } = useAuthStore();

  return {
    isAuthenticated,
    user,
    login,
    logout,
  };
}
