import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';

export function useHydration() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Zustand con persist se hidrata automáticamente
    // Solo necesitamos esperar un ciclo de renderización
    setIsHydrated(true);
  }, []);

  return isHydrated;
}
