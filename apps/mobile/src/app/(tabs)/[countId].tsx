import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useInventoryCount,
  useUpdateCountItem,
  useCompleteCount,
  useSendToERP,
  CountItem,
} from '@/hooks/useInventory';
import { offlineSync } from '@/services/offline-sync';
import BarcodeScanner from '@/components/BarcodeScanner';

// ─────────────────────────────────────────────
type FilterType = 'all' | 'variance';

interface ItemStats {
  total: number;
  counted: number;
  pending: number;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function getItemRowColor(item: CountItem): string {
  if (item.status === 'PENDING') return '#f3f4f6';          // Pendiente/Para recontar → gris

  const variance = getVariance(item);
  if (variance === 0) return '#dcfce7';                     // Sin varianza → verde
  if (variance != null && variance !== 0) return '#fee2e2'; // Con varianza → rojo

  return '#ffffff';                                         // Fallback
}

function getVariance(item: CountItem): number | null {
  if (item.countedQty == null) return null;
  return item.countedQty - item.systemQty;
}

function formatVariance(v: number | null): string {
  if (v == null) return '–';
  return v > 0 ? `+${v}` : String(v);
}

function computeStats(items: CountItem[]): ItemStats {
  const counted = items.filter((i) => i.countedQty != null).length;
  return {
    total: items.length,
    counted,
    pending: items.length - counted,
  };
}

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
export default function CountDetailScreen() {
  const { countId } = useLocalSearchParams<{ countId: string }>();
  const router = useRouter();

  // Queries & mutations
  const { data: countData, isLoading, isError, refetch } = useInventoryCount(countId ?? '');
  const updateMutation = useUpdateCountItem();
  const completeMutation = useCompleteCount();
  const sendToERPMutation = useSendToERP();

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedItem, setSelectedItem] = useState<CountItem | null>(null);
  const [boxesQty, setBoxesQty] = useState('');
  const [unitsQty, setUnitsQty] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  // Filtros de clasificación
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubcat, setFilterSubcat] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [globalClassifications, setGlobalClassifications] = useState<any[]>([]);
  const [isVisualScanning, setIsVisualScanning] = useState(false);

  const searchInputRef = useRef<TextInput>(null);

  // Cargar permisos y roles al enfocar la pantalla
  useFocusEffect(
    useCallback(() => {
      Promise.all([
        AsyncStorage.getItem('user_permissions'),
        AsyncStorage.getItem('user_roles'),
      ]).then(([p, r]) => {
        if (p) {
          try { setPermissions(JSON.parse(p)); } catch (e) { setPermissions([]); }
        }
        if (r) {
          try { setRoles(JSON.parse(r)); } catch (e) { setRoles([]); }
        }
      });
    }, [])
  );

  // Cargar clasificaciones globales y sincronizar
  useFocusEffect(
    useCallback(() => {
      offlineSync.getClassifications().then(setGlobalClassifications);
      offlineSync.syncGlobalClassifications().then(() => {
        offlineSync.getClassifications().then(setGlobalClassifications);
      });
    }, [])
  );

  const isSuperAdmin = roles.includes('SuperAdmin');
  const hasSystemView = isSuperAdmin || permissions.includes('inventory:view_qty');
  const canSyncERP = isSuperAdmin || permissions.includes('inventory:sync');
  const canManageUsers = isSuperAdmin || permissions.includes('users:manage');

  // ── Datos ──────────────────────────────────
  const allItems: CountItem[] = countData?.countItems ?? [];

  // Filtrar por búsqueda
  const searchedItems = allItems.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.itemCode.toLowerCase().includes(q) ||
      item.itemName.toLowerCase().includes(q)
    );
  });

  // Filtrar por clasificaciones
  const classifiedItems = searchedItems.filter((item) => {
    const matchCat = !filterCategory || item.category === filterCategory;
    const matchSubcat = !filterSubcat || item.subcategory === filterSubcat;
    const matchBrand = !filterBrand || item.brand === filterBrand;
    return matchCat && matchSubcat && matchBrand;
  });

  // Filtrar por varianzas
  const filteredItems = classifiedItems.filter((item) => {
    if (activeFilter === 'all') return true;
    // Si el item está PENDIENTE, significa que debe recontarse o no se ha tocado
    if (item.status === 'PENDING') return true;

    const v = getVariance(item);
    return v != null && v !== 0;
  });

  // Opciones de filtro (Prioriza globales, cae en locales)
  const localCategories = [...new Set(allItems.map((i) => i.category).filter(Boolean))] as string[];
  const localSubcats = [...new Set(allItems.map((i) => i.subcategory).filter(Boolean))] as string[];
  const localBrands = [...new Set(allItems.map((i) => i.brand).filter(Boolean))] as string[];

  const globCats = globalClassifications.filter(c => c.groupType === 'CATEGORY');
  const globSubs = globalClassifications.filter(c => c.groupType === 'SUBCATEGORY');
  const globBrands = globalClassifications.filter(c => c.groupType === 'BRAND');

  // Helpers para deduplicar opciones (evitar Error: Encountered two children with the same key)
  const getUniqueOptions = (items: any[], fallbackStrings: string[]) => {
    if (items.length > 0) {
      const unique = new Map();
      items.forEach(c => {
        if (!unique.has(c.description)) {
          // Usamos el CÓDIGO como valor para que coincida con lo que hay en los items
          unique.set(c.description, { value: c.code, label: `${c.code} - ${c.description}` });
        }
      });
      return Array.from(unique.values());
    }
    const uniqueFallback = [...new Set(fallbackStrings)];
    return uniqueFallback.map(s => ({ value: s, label: s }));
  };

  const categoriesOptions = getUniqueOptions(globCats, localCategories);
  const subcatsOptions = getUniqueOptions(globSubs, localSubcats);
  const brandsOptions = getUniqueOptions(globBrands, localBrands);

  const hasClassificationFilters = categoriesOptions.length > 0 || subcatsOptions.length > 0 || brandsOptions.length > 0;
  const activeClassFilterCount = [filterCategory, filterSubcat, filterBrand].filter(Boolean).length;


  const stats = computeStats(allItems);

  /**
   * packQty: unidades por caja del artículo seleccionado (mín. 1 para evitar división por cero).
   * Cajas y Unidades son INDEPENDIENTES:
   * - Cajas  = cuántas cajas físicas se contaron
   * - Unidades = unidades sueltas adicionales (no completan una caja)
   * - Total a enviar = (cajas × packQty) + unidades_sueltas
   */
  const packQty = selectedItem?.packQty ?? 1;

  const totalUnidades = () => {
    const cajas = parseInt(boxesQty || '0', 10);
    const sueltas = parseInt(unitsQty || '0', 10);
    const boxes = isNaN(cajas) ? 0 : cajas;
    const loose = isNaN(sueltas) ? 0 : sueltas;
    return (boxes * packQty) + loose;
  };

  const handleBoxesChange = (value: string) => {
    // Solo actualiza el campo Cajas — NO toca Unidades
    setBoxesQty(value);
  };

  const handleUnitsChange = (value: string) => {
    // Solo actualiza el campo Unidades — NO toca Cajas
    setUnitsQty(value);
  };


  // ── Búsqueda por código de barras ──────────
  const handleBarcodeSearch = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    const found = allItems.find(
      (item) =>
        item.itemCode.toLowerCase() === trimmed.toLowerCase() ||
        item.barCodeInv?.toLowerCase() === trimmed.toLowerCase() ||
        item.barCodeVt?.toLowerCase() === trimmed.toLowerCase()
    );

    if (found) {
      openItemModal(found);
      setSearchQuery('');
    } else if (trimmed.length > 3) { // Evitar alertas molestas en búsquedas parciales manuales
      Alert.alert('No encontrado', `Código "${trimmed}" no existe en este conteo`);
    }
  };

  // ── Modal ──────────────────────────────────
  const openItemModal = (item: CountItem) => {
    setSelectedItem(item);
    // Pre-llenar con cantidad ya contada si existe
    if (item.countedQty != null) {
      const pack = item.packQty || 1;
      const boxes = Math.floor(item.countedQty / pack);
      const loose = item.countedQty % pack;

      setBoxesQty(String(boxes));
      setUnitsQty(String(loose));
    } else {
      setBoxesQty('');
      setUnitsQty('');
    }
  };

  const closeModal = () => {
    setSelectedItem(null);
    setBoxesQty('');
    setUnitsQty('');
    // Al cerrar el modal, siempre devolver el foco al buscador para permitir el siguiente escaneo
    setTimeout(() => searchInputRef.current?.focus(), 200);
  };

  // ── Guardar cantidad ───────────────────────
  const handleSaveCount = async () => {
    if (!selectedItem) return;

    if (!unitsQty && !boxesQty) {
      Alert.alert('Error', 'Ingresa la cantidad en cajas o unidades sueltas');
      return;
    }

    // Total = (cajas × packQty) + unidades_sueltas
    const finalQty = totalUnidades();

    if (isNaN(finalQty) || finalQty < 0) {
      Alert.alert('Error', 'La cantidad debe ser un número válido');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        countId: countId!,
        itemId: selectedItem.id,
        countedQty: finalQty,
      });
      closeModal();
      await refetch();
    } catch {
      Alert.alert('Error', 'No se pudo guardar. Verifique la conexión.');
    }
  };

  // ── Completar conteo ───────────────────────
  const handleComplete = () => {
    Alert.alert(
      'Completar Conteo',
      `¿Estás seguro de completar el conteo?\n\nContados: ${stats.counted}/${stats.total} items`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Completar',
          style: 'default',
          onPress: async () => {
            try {
              await completeMutation.mutateAsync(countId!);
              Alert.alert('✅ Completado', 'El conteo fue completado exitosamente', [
                { text: 'OK', onPress: () => refetch() },
              ]);
            } catch {
              Alert.alert('Error', 'No se pudo completar el conteo');
            }
          },
        },
      ]
    );
  };

  // El botón de Sync ERP se ha eliminado de mobile por requerimiento de negocio (se maneja en web).

  // ── Pull to refresh ────────────────────────
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // ── Estados de la pantalla ─────────────────
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Cargando conteo...</Text>
      </View>
    );
  }

  if (isError || !countData) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>No se pudo cargar el conteo</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isActive = countData.status === 'ACTIVE' || countData.status === 'DRAFT';

  // ── Render item de la lista ────────────────
  const renderItem = ({ item }: { item: CountItem }) => {
    const variance = getVariance(item);
    const rowBg = getItemRowColor(item);

    return (
      <TouchableOpacity
        style={[styles.itemRow, { backgroundColor: rowBg }, !isActive && { opacity: 0.6 }]}
        onPress={() => isActive && openItemModal(item)}
        activeOpacity={isActive ? 0.7 : 1}
        disabled={!isActive}
      >
        <View style={styles.itemMain}>
          <Text style={styles.itemCode} numberOfLines={1}>{item.itemCode}</Text>
          <Text style={styles.itemName} numberOfLines={1}>{item.itemName}</Text>
          {item.packQty > 1 && (
            <Text style={styles.itemPack}>Pack: {item.packQty} {item.uom}</Text>
          )}
        </View>
        <View style={styles.itemQtys}>
          {hasSystemView && (
            <View style={styles.qtyCol}>
              <Text style={styles.qtyLabel}>Sistema</Text>
              <Text style={styles.qtyValue}>{item.systemQty}</Text>
            </View>
          )}
          <View style={styles.qtyCol}>
            <Text style={styles.qtyLabel}>Contado</Text>
            <Text style={[styles.qtyValue, item.countedQty != null && styles.qtyValueCounted]}>
              {item.countedQty ?? '–'}
            </Text>
          </View>
          {hasSystemView && (
            <View style={styles.qtyCol}>
              <Text style={styles.qtyLabel}>Dif.</Text>
              <Text style={[
                styles.qtyValue,
                variance != null && variance < 0 && styles.varianceNeg,
                variance != null && variance > 0 && styles.variancePos,
              ]}>
                {formatVariance(variance)}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ── Render principal ───────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {countData.code || `#${countData.sequenceNumber}`}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: getStatusColor(countData.status) }]}>
              <Text style={styles.statusPillText}>{countData.status}</Text>
            </View>
          </View>
          {(countData.status === 'ACTIVE' || countData.status === 'DRAFT') && (
            <TouchableOpacity
              style={styles.completeBtn}
              onPress={handleComplete}
              disabled={completeMutation.isLoading}
            >
              {completeMutation.isLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.completeBtnText}>✓ Completar</Text>
              }
            </TouchableOpacity>
          )}
        </View>

        {/* ── STATS BAR ── */}
        <View style={styles.statsBar}>
          <StatChip label="Total" value={stats.total} color="#6b7280" />
          <StatChip label="Contados" value={stats.counted} color="#10b981" />
          <StatChip label="Pendientes" value={stats.pending} color="#f59e0b" />
        </View>

        {/* ── BÚSQUEDA ── */}
        <View style={styles.searchContainer}>
          <View style={styles.searchWrapper}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Buscar o Escanear..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => handleBarcodeSearch(searchQuery)}
              returnKeyType="search"
              autoCorrect={false}
              autoFocus
              autoCapitalize="characters"
            />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ paddingHorizontal: 10 }}>
                  <Text style={styles.clearSearch}>✕</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setIsVisualScanning(true)}
                style={styles.cameraToggle}
              >
                <Text style={{ fontSize: 18 }}>📷</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── FILTROS BÁSICOS ── */}
        <View style={styles.filterRow}>
          <FilterTab
            label="📋 Todos"
            active={activeFilter === 'all'}
            count={allItems.length}
            onPress={() => setActiveFilter('all')}
          />
          {hasSystemView && (
            <FilterTab
              label="⚠️ Varianzas"
              active={activeFilter === 'variance'}
              count={allItems.filter((i) => getVariance(i) !== null && getVariance(i) !== 0).length}
              onPress={() => setActiveFilter('variance')}
            />
          )}
          {hasClassificationFilters && (
            <TouchableOpacity
              style={[
                styles.filterChipBtn,
                showFilters && { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
              ]}
              onPress={() => setShowFilters((v) => !v)}
            >
              <Text style={[styles.filterChipText, showFilters && { color: '#fff' }]}>
                🏷️ Filtros{activeClassFilterCount > 0 ? ` (${activeClassFilterCount})` : ''}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── PANEL CLASIFICACIONES (expandible) ── */}
        {
          showFilters && hasClassificationFilters && (
            <View style={styles.classFiltersPanel}>
              {categoriesOptions.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                  <View style={styles.chipRow}>
                    <Text style={styles.chipGroupLabel}>📁</Text>
                    <ChipFilter label="Todas" active={!filterCategory} onPress={() => setFilterCategory('')} />
                    {categoriesOptions.map((c) => (
                      <ChipFilter key={c.value} label={c.label} active={filterCategory === c.value} onPress={() => setFilterCategory(c.value === filterCategory ? '' : c.value)} />
                    ))}
                  </View>
                </ScrollView>
              )}
              {subcatsOptions.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                  <View style={styles.chipRow}>
                    <Text style={styles.chipGroupLabel}>📂</Text>
                    <ChipFilter label="Todas" active={!filterSubcat} onPress={() => setFilterSubcat('')} />
                    {subcatsOptions.map((s) => (
                      <ChipFilter key={s.value} label={s.label} active={filterSubcat === s.value} onPress={() => setFilterSubcat(s.value === filterSubcat ? '' : s.value)} />
                    ))}
                  </View>
                </ScrollView>
              )}
              {brandsOptions.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    <Text style={styles.chipGroupLabel}>🏷️</Text>
                    <ChipFilter label="Todas" active={!filterBrand} onPress={() => setFilterBrand('')} />
                    {brandsOptions.map((b) => (
                      <ChipFilter key={b.value} label={b.label} active={filterBrand === b.value} onPress={() => setFilterBrand(b.value === filterBrand ? '' : b.value)} />
                    ))}
                  </View>
                </ScrollView>
              )}
              {activeClassFilterCount > 0 && (
                <TouchableOpacity
                  style={styles.clearFiltersBtn}
                  onPress={() => { setFilterCategory(''); setFilterSubcat(''); setFilterBrand(''); }}
                >
                  <Text style={styles.clearFiltersBtnText}>✕ Limpiar filtros de clasificación</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }

        {/* ── LISTA ── */}
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          style={styles.list}
          contentContainerStyle={filteredItems.length === 0 ? styles.emptyList : undefined}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📭</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery
                  ? `Sin resultados para "${searchQuery}"`
                  : activeFilter === 'variance'
                    ? 'No hay varianzas registradas'
                    : 'No hay artículos en este conteo'}
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />

        {/* ── MODAL CAPTURA DE CANTIDAD ── */}
        <Modal
          visible={selectedItem != null}
          animationType="slide"
          transparent
          onRequestClose={closeModal}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalContainer}>
              {/* Header modal */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderInfo}>
                  <Text style={styles.modalItemCode}>{selectedItem?.itemCode}</Text>
                  <Text style={styles.modalItemName} numberOfLines={2}>
                    {selectedItem?.itemName}
                  </Text>
                </View>
                <TouchableOpacity onPress={closeModal} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">

                {/* Info del sistema */}
                {hasSystemView && (
                  <View style={styles.sysInfoCard}>
                    <Text style={styles.sysInfoTitle}>📊 Información del Sistema</Text>
                    <View style={styles.sysInfoRow}>
                      <Text style={styles.sysInfoLabel}>Cantidad sistema:</Text>
                      <Text style={styles.sysInfoValue}>{selectedItem?.systemQty}</Text>
                    </View>
                    <View style={styles.sysInfoRow}>
                      <Text style={styles.sysInfoLabel}>Pack por caja:</Text>
                      <Text style={styles.sysInfoValue}>{selectedItem?.packQty} {selectedItem?.uom}</Text>
                    </View>
                  </View>
                )}

                {/* Inputs de cantidad */}
                <View style={styles.qtyInputSection}>
                  <Text style={styles.qtyInputSectionTitle}>📝 Cantidad Física Contada</Text>

                  {/* Cajas */}
                  <View style={styles.qtyInputGroup}>
                    <Text style={styles.qtyInputLabel}>📦 Cajas</Text>
                    <View style={styles.qtyInputRow}>
                      <TextInput
                        style={styles.qtyInput}
                        keyboardType="numeric"
                        placeholder="0"
                        value={boxesQty}
                        onChangeText={handleBoxesChange}
                        returnKeyType="next"
                      />
                      <Text style={styles.qtyInputUnit}>cajas</Text>
                    </View>
                    {boxesQty !== '' && packQty > 1 && (
                      <Text style={styles.qtyHint}>
                        = {parseInt(boxesQty || '0', 10) * packQty} {selectedItem?.uom} en cajas
                      </Text>
                    )}
                  </View>

                  <View style={styles.orDivider}>
                    <View style={styles.orLine} />
                    <Text style={styles.orText}>+</Text>
                    <View style={styles.orLine} />
                  </View>

                  {/* Unidades sueltas */}
                  <View style={styles.qtyInputGroup}>
                    <Text style={styles.qtyInputLabel}>📌 Unidades sueltas</Text>
                    <View style={styles.qtyInputRow}>
                      <TextInput
                        style={styles.qtyInput}
                        keyboardType="numeric"
                        placeholder="0"
                        value={unitsQty}
                        onChangeText={handleUnitsChange}
                        returnKeyType="done"
                      />
                      <Text style={styles.qtyInputUnit}>{selectedItem?.uom ?? 'UND'}</Text>
                    </View>
                    <Text style={styles.qtyHint}>Unidades adicionales que no llenan una caja</Text>
                  </View>
                </View>

                {/* Resumen */}
                {(unitsQty !== '' || boxesQty !== '') && (
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>✅ Resumen del Conteo</Text>
                    {boxesQty !== '' && (
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Cajas × pack:</Text>
                        <Text style={styles.summaryValue}>
                          {parseInt(boxesQty || '0', 10)} × {packQty} = {parseInt(boxesQty || '0', 10) * packQty} {selectedItem?.uom}
                        </Text>
                      </View>
                    )}
                    {unitsQty !== '' && (
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Unidades sueltas:</Text>
                        <Text style={styles.summaryValue}>{unitsQty || '0'} {selectedItem?.uom}</Text>
                      </View>
                    )}
                    <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#e5e7eb', marginTop: 8, paddingTop: 8 }]}>
                      <Text style={[styles.summaryLabel, { fontWeight: '700' }]}>Total a guardar:</Text>
                      <Text style={[styles.summaryValue, { fontWeight: '800', fontSize: 16 }]}>
                        {totalUnidades()} {selectedItem?.uom}
                      </Text>
                    </View>
                    {hasSystemView && (
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Diferencia vs sistema:</Text>
                        <Text style={[
                          styles.summaryValue,
                          (totalUnidades() - (selectedItem?.systemQty ?? 0)) < 0
                            ? styles.varianceNeg
                            : (totalUnidades() - (selectedItem?.systemQty ?? 0)) > 0
                              ? styles.variancePos
                              : styles.varianceZero,
                        ]}>
                          {formatVariance(totalUnidades() - (selectedItem?.systemQty ?? 0))}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>

              {/* Botones del modal */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.saveBtn, updateMutation.isLoading && styles.saveBtnDisabled]}
                  onPress={handleSaveCount}
                  disabled={updateMutation.isLoading}
                >
                  {updateMutation.isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : countData.status === 'COMPLETED' ? (
                    <Text style={styles.saveBtnText}>🔒 Conteo Finalizado</Text>
                  ) : (
                    <Text style={styles.saveBtnText}>💾 Guardar Cantidad</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={closeModal}
                  disabled={updateMutation.isLoading}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ── MODAL ESCÁNER VISUAL ── */}
        <Modal visible={isVisualScanning} animationType="fade">
          <BarcodeScanner
            onBarcodeScan={(code) => {
              setIsVisualScanning(false);
              handleBarcodeSearch(code);
            }}
            onClose={() => {
              setIsVisualScanning(false);
              setTimeout(() => searchInputRef.current?.focus(), 250);
            }}
          />
        </Modal>
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// Sub-componentes pequeños
// ─────────────────────────────────────────────
function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={[styles.statChipValue, { color }]}>{value}</Text>
      <Text style={styles.statChipLabel}>{label}</Text>
    </View>
  );
}

function FilterTab({
  label, active, count, onPress,
}: { label: string; active: boolean; count: number; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.filterTab, active && styles.filterTabActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
        {label}
      </Text>
      <View style={[styles.filterTabBadge, active && styles.filterTabBadgeActive]}>
        <Text style={[styles.filterTabBadgeText, active && styles.filterTabBadgeTextActive]}>
          {count}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'ACTIVE': return '#3b82f6';
    case 'DRAFT': return '#6b7280';
    case 'ON_HOLD': return '#f59e0b';
    case 'COMPLETED': return '#10b981';
    case 'CANCELLED': return '#ef4444';
    case 'CLOSED': return '#8b5cf6';
    default: return '#6b7280';
  }
}

function ChipFilter({
  label, active, onPress,
}: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  // Layout general
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#6b7280', fontSize: 14, marginTop: 8 },
  errorIcon: { fontSize: 40 },
  errorText: { color: '#ef4444', fontSize: 16, fontWeight: '600' },
  retryButton: {
    marginTop: 12,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: { color: '#fff', fontWeight: '600' },

  // Header
  cameraToggle: {
    padding: 8,
    marginLeft: 4,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  header: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 8,
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
  headerCenter: { flex: 1, gap: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusPillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  completeBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  completeBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Stats
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 4,
    paddingHorizontal: 12,
    gap: 0,
  },
  statChip: { flex: 1, alignItems: 'center' },
  statChipValue: { fontSize: 18, fontWeight: '800' },
  statChipLabel: { fontSize: 10, color: '#9ca3af', marginTop: 1 },

  // Búsqueda
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 10,
    gap: 8,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#111827',
  },
  clearSearch: { fontSize: 16, color: '#9ca3af', padding: 4 },

  // Filtros tabs
  filterRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingBottom: 6,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    gap: 6,
  },
  filterTabActive: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  filterTabText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  filterTabTextActive: { color: '#3b82f6', fontWeight: '700' },
  filterTabBadge: {
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  filterTabBadgeActive: { backgroundColor: '#bfdbfe' },
  filterTabBadgeText: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  filterTabBadgeTextActive: { color: '#1d4ed8' },

  // ── Filtros de clasificación ──
  filterChipBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    marginLeft: 6,
  },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#4b5563' },
  classFiltersPanel: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 12,
  },
  chipGroupLabel: { fontSize: 14, marginRight: 2 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  chipText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  clearFiltersBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  clearFiltersBtnText: { fontSize: 12, color: '#dc2626', fontWeight: '600' },

  // Lista
  list: { flex: 1 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  separator: { height: 1, backgroundColor: '#e5e7eb' },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyStateIcon: { fontSize: 48, marginBottom: 16 },
  emptyStateText: { fontSize: 15, color: '#9ca3af', textAlign: 'center' },

  // Item de la lista
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  itemMain: { flex: 1 },
  itemCode: { fontSize: 14, fontWeight: '700', color: '#111827' },
  itemName: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  itemPack: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  itemQtys: { flexDirection: 'row', gap: 8 },
  qtyCol: { alignItems: 'center', minWidth: 48 },
  qtyLabel: { fontSize: 10, color: '#9ca3af', marginBottom: 2 },
  qtyValue: { fontSize: 14, fontWeight: '600', color: '#374151' },
  qtyValueCounted: { color: '#111827' },
  varianceNeg: { color: '#dc2626' },
  variancePos: { color: '#059669' },
  varianceZero: { color: '#059669' },

  // Modal overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },

  // Modal header
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  modalHeaderInfo: { flex: 1 },
  modalItemCode: { fontSize: 18, fontWeight: '800', color: '#111827' },
  modalItemName: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtnText: { fontSize: 14, color: '#374151', fontWeight: '700' },

  // Modal body
  modalBody: { paddingHorizontal: 16, paddingTop: 16 },

  // Info del sistema (card azul)
  sysInfoCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  sysInfoTitle: { fontSize: 13, fontWeight: '700', color: '#1d4ed8', marginBottom: 8 },
  sysInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sysInfoLabel: { fontSize: 13, color: '#374151' },
  sysInfoValue: { fontSize: 13, fontWeight: '700', color: '#111827' },

  // Inputs de cantidad
  qtyInputSection: { marginBottom: 16 },
  qtyInputSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  qtyInputGroup: { marginBottom: 4 },
  qtyInputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  qtyInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyInput: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  qtyInputUnit: { fontSize: 14, color: '#6b7280', fontWeight: '600', minWidth: 48 },
  qtyHint: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 4,
  },

  // OR divider
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 12,
  },
  orLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  orText: { fontSize: 13, color: '#9ca3af', fontWeight: '600' },

  // Resumen
  summaryCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: '#065f46', marginBottom: 8 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: { fontSize: 13, color: '#374151' },
  summaryValue: { fontSize: 13, fontWeight: '700', color: '#111827' },

  // Modal footer
  modalFooter: {
    padding: 16,
    paddingTop: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  saveBtn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#6b7280', fontSize: 14, fontWeight: '600' },
});
