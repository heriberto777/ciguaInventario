'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getApiClient } from '@/services/api';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { InventoryCountsTable } from '@/components/inventory/InventoryCountsTable';
import { NewVersionModal } from '@/components/inventory/NewVersionModal';
import { NotificationModal } from '@/components/atoms/NotificationModal';
import { ConfirmModal } from '@/components/atoms/ConfirmModal';
import { useAuthStore } from '@/store/auth';

const apiClient = getApiClient();

// Constante para la clave de localStorage
const STORAGE_KEY = (countId: string) => `inventory_count_${countId}`;

interface InventoryCount {
  id: string;
  code: string;
  sequenceNumber: string;
  description?: string;
  status: string;
  currentVersion: number;
  totalVersions: number;
  warehouseId: string;
  locationId?: string;
  createdAt: string;
  countItems: CountItem[];
}

interface CountItem {
  id: string;
  itemCode: string;
  itemName: string;
  systemQty: number;
  countedQty?: number;
  version: number;
  packQty: number;
  uom: string;
  baseUom: string;
  costPrice?: number;
  salePrice?: number;
  barCodeInv?: string;
  barCodeVt?: string;
  // Clasificación
  category?: string;
  subcategory?: string;
  brand?: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface Location {
  id: string;
  code: string;
  description?: string;
}

interface Classification {
  id: string;
  code: string;
  description: string;
  groupType: 'CATEGORY' | 'SUBCATEGORY' | 'BRAND' | 'OTHER';
}

function useClassifications(groupType?: string) {
  return useQuery({
    queryKey: ['classifications', groupType || 'ALL'],
    queryFn: async () => {
      const url = groupType
        ? `/item-classifications?groupType=${groupType}`
        : '/item-classifications';
      const res = await apiClient.get(url);
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      return data as Classification[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export default function InventoryCountPage() {
  // Limpiar localStorage corruptos al cargar el componente
  useEffect(() => {
    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key.startsWith('inventory_count_')) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            if (!parsed || typeof parsed !== 'object') {
              keysToDelete.push(key);
            }
          } catch {
            keysToDelete.push(key);
          }
        }
      }

      // Limpieza específica de active_count_id si parece basura
      if (key === 'active_count_id') {
        const val = localStorage.getItem(key);
        if (val && (val.includes(' ') || val.includes('<') || val.length > 50)) {
          keysToDelete.push(key);
        }
      }
    }

    keysToDelete.forEach(key => {
      console.log(`Limpiando localStorage corrupto: ${key}`);
      localStorage.removeItem(key);
    });

    // Si el active_count_id apunta a algo que no existe en localStorage (y no queremos trigger Sync error inmediato)
    const activeCountId = localStorage.getItem('active_count_id');
    if (activeCountId && activeCountId.length > 10 && !localStorage.getItem(STORAGE_KEY(activeCountId))) {
      // Opcional: No borrarlo aquí para dejar que fetchCountFromServer lo intente
    }
  }, []);

  const [view, setView] = useState<'list' | 'create' | 'process'>('list');
  const [selectedCount, setSelectedCount] = useState<InventoryCount | null>(null);
  const [countItems, setCountItems] = useState<CountItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVarianceOnly, setFilterVarianceOnly] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [mappingId, setMappingId] = useState('');
  const [syncingItemIds, setSyncingItemIds] = useState<Set<string>>(new Set());
  const [syncedItemIds, setSyncedItemIds] = useState<Set<string>>(new Set());
  // Filtros de clasificación
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubcategory, setFilterSubcategory] = useState('');
  const [filterBrand, setFilterBrand] = useState('');

  // Estados para creación por Excel
  const [creationMode, setCreationMode] = useState<'erp' | 'excel'>('erp');
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [excelPreview, setExcelPreview] = useState<{
    total: number;
    preview: any[];
    errorsCount: number;
    rowErrors: any[];
  } | null>(null);

  // Modal para nueva versión
  const [showNewVersionModal, setShowNewVersionModal] = useState(false);
  const [newVersionData, setNewVersionData] = useState<{
    versionNumber: number;
    itemsCount: number;
    previousVersion: number;
  } | null>(null);

  // Modal de notificación simple
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  const [error404, setError404] = useState(false);

  // Modal de confirmación para eliminar
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [countIdToDelete, setCountIdToDelete] = useState<string | null>(null);

  // Estados para sincronización con ERP
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'closing' | 'done' | 'error'>('syncing');
  const [syncMessage, setSyncMessage] = useState('');

  // Permisos y Roles
  const user = useAuthStore((state) => state.user);
  const permissions = user?.permissions || [];
  const roles = user?.roles || [];
  const isSuperAdmin = roles.includes('SuperAdmin');

  const hasSystemView = isSuperAdmin || permissions.includes('inventory:view_qty') || permissions.includes('inventory:manage');
  const canManageUsers = isSuperAdmin || permissions.includes('users:manage');
  const canSyncERP = isSuperAdmin || permissions.includes('inventory:sync_erp') || permissions.includes('inventory:manage') || permissions.includes('inventory:sync');
  const canEditSettings = isSuperAdmin || permissions.includes('inventory:edit_settings') || permissions.includes('inventory:manage');
  const canDelete = isSuperAdmin || permissions.includes('inventory:delete') || permissions.includes('inventory:manage');
  const canExport = isSuperAdmin || permissions.includes('inventory:export_excel') || permissions.includes('inventory:manage');
  const canReopen = isSuperAdmin || permissions.includes('inventory:reopen') || permissions.includes('inventory:manage');
  const canCreate = isSuperAdmin || permissions.includes('inventory:create') || permissions.includes('inventory:manage');

  // Refs para debounce
  const debounceTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const pendingUpdatesRef = useRef<{ [key: string]: number }>({});
  const isInitializedRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const firstItemQtyRef = useRef<HTMLInputElement>(null);

  // Recuperar datos guardados del localStorage al cargar
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    try {
      const savedCountId = localStorage.getItem('active_count_id');
      // Validar que el ID parezca un UUID o un ID válido (no basura)
      if (savedCountId && savedCountId.length > 10 && !savedCountId.includes(' ')) {
        // Primero, intentar recuperar del localStorage para una carga instantánea
        const savedCountData = localStorage.getItem(STORAGE_KEY(savedCountId));
        if (savedCountData) {
          try {
            const parsed = JSON.parse(savedCountData);
            if (parsed && parsed.count) {
              console.log('Recuperando del localStorage (flash load):', {
                count: parsed.count,
                itemsCount: parsed.items?.length
              });
              setSelectedCount(parsed.count);
              setCountItems(parsed.items || []);
            }
          } catch (parseError) {
            console.error('Error parseando localStorage:', parseError);
            localStorage.removeItem(STORAGE_KEY(savedCountId));
          }
        }

        // SIEMPRE traer del servidor para asegurar que tenemos lo último del móvil
        fetchCountFromServer(savedCountId);
      } else if (savedCountId) {
        // Si el ID es inválido, limpiarlo
        localStorage.removeItem('active_count_id');
      }
    } catch (error) {
      console.error('Error al recuperar datos:', error);
      localStorage.removeItem('active_count_id');
    }
  }, []);

  const fetchCountFromServer = async (countId: string | null) => {
    if (!countId || countId.includes('<') || countId.includes(' ')) return;
    try {
      setError404(false);
      const response = await apiClient.get(`/inventory-counts/${countId}`);
      const count = response.data as InventoryCount;
      setSelectedCount(count);
      setCountItems(count.countItems || []);
    } catch (error: any) {
      console.error('Error trayendo conteo del servidor:', error);
      if (error.response?.status === 404) {
        setError404(true);
        localStorage.removeItem('active_count_id');
        localStorage.removeItem(STORAGE_KEY(countId));
      } else {
        showNotification('error', 'Error de conexión', 'No se pudo sincronizar el conteo con el servidor.');
      }
    }
  };

  // Guardar datos cuando cambian
  useEffect(() => {
    if (selectedCount && countItems.length > 0) {
      localStorage.setItem('active_count_id', selectedCount.id);
      localStorage.setItem(STORAGE_KEY(selectedCount.id), JSON.stringify({
        count: selectedCount,
        items: countItems,
        lastSaved: new Date().toISOString(),
      }));
    }
  }, [selectedCount?.id, countItems]);

  // Queries
  const { data: counts = [], refetch: refetchCounts } = useQuery({
    queryKey: ['inventory-counts'],
    queryFn: async () => {
      const response = await apiClient.get('/inventory-counts');
      return response.data as InventoryCount[];
    },
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const response = await apiClient.get('/warehouses');
      return response.data as Warehouse[];
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', warehouseId],
    queryFn: async () => {
      if (!warehouseId) return [];
      const response = await apiClient.get(`/warehouses/${warehouseId}/locations`);
      return response.data as Location[];
    },
    enabled: !!warehouseId,
  });

  // Cargar mappings disponibles
  const { data: availableMappings = [], isLoading: mappingsLoading } = useQuery({
    queryKey: ['available-mappings'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/mapping-configs');
        const rawData = Array.isArray(response.data) ? response.data : response.data.data || [];
        const uniqueMappings = Array.from(
          new Map(rawData.map((m: any) => [m.datasetType, m])).values()
        );
        return uniqueMappings;
      } catch (error) {
        console.error('Error loading mappings:', error);
        return [];
      }
    },
  });

  // Mutations
  const createCountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/inventory-counts', {
        warehouseId,
        locationId: locationId || undefined,
        description: `Conteo físico - ${new Date().toLocaleDateString()}`,
      });
      return response.data.count || response.data as InventoryCount;
    },
    onSuccess: async (countData) => {
      const count = (countData as any).count || countData;

      if (creationMode === 'excel' && excelFile) {
        try {
          setUploadingExcel(true);
          const formData = new FormData();
          formData.append('file', excelFile);
          await apiClient.post(`/inventory-counts/${count.id}/load-from-excel`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch (error: any) {
          showNotification('error', 'Error al cargar Excel', error.response?.data?.error || 'No se pudieron cargar los artículos.');
        } finally {
          setUploadingExcel(false);
        }
      } else if (creationMode === 'erp' && mappingId) {
        try {
          await apiClient.post(`/inventory-counts/${count.id}/load-from-mapping`, {
            warehouseId,
            mappingId,
            locationId: locationId || undefined,
          });
        } catch (error) {
          console.error('Error loading from mapping:', error);
        }
      }

      const freshCount = await apiClient.get(`/inventory-counts/${count.id}`);
      const fullCount = freshCount.data as InventoryCount;
      setSelectedCount(fullCount);
      setCountItems(fullCount.countItems || []);
      setView('process');
      setWarehouseId('');
      setLocationId('');
      setMappingId('');
      setExcelFile(null);
      setExcelPreview(null);
    },
  });

  const previewExcelMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/inventory-counts/excel-preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: (data) => setExcelPreview(data),
    onError: (error: any) => {
      setExcelPreview(null);
      showNotification('error', 'Error de Vista Previa', error.response?.data?.error || 'No se pudo generar la vista previa.');
    }
  });

  useEffect(() => {
    if (excelFile && creationMode === 'excel') {
      previewExcelMutation.mutate(excelFile);
    } else {
      setExcelPreview(null);
    }
  }, [excelFile, creationMode]);

  const startCountMutation = useMutation({
    mutationFn: async (countId: string) => {
      const response = await apiClient.post(`/inventory-counts/${countId}/start`, {});
      return response.data.count as InventoryCount;
    },
    onSuccess: (count) => {
      setSelectedCount(count);
      setCountItems(count.countItems || []);
      setView('process');
      refetchCounts();
    },
  });

  const completeCountMutation = useMutation({
    mutationFn: async (countId: string) => {
      const response = await apiClient.post(`/inventory-counts/${countId}/complete`, {});
      localStorage.removeItem(STORAGE_KEY(countId));
      localStorage.removeItem('active_count_id');
      return response.data.count as InventoryCount;
    },
    onSuccess: (count) => {
      setSelectedCount(count);
      setCountItems(count.countItems || []);
      refetchCounts();
    },
  });

  const finalizeCountMutation = useMutation({
    mutationFn: async (countId: string) => {
      const response = await apiClient.post(`/inventory-counts/${countId}/finalize`, {});
      return response.data as InventoryCount;
    },
    onSuccess: (count) => {
      setSelectedCount(count);
      setCountItems(count.countItems || []);
      refetchCounts();
      showNotification('success', '✅ Finalizado', 'Conteo finalizado administrativamente.');
    },
  });

  const createVersionMutation = useMutation({
    mutationFn: async (countId: string) => {
      await apiClient.post(`/inventory-counts/${countId}/new-version`, {});
      localStorage.removeItem(STORAGE_KEY(countId));
      const getResponse = await apiClient.get(`/inventory-counts/${countId}`);
      return getResponse.data as InventoryCount;
    },
    onSuccess: (count) => {
      setSelectedCount(count);
      setCountItems(count.countItems || []);
      setView('process');
      refetchCounts();
      setNewVersionData({
        versionNumber: count.currentVersion,
        itemsCount: count.countItems?.length || 0,
        previousVersion: count.currentVersion - 1,
      });
      setShowNewVersionModal(true);
    },
  });

  const sendToERPMutation = useMutation({
    mutationFn: async (countId: string) => {
      setIsSyncing(true);
      setSyncStatus('syncing');
      setSyncMessage('Consolidando datos y preparando envío al ERP...');
      const response = await apiClient.post(`/inventory-counts/${countId}/send-to-erp`, {});
      setSyncStatus('closing');
      setSyncMessage('Sincronización exitosa. Actualizando estado del conteo...');
      localStorage.removeItem(STORAGE_KEY(countId));
      localStorage.removeItem('active_count_id');
      return response.data;
    },
    onSuccess: (data) => {
      setSyncStatus('done');
      setSyncMessage('Proceso completado correctamente.');
      setTimeout(() => {
        setIsSyncing(false);
        setSelectedCount(null);
        setCountItems([]);
        setView('list');
        const title = data.success ? '✅ Sincronización Exitosa' : '⚠️ Sincronización Parcial';
        const detail = data.itemsFailed > 0
          ? `${data.itemsSynced} sincronizados, ${data.itemsFailed} errores.`
          : `Todos los artículos (${data.itemsSynced}) fueron sincronizados correctamente.`;
        showNotification(data.success ? 'success' : 'info', title, data.message + '. ' + detail);
      }, 1500);
    },
    onError: (error: any) => {
      setSyncStatus('error');
      setSyncMessage(error.response?.data?.error || 'Error crítico durante la sincronización.');
    }
  });

  const handleExportExcel = async (countId: string) => {
    try {
      const url = `/inventory-counts/${countId}/export-excel`;
      const response = await apiClient.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `resultado_conteo_${countId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showNotification('success', '📥 Exportando', 'Tu descarga debería comenzar en breve.');
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      showNotification('error', '❌ Error', 'No se pudo generar el archivo Excel.');
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (countId: string) => {
      await apiClient.delete(`/inventory-counts/${countId}/delete`);
    },
    onSuccess: () => {
      refetchCounts();
      setView('list');
      setShowDeleteConfirm(false);
      showNotification('success', '✅ Eliminado', 'Conteo eliminado correctamente');
    },
  });

  const reactivateCountMutation = useMutation({
    mutationFn: async (countId: string) => {
      const response = await apiClient.post(`/inventory-counts/${countId}/reactivate`, {});
      return response.data.count as InventoryCount;
    },
    onSuccess: (count) => {
      showNotification('success', '✅ Reactivado', `El conteo ${count.sequenceNumber} ha sido reactivado.`);
      refetchCounts();
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async (countId: string) => {
      const response = await apiClient.post(`/inventory-counts/${countId}/pause`, {});
      return response.data.count as InventoryCount;
    },
    onSuccess: (count) => {
      setSelectedCount(count);
      setCountItems(count.countItems || []);
      refetchCounts();
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async (countId: string) => {
      const response = await apiClient.post(`/inventory-counts/${countId}/resume`, {});
      return response.data.count as InventoryCount;
    },
    onSuccess: (count) => {
      setSelectedCount(count);
      setCountItems(count.countItems || []);
      refetchCounts();
    },
  });

  const cancelCountMutation = useMutation({
    mutationFn: async (countId: string) => {
      await apiClient.post(`/inventory-counts/${countId}/cancel`, {});
      localStorage.removeItem(STORAGE_KEY(countId));
      localStorage.removeItem('active_count_id');
    },
    onSuccess: () => {
      setSelectedCount(null);
      setCountItems([]);
      setView('list');
      refetchCounts();
    },
  });

  const showNotification = useCallback((
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string
  ) => {
    setNotification({ isOpen: true, type, title, message });
  }, []);

  const handleItemChange = useCallback((itemId: string, countedQty: number) => {
    setCountItems((prev) => {
      const updated = prev.map((item) =>
        item.id === itemId ? { ...item, countedQty } : item
      );
      pendingUpdatesRef.current[itemId] = countedQty;
      return updated;
    });

    if (debounceTimeoutRef.current[itemId]) {
      clearTimeout(debounceTimeoutRef.current[itemId]);
    }

    debounceTimeoutRef.current[itemId] = setTimeout(async () => {
      const finalCountedQty = pendingUpdatesRef.current[itemId];
      setSyncingItemIds((prev) => new Set([...prev, itemId]));

      try {
        const response = await apiClient.patch(
          `/inventory-counts/${selectedCount?.id}/items/${itemId}`,
          { countedQty: finalCountedQty }
        );

        if (response.data) {
          setCountItems((prev) =>
            prev.map((item) =>
              item.id === itemId ? { ...item, countedQty: response.data.countedQty } : item
            )
          );
        }

        setSyncedItemIds((prev) => new Set([...prev, itemId]));
      } catch (error) {
        console.error('Error syncing item:', error);
      } finally {
        setSyncingItemIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
        delete debounceTimeoutRef.current[itemId];
      }
    }, 500);
  }, [selectedCount?.id]);

  const handleProcessCount = useCallback(async (countId: string) => {
    try {
      const response = await apiClient.get(`/inventory-counts/${countId}`);
      const freshCount = response.data as InventoryCount;
      setSelectedCount(freshCount);
      setCountItems(freshCount.countItems || []);
      localStorage.setItem('active_count_id', freshCount.id);
      localStorage.setItem(STORAGE_KEY(freshCount.id), JSON.stringify({
        count: freshCount,
        items: freshCount.countItems,
        lastSaved: new Date().toISOString(),
      }));
      setSyncingItemIds(new Set());
      setSyncedItemIds(new Set());
      setView('process');
    } catch (error) {
      console.error('Error cargando conteo:', error);
      alert('Error al cargar el conteo');
    }
  }, []);

  const filteredItems = countItems.filter((item) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      item.itemCode.toLowerCase().includes(q) ||
      item.itemName.toLowerCase().includes(q) ||
      item.barCodeInv?.toLowerCase().includes(q) ||
      item.barCodeVt?.toLowerCase().includes(q);

    const matchesCategory = !filterCategory || item.category === filterCategory;
    const matchesSubcategory = !filterSubcategory || item.subcategory === filterSubcategory;
    const matchesBrand = !filterBrand || item.brand === filterBrand;

    if (filterVarianceOnly) {
      const systemQty = typeof item.systemQty === 'string' ? parseFloat(item.systemQty) : item.systemQty;
      const counted = item.countedQty ?? 0;
      return matchesSearch && matchesCategory && matchesSubcategory && matchesBrand &&
        Math.round((counted - systemQty) * 10) / 10 !== 0;
    }
    return matchesSearch && matchesCategory && matchesSubcategory && matchesBrand;
  });

  // Queries para clasificaciones globales
  const { data: globalCategories = [] } = useClassifications('CATEGORY');
  const { data: globalSubcategories = [] } = useClassifications('SUBCATEGORY');
  const { data: globalBrands = [] } = useClassifications('BRAND');

  // Si no hay datos globales todavía, usamos los locales como respaldo (para retrocompatibilidad)
  const localCategories = [...new Set(countItems.map((i) => i.category).filter(Boolean))] as string[];
  const localSubcategories = [...new Set(countItems.map((i) => i.subcategory).filter(Boolean))] as string[];
  const localBrands = [...new Set(countItems.map((i) => i.brand).filter(Boolean))] as string[];

  // Helpers para deduplicar opciones por descripción (evitar Warning: duplicate key)
  const getUniqueOptions = (items: Classification[], fallbackStrings: string[]) => {
    if (items.length > 0) {
      // Usar Map para asegurar unicidad por descripción
      const unique = new Map();
      items.forEach(c => {
        if (!unique.has(c.description)) {
          // Usamos el CÓDIGO como valor para que coincida con lo que hay en los items
          unique.set(c.description, { value: c.code, label: `${c.code} - ${c.description}` });
        }
      });
      return Array.from(unique.values());
    }
    return fallbackStrings.map(s => ({ value: s, label: s }));
  };

  const categories = getUniqueOptions(globalCategories, localCategories);
  const subcategories = getUniqueOptions(globalSubcategories, localSubcategories);
  const brands = getUniqueOptions(globalBrands, localBrands);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // Si hay resultados, enfocar el campo de cantidad del primero
      if (filteredItems.length > 0) {
        e.preventDefault();
        setTimeout(() => {
          firstItemQtyRef.current?.focus();
          firstItemQtyRef.current?.select();
        }, 10);
      }
    }
  };

  const handleQtyKeyDown = (e: React.KeyboardEvent, itemId: string) => {
    if (e.key === 'Enter') {
      // Al presionar Enter en cantidad, volver a la búsqueda y limpiarla
      setSearchTerm('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 10);
    }
  };

  const selectStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb',
    background: '#fff', color: '#374151', fontSize: '0.8rem',
    cursor: 'pointer', minWidth: 160,
  };

  const getVariance = (item: CountItem) => {
    const systemQty = typeof item.systemQty === 'string' ? parseFloat(item.systemQty) : item.systemQty;
    const counted = item.countedQty ?? 0;
    const variance = counted - systemQty;
    const percent = systemQty > 0 ? (variance / systemQty) * 100 : 0;
    return {
      variance: Math.round(variance * 10) / 10,
      percent: Math.round(percent * 10) / 10
    };
  };

  // 404 ERROR VIEW
  if (error404) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <span className="text-4xl">🔍</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Conteo no encontrado</h2>
        <p className="text-gray-600 mb-8 max-w-md">
          El conteo que intentas acceder no existe o ha sido eliminado.
          Esto puede suceder si se reinició la base de datos o si el enlace es obsoleto.
        </p>
        <Button onClick={() => { setError404(false); setView('list'); refetchCounts(); }} variant="primary">
          Volver al listado
        </Button>
      </div>
    );
  }

  // LIST VIEW
  if (view === 'list') {
    return (
      <div className="w-full">
        <div className="border-b bg-white p-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Conteo Físico</h1>
            {canCreate && (
              <Button onClick={() => setView('create')} variant="primary">
                + Nuevo Conteo
              </Button>
            )}
          </div>
        </div>

        <div className="p-6 bg-gray-50">
          {counts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <p className="text-gray-500">No hay conteos aún</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Número</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Código</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Estado</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Versión</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Items</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Creado</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {counts.map((count) => (
                    <tr key={count.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">{count.sequenceNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{count.code}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${count.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          count.status === 'SUBMITTED' ? 'bg-purple-100 text-purple-700' :
                            count.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                              count.status === 'ON_HOLD' ? 'bg-yellow-100 text-yellow-700' :
                                count.status === 'CLOSED' ? 'bg-gray-100 text-gray-700' :
                                  count.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-700'
                          }`}>
                          {count.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold">{count.currentVersion}</td>
                      <td className="px-4 py-3 text-center font-semibold">{count.countItems?.length || 0}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(count.createdAt).toLocaleDateString('es-ES')}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-center flex-wrap">
                          {/* DRAFT STATE */}
                          {count.status === 'DRAFT' && (
                            <>
                              <Button onClick={() => handleProcessCount(count.id)} variant="primary" size="sm">
                                📋 Procesar
                              </Button>
                              {canDelete && (
                                <Button onClick={() => { setCountIdToDelete(count.id); setShowDeleteConfirm(true); }} variant="danger" size="sm">
                                  🗑 Eliminar
                                </Button>
                              )}
                            </>
                          )}

                          {/* ACTIVE STATE */}
                          {count.status === 'ACTIVE' && (
                            <>
                              <Button onClick={() => handleProcessCount(count.id)} variant="primary" size="sm">
                                📝 Procesar
                              </Button>
                              <Button onClick={() => completeCountMutation.mutate(count.id)} variant="success" size="sm">
                                ✓ Finalizar
                              </Button>
                              <Button onClick={() => pauseMutation.mutate(count.id)} variant="secondary" size="sm">
                                ⏸ Pausar
                              </Button>
                              {canDelete && (
                                <Button onClick={() => { setCountIdToDelete(count.id); setShowDeleteConfirm(true); }} variant="danger" size="sm">
                                  🗑 Eliminar
                                </Button>
                              )}
                            </>
                          )}

                          {/* ON_HOLD STATE */}
                          {count.status === 'ON_HOLD' && (
                            <>
                              <Button onClick={() => handleProcessCount(count.id)} variant="primary" size="sm">
                                ▶ Continuar
                              </Button>
                              <Button onClick={() => completeCountMutation.mutate(count.id)} variant="success" size="sm">
                                ✓ Finalizar
                              </Button>
                            </>
                          )}

                          {/* SUBMITTED STATE */}
                          {count.status === 'SUBMITTED' && (
                            <>
                              <Button onClick={() => handleProcessCount(count.id)} variant="primary" size="sm">
                                👁 Ver
                              </Button>
                              <Button onClick={() => finalizeCountMutation.mutate(count.id)} variant="success" size="sm" disabled={finalizeCountMutation.isPending}>
                                🏆 Finalizar
                              </Button>
                              {canCreate && (
                                <Button onClick={() => createVersionMutation.mutate(count.id)} variant="secondary" size="sm" disabled={createVersionMutation.isPending}>
                                  🔄 Versión
                                </Button>
                              )}
                              {canExport && (
                                <Button onClick={() => handleExportExcel(count.id)} variant="secondary" size="sm">
                                  📊 Excel
                                </Button>
                              )}
                              {canDelete && (
                                <Button onClick={() => { setCountIdToDelete(count.id); setShowDeleteConfirm(true); }} variant="danger" size="sm">
                                  🗑 Eliminar
                                </Button>
                              )}
                            </>
                          )}

                          {/* COMPLETED STATE */}
                          {count.status === 'COMPLETED' && (
                            <>
                              {canCreate && (
                                <Button onClick={() => createVersionMutation.mutate(count.id)} variant="secondary" size="sm">
                                  🔄 Versión
                                </Button>
                              )}
                              {canExport && (
                                <Button onClick={() => handleExportExcel(count.id)} variant="secondary" size="sm">
                                  📊 Excel
                                </Button>
                              )}
                              {canSyncERP && (
                                <Button onClick={() => sendToERPMutation.mutate(count.id)} variant="primary" size="sm">
                                  🚀 ERP
                                </Button>
                              )}
                            </>
                          )}

                          {/* IN_PROGRESS STATE */}
                          {count.status === 'IN_PROGRESS' && (
                            <>
                              <Button onClick={() => handleProcessCount(count.id)} variant="primary" size="sm">
                                📝 Recontar
                              </Button>
                              <Button onClick={() => completeCountMutation.mutate(count.id)} variant="success" size="sm">
                                ✓ Finalizar
                              </Button>
                            </>
                          )}

                          {/* CLOSED STATE */}
                          {count.status === 'CLOSED' && (
                            <>
                              {canExport && (
                                <Button onClick={() => handleExportExcel(count.id)} variant="secondary" size="sm">
                                  📊 Excel
                                </Button>
                              )}
                              {canReopen && (
                                <Button onClick={() => reactivateCountMutation.mutate(count.id)} variant="secondary" size="sm">
                                  🔓 Reactivar
                                </Button>
                              )}
                              {canDelete && (
                                <Button onClick={() => { setCountIdToDelete(count.id); setShowDeleteConfirm(true); }} variant="danger" size="sm">
                                  🗑 Eliminar
                                </Button>
                              )}
                            </>
                          )}

                          {/* CANCELLED STATE */}
                          {count.status === 'CANCELLED' && canDelete && (
                            <Button onClick={() => { setCountIdToDelete(count.id); setShowDeleteConfirm(true); }} variant="danger" size="sm">
                              🗑 Eliminar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sync Progress Modal */}
        {isSyncing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
              {syncStatus === 'syncing' && (
                <>
                  <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Sincronizando con ERP</h3>
                  <p className="text-gray-600">{syncMessage}</p>
                </>
              )}
              {syncStatus === 'closing' && (
                <>
                  <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Finalizando Conteo</h3>
                  <p className="text-gray-600">{syncMessage}</p>
                </>
              )}
              {syncStatus === 'done' && (
                <>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6 scale-110 animate-bounce">
                    <span className="text-3xl">✅</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">¡Completado!</h3>
                  <p className="text-gray-600">{syncMessage}</p>
                  <Button onClick={() => setIsSyncing(false)} className="mt-6">Cerrar</Button>
                </>
              )}
              {syncStatus === 'error' && (
                <>
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <span className="text-3xl">⚠️</span>
                  </div>
                  <h3 className="text-xl font-bold text-red-700 mb-2">Error de Sincronización</h3>
                  <p className="text-gray-600 mb-6">{syncMessage}</p>
                  <Button onClick={() => setIsSyncing(false)} variant="danger">Cerrar y Revisar</Button>
                </>
              )}
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={showDeleteConfirm}
          onConfirm={() => { if (countIdToDelete) deleteMutation.mutate(countIdToDelete); }}
          onCancel={() => { setShowDeleteConfirm(false); setCountIdToDelete(null); }}
          title="⚠️ Eliminar Conteo"
          message="¿Estás seguro de que deseas eliminar este conteo? Esta acción no se puede deshacer."
          isDangerous={true}
        />

        <NotificationModal
          isOpen={notification.isOpen}
          onClose={() => setNotification({ ...notification, isOpen: false })}
          type={notification.type}
          title={notification.title}
          message={notification.message}
        />
      </div>
    );
  }

  // CREATE VIEW
  if (view === 'create') {
    const isFormValid = warehouseId && (creationMode === 'erp' ? mappingId : excelFile);
    const downloadTemplate = async () => {
      try {
        const response = await apiClient.get('/inventory-counts/excel-template', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'plantilla_conteo.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (error) { console.error('Error downloading template:', error); }
    };

    return (
      <div className="w-full h-full flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="border rounded-lg p-8 max-w-md w-full bg-white shadow-lg">
          <h2 className="text-2xl font-bold mb-2">📝 Crear Nuevo Conteo</h2>
          <p className="text-sm text-gray-500 mb-6">Completa todos los campos requeridos</p>

          <div className="space-y-4">
            <div>
              <Label htmlFor="warehouse" className="font-semibold">📦 Almacén <span className="text-red-500">*</span></Label>
              <select
                id="warehouse" value={warehouseId}
                onChange={(e) => { setWarehouseId(e.target.value); setLocationId(''); }}
                className={`w-full mt-2 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${warehouseId ? 'border-green-300 focus:ring-green-500 bg-green-50' : 'border-gray-300'}`}
              >
                <option value="">Selecciona un almacén</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            <div className="py-2">
              <Label className="font-semibold mb-2 block">🎯 Método de Carga</Label>
              <div className="flex gap-2">
                <button onClick={() => setCreationMode('erp')} className={`flex-1 py-2 px-3 rounded-md border text-sm transition-all ${creationMode === 'erp' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-700'}`}>🔗 ERP Mapping</button>
                <button onClick={() => setCreationMode('excel')} className={`flex-1 py-2 px-3 rounded-md border text-sm transition-all ${creationMode === 'excel' ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-700'}`}>📊 Excel File</button>
              </div>
            </div>

            {creationMode === 'erp' && (
              <div>
                <Label htmlFor="mapping" className="font-semibold">🔗 Mapeo de Datos <span className="text-red-500">*</span></Label>
                <select
                  id="mapping" value={mappingId} onChange={(e) => setMappingId(e.target.value)}
                  className={`w-full mt-2 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${mappingId ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}
                >
                  <option value="">Selecciona un mapeo</option>
                  {availableMappings.map((mapping: any) => <option key={mapping.id} value={mapping.id}>{mapping.datasetType}</option>)}
                </select>
              </div>
            )}

            {creationMode === 'excel' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">📊 Archivo Excel <span className="text-red-500">*</span></Label>
                  <button onClick={downloadTemplate} className="text-xs text-blue-600 hover:underline">📥 Descargar Plantilla</button>
                </div>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${excelFile ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50'}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.[0]) setExcelFile(e.dataTransfer.files[0]); }}
                >
                  <input type="file" id="excel-upload" accept=".xlsx,.xls" className="hidden" onChange={(e) => setExcelFile(e.target.files?.[0] || null)} />
                  <Label htmlFor="excel-upload" className="cursor-pointer">
                    {excelFile ? <p className="text-sm font-medium text-green-700">📄 {excelFile.name}</p> : <p className="text-sm text-gray-600 font-medium">Haz click o arrastra (.xlsx)</p>}
                  </Label>
                </div>
                {excelPreview && (
                  <div className="mt-4 border rounded-md overflow-hidden bg-white max-h-40 overflow-y-auto">
                    <table className="w-full text-[10px]">
                      <thead className="bg-gray-50 border-b">
                        <tr><th className="px-2 py-1 text-left">Item</th><th className="px-2 py-1 text-right">Cant.</th></tr>
                      </thead>
                      <tbody>
                        {excelPreview.preview.map((item, i) => (
                          <tr key={i} className="border-b">
                            <td className="px-2 py-1 truncate">{item.itemName}</td>
                            <td className="px-2 py-1 text-right">{item.systemQty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="location">📍 Ubicación <span className="text-gray-400">(opcional)</span></Label>
              <select id="location" value={locationId} onChange={(e) => setLocationId(e.target.value)} className="w-full mt-2 border border-gray-300 rounded-md px-3 py-2">
                <option value="">Todas las ubicaciones</option>
                {locations.map((l: any) => <option key={l.id} value={l.id}>{l.code}</option>)}
              </select>
            </div>

            <div className="flex gap-2 pt-6 border-t">
              <Button onClick={() => createCountMutation.mutate()} disabled={!isFormValid || createCountMutation.isPending || uploadingExcel} variant="primary" className="flex-1">
                {createCountMutation.isPending || uploadingExcel ? '⏳ Procesando...' : '✓ Crear Conteo'}
              </Button>
              <Button onClick={() => { setView('list'); setExcelFile(null); }} variant="secondary" className="flex-1">✕ Cancelar</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PROCESS VIEW
  if (view === 'process' && selectedCount) {
    return (
      <div className="w-full h-full flex flex-col bg-gray-50">
        <div className="flex-shrink-0 border-b bg-white px-6 py-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">{selectedCount.sequenceNumber}</h1>
              <p className="text-sm text-gray-500">{selectedCount.code}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedCount.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
              selectedCount.status === 'SUBMITTED' ? 'bg-purple-100 text-purple-700' :
                selectedCount.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                  selectedCount.status === 'ON_HOLD' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
              }`}>
              {selectedCount.status}
            </span>
          </div>
        </div>

        <div className="flex-shrink-0 border-b bg-white px-6 py-4">
          <div className="flex gap-2 flex-wrap">
            {selectedCount.status === 'DRAFT' && (
              <>
                <Button onClick={() => startCountMutation.mutate(selectedCount.id)} variant="primary">✓ Iniciar Conteo</Button>
                {canDelete && (
                  <Button onClick={() => cancelCountMutation.mutate(selectedCount.id)} variant="danger">✕ Cancelar</Button>
                )}
              </>
            )}
            {selectedCount.status === 'ACTIVE' && (
              <>
                <Button onClick={() => completeCountMutation.mutate(selectedCount.id)} variant="primary">✓ Finalizar</Button>
                <Button onClick={() => pauseMutation.mutate(selectedCount.id)} variant="secondary">⏸ Pausar</Button>
                {canDelete && (
                  <Button onClick={() => cancelCountMutation.mutate(selectedCount.id)} variant="danger">✕ Cancelar</Button>
                )}
              </>
            )}
            {selectedCount.status === 'ON_HOLD' && (
              <>
                <Button onClick={() => resumeMutation.mutate(selectedCount.id)} variant="secondary">▶ Reanudar</Button>
                <Button onClick={() => completeCountMutation.mutate(selectedCount.id)} variant="primary" disabled={completeCountMutation.isPending}>✓ Finalizar / Entregar</Button>
                {canDelete && (
                  <Button onClick={() => cancelCountMutation.mutate(selectedCount.id)} variant="danger">✕ Cancelar</Button>
                )}
              </>
            )}
            {selectedCount.status === 'SUBMITTED' && (
              <>
                <Button onClick={() => finalizeCountMutation.mutate(selectedCount.id)} variant="primary" disabled={finalizeCountMutation.isPending}>🏆 Finalizar Conteo</Button>
                <Button onClick={() => createVersionMutation.mutate(selectedCount.id)} variant="secondary" disabled={createVersionMutation.isPending}>🔄 Crear Nueva Versión (Recontar)</Button>
                {canExport && (
                  <Button onClick={() => handleExportExcel(selectedCount.id)} variant="secondary">📥 Exportar Excel</Button>
                )}
                {canDelete && (
                  <Button onClick={() => cancelCountMutation.mutate(selectedCount.id)} variant="danger">✕ Cancelar</Button>
                )}
              </>
            )}
            {selectedCount.status === 'COMPLETED' && (
              <>
                {canCreate && (
                  <Button onClick={() => createVersionMutation.mutate(selectedCount.id)} variant="secondary">🔄 Crear Versión</Button>
                )}
                {canExport && (
                  <Button onClick={() => handleExportExcel(selectedCount.id)} variant="secondary">📥 Exportar Excel</Button>
                )}
                {canSyncERP && (
                  <Button onClick={() => sendToERPMutation.mutate(selectedCount.id)} variant="primary">🚀 Enviar a ERP</Button>
                )}
                {canDelete && (
                  <Button onClick={() => cancelCountMutation.mutate(selectedCount.id)} variant="danger">✕ Cancelar</Button>
                )}
              </>
            )}
            <Button onClick={() => { setSelectedCount(null); setCountItems([]); setView('list'); refetchCounts(); }} variant="secondary">← Volver</Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="bg-white border-b p-6">
            <div className="flex gap-4 mb-6">
              <div className="flex-1 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-yellow-700 uppercase">Varianzas</p>
                <p className="text-4xl font-bold text-yellow-600">{filteredItems.filter(i => getVariance(i).variance !== 0).length}</p>
              </div>
              <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-green-700 uppercase">Bajo</p>
                <p className="text-4xl font-bold text-green-600">{filteredItems.filter(i => getVariance(i).variance < 0).length}</p>
              </div>
              <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-red-700 uppercase">Sobre</p>
                <p className="text-4xl font-bold text-red-600">{filteredItems.filter(i => getVariance(i).variance > 0).length}</p>
              </div>
            </div>

            <div className="space-y-3">
              <Input
                ref={searchInputRef}
                placeholder="🔍 Escanea o busca por código/descripción... (Barcode ready)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                autoFocus
              />
              <div className="flex gap-2 flex-wrap">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">📁 Todas las Categorías</option>
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>

                <select
                  value={filterSubcategory}
                  onChange={(e) => setFilterSubcategory(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">📂 Todas las Subcategorías</option>
                  {subcategories.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>

                <select
                  value={filterBrand}
                  onChange={(e) => setFilterBrand(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">🏷️ Todas las Marcas</option>
                  {brands.map((b) => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={filterVarianceOnly} onChange={(e) => setFilterVarianceOnly(e.target.checked)} className="rounded w-4 h-4" />
                  <span className="text-sm font-medium">Solo variado</span>
                </label>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="bg-white rounded-lg border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Item</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">UOM</th>
                    {hasSystemView && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Sistema</th>}
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Conteo</th>
                    {hasSystemView && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Varianza</th>}
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, index) => {
                    const { variance, percent } = getVariance(item);
                    return (
                      <tr key={item.id} className={`border-b hover:bg-gray-50 ${variance !== 0 ? 'bg-yellow-50' : ''}`}>
                        <td className="px-4 py-3">
                          <p className="font-mono text-sm font-bold">{item.itemCode}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">{item.itemName}</p>
                        </td>
                        <td className="px-4 py-3 text-right text-sm">{item.uom}</td>
                        {hasSystemView && <td className="px-4 py-3 text-right font-medium">{item.systemQty}</td>}
                        <td className="px-4 py-3">
                          <Input
                            ref={index === 0 ? firstItemQtyRef : null}
                            type="number" value={item.countedQty ?? ''}
                            onChange={(e) => handleItemChange(item.id, parseFloat(e.target.value) || 0)}
                            onKeyDown={(e) => handleQtyKeyDown(e, item.id)}
                            className="w-24 text-right ml-auto"
                          />
                        </td>
                        {hasSystemView && (
                          <td className={`px-4 py-3 text-right font-bold ${variance < 0 ? 'text-green-600' : variance > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {variance >= 0 ? '+' : ''}{variance.toFixed(1)} <br />
                            <span className="text-[10px]">({percent.toFixed(1)}%)</span>
                          </td>
                        )}
                        <td className="px-4 py-3 text-center text-xs">
                          {syncingItemIds.has(item.id) ? '⟳' : syncedItemIds.has(item.id) ? '✓' : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <NotificationModal
          isOpen={notification.isOpen}
          onClose={() => setNotification({ ...notification, isOpen: false })}
          type={notification.type} title={notification.title} message={notification.message}
        />

        {newVersionData && (
          <NewVersionModal
            isOpen={showNewVersionModal} onClose={() => { setShowNewVersionModal(false); setNewVersionData(null); }}
            versionNumber={newVersionData.versionNumber} itemsCount={newVersionData.itemsCount} previousVersion={newVersionData.previousVersion}
          />
        )}
      </div>
    );
  }

  return null;
}
