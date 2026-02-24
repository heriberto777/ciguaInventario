import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from 'react-query';
import { offlineSync } from '@/services/offline-sync';
import AsyncStorage from '@react-native-async-storage/async-storage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5 * 60 * 1000 },
    mutations: { retry: 1 },
  },
});

export default function RootLayout() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    // Inicializar base de datos offline de forma asíncrona sin bloquear
    offlineSync.initDB().catch(err => {
      console.error('Error initializing offline sync:', err);
      // Continuar aunque falle la inicialización
    });

    // Verificar si el usuario ya está logueado
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      setIsLoggedIn(!!token);
    } catch (err) {
      console.error('Error checking auth status:', err);
      setIsLoggedIn(false);
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        {isLoggedIn ? (
          // Usuario logueado - mostrar tabs
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
            }}
          />
        ) : (
          // Usuario no logueado - mostrar login
          <Stack.Screen
            name="auth/login"
            options={{
              headerShown: false,
            }}
          />
        )}
        <Stack.Screen
          name="index"
          options={{ headerShown: false }}
        />
      </Stack>
      <StatusBar style="auto" />
    </QueryClientProvider>
  );
}
