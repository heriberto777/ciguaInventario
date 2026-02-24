import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineSync } from '@/services/offline-sync';

export default function SettingsScreen() {
  const [apiUrl, setApiUrl] = useState('http://10.0.11.49:3000/api');
  const [autoSync, setAutoSync] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [pendingSyncs, setPendingSyncs] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const router = useRouter();

  useFocusEffect(
    React.useCallback(() => {
      loadSettings();
      checkPendingSyncs();
    }, [])
  );

  const loadSettings = async () => {
    const savedUrl = await AsyncStorage.getItem('api_url');
    const savedEmail = await AsyncStorage.getItem('user_email');
    const savedAutoSync = await AsyncStorage.getItem('auto_sync');
    const lastSync = await AsyncStorage.getItem('last_sync_time');

    if (savedUrl) setApiUrl(savedUrl);
    if (savedEmail) setUserEmail(savedEmail);
    if (savedAutoSync !== null) setAutoSync(JSON.parse(savedAutoSync));
    if (lastSync) setLastSyncTime(lastSync);
  };

  const checkPendingSyncs = async () => {
    const syncs = await offlineSync.getPendingSyncs();
    setPendingSyncs(syncs.length);
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      await offlineSync.syncPending();
      const now = new Date().toLocaleString('es-MX');
      await AsyncStorage.setItem('last_sync_time', now);
      setLastSyncTime(now);
      Alert.alert('Éxito', 'Sincronización completada');
      await checkPendingSyncs();
    } catch (error) {
      Alert.alert('Error', 'Fallo la sincronización. Reintentaremos más tarde.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveSettings = async () => {
    await AsyncStorage.setItem('api_url', apiUrl);
    await AsyncStorage.setItem('auto_sync', JSON.stringify(autoSync));
    alert('Configuración guardada');
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user_email');
    router.replace('/auth/login');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información del Servidor</Text>

        <View style={styles.settingGroup}>
          <Text style={styles.label}>URL del API</Text>
          <TextInput
            style={styles.input}
            placeholder="http://10.0.11.49:3000/api"
            value={apiUrl}
            onChangeText={setApiUrl}
          />
          <Text style={styles.helperText}>
            URL base del servidor backend
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Usuario</Text>

        <View style={styles.settingGroup}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.userEmail}>{userEmail || 'No configurado'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sincronización</Text>

        <View style={styles.switchGroup}>
          <Text style={styles.label}>Sincronización Automática</Text>
          <Switch
            value={autoSync}
            onValueChange={setAutoSync}
            trackColor={{ false: '#d1d5db', true: '#a3e635' }}
            thumbColor={autoSync ? '#65a30d' : '#f3f4f6'}
          />
        </View>
        <Text style={styles.helperText}>
          Los cambios se sincronizarán automáticamente con el servidor
        </Text>

        <View style={styles.syncStatusContainer}>
          <View style={styles.syncStatusInfo}>
            <Text style={styles.syncStatusLabel}>Operaciones pendientes:</Text>
            <Text style={styles.syncStatusValue}>{pendingSyncs}</Text>
            {lastSyncTime && (
              <Text style={styles.syncStatusTime}>Última sincronización: {lastSyncTime}</Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
            onPress={handleSyncNow}
            disabled={isSyncing || pendingSyncs === 0}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.syncButtonText}>🔄 Sincronizar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleSaveSettings}
      >
        <Text style={styles.buttonText}>Guardar Configuración</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.logoutButton]}
        onPress={handleLogout}
      >
        <Text style={[styles.buttonText, styles.logoutText]}>Cerrar Sesión</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.version}>Versión 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  section: {
    backgroundColor: '#fff',
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  settingGroup: {
    marginBottom: 16,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
  },
  userEmail: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
    paddingVertical: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
  },
  button: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutText: {
    color: '#ef4444',
  },
  syncStatusContainer: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncStatusInfo: {
    flex: 1,
  },
  syncStatusLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  syncStatusValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#22c55e',
  },
  syncStatusTime: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  syncButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncButtonDisabled: {
    backgroundColor: '#d1d5db',
    opacity: 0.6,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  version: {
    fontSize: 12,
    color: '#9ca3af',
  },
});
