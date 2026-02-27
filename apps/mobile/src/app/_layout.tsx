import { useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from 'react-query';
import { offlineSync } from '@/services/offline-sync';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApiClient, getApiClient } from '@/services/api';
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


  // Cierra sesión: limpia token y redirige a login
  const handleLogout = useCallback(async () => {
    await AsyncStorage.removeItem('auth_token');
    setIsLoggedIn(false);
    queryClient.clear();
  }, []);

  useEffect(() => {
    // Inicializar DB offline sin bloquear el arranque
    offlineSync.initDB().catch((err) => {
      console.error('Error initializing offline sync:', err);
    });

    // Verificar token y levantar API client
    (async () => {
      try {
        const backendUrl = await getApiBaseUrl();
        const apiBaseUrl = backendUrl || 'http://localhost:3000/api';

        // Inicializar cliente siempre (haya o no token inicial)
        await initializeApiClient(apiBaseUrl);

        // Registrar qué hacer cuando el API detecte un 401
        const { onLogout } = await import('@/services/api');
        onLogout(handleLogout);

        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          setIsLoggedIn(true);

          // Sincronización en segundo plano después de cargar
          setTimeout(() => {
            offlineSync.syncGlobalClassifications();
            offlineSync.syncPending();
          }, 2000);
        } else {
          setIsLoggedIn(false);
        }
      } catch (err) {
        console.error('Error checking auth status:', err);
        setIsLoggedIn(false);
      }
    })();
  }, [handleLogout]);

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
