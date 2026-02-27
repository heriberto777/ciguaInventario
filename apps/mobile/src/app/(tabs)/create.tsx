import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  FlatList,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCreateCount, useWarehouses, Warehouse } from '@/hooks/useInventory';
import { initializeApiClient } from '@/services/api';

export default function CreateCountScreen() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [showWarehousePicker, setShowWarehousePicker] = useState(false);
  const [error, setError] = useState('');

  const createMutation = useCreateCount();
  const { data: warehouses = [], isLoading: loadingWarehouses } = useWarehouses();

  // Inicializar API client si aún no está
  useEffect(() => {
    const initAPI = async () => {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        await initializeApiClient('http://10.0.11.49:3000/api');
      }
    };
    initAPI();
  }, []);

  const activeWarehouses = warehouses.filter((w) => w.isActive);

  const handleCreate = async () => {
    setError('');

    if (!selectedWarehouse) {
      setError('Debe seleccionar un almacén');
      return;
    }

    try {
      const count = await createMutation.mutateAsync({
        warehouseId: selectedWarehouse.id,
        description: description.trim() || undefined,
      });

      Alert.alert('✅ Éxito', 'Conteo creado correctamente', [
        {
          text: 'Ver Conteo',
          onPress: () => router.push(`/${count.id}`),
        },
        {
          text: 'Quedarse aquí',
          style: 'cancel',
          onPress: () => {
            setSelectedWarehouse(null);
            setDescription('');
          },
        },
      ]);
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Error al crear conteo. Verifique la conexión.';
      setError(msg);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
        <ScrollView keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backBtnText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Nuevo Conteo</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.form}>
            {/* Error */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            ) : null}

            {/* Selector de Almacén */}
            <View style={styles.field}>
              <Text style={styles.label}>Almacén *</Text>
              <TouchableOpacity
                style={[styles.picker, !selectedWarehouse && styles.pickerEmpty]}
                onPress={() => setShowWarehousePicker(true)}
                disabled={loadingWarehouses || createMutation.isLoading}
              >
                {loadingWarehouses ? (
                  <ActivityIndicator size="small" color="#3b82f6" />
                ) : selectedWarehouse ? (
                  <View>
                    <Text style={styles.pickerValuePrimary}>{selectedWarehouse.name}</Text>
                    <Text style={styles.pickerValueSecondary}>Código: {selectedWarehouse.code}</Text>
                  </View>
                ) : (
                  <Text style={styles.pickerPlaceholder}>
                    {activeWarehouses.length === 0
                      ? 'No hay almacenes disponibles'
                      : 'Seleccionar almacén...'}
                  </Text>
                )}
                <Text style={styles.pickerChevron}>▼</Text>
              </TouchableOpacity>
            </View>

            {/* Descripción */}
            <View style={styles.field}>
              <Text style={styles.label}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ej: Revisión Q1 2026 (opcional)"
                placeholderTextColor="#9ca3af"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                editable={!createMutation.isLoading}
              />
            </View>

            {/* Botones */}
            <TouchableOpacity
              style={[styles.primaryBtn, createMutation.isLoading && styles.btnDisabled]}
              onPress={handleCreate}
              disabled={createMutation.isLoading}
            >
              {createMutation.isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Crear Conteo</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => router.back()}
              disabled={createMutation.isLoading}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          {/* Modal selector de almacén */}
          <Modal
            visible={showWarehousePicker}
            animationType="slide"
            transparent
            onRequestClose={() => setShowWarehousePicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Seleccionar Almacén</Text>
                  <TouchableOpacity onPress={() => setShowWarehousePicker(false)}>
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {activeWarehouses.length === 0 ? (
                  <View style={styles.emptyPickerState}>
                    <Text style={styles.emptyPickerText}>No hay almacenes activos configurados</Text>
                  </View>
                ) : (
                  <FlatList
                    data={activeWarehouses}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.warehouseItem,
                          selectedWarehouse?.id === item.id && styles.warehouseItemSelected,
                        ]}
                        onPress={() => {
                          setSelectedWarehouse(item);
                          setShowWarehousePicker(false);
                        }}
                      >
                        <View>
                          <Text style={styles.warehouseItemName}>{item.name}</Text>
                          <Text style={styles.warehouseItemCode}>Código: {item.code}</Text>
                        </View>
                        {selectedWarehouse?.id === item.id && (
                          <Text style={styles.warehouseItemCheck}>✓</Text>
                        )}
                      </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
                  />
                )}
              </View>
            </View>
          </Modal>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },

  // Header
  header: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
  },
  backBtnText: { fontSize: 20, color: '#374151' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },

  // Form
  form: { padding: 16 },
  field: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#1f2937', marginBottom: 8 },

  // Picker
  picker: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 52,
  },
  pickerEmpty: { borderColor: '#d1d5db' },
  pickerValuePrimary: { fontSize: 15, fontWeight: '600', color: '#111827' },
  pickerValueSecondary: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  pickerPlaceholder: { fontSize: 14, color: '#9ca3af' },
  pickerChevron: { fontSize: 12, color: '#6b7280' },

  // Input
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1f2937',
  },
  textArea: { textAlignVertical: 'top', paddingTop: 12, minHeight: 80 },

  // Error
  errorBox: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: '#dc2626', fontSize: 14 },

  // Botones
  primaryBtn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#6b7280', fontSize: 14, fontWeight: '600' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  modalCloseText: { fontSize: 18, color: '#6b7280', padding: 4 },

  // Warehouse items
  warehouseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  warehouseItemSelected: { backgroundColor: '#eff6ff' },
  warehouseItemName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  warehouseItemCode: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  warehouseItemCheck: { fontSize: 18, color: '#3b82f6', fontWeight: '700' },
  itemSeparator: { height: 1, backgroundColor: '#f3f4f6' },
  emptyPickerState: { padding: 32, alignItems: 'center' },
  emptyPickerText: { color: '#9ca3af', fontSize: 14, textAlign: 'center' },
});
