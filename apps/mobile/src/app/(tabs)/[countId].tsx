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
import { useResponsive } from '@/hooks/useResponsive';
import {
  useInventoryCount,
  useUpdateCountItem,
  useCompleteCount,
  useSendToERP,
  CountItem,
} from '@/hooks/useInventory';
import { offlineSync } from '@/services/offline-sync';
import BarcodeScanner from '@/components/BarcodeScanner';
import InvoiceReserveModal from '@/components/InvoiceReserveModal';
import { usePermissions } from '@/hooks/usePermissions';

// ─────────────────────────────────────────────
// Tipos y Helpers (Fuera del componente)
// ─────────────────────────────────────────────
type FilterType = 'all' | 'variance';

interface ItemStats {
  total: number;
  counted: number;
  pending: number;
}

function getItemRowColor(item: CountItem): string {
  if (item.status === 'PENDING') return '#f3f4f6';
  const variance = getVariance(item);
  if (variance === 0) return '#dcfce7';
  if (variance != null && variance !== 0) return '#fee2e2';
  return '#ffffff';
}

function getVariance(item: CountItem): number | null {
  if (item.countedQty == null) return null;
  const reserved = item.reservedQty || 0;
  return item.countedQty - (item.systemQty - reserved);
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

// ─────────────────────────────────────────────
// Sub-componentes Estables (Fuera del render principal)
// ─────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  icon: string;
}

const StatCard = React.memo(({ label, value, color, icon }: StatCardProps) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}>
      <Text style={{ fontSize: 18 }}>{icon}</Text>
    </View>
    <View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  </View>
));

interface FilterTabProps {
  label: string;
  icon: string;
  active: boolean;
  count?: number;
  onPress: () => void;
  activeBgColor?: string;
  isTablet?: boolean;
}

