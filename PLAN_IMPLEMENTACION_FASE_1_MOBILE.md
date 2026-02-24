# 📲 PLAN DE IMPLEMENTACIÓN MOBILE - FASE 1

## 🎯 Objetivo
Tener una app móvil funcionando que permita:
1. Ver lista de conteos
2. Crear nuevo conteo
3. Ver detalle y registrar cantidades
4. Marcar como completado

## ✅ Lo que YA está listo

### Backend
- ✅ Todos los endpoints implementados
- ✅ BD con datos de prueba
- ✅ Autenticación JWT funcionando

### Mobile Hooks
- ✅ `useListInventoryCounts()` - Obtener lista de conteos
- ✅ `useCreateCount()` - Crear conteo
- ✅ `useInventoryCount(id)` - Obtener detalle conteo
- ✅ `useGetCountItems(id)` - Obtener items del conteo
- ✅ `useUpdateCountItem()` - Actualizar cantidad
- ✅ `useStartCount()` - Iniciar conteo
- ✅ `useCompleteCount()` - Completar conteo
- ✅ `useAddCountItem()` - Agregar item
- ✅ `useGetVarianceItems(id)` - Obtener items con varianza

### Mobile Screens (Parcialmente)
- ✅ Login screen funciona
- ✅ Tabs navigation setup
- ⚠️ inventory-counts.tsx - Listado básico (necesita mejoras)
- ⚠️ count-detail.tsx - Existe pero necesita reescribir

---

## 🔨 IMPLEMENTACIÓN (En este orden)

### PASO 1: Mejorar inventory-counts.tsx (Pantalla de lista)
**Duración: 30-45 min**

**Cambios necesarios:**
1. Usar `useListInventoryCounts()` en lugar de axios directo
2. Agregar botón "+ Crear Conteo"
3. Mostrar:
   - Número de conteo
   - Estado (color según estado)
   - Fecha
   - Botón para abrir detalle
4. Agregar estados de carga y error

**Archivo:** `apps/mobile/src/app/(tabs)/inventory-counts.tsx`

---

### PASO 2: Crear pantalla "Crear Conteo"
**Duración: 45-60 min**

**Ruta:** `apps/mobile/src/app/(tabs)/create-count.tsx`

**Funcionalidades:**
1. Form con:
   - Input: "Nombre/Descripción"
   - Selector: "Almacén"
   - Selector: "Mapping Config" (opcional)
2. Botón: "Crear"
3. Mostrar loading mientras se crea
4. Mostrar error si falla
5. Redirigir a detalle si éxito

**Código base:**
```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useCreateCount } from '@/hooks/useInventory';

export default function CreateCountScreen() {
  const [description, setDescription] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const router = useRouter();
  const createMutation = useCreateCount();

  const handleCreate = async () => {
    if (!warehouseId) {
      Alert.alert('Error', 'Selecciona un almacén');
      return;
    }

    try {
      const count = await createMutation.mutateAsync({
        warehouseId,
        description: description || undefined,
      });

      // Redirigir al detalle del conteo creado
      router.push({
        pathname: '/(tabs)/count-detail',
        params: { id: count.id },
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear el conteo');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crear Nuevo Conteo</Text>

      <TextInput
        style={styles.input}
        placeholder="Descripción (opcional)"
        value={description}
        onChangeText={setDescription}
      />

      {/* TODO: Agregar selector de warehouse */}

      <TouchableOpacity
        style={[styles.button, createMutation.isLoading && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={createMutation.isLoading}
      >
        {createMutation.isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Crear Conteo</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 16, borderRadius: 8 },
  button: { backgroundColor: '#3b82f6', padding: 16, borderRadius: 8, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
```

---

### PASO 3: Reescribir count-detail.tsx
**Duración: 60-90 min**

**Funcionalidades:**
1. Header:
   - Número de conteo
   - Estado actual (badge con color)
   - Botones: Iniciar / Completar

2. Listado de items:
   - Columnas: Código | Nombre | Qty Sistem | Qty Contada | Diferencia
   - Color de fondo según diferencia:
     - Verde: Coincide (0 diferencia)
     - Rojo: No coincide
     - Gris: Sin contar

3. Click en item → Modal para editar cantidad

4. Tab/Botón: Mostrar solo varianzas

