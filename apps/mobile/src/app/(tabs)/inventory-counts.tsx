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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useListInventoryCounts } from '@/hooks/useInventory';
import { initializeApiClient } from '@/services/api';

interface InventoryCount {
  id: string;
  sequenceNumber: number;
  code: string;
  status: 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED' | 'CLOSED';
  currentVersion: number;
  countItems: Array<{ id: string }>;
  createdAt: string;
  updatedAt: string;
}

export default function InventoryCountsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { data: allCounts = [], isLoading, refetch } = useListInventoryCounts();

  useEffect(() => {
    const initAPI = async () => {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        await initializeApiClient('http://10.0.11.49:3000/api');
      }
    };
    initAPI();
  }, []);

  const counts = allCounts.filter(count => count.status === 'ACTIVE');

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '#10b981';
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
          <Text style={styles.label}>Items:</Text>
          <Text style={styles.value}>{item.countItems?.length || 0}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Versión:</Text>
          <Text style={styles.value}>{item.currentVersion}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Fecha:</Text>
          <Text style={styles.value}>{new Date(item.createdAt).toLocaleDateString('es-ES')}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.actionButton}>
        <Text style={styles.actionButtonText}>Ver Conteo →</Text>
      </TouchableOpacity>
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
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Conteos Físicos</Text>
          <Text style={styles.headerSubtitle}>{counts.length} conteos registrados</Text>
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/create')}
        >
          <Text style={styles.createButtonText}>+</Text>
        </TouchableOpacity>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createButton: {
    backgroundColor: '#3b82f6',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonText: { color: '#fff', fontSize: 24, fontWeight: '600' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#1f2937', marginBottom: 4 },
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  countNumber: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 4 },
  countCode: { fontSize: 13, color: '#6b7280' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  cardBody: { paddingHorizontal: 16, paddingVertical: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  value: { fontSize: 13, color: '#1f2937', fontWeight: '600' },
  actionButton: { backgroundColor: '#3b82f6', paddingVertical: 12, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyStateText: { fontSize: 16, color: '#6b7280', marginBottom: 24, textAlign: 'center' },
  emptyCreateButton: { backgroundColor: '#3b82f6', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 8 },
  emptyCreateButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
});
