import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useListInventoryCounts } from '@/hooks/useInventory';
import { initializeApiClient } from '@/services/api';
import { getApiBaseUrl } from '@/services/serverConfig';
import { offlineSync } from '@/services/offline-sync';
import { useFocusEffect } from 'expo-router';

interface InventoryCount {
  id: string;
  sequenceNumber: number;
  code: string;
  status: 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'SUBMITTED' | 'COMPLETED' | 'CANCELLED' | 'CLOSED';
  currentVersion: number;
  countItems: Array<{ id: string }>;
  createdAt: string;
  updatedAt: string;
}

export default function InventoryCountsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const { data: allCounts = [], isLoading, refetch } = useListInventoryCounts();

  useFocusEffect(
    React.useCallback(() => {
      const checkPending = async () => {
        const syncs = await offlineSync.getPendingSyncs();
        setPendingSyncCount(syncs.length);
        if (syncs.length > 0) {
          // Intentamos sincronizar si hay algo pendiente al enfocar
          offlineSync.syncPending().then(() => {
            offlineSync.getPendingSyncs().then(s => setPendingSyncCount(s.length));
          });
        }
      };
      checkPending();
    }, [])
  );

  useEffect(() => {
    const initAPI = async () => {
      const token = await AsyncStorage.getItem('auth_token');
      const baseUrl = await getApiBaseUrl();
      if (token && baseUrl) {
        await initializeApiClient(baseUrl);
      }
    };
    initAPI();
  }, []);

  const counts = allCounts.filter(count =>
    count.status === 'ACTIVE' ||
    count.status === 'ON_HOLD' ||
    count.status === 'SUBMITTED'
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '#10b981';
      case 'SUBMITTED': return '#8b5cf6'; // Violeta para entrega
      case 'ACTIVE': return '#3b82f6';
      case 'ON_HOLD': return '#f59e0b';
      case 'DRAFT': return '#6b7280';
      case 'CANCELLED': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const renderCountItem = ({ item }: { item: InventoryCount }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.countNumber}>#{item.sequenceNumber}</Text>
          <Text style={styles.countCode}>{item.code}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Items / Ver:</Text>
          <Text style={styles.value}>{item.countItems?.length || 0} (v{item.currentVersion})</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Fecha:</Text>
          <Text style={styles.value}>{new Date(item.createdAt).toLocaleDateString('es-ES')}</Text>
        </View>
      </View>

      <View style={styles.actionButton}>
        <Text style={styles.actionButtonText}>Abrir Conteo →</Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Conteos Físicos</Text>
            <Text style={styles.headerSubtitle}>{counts.length} conteos registrados</Text>
            {pendingSyncCount > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>⏳ {pendingSyncCount} pendientes</Text>
              </View>
            )}
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.reloadButton}
              onPress={() => onRefresh()}
              disabled={refreshing || isLoading}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#3b82f6" />
              ) : (
                <Text style={styles.reloadButtonText}>🔄</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/create')}
            >
              <Text style={styles.createButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {counts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No hay conteos disponibles</Text>
            <TouchableOpacity
              style={styles.emptyCreateButton}
              onPress={() => router.push('/create')}
            >
              <Text style={styles.emptyCreateButtonText}>Crear Primer Conteo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={counts}
            renderItem={renderCountItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createButton: {
    backgroundColor: '#3b82f6',
    width: 44,
    height: 44,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
  },
  reloadButton: {
    backgroundColor: '#eff6ff',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  reloadButtonText: { fontSize: 18 },
  createButtonText: { color: '#fff', fontSize: 20, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1f2937', marginBottom: 2 },
  headerSubtitle: { fontSize: 14, color: '#6b7280' },
  listContent: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  countNumber: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 4 },
  countCode: { fontSize: 13, color: '#6b7280' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  cardBody: { paddingHorizontal: 12, paddingVertical: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  value: { fontSize: 12, color: '#1f2937', fontWeight: '600' },
  actionButton: { backgroundColor: '#3b82f6', paddingVertical: 8, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyStateText: { fontSize: 16, color: '#6b7280', marginBottom: 24, textAlign: 'center' },
  emptyCreateButton: { backgroundColor: '#3b82f6', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 8 },
  emptyCreateButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  pendingBadge: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  pendingBadgeText: {
    color: '#9a3412',
    fontSize: 11,
    fontWeight: '700',
  },
});
