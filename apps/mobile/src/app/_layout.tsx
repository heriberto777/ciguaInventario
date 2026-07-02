import { useEffect, useState, useCallback, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus } from 'react-native';
import { QueryClient, QueryClientProvider } from 'react-query';
import { offlineSync } from '@/services/offline-sync';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApiClient, onLogout, onLogin } from '@/services/api';
import { getApiBaseUrl } from '@/services/serverConfig';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5 * 60 * 1000 },
    mutations: { retry: 0 },
  },
});

export default function RootLayout() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const router = useRouter();

  // Cierra sesión: limpia token, resetea estado y navega a login
  const handleLogout = useCallback(async () => {
    await AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'user_email']);
    setIsLoggedIn(false);
    queryClient.clear();
    router.replace('/auth/login');
  }, [router]);

  // Ejecuta sync offline y luego invalida el cache de React Query para los conteos afectados,
  // garantizando que la UI refleje los totales correctos del servidor (suma de contribuciones).
  const runSync = useCallback(async () => {
    offlineSync.syncGlobalClassifications();
    const { affectedCountIds } = await offlineSync.syncPending();
    if (affectedCountIds.length > 0) {
      queryClient.invalidateQueries('inventory-counts');
      affectedCountIds.forEach(id => {
        queryClient.invalidateQueries(['inventory-count', id]);
      });
    }
  }, []);

  // Notificado por el login screen cuando login es exitoso
  const handleLogin = useCallback(() => {
    setIsLoggedIn(true);
    setTimeout(runSync, 2000);
  }, [runSync]);

  useEffect(() => {
    // Inicializar DB offline sin bloquear el arranque
    offlineSync.initDB().catch((err) => {
      console.error('Error initializing offline sync:', err);
    });

    // Registrar callbacks de login/logout
    onLogout(handleLogout);
    onLogin(handleLogin);

    // Disparar sync cada vez que el app vuelve al primer plano
    // (cubre el caso de que el dispositivo recuperó red mientras estaba en background)
    const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        runSync();
      }
      appState.current = nextState;
    });

    // Verificar token y levantar API client
    (async () => {
      try {
        const backendUrl = await getApiBaseUrl();
        const apiBaseUrl = backendUrl || 'http://localhost:3000/api';

        // Inicializar cliente siempre (haya o no token inicial)
        await initializeApiClient(apiBaseUrl);

        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          setIsLoggedIn(true);

          // Sincronización en segundo plano después de cargar
          setTimeout(runSync, 2000);
        } else {
          setIsLoggedIn(false);
        }
      } catch (err) {
        console.error('Error checking auth status:', err);
        setIsLoggedIn(false);
      }
    })();

    return () => {
      appStateSub.remove();
    };
  }, [handleLogout, handleLogin, runSync]);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AppNavigator isLoggedIn={isLoggedIn} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

/**
 * Separamos el navigator para poder usar useTheme() dentro del ThemeProvider.
 */
function AppNavigator({ isLoggedIn }: { isLoggedIn: boolean | null }) {
  const { isDark } = useTheme();
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <Stack.Screen name="(tabs)" />
        ) : (
          <Stack.Screen name="auth/login" />
        )}
        <Stack.Screen name="auth/server-setup" />
        <Stack.Screen name="index" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}
