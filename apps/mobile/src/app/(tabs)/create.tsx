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
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCreateCount } from '@/hooks/useInventory';
import { initializeApiClient } from '@/services/api';

export default function CreateCountScreen() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [error, setError] = useState('');

  const createMutation = useCreateCount();

  // Inicializar API client
  useEffect(() => {
    const initAPI = async () => {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        await initializeApiClient('http://10.0.11.49:3000/api');
      }
    };
    initAPI();
  }, []);

  const handleCreate = async () => {
    setError('');

    if (!warehouseId.trim()) {
      setError('Debe seleccionar un almacén');
      return;
    }

    try {
      const count = await createMutation.mutateAsync({
        warehouseId,
        description: description || undefined,
      });

      Alert.alert('Éxito', 'Conteo creado correctamente', [
        {
          text: 'Ver Conteo',
          onPress: () => {
            router.push(`/${count.id}`);
          },
        },
      ]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear conteo');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Nuevo Conteo</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.form}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.field}>
          <Text style={styles.label}>Almacén *</Text>
          <TextInput
            style={styles.input}
            placeholder="ID del almacén"
            value={warehouseId}
            onChangeText={setWarehouseId}
            editable={!createMutation.isLoading}
          />
          <Text style={styles.hint}>Ej: warehouse-001</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Descripción del conteo (opcional)"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            editable={!createMutation.isLoading}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            createMutation.isLoading && styles.buttonDisabled,
          ]}
          onPress={handleCreate}
          disabled={createMutation.isLoading}
        >
          {createMutation.isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Crear Conteo</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={createMutation.isLoading}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1f2937',
  },
  textArea: {
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  error: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    marginBottom: 16,
    fontSize: 14,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
});
