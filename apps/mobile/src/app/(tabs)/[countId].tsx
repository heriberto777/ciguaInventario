import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInventoryCount, useUpdateCountItem, useCompleteCount } from '@/hooks/useInventory';
import { initializeApiClient } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CountItem {
  id: string;
  itemCode: string;
  itemName: string;
  systemQty: number;
  countedQty?: number;
  packQty: number;
  uom: string;
}

export default function CountDetailScreen() {
  const { countId } = useLocalSearchParams<{ countId: string }>();
  const router = useRouter();

  const [selectedItem, setSelectedItem] = useState<CountItem | null>(null);
  const [newQty, setNewQty] = useState('');
  const [showVarianceOnly, setShowVarianceOnly] = useState(false);

  const { data: count, isLoading, refetch } = useInventoryCount(countId || '');
  const updateMutation = useUpdateCountItem();
  const completeMutation = useCompleteCount();

  // Inicializar API
  useEffect(() => {
    const initAPI = async () => {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        await initializeApiClient('http://10.0.11.49:3000/api');
      }
    };
    initAPI();
  }, []);

  if (!countId) {
    return (
      <View style={styles.container}>
        <Text>Error: No se encontró el conteo</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!count) {
    return (
      <View style={styles.container}>
        <Text>No se encontró el conteo</Text>
      </View>
    );
  }

  // Filtrar items según vista
  const displayItems = showVarianceOnly
    ? count.countItems?.filter(item => (item.countedQty || 0) !== item.systemQty) || []
    : count.countItems || [];

  const handleUpdateItem = async () => {
    if (!selectedItem || !newQty) {
      Alert.alert('Error', 'Ingresa una cantidad');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        countId: countId,
        itemId: selectedItem.id,
        countedQty: parseInt(newQty),
      });
      setSelectedItem(null);
      setNewQty('');
      await refetch();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar la cantidad');
    }
  };

  const handleComplete = async () => {
    Alert.alert('Completar', '¿Estás seguro de completar este conteo?', [
      { text: 'Cancelar' },
      {
        text: 'Completar',
        onPress: async () => {
          try {
            await completeMutation.mutateAsync(countId);
            Alert.alert('Éxito', 'Conteo completado', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          } catch (error) {
            Alert.alert('Error', 'No se pudo completar');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: CountItem }) => {
    const difference = (item.countedQty || 0) - item.systemQty;
    const hasVariance = difference !== 0;
    const bgColor = item.countedQty === undefined ? '#f9fafb' : hasVariance ? '#fee2e2' : '#dcfce7';

    return (
      <TouchableOpacity
        style={[styles.itemRow, { backgroundColor: bgColor }]}
        onPress={() => {
          setSelectedItem(item);
          setNewQty(String(item.countedQty || ''));
        }}
      >
        <View style={styles.itemInfo}>
          <Text style={styles.itemCode}>{item.itemCode}</Text>
          <Text style={styles.itemName}>{item.itemName}</Text>
        </View>
        <View style={styles.itemQties}>
          <View style={styles.qtyColumn}>
            <Text style={styles.qtyLabel}>Sistema</Text>
            <Text style={styles.qtyValue}>{item.systemQty}</Text>
          </View>
          <View style={styles.qtyColumn}>
            <Text style={styles.qtyLabel}>Contado</Text>
            <Text style={[styles.qtyValue, item.countedQty === undefined && styles.qtyMissing]}>
              {item.countedQty !== undefined ? item.countedQty : '-'}
            </Text>
          </View>
          <View style={styles.qtyColumn}>
            <Text style={styles.qtyLabel}>Diferencia</Text>
            <Text style={[styles.qtyValue, hasVariance && styles.qtyDifferent]}>
              {item.countedQty !== undefined ? difference : '-'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Atrás</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{count.code}</Text>
          <Text style={styles.headerStatus}>{count.status}</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Info */}
      <View style={styles.infoBox}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Secuencia</Text>
          <Text style={styles.infoValue}>{count.sequenceNumber}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Items</Text>
          <Text style={styles.infoValue}>{count.countItems?.length || 0}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Versión</Text>
          <Text style={styles.infoValue}>{count.currentVersion}</Text>
        </View>
      </View>

      {/* Botones */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.filterButton, showVarianceOnly && styles.filterButtonActive]}
          onPress={() => setShowVarianceOnly(!showVarianceOnly)}
        >
          <Text style={[styles.filterButtonText, showVarianceOnly && styles.filterButtonTextActive]}>
            {showVarianceOnly ? 'Solo Varianzas ✓' : 'Mostrar Todos'}
          </Text>
        </TouchableOpacity>

        {count.status === 'ACTIVE' && (
          <TouchableOpacity
            style={[styles.completeButton, completeMutation.isLoading && styles.buttonDisabled]}
            onPress={handleComplete}
            disabled={completeMutation.isLoading}
          >
            <Text style={styles.completeButtonText}>
              {completeMutation.isLoading ? 'Completando...' : 'Completar'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Lista de items */}
      <FlatList
        data={displayItems}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {showVarianceOnly ? 'Sin varianzas' : 'Sin items'}
            </Text>
          </View>
        }
      />

      {/* Modal para editar cantidad */}
      <Modal visible={!!selectedItem} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Registrar Cantidad</Text>

            {selectedItem && (
              <>
                <View style={styles.modalItem}>
                  <Text style={styles.modalCode}>{selectedItem.itemCode}</Text>
                  <Text style={styles.modalName}>{selectedItem.itemName}</Text>
                </View>

                <View style={styles.modalInfo}>
                  <View style={styles.modalInfoItem}>
                    <Text style={styles.modalLabel}>Cantidad Sistema:</Text>
                    <Text style={styles.modalValue}>{selectedItem.systemQty}</Text>
                  </View>
                  <View style={styles.modalInfoItem}>
                    <Text style={styles.modalLabel}>UOM:</Text>
                    <Text style={styles.modalValue}>{selectedItem.uom}</Text>
                  </View>
                </View>

                <Text style={styles.inputLabel}>Cantidad Contada *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="number-pad"
                  value={newQty}
                  onChangeText={setNewQty}
                  editable={!updateMutation.isLoading}
                />

                <TouchableOpacity
                  style={[styles.button, updateMutation.isLoading && styles.buttonDisabled]}
                  onPress={handleUpdateItem}
                  disabled={updateMutation.isLoading}
                >
                  <Text style={styles.buttonText}>
                    {updateMutation.isLoading ? 'Guardando...' : 'Guardar'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setSelectedItem(null);
                setNewQty('');
              }}
              disabled={updateMutation.isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  headerInfo: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  headerStatus: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  infoBox: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  buttonGroup: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  filterButtonActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#3b82f6',
  },
  completeButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#10b981',
  },
  completeButtonText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  itemRow: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  itemName: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  itemQties: {
    flexDirection: 'row',
    gap: 12,
  },
  qtyColumn: {
    alignItems: 'center',
  },
  qtyLabel: {
    fontSize: 10,
    color: '#9ca3af',
    marginBottom: 2,
  },
  qtyValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  qtyMissing: {
    color: '#d1d5db',
  },
  qtyDifferent: {
    color: '#ef4444',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 30,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  modalItem: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  modalCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  modalName: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  modalInfo: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  modalInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  modalLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  modalValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
});