const FilterTab = React.memo(({
  label, icon, active, count, onPress, activeBgColor, isTablet
}: FilterTabProps) => {
  const tintColor = active ? (activeBgColor ? '#fff' : '#2563eb') : '#4b5563';
  const bgColor = active ? (activeBgColor || '#eff6ff') : '#f3f4f6';
  const borderColor = active ? (activeBgColor || '#3b82f6') : '#d1d5db';

  return (
    <TouchableOpacity
      style={[
        styles.filterTab,
        { backgroundColor: bgColor, borderColor: borderColor, borderWidth: 1.5 },
        isTablet && { paddingHorizontal: 20 }
      ]}
      onPress={onPress}
    >
      <Text style={[styles.filterTabText, { color: tintColor, fontWeight: active ? '700' : '500' }, isTablet && { fontSize: 15 }]}>
        {icon}  {label}
      </Text>
      {count !== undefined && (
        <View style={[styles.filterTabBadge, { backgroundColor: active ? 'rgba(0,0,0,0.1)' : '#e5e7eb' }]}>
          <Text style={[styles.filterTabBadgeText, { color: tintColor }, isTablet && { fontSize: 13 }]}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

interface ChipFilterProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

const ChipFilter = React.memo(({ label, active, onPress }: ChipFilterProps) => (
  <TouchableOpacity
    style={[styles.chip, active && styles.chipActive]}
    onPress={onPress}
  >
    <Text style={[styles.chipText, active && styles.chipTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
));

interface ItemCountFormProps {
  selectedItem: CountItem | null;
  boxesQty: string;
  unitsQty: string;
  onBoxesChange: (val: string) => void;
  onUnitsChange: (val: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isTablet: boolean;
  isSaving: boolean;
  canEditQuantity: boolean;
  hasSystemView: boolean;
}

const ItemCountForm = React.memo(({
  selectedItem,
  boxesQty,
  unitsQty,
  onBoxesChange,
  onUnitsChange,
  onSave,
  onCancel,
  isTablet,
  isSaving,
  canEditQuantity,
  hasSystemView,
}: ItemCountFormProps) => {

  const packQty = selectedItem?.packQty ?? 1;

  const totalUnidades = () => {
    const cajas = parseInt(boxesQty || '0', 10);
    const sueltas = parseInt(unitsQty || '0', 10);
    const boxes = isNaN(cajas) ? 0 : cajas;
    const loose = isNaN(sueltas) ? 0 : sueltas;
    return (boxes * packQty) + loose;
  };

  if (!selectedItem) {
    return (
      <View style={styles.emptyForm}>
        <Text style={{ fontSize: 50, marginBottom: 20 }}>👈</Text>
        <Text style={styles.emptyFormText}>Selecciona un artículo de la lista para iniciar el conteo.</Text>
      </View>
    );
  }

  const systemQtyEff = selectedItem.systemQty - (selectedItem.reservedQty || 0);
  const diff = totalUnidades() - systemQtyEff;

  return (
    <View style={isTablet ? styles.splitFormContainer : styles.modalBodyInner}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={styles.formHeader}>
          <Text style={styles.formCode}>{selectedItem.itemCode}</Text>
          <Text style={styles.formName}>{selectedItem.itemName}</Text>
        </View>

        {hasSystemView && (
          <View style={styles.sysInfoCard}>
            <Text style={styles.sysInfoTitle}>📊 Sistema</Text>
            <View style={styles.sysInfoRow}>
              <Text style={styles.sysInfoLabel}>Stock actual:</Text>
              <Text style={styles.sysInfoValue}>{selectedItem.systemQty} {selectedItem.uom}</Text>
            </View>
            <View style={styles.sysInfoRow}>
              <Text style={styles.sysInfoLabel}>Pend. Reserva:</Text>
              <Text style={styles.sysInfoValue}>{selectedItem.reservedQty || 0} {selectedItem.uom}</Text>
            </View>
          </View>
        )}

        <View style={styles.qtyInputSection}>
          <View style={styles.qtyInputGroup}>
            <Text style={styles.qtyInputLabel}>📦 Cajas (Pack {selectedItem.packQty})</Text>
            <TextInput
              style={styles.qtyInput}
              keyboardType="numeric"
              placeholder="0"
              value={boxesQty}
              onChangeText={onBoxesChange}
              returnKeyType="next"
              autoFocus={!isTablet}
            />
          </View>

          <View style={styles.orDivider}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>+</Text>
            <View style={styles.orLine} />
          </View>

          <View style={styles.qtyInputGroup}>
            <Text style={styles.qtyInputLabel}>📌 Unidades sueltas ({selectedItem.uom})</Text>
            <TextInput
              style={styles.qtyInput}
              keyboardType="numeric"
              placeholder="0"
              value={unitsQty}
              onChangeText={onUnitsChange}
              returnKeyType="done"
            />
          </View>
        </View>

        {(unitsQty !== '' || boxesQty !== '') && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Contado:</Text>
              <Text style={styles.summaryValueBig}>
                {totalUnidades()} {selectedItem.uom}
              </Text>
            </View>
            {hasSystemView && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Diferencia Final:</Text>
                <Text style={[
                  styles.summaryValue,
                  diff < 0 ? styles.varianceNeg : styles.variancePos
                ]}>
                  {formatVariance(diff)}
                </Text>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, (isSaving || !canEditQuantity) && styles.saveBtnDisabled]}
          onPress={onSave}
          disabled={isSaving || !canEditQuantity}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>💾 Guardar Cantidad</Text>
          )}
        </TouchableOpacity>

        {!isTablet && (
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
});

// ─────────────────────────────────────────────
// Componente Principal
// ─────────────────────────────────────────────
export default function CountDetailScreen() {
  const { countId } = useLocalSearchParams<{ countId: string }>();
  const router = useRouter();

  const { data: countData, isLoading, isError, refetch } = useInventoryCount(countId ?? '');
  const updateMutation = useUpdateCountItem();
  const completeMutation = useCompleteCount();
  const { isTablet, spacing, masterWidth } = useResponsive();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedItem, setSelectedItem] = useState<CountItem | null>(null);
  const [boxesQty, setBoxesQty] = useState('');
  const [unitsQty, setUnitsQty] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubcat, setFilterSubcat] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [globalClassifications, setGlobalClassifications] = useState<any[]>([]);
  const [isVisualScanning, setIsVisualScanning] = useState(false);
  const [showReserveModal, setShowReserveModal] = useState(false);

  const { hasPermission } = usePermissions();
  const hasSystemView = hasPermission('inventory:view_qty');
  const canExecute = hasPermission('inv_counts:execute');
  const canEditItems = hasPermission('inventory:edit_items');
  const canEditQuantity = canExecute || canEditItems;

  const searchInputRef = useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      offlineSync.getClassifications().then(setGlobalClassifications);
      offlineSync.syncGlobalClassifications().then(() => {
        offlineSync.getClassifications().then(setGlobalClassifications);
      });
    }, [])
  );

  // handlers estables
  const handleBoxesChange = useCallback((value: string) => setBoxesQty(value), []);
  const handleUnitsChange = useCallback((value: string) => setUnitsQty(value), []);

  const closeModal = useCallback(() => {
    setSelectedItem(null);
    setBoxesQty('');
    setUnitsQty('');
    setTimeout(() => searchInputRef.current?.focus(), 200);
  }, []);

  const handleSaveCount = useCallback(async () => {
    if (!selectedItem) return;
    const pack = selectedItem.packQty || 1;
    const boxes = parseInt(boxesQty || '0', 10);
    const units = parseInt(unitsQty || '0', 10);
    const finalQty = (boxes * pack) + units;

    if (isNaN(finalQty) || finalQty < 0) {
      Alert.alert('Error', 'Cantidad inválida');
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
      Alert.alert('Error', 'No se pudo guardar');
    }
  }, [selectedItem, boxesQty, unitsQty, countId, updateMutation, closeModal, refetch]);

  const openItemModal = useCallback((item: CountItem) => {
    setSelectedItem(item);
    const pack = item.packQty || 1;
    if (item.countedQty != null) {
      setBoxesQty(String(Math.floor(item.countedQty / pack)));
      setUnitsQty(String(item.countedQty % pack));
    } else {
      setBoxesQty('');
      setUnitsQty('');
    }
  }, []);

  // Sincronizar cantidades al cambiar item (especialmente para Tablet)
  useEffect(() => {
    if (isTablet && selectedItem) {
      const pack = selectedItem.packQty || 1;
      if (selectedItem.countedQty != null) {
        setBoxesQty(String(Math.floor(selectedItem.countedQty / pack)));
        setUnitsQty(String(selectedItem.countedQty % pack));
      } else {
        setBoxesQty('');
        setUnitsQty('');
      }
    }
  }, [selectedItem, isTablet]);

  const handleBarcodeSearch = useCallback((code: string) => {
    const trimmed = code.trim();
    if (!trimmed || !countData?.countItems) return;
    const found = countData.countItems.find(i =>
      i.itemCode.toLowerCase() === trimmed.toLowerCase() ||
      i.barCodeInv?.toLowerCase() === trimmed.toLowerCase() ||
      i.barCodeVt?.toLowerCase() === trimmed.toLowerCase()
    );

    if (found) {
      openItemModal(found);
      setSearchQuery('');
    } else if (trimmed.length > 3) {
      Alert.alert('No encontrado', `Código "${trimmed}" inexistente`);
    }
  }, [countData, isTablet, openItemModal]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleComplete = useCallback(() => {
    Alert.alert('Completar', '¿Confirmas completar el conteo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Completar', onPress: async () => {
          try {
            await completeMutation.mutateAsync(countId!);
            refetch();
          } catch { Alert.alert('Error', 'No se pudo completar'); }
        }
      }
    ]);
  }, [countId, completeMutation, refetch]);

  // filtrado de datos
  const allItems = countData?.countItems ?? [];
  const filteredItems = allItems.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || item.itemCode.toLowerCase().includes(q) || item.itemName.toLowerCase().includes(q);
    const matchesCat = !filterCategory || item.category === filterCategory;
    const matchesSub = !filterSubcat || item.subcategory === filterSubcat;
    const matchesBrand = !filterBrand || item.brand === filterBrand;
    const matchesVariance = activeFilter === 'all' || (item.status === 'PENDING' || (getVariance(item) !== null && getVariance(item) !== 0));
    return matchesSearch && matchesCat && matchesSub && matchesBrand && matchesVariance;
  });

  const getUniqueOpts = (glob: any[], loc: string[]) => {
    if (glob.length > 0) {
      const unique = new Map();
      glob.forEach(c => {
        if (!unique.has(c.description)) unique.set(c.description, { value: c.code, label: `${c.code} - ${c.description}` });
      });
      return Array.from(unique.values());
    }
    return [...new Set(loc)].map(s => ({ value: s, label: s }));
  };

  const categoriesOptions = getUniqueOpts(globalClassifications.filter(c => c.groupType === 'CATEGORY'), allItems.map(i => i.category).filter(Boolean));
  const subcatsOptions = getUniqueOpts(globalClassifications.filter(c => c.groupType === 'SUBCATEGORY'), allItems.map(i => i.subcategory).filter(Boolean));
  const brandsOptions = getUniqueOpts(globalClassifications.filter(c => c.groupType === 'BRAND'), allItems.map(i => i.brand).filter(Boolean));

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  if (isError || !countData) return <View style={styles.centered}><Text style={styles.errorText}>Error cargando conteo</Text></View>;

  const stats = computeStats(allItems);
  const isActive = ['ACTIVE', 'DRAFT', 'ON_HOLD'].includes(countData.status);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <View style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>←</Text></TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>{countData.code || `#${countData.sequenceNumber}`}</Text>
            <View style={[styles.statusPill, { backgroundColor: getStatusColor(countData.status) }]}><Text style={styles.statusPillText}>{countData.status}</Text></View>
          </View>
          {isActive && (
            <TouchableOpacity style={styles.completeBtn} onPress={handleComplete} disabled={completeMutation.isLoading}>
              {completeMutation.isLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.completeBtnText}>✓ Completar</Text>}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statsContainer}>
          <StatCard label="Total" value={stats.total} icon="📋" color="#3b82f6" />
          <StatCard label="Contados" value={stats.counted} icon="✅" color="#10b981" />
          <StatCard label="Pend." value={stats.pending} icon="⏳" color="#f59e0b" />
        </View>

        <View style={isTablet ? { flex: 1, flexDirection: 'row' } : { flex: 1 }}>
          <View style={isTablet ? { width: masterWidth, borderRightWidth: 1, borderRightColor: '#e5e7eb' } : { flex: 1 }}>
            <View style={styles.searchContainer}>
              <View style={styles.searchWrapper}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  ref={searchInputRef}
                  style={styles.searchInput}
                  placeholder="Buscar o Escanear..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={() => handleBarcodeSearch(searchQuery)}
                  autoCorrect={false}
                  autoCapitalize="characters"
                />
                {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><Text style={styles.clearSearch}>✕</Text></TouchableOpacity>}
                <TouchableOpacity onPress={() => setIsVisualScanning(true)} style={styles.cameraToggle}><Text style={{ fontSize: 18 }}>📷</Text></TouchableOpacity>
              </View>
            </View>

            <View style={[styles.filterRowContainer, { height: isTablet ? 72 : 56 }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                <FilterTab label="Todos" icon="📋" active={activeFilter === 'all'} count={allItems.length} onPress={() => setActiveFilter('all')} isTablet={isTablet} />
                {hasSystemView && <FilterTab label="Varianzas" icon="⚠️" active={activeFilter === 'variance'} count={allItems.filter(i => getVariance(i) !== 0).length} onPress={() => setActiveFilter('variance')} isTablet={isTablet} />}
                {(categoriesOptions.length > 0) && <FilterTab label="Filtros" icon="🏷️" active={showFilters} count={([filterCategory, filterSubcat, filterBrand].filter(Boolean).length) || undefined} onPress={() => setShowFilters(!showFilters)} activeBgColor="#4f46e5" isTablet={isTablet} />}
                {isActive && hasPermission('inv_counts:reserved_invoices') && <FilterTab label="Despachos" icon="📦" active={showReserveModal} onPress={() => setShowReserveModal(true)} activeBgColor="#10b981" isTablet={isTablet} />}
              </ScrollView>
            </View>

            {showFilters && (
              <View style={styles.classFiltersPanel}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  <Text style={styles.chipGroupLabel}>📁</Text>
                  <ChipFilter label="Todas" active={!filterCategory} onPress={() => setFilterCategory('')} />
                  {categoriesOptions.map(c => <ChipFilter key={c.value} label={c.label} active={filterCategory === c.value} onPress={() => setFilterCategory(filterCategory === c.value ? '' : c.value)} />)}
                </ScrollView>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  <Text style={styles.chipGroupLabel}>📂</Text>
                  <ChipFilter label="Todas" active={!filterSubcat} onPress={() => setFilterSubcat('')} />
                  {subcatsOptions.map(s => <ChipFilter key={s.value} label={s.label} active={filterSubcat === s.value} onPress={() => setFilterSubcat(filterSubcat === s.value ? '' : s.value)} />)}
                </ScrollView>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  <Text style={styles.chipGroupLabel}>🏷️</Text>
                  <ChipFilter label="Todas" active={!filterBrand} onPress={() => setFilterBrand('')} />
                  {brandsOptions.map(b => <ChipFilter key={b.value} label={b.label} active={filterBrand === b.value} onPress={() => setFilterBrand(filterBrand === b.value ? '' : b.value)} />)}
                </ScrollView>
              </View>
            )}

            <FlatList
              data={filteredItems}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.itemRow, { backgroundColor: getItemRowColor(item) }, !isActive && { opacity: 0.6 }, selectedItem?.id === item.id && isTablet && styles.itemRowSelected]}
                  onPress={() => isActive && (isTablet ? setSelectedItem(item) : openItemModal(item))}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemMain}>
                    <Text style={styles.itemCode} numberOfLines={1}>{item.itemCode}</Text>
                    <Text style={styles.itemName} numberOfLines={isTablet ? 2 : 1}>{item.itemName}</Text>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                      {item.packQty > 1 && <Text style={styles.itemPack}>📦 Pack: {item.packQty}</Text>}
                      {(item.reservedQty ?? 0) > 0 && <Text style={styles.itemReserved}>🚚 Res: {item.reservedQty}</Text>}
                    </View>
                  </View>
                  <View style={styles.itemQtys}>
                    {hasSystemView && <View style={styles.qtyCol}><Text style={styles.qtyLabel}>Sis</Text><Text style={styles.qtyValue}>{item.systemQty}</Text></View>}
                    <View style={styles.qtyCol}><Text style={styles.qtyLabel}>Cnt</Text><Text style={[styles.qtyValue, item.countedQty != null && styles.qtyValueCounted]}>{item.countedQty ?? '–'}</Text></View>
                    {hasSystemView && <View style={styles.qtyCol}><Text style={styles.qtyLabel}>Dif</Text><Text style={[styles.qtyValue, getVariance(item) != null && getVariance(item)! < 0 ? styles.varianceNeg : (getVariance(item)! > 0 ? styles.variancePos : null)]}>{formatVariance(getVariance(item))}</Text></View>}
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>

          {isTablet && (
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
              <ItemCountForm
                selectedItem={selectedItem}
                boxesQty={boxesQty}
                unitsQty={unitsQty}
                onBoxesChange={handleBoxesChange}
                onUnitsChange={handleUnitsChange}
                onSave={handleSaveCount}
                onCancel={closeModal}
                isTablet={true}
                isSaving={updateMutation.isLoading}
                canEditQuantity={canEditQuantity}
                hasSystemView={hasSystemView}
              />
            </View>
          )}
        </View>

        <Modal visible={selectedItem != null && !isTablet} animationType="slide" transparent>
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderInfo}>
                  <Text style={styles.modalItemCode}>{selectedItem?.itemCode}</Text>
                  <Text style={styles.modalItemName} numberOfLines={1}>{selectedItem?.itemName}</Text>
                </View>
                <TouchableOpacity onPress={closeModal} style={styles.modalCloseBtn}><Text>✕</Text></TouchableOpacity>
              </View>
              <ItemCountForm
                selectedItem={selectedItem}
                boxesQty={boxesQty}
                unitsQty={unitsQty}
                onBoxesChange={handleBoxesChange}
                onUnitsChange={handleUnitsChange}
                onSave={handleSaveCount}
                onCancel={closeModal}
                isTablet={false}
                isSaving={updateMutation.isLoading}
                canEditQuantity={canEditQuantity}
                hasSystemView={hasSystemView}
              />
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {isVisualScanning && (
          <BarcodeScanner
            onBarcodeScan={(code: string) => { setIsVisualScanning(false); handleBarcodeSearch(code); }}
            onClose={() => setIsVisualScanning(false)}
          />
        )}

        {showReserveModal && countId && (
          <InvoiceReserveModal
            visible={showReserveModal}
            onClose={() => setShowReserveModal(false)}
            countId={countId}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#ef4444', fontWeight: 'bold' },
  header: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', gap: 8 },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 18, backgroundColor: '#f3f4f6' },
  backBtnText: { fontSize: 20 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusPillText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  completeBtn: { backgroundColor: '#10b981', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  completeBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  statsContainer: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  statCard: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#f9fafb', borderRadius: 8, gap: 8 },
  statIconContainer: { width: 32, height: 32, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: 'bold' },
  statLabel: { fontSize: 9, color: '#6b7280' },
  searchContainer: { backgroundColor: '#fff', padding: 12 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 12, height: 44, gap: 8 },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 16 },
  clearSearch: { fontSize: 14, color: '#9ca3af' },
  cameraToggle: { padding: 4 },
  filterRowContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  filterRow: { alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  filterTab: { flexDirection: 'row', alignItems: 'center', height: 40, paddingHorizontal: 12, borderRadius: 20, gap: 6 },
  filterTabText: { fontSize: 13 },
  filterTabBadge: { paddingHorizontal: 5, borderRadius: 8 },
  filterTabBadgeText: { fontSize: 10, fontWeight: 'bold' },
  classFiltersPanel: { backgroundColor: '#f9fafb', padding: 8, gap: 4, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  chipRow: { alignItems: 'center', gap: 8, paddingVertical: 4 },
  chipGroupLabel: { fontSize: 14, width: 24, textAlign: 'center' },
  chip: { height: 32, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  chipActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  chipText: { fontSize: 12, color: '#374151' },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },
  listContent: { paddingVertical: 8 },
  itemRow: { flexDirection: 'row', padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb', gap: 8 },
  itemRowSelected: { borderLeftWidth: 4, borderLeftColor: '#3b82f6', backgroundColor: '#eff6ff' },
  itemMain: { flex: 1 },
  itemCode: { fontSize: 14, fontWeight: 'bold' },
  itemName: { fontSize: 12, color: '#6b7280' },
  itemPack: { fontSize: 11, color: '#9ca3af' },
  itemReserved: { fontSize: 11, color: '#10b981', fontWeight: 'bold' },
  itemQtys: { flexDirection: 'row', gap: 8 },
  qtyCol: { alignItems: 'center', minWidth: 40 },
  qtyLabel: { fontSize: 9, color: '#9ca3af' },
  qtyValue: { fontSize: 13, fontWeight: '600' },
  qtyValueCounted: { color: '#111827' },
  varianceNeg: { color: '#dc2626' },
  variancePos: { color: '#059669' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalHeaderInfo: { flex: 1 },
  modalItemCode: { fontSize: 18, fontWeight: 'bold' },
  modalItemName: { fontSize: 14, color: '#6b7280' },
  modalCloseBtn: { padding: 8 },
  modalBodyInner: { padding: 16 },
  splitFormContainer: { flex: 1, padding: 20 },
  formHeader: { marginBottom: 16 },
  formCode: { fontSize: 24, fontWeight: 'bold' },
  formName: { fontSize: 16, color: '#6b7280' },
  emptyForm: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyFormText: { fontSize: 16, color: '#9ca3af', textAlign: 'center' },
  sysInfoCard: { backgroundColor: '#eff6ff', borderRadius: 8, padding: 12, marginBottom: 16 },
  sysInfoTitle: { fontSize: 13, fontWeight: 'bold', color: '#1d4ed8', marginBottom: 6 },
  sysInfoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sysInfoLabel: { fontSize: 13 },
  sysInfoValue: { fontSize: 13, fontWeight: 'bold' },
  qtyInputSection: { marginBottom: 16 },
  qtyInputGroup: { gap: 8 },
  qtyInputLabel: { fontSize: 14, fontWeight: '600' },
  qtyInput: { height: 50, borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, fontSize: 20, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#fff' },
  orDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 8, gap: 10 },
  orLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  orText: { fontSize: 12, color: '#9ca3af' },
  summaryCard: { backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#d1fae5' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 15, fontWeight: 'bold' },
  summaryValueBig: { fontSize: 20, fontWeight: 'bold', color: '#10b981' },
  saveBtn: { backgroundColor: '#3b82f6', height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelBtn: { marginTop: 12, alignItems: 'center' },
  cancelBtnText: { color: '#6b7280' },
});