**Código base:**
```tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  useInventoryCount,
  useUpdateCountItem,
  useStartCount,
  useCompleteCount,
} from '@/hooks/useInventory';

export default function CountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [newQty, setNewQty] = useState('');

  const { data: count, isLoading } = useInventoryCount(id || '');
  const updateMutation = useUpdateCountItem();
  const startMutation = useStartCount();
  const completeMutation = useCompleteCount();

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  const renderItem = ({ item }: { item: any }) => {
    const difference = (item.countedQty || 0) - item.systemQty;
    const bgColor = item.countedQty === undefined ? '#f0f0f0' : difference === 0 ? '#d1fae5' : '#fee2e2';

    return (
      <TouchableOpacity
        style={[styles.itemRow, { backgroundColor: bgColor }]}
        onPress={() => {
          setSelectedItem(item);
          setNewQty(String(item.countedQty || ''));
        }}
      >
        <Text style={styles.itemCode}>{item.itemCode}</Text>
        <Text style={styles.itemName}>{item.itemName}</Text>
        <Text style={styles.qty}>{item.systemQty}</Text>
        <Text style={styles.qty}>{item.countedQty || '-'}</Text>
        <Text style={styles.qty}>{difference || '-'}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.countCode}>{count?.code}</Text>
        <Text style={styles.status}>{count?.status}</Text>
      </View>

      {/* Botones */}
      <View style={styles.buttonGroup}>
        {count?.status === 'DRAFT' && (
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={() => startMutation.mutate(id!)}
          >
            <Text style={styles.buttonText}>Iniciar Conteo</Text>
          </TouchableOpacity>
        )}

        {count?.status === 'ACTIVE' && (
          <TouchableOpacity
            style={[styles.button, styles.buttonSuccess]}
            onPress={() => completeMutation.mutate(id!)}
          >
            <Text style={styles.buttonText}>Completar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabla de items */}
      <FlatList
        data={count?.countItems || []}
        renderItem={renderItem}
        keyExtractor={item => item.id}
      />

      {/* Modal para editar cantidad */}
      <Modal visible={!!selectedItem} animationType="slide">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Registrar Cantidad</Text>
          <Text>{selectedItem?.itemCode}</Text>

          <TextInput
            style={styles.input}
            placeholder="Cantidad contada"
            keyboardType="number-pad"
            value={newQty}
            onChangeText={setNewQty}
          />

          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={async () => {
              if (!newQty) return;
              await updateMutation.mutateAsync({
                countId: id!,
                itemId: selectedItem.id,
                countedQty: parseInt(newQty),
              });
              setSelectedItem(null);
            }}
          >
            <Text style={styles.buttonText}>Guardar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16, backgroundColor: '#f3f4f6', borderBottomWidth: 1 },
  countCode: { fontSize: 18, fontWeight: 'bold' },
  status: { marginTop: 8, color: '#666' },
  buttonGroup: { flexDirection: 'row', padding: 16, gap: 8 },
  button: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonPrimary: { backgroundColor: '#3b82f6' },
  buttonSuccess: { backgroundColor: '#10b981' },
  buttonText: { color: 'white', fontWeight: 'bold' },
  itemRow: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  itemCode: { width: 70, fontWeight: '600' },
  itemName: { flex: 1 },
  qty: { width: 60, textAlign: 'center' },
  modal: { flex: 1, padding: 16, justifyContent: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 16, borderRadius: 8 },
});
```

---

### PASO 4: Agregar navegación entre pantallas
**Duración: 15 min**

**En `(tabs)/_layout.tsx`:**
1. Agregar nueva pantalla: `create-count`
2. Agregar Link o botón en inventory-counts que vaya a create-count

**En `inventory-counts.tsx`:**
```tsx
<TouchableOpacity
  style={styles.createButton}
  onPress={() => router.push('/(tabs)/create-count')}
>
  <Text>+ Crear Conteo</Text>
</TouchableOpacity>
```

---

## 🧪 Testing

Después de cada paso, prueba:

1. **Login:** Entra con admin@cigua.com / admin123456
2. **Listar:** ¿Se muestran los conteos?
3. **Crear:** ¿Se puede crear uno nuevo?
4. **Detalle:** ¿Se abre el detalle?
5. **Editar:** ¿Se puede cambiar cantidad?

---

## 📊 Progreso esperado

```
├── PASO 1: Mejorar inventory-counts.tsx     ✓ Lista funcional
├── PASO 2: Crear create-count.tsx           ✓ Crear nuevo
├── PASO 3: Reescribir count-detail.tsx      ✓ Detalle + edición
└── PASO 4: Navegación                       ✓ Todo conectado

Resultado: ✅ APP FUNCIONAL (versión MVP)
```

---

## 🚨 Posibles Errores

### "Cannot find module useCreateCount"
- Solución: Asegúrate de haber guardado useInventory.ts con los nuevos hooks

### "401 Unauthorized"
- Solución: Token expirado. Login de nuevo.

### "Cannot get /inventory-counts"
- Solución: Backend no está corriendo. Inicia con `npm run dev`

---

## ⏱️ Tiempo estimado total
- PASO 1: 45 min
- PASO 2: 60 min
- PASO 3: 90 min
- PASO 4: 15 min
- **TOTAL: ~3 horas**

¿Empezamos con PASO 1?
