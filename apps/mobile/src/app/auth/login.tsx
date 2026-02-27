import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { getApiBaseUrl } from '@/services/serverConfig';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const router = useRouter();

  // Recarga la URL del servidor cada vez que la pantalla recibe el foco
  // (incluyendo al volver de la pantalla server-setup)
  useFocusEffect(
    useCallback(() => {
      getApiBaseUrl().then((url) => setServerUrl(url));
    }, [])
  );

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Por favor completa todos los campos');
      return;
    }
    if (!serverUrl) {
      Alert.alert(
        'Servidor no configurado',
        'Debes configurar la dirección del servidor antes de iniciar sesión.',
        [{ text: 'Configurar ahora', onPress: () => router.push('/auth/server-setup') }]
      );
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${serverUrl}/auth/login`, { email, password });
      const { data } = response.data;

      await AsyncStorage.setItem('auth_token', data.accessToken);
      await AsyncStorage.setItem('refresh_token', data.refreshToken);
      await AsyncStorage.setItem('user_email', data.user.email);
      await AsyncStorage.setItem('user_id', data.user.id);
      await AsyncStorage.setItem('user_name', data.user.name || data.user.email);
      await AsyncStorage.setItem('user_roles', JSON.stringify(data.user.roles || []));
      await AsyncStorage.setItem('user_permissions', JSON.stringify(data.user.permissions || []));

      // Inicializar el cliente de API con el nuevo token inmediatamente
      const { initializeApiClient } = await import('@/services/api');
      await initializeApiClient(serverUrl);

      router.replace('/(tabs)');
    } catch (err: any) {
      const code = err.response?.data?.error?.code;
      if (code === 'INVALID_CREDENTIALS') {
        setError('Email o contraseña incorrectos');
      } else if (!err.response) {
        setError('No se pudo conectar al servidor. Verifica la configuración.');
      } else {
        setError(err.message || 'Error desconocido');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Brand */}
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Text style={styles.logoIcon}>📦</Text>
        </View>
        <Text style={styles.title}>Cigua Inventory</Text>
        <Text style={styles.subtitle}>Conteo Físico Móvil</Text>
      </View>

      {/* Status del servidor */}
      <TouchableOpacity
        style={[styles.serverStatus, serverUrl ? styles.serverOk : styles.serverNone]}
        onPress={() => router.push('/auth/server-setup')}
      >
        <Text style={styles.serverStatusText}>
          {serverUrl
            ? `🟢 Servidor: ${serverUrl}`
            : '⚙️ Toca para configurar el servidor'
          }
        </Text>
      </TouchableOpacity>

      {/* Formulario */}
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="usuario@empresa.com"
            value={email}
            onChangeText={setEmail}
            editable={!loading}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            editable={!loading}
            secureTextEntry
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Iniciar Sesión</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Config server link */}
      <TouchableOpacity
        style={styles.configLink}
        onPress={() => router.push('/auth/server-setup')}
      >
        <Text style={styles.configLinkText}>⚙️ Configurar servidor</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },

  // Header / brand
  header: { marginBottom: 28, alignItems: 'center' },
  logoBox: {
    width: 64, height: 64,
    backgroundColor: '#6366f1',
    borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  logoIcon: { fontSize: 32 },
  title: { fontSize: 26, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748b' },

  // Status del servidor
  serverStatus: {
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
    marginBottom: 20, alignItems: 'center',
  },
  serverOk: { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#bbf7d0' },
  serverNone: { backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fde68a' },
  serverStatusText: { fontSize: 12, color: '#374151', fontWeight: '600' },

  // Formulario
  form: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
  },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#1f2937',
    backgroundColor: '#fafafa',
  },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 14, textAlign: 'center' },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 4,
  },
  buttonDisabled: { backgroundColor: '#a5b4fc' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Link config
  configLink: { alignItems: 'center', paddingVertical: 8 },
  configLinkText: { color: '#6366f1', fontSize: 13, fontWeight: '600' },
});
