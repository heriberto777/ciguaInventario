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
import { ProcessingModal } from '@/components/atoms/ProcessingModal';
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
  finalizedVersion?: number;
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
  lot?: string;
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

  // Estado de procesamiento global
  const [processing, setProcessing] = useState<{
    isOpen: boolean;
    message: string;
    status: 'processing' | 'success' | 'error';
  }>({
    isOpen: false,
    message: '',
    status: 'processing',
  });

  const showProcessing = (message: string) => setProcessing({ isOpen: true, message, status: 'processing' });
  const stopProcessing = () => setProcessing(prev => ({ ...prev, isOpen: false }));
  const successProcessing = (message: string) => setProcessing({ isOpen: true, message, status: 'success' });
  const errorProcessing = (message: string) => setProcessing({ isOpen: true, message, status: 'error' });

  // Modal de confirmación genérico para acciones
  const [actionConfirm, setActionConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDangerous?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    isDangerous: false,
  });

  const handleActionWithConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    isDangerous: boolean = false
  ) => {
    setActionConfirm({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setActionConfirm(prev => ({ ...prev, isOpen: false }));
      },
      isDangerous,
    });
  };

  // Permisos y Roles
  const user = useAuthStore((state) => state.user);
  const permissions = user?.permissions || [];
  const roles = user?.roles || [];
  const isSuperAdmin = roles.includes('SuperAdmin');

  const hasSystemView = isSuperAdmin || permissions.includes('inventory:view_qty') || permissions.includes('inventory:manage');
  const hasVarianceView = isSuperAdmin || permissions.includes('inventory:view_variances') || permissions.includes('inventory:manage');
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
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error?.message || error.message || 'No se pudo iniciar el conteo.';
      showNotification('error', 'Error', errorMsg);
    }
  });

  const completeCountMutation = useMutation({
    mutationFn: async (countId: string) => {
      showProcessing('Guardando cambios y marcando como entregado...');
      const response = await apiClient.post(`/inventory-counts/${countId}/complete`, {});
      localStorage.removeItem(STORAGE_KEY(countId));
      localStorage.removeItem('active_count_id');
      return response.data.count as InventoryCount;
    },
    onSuccess: (count) => {
      setSelectedCount(count);
      setCountItems(count.countItems || []);
      refetchCounts();
      stopProcessing();
    },
    onError: () => errorProcessing('No se pudo completar el conteo.')
  });

  const finalizeCountMutation = useMutation({
    mutationFn: async (countId: string) => {
      showProcessing('Finalizando administrativamente y generando consolidado...');
      const response = await apiClient.post(`/inventory-counts/${countId}/finalize`, {});
      return response.data as InventoryCount;
    },
    onSuccess: (count) => {
      setSelectedCount(count);
      setCountItems(count.countItems || []);
      refetchCounts();
      successProcessing('Conteo finalizado administrativamente.');
      setTimeout(stopProcessing, 1500);
    },
    onError: () => errorProcessing('No se pudo finalizar el conteo.')
  });


  const createVersionMutation = useMutation({
    mutationFn: async (countId: string) => {
      showProcessing('Creando nueva versión de conteo...');
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
      stopProcessing();
      setNewVersionData({
        versionNumber: count.currentVersion,
        itemsCount: count.countItems?.length || 0,
        previousVersion: count.currentVersion - 1,
      });
      setShowNewVersionModal(true);
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error?.message || error.message || 'No se pudo crear la nueva versión.';
      errorProcessing(errorMsg);
      setTimeout(stopProcessing, 3000);
    }
  });

  const sendToERPMutation = useMutation({
    mutationFn: async (countId: string) => {
      showProcessing('Consolidando datos y preparando envío al ERP...');
      const response = await apiClient.post(`/inventory-counts/${countId}/send-to-erp`, {});
      setProcessing(prev => ({ ...prev, message: 'Sincronización exitosa. Actualizando estado del conteo...' }));
      localStorage.removeItem(STORAGE_KEY(countId));
      localStorage.removeItem('active_count_id');
      return response.data;
    },
    onSuccess: (data) => {
      successProcessing('Proceso completado correctamente.');
      setTimeout(() => {
        stopProcessing();
        setSelectedCount(null);
        setCountItems([]);
        refetchCounts();
        setView('list');
        const title = data.success ? '✅ Sincronización Exitosa' : '⚠️ Sincronización Parcial';
        const detail = data.itemsFailed > 0
          ? `${data.itemsSynced} sincronizados, ${data.itemsFailed} errores.`
          : `Todos los artículos (${data.itemsSynced}) fueron sincronizados correctamente.`;
        showNotification(data.success ? 'success' : 'info', title, data.message + '. ' + detail);
      }, 1500);
    },
    onError: (error: any) => {
      const errorData = error.response?.data?.error;
      const message = typeof errorData === 'object' ? (errorData.message || JSON.stringify(errorData)) : (errorData || error.message || 'Error crítico durante la sincronización.');
      errorProcessing(message);
    }
  });

  const handleExportExcel = async (countId: string) => {
    try {
      showProcessing('Generando archivo Excel...');
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
      successProcessing('Archivo generado correctamente.');

      // Refrescar estado porque el backend lo marca como FINALIZED tras exportar
      refetchCounts();
      if (countId === selectedCount?.id) {
        fetchCountFromServer(countId);
      }

      setTimeout(stopProcessing, 1500);
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      errorProcessing('No se pudo generar el archivo Excel.');
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (countId: string) => {
      showProcessing('Eliminando conteo del servidor...');
      await apiClient.delete(`/inventory-counts/${countId}/delete`);
    },
    onSuccess: () => {
      refetchCounts();
      setView('list');
      setShowDeleteConfirm(false);
      successProcessing('Conteo eliminado correctamente');
      setTimeout(stopProcessing, 1500);
    },
    onError: () => errorProcessing('No se pudo eliminar el conteo.')
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
      showNotification('error', 'Error', 'No se pudo cargar el conteo');
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
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Conteo no encontrado</h2>
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
        <div className="border-b border-border-default bg-card p-8">
          <div className="flex justify-between items-center max-w-7xl mx-auto">
            <div>
              <h1 className="text-3xl font-black text-primary tracking-tight">Conteo Físico</h1>
              <p className="text-muted text-xs font-bold uppercase tracking-widest mt-1">Gestión de existencias y auditoría</p>
            </div>
            {canCreate && (
              <Button onClick={() => setView('create')} variant="primary" className="shadow-lg shadow-accent-primary/20">
                + Nuevo Conteo
              </Button>
            )}
          </div>
        </div>

        <div className="p-8 bg-app min-h-[calc(100vh-140px)]">
          <div className="max-w-7xl mx-auto">
            {counts.length === 0 ? (
              <div className="text-center py-20 bg-card rounded-xl border border-border-default shadow-sm">
                <div className="text-4xl mb-4">Empty</div>
                <p className="text-muted font-bold uppercase tracking-widest text-xs">No hay conteos aún</p>
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border-default overflow-hidden shadow-xl">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-default bg-hover/30">
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-muted">Número</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-muted">Código</th>
                      <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted">Estado</th>
                      <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted">Versión</th>
                      <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted">Items</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-muted">Creado</th>
                      <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {counts.map((count) => (
                      <tr key={count.id} className="border-b border-border-default hover:bg-hover/50 transition-all group">
                        <td className="px-4 py-3 font-bold text-[var(--text-primary)]">{count.sequenceNumber}</td>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{count.code}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${count.status === 'COMPLETED' ? 'bg-success/10 text-success border-success/20' :
                            count.status === 'SUBMITTED' ? 'bg-accent-secondary/10 text-accent-secondary border-accent-secondary/20' :
                              count.status === 'ACTIVE' ? 'bg-accent-primary/10 text-accent-primary border-accent-primary/20' :
                                count.status === 'ON_HOLD' ? 'bg-warning/10 text-warning border-warning/20' :
                                  count.status === 'CLOSED' ? 'bg-muted/10 text-muted border-border-default' :
                                    count.status === 'FINALIZED' ? 'bg-success/20 text-success border-success/30' :
                                      count.status === 'CANCELLED' ? 'bg-danger/10 text-danger border-danger/20' :
                                        'bg-hover text-muted border-border-default'
                            }`}>
                            {count.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-[var(--text-primary)]">{count.currentVersion}</td>
                        <td className="px-4 py-3 text-center font-bold text-[var(--text-primary)]">{count.countItems?.length || 0}</td>
                        <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{new Date(count.createdAt).toLocaleDateString('es-ES')}</td>
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
                                <Button onClick={() => completeCountMutation.mutate(count.id)} variant="success" size="sm" isLoading={completeCountMutation.isPending}>
                                  ✓ Finalizar
                                </Button>
                                <Button onClick={() => pauseMutation.mutate(count.id)} variant="secondary" size="sm" isLoading={pauseMutation.isPending}>
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
                                <Button onClick={() => finalizeCountMutation.mutate(count.id)} variant="success" size="sm" isLoading={finalizeCountMutation.isPending}>
                                  🏆 Finalizar
                                </Button>
                                {canCreate && (
                                  <Button onClick={() => createVersionMutation.mutate(count.id)} variant="secondary" size="sm" isLoading={createVersionMutation.isPending}>
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
                                  <Button onClick={() => createVersionMutation.mutate(count.id)} variant="secondary" size="sm" isLoading={createVersionMutation.isPending}>
                                    🔄 Versión
                                  </Button>
                                )}
                                {canExport && (
                                  <Button onClick={() => handleExportExcel(count.id)} variant="secondary" size="sm">
                                    📊 Excel
                                  </Button>
                                )}
                                {canSyncERP && (
                                  <Button onClick={() => sendToERPMutation.mutate(count.id)} variant="primary" size="sm" isLoading={sendToERPMutation.isPending}>
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

                            {/* FINALIZED STATE */}
                            {count.status === 'FINALIZED' && (
                              <>
                                <Button onClick={() => handleProcessCount(count.id)} variant="primary" size="sm">
                                  👁 Ver
                                </Button>
                                {canExport && (
                                  <Button onClick={() => handleExportExcel(count.id)} variant="secondary" size="sm">
                                    📊 Excel
                                  </Button>
                                )}
                                {canSyncERP && (
                                  <Button onClick={() => sendToERPMutation.mutate(count.id)} variant="primary" size="sm" isLoading={sendToERPMutation.isPending}>
                                    🚀 ERP
                                  </Button>
                                )}
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
                                  <Button onClick={() => reactivateCountMutation.mutate(count.id)} variant="secondary" size="sm" isLoading={reactivateCountMutation.isPending}>
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

          {/* Modal de Procesamiento Global */}
          <ProcessingModal
            isOpen={processing.isOpen}
            message={processing.message}
            status={processing.status}
            onClose={processing.status !== 'processing' ? stopProcessing : undefined}
          />

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
      } catch (error) {
        console.error('Error downloading template:', error);
      }
    };

    return (
      <div className="w-full h-full flex items-center justify-center p-8 bg-app">
        <div className="border border-border-default rounded-2xl p-10 max-w-lg w-full bg-card shadow-2xl relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent-primary/5 rounded-full blur-3xl -mr-16 -mt-16"></div>

          <h2 className="text-3xl font-black text-primary mb-2 tracking-tight">📝 Nuevo Conteo</h2>
          <p className="text-xs font-bold text-muted uppercase tracking-widest mb-10">Configuración de auditoría física</p>

          <div className="space-y-8">
            <div>
              <Label htmlFor="warehouse" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 block">📦 Almacén de Origen</Label>
              <select
                id="warehouse" value={warehouseId}
                onChange={(e) => { setWarehouseId(e.target.value); setLocationId(''); }}
                className={`w-full bg-hover/50 border border-border-default rounded-2xl px-5 py-4 text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 transition-all font-medium appearance-none`}
              >
                <option value="">Selecciona un almacén</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            <div>
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 block">🎯 Método de Recopilación</Label>
              <div className="flex gap-3 bg-hover/30 p-1.5 rounded-2xl border border-border-default">
                <button
                  onClick={() => setCreationMode('erp')}
                  className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${creationMode === 'erp' ? 'bg-accent-primary text-white shadow-lg' : 'text-muted hover:text-primary'}`}
                >
                  🔗 ERP Sync
                </button>
                <button
                  onClick={() => setCreationMode('excel')}
                  className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${creationMode === 'excel' ? 'bg-accent-secondary text-white shadow-lg' : 'text-muted hover:text-primary'}`}
                >
                  📊 Excel Load
                </button>
              </div>
            </div>

            {creationMode === 'erp' && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <Label htmlFor="mapping" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 block">🔗 Mapeo de Integración</Label>
                <select
                  id="mapping" value={mappingId} onChange={(e) => setMappingId(e.target.value)}
                  className={`w-full bg-hover/50 border border-border-default rounded-2xl px-5 py-4 text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 transition-all font-medium appearance-none`}
                >
                  <option value="">Selecciona un mapeo</option>
                  {availableMappings.map((mapping: any) => <option key={mapping.id} value={mapping.id}>{mapping.datasetType}</option>)}
                </select>
              </div>
            )}

            {creationMode === 'excel' && (
              <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted block">📊 Archivo de Datos</Label>
                  <button onClick={downloadTemplate} className="text-[10px] font-black uppercase tracking-widest text-accent-primary hover:underline">📥 Download Template</button>
                </div>
                <div
                  className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all group ${excelFile ? 'border-success bg-success/5' : 'border-border-default bg-hover/20 hover:border-accent-primary/50'}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.[0]) setExcelFile(e.dataTransfer.files[0]); }}
                >
                  <input type="file" id="excel-upload" accept=".xlsx,.xls" className="hidden" onChange={(e) => setExcelFile(e.target.files?.[0] || null)} />
                  <Label htmlFor="excel-upload" className="cursor-pointer block">
                    {excelFile ? (
                      <div className="space-y-2">
                        <p className="text-2xl">📄</p>
                        <p className="text-sm font-black text-success uppercase truncate max-w-xs mx-auto">{excelFile.name}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-2xl group-hover:scale-110 transition-transform">📁</p>
                        <p className="text-[10px] text-muted font-black uppercase tracking-widest">Haz click o arrastra (.xlsx)</p>
                      </div>
                    )}
                  </Label>
                </div>
                {excelPreview && (
                  <div className="mt-4 border border-border-default rounded-2xl overflow-hidden bg-hover/30 max-h-40 overflow-y-auto shadow-inner">
                    <table className="w-full text-[10px] font-bold">
                      <thead className="bg-card/50 border-b border-border-default sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left uppercase text-muted tracking-widest">Item</th>
                          <th className="px-4 py-2 text-right uppercase text-muted tracking-widest">Cant.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-default/50">
                        {excelPreview.preview.map((item, i) => (
                          <tr key={i} className="hover:bg-card/30">
                            <td className="px-4 py-2 text-primary truncate max-w-[150px]">{item.itemName}</td>
                            <td className="px-4 py-2 text-right text-accent-primary">{item.systemQty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="location" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 block">📍 Pasillo / Ubicación <span className="text-[8px] opacity-50">(OPCIONAL)</span></Label>
              <select
                id="location" value={locationId} onChange={(e) => setLocationId(e.target.value)}
                className="w-full bg-hover/50 border border-border-default rounded-2xl px-5 py-4 text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 transition-all font-medium appearance-none"
              >
                <option value="">Todas las ubicaciones</option>
                {locations.map((l: any) => <option key={l.id} value={l.id}>{l.code}</option>)}
              </select>
            </div>

            <div className="flex gap-3 pt-6 border-t border-border-default">
              <Button
                onClick={() => createCountMutation.mutate()}
                disabled={!isFormValid || createCountMutation.isPending || uploadingExcel}
                variant="primary"
                className="flex-1 py-6 rounded-2xl shadow-xl shadow-accent-primary/20"
              >
                {createCountMutation.isPending || uploadingExcel ? '⏳ Procesando...' : '✓ Crear Conteo'}
              </Button>
              <Button
                onClick={() => { setView('list'); setExcelFile(null); }}
                variant="secondary"
                className="flex-1 py-6 rounded-2xl"
              >
                ✕ Cancelar
              </Button>
            </div>
          </div>
        </div>
        <ProcessingModal
          isOpen={processing.isOpen}
          message={processing.message}
          status={processing.status}
          onClose={processing.status !== 'processing' ? stopProcessing : undefined}
        />
      </div>
    );
  }
  // PROCESS VIEW
  if (view === 'process' && selectedCount) {
    return (
      <div className="w-full h-full flex flex-col bg-app">
        <div className="flex-shrink-0 border-b border-border-default bg-card px-8 py-6">
          <div className="max-w-7xl mx-auto flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-black text-primary tracking-tighter">{selectedCount.sequenceNumber}</h1>
              <p className="text-xs font-bold text-muted uppercase tracking-[0.2em] mt-1">{selectedCount.code}</p>
            </div>
            <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] border ${selectedCount.status === 'COMPLETED' ? 'bg-success/10 text-success border-success/20' :
              selectedCount.status === 'SUBMITTED' ? 'bg-accent-secondary/10 text-accent-secondary border-accent-secondary/20' :
                selectedCount.status === 'FINALIZED' ? 'bg-success/20 text-success border-success/40' :
                  selectedCount.status === 'ACTIVE' ? 'bg-accent-primary/10 text-accent-primary border-accent-primary/20' :
                    selectedCount.status === 'ON_HOLD' ? 'bg-warning/10 text-warning border-warning/20' :
                      'bg-hover text-muted border-border-default'
              }`}>
              {selectedCount.status}
            </span>
          </div>
        </div>

        <div className="flex-shrink-0 border-b border-border-default bg-card px-8 py-4">
          <div className="max-w-7xl mx-auto flex gap-3 flex-wrap">
            {selectedCount.status === 'DRAFT' && (
              <>
                <Button onClick={() => handleActionWithConfirm(
                  '✓ Iniciar Conteo',
                  '¿Estás seguro de que deseas iniciar este conteo? Esto permitirá que el personal empiece a registrar cantidades.',
                  () => startCountMutation.mutate(selectedCount.id)
                )} variant="primary">✓ Iniciar Conteo</Button>
                {canDelete && (
                  <Button onClick={() => handleActionWithConfirm(
                    '✕ Cancelar Conteo',
                    '¿Estás seguro de que deseas cancelar este conteo? Esta acción es irreversible.',
                    () => cancelCountMutation.mutate(selectedCount.id),
                    true
                  )} variant="danger">✕ Cancelar</Button>
                )}
              </>
            )}
            {selectedCount.status === 'ACTIVE' && (
              <>
                <Button onClick={() => handleActionWithConfirm(
                  '✓ Finalizar Conteo',
                  '¿Has terminado de registrar todos los artículos? Una vez finalizado, el conteo pasará a revisión.',
                  () => completeCountMutation.mutate(selectedCount.id)
                )} variant="primary">✓ Finalizar</Button>
                <Button onClick={() => pauseMutation.mutate(selectedCount.id)} variant="secondary">⏸ Pausar</Button>
                {canDelete && (
                  <Button onClick={() => handleActionWithConfirm(
                    '✕ Cancelar Conteo',
                    '¿Estás seguro de que deseas cancelar este conteo activo?',
                    () => cancelCountMutation.mutate(selectedCount.id),
                    true
                  )} variant="danger">✕ Cancelar</Button>
                )}
              </>
            )}
            {selectedCount.status === 'ON_HOLD' && (
              <>
                <Button onClick={() => resumeMutation.mutate(selectedCount.id)} variant="secondary">▶ Reanudar</Button>
                <Button onClick={() => handleActionWithConfirm(
                  '✓ Finalizar / Entregar',
                  '¿Deseas finalizar y entregar este conteo que estaba en pausa?',
                  () => completeCountMutation.mutate(selectedCount.id)
                )} variant="primary" disabled={completeCountMutation.isPending}>✓ Finalizar / Entregar</Button>
                {canDelete && (
                  <Button onClick={() => handleActionWithConfirm(
                    '✕ Cancelar Conteo',
                    '¿Estás seguro de que deseas cancelar este conteo?',
                    () => cancelCountMutation.mutate(selectedCount.id),
                    true
                  )} variant="danger">✕ Cancelar</Button>
                )}
              </>
            )}
            {selectedCount.status === 'SUBMITTED' && (
              <>
                <Button onClick={() => handleActionWithConfirm(
                  '🏆 Finalizar Conteo',
                  '¿Estás seguro de finalizar definitivamente este conteo? Se generarán los reportes finales.',
                  () => finalizeCountMutation.mutate(selectedCount.id)
                )} variant="primary" disabled={finalizeCountMutation.isPending}>🏆 Finalizar Conteo</Button>
                <Button onClick={() => handleActionWithConfirm(
                  '🔄 Crear Nueva Versión',
                  'Se guardará la versión actual y se iniciará un nuevo reconteo para los artículos seleccionados. ¿Continuar?',
                  () => createVersionMutation.mutate(selectedCount.id)
                )} variant="secondary" disabled={createVersionMutation.isPending}>🔄 Crear Nueva Versión (Recontar)</Button>
                {canExport && (
                  <Button onClick={() => handleExportExcel(selectedCount.id)} variant="secondary">📥 Exportar Excel</Button>
                )}
                {canDelete && (
                  <Button onClick={() => handleActionWithConfirm(
                    '✕ Cancelar Conteo',
                    '¿Estás seguro de que deseas cancelar?',
                    () => cancelCountMutation.mutate(selectedCount.id),
                    true
                  )} variant="danger">✕ Cancelar</Button>
                )}
              </>
            )}
            {(selectedCount.status === 'COMPLETED' || selectedCount.status === 'FINALIZED') && (
              <>
                {selectedCount.status === 'COMPLETED' && canCreate && (
                  <Button onClick={() => handleActionWithConfirm(
                    '🔄 Crear Nueva Versión',
                    '¿Deseas abrir una nueva versión de este conteo completado para corregir discrepancias?',
                    () => createVersionMutation.mutate(selectedCount.id)
                  )} variant="secondary">🔄 Crear Versión</Button>
                )}
                {canExport && (
                  <Button onClick={() => handleExportExcel(selectedCount.id)} variant="secondary">📥 Exportar Excel</Button>
                )}
                {canSyncERP && (
                  <Button onClick={() => handleActionWithConfirm(
                    '🚀 Enviar a ERP',
                    `Se enviarán los datos de la versión ${selectedCount.finalizedVersion || selectedCount.currentVersion} al ERP. ¿Continuar?`,
                    () => sendToERPMutation.mutate(selectedCount.id)
                  )} variant="primary" disabled={sendToERPMutation.isPending}>🚀 Enviar a ERP</Button>
                )}
                {canDelete && (
                  <Button onClick={() => handleActionWithConfirm(
                    '✕ Cancelar Conteo',
                    '¿Estás seguro de cancelar este conteo?',
                    () => cancelCountMutation.mutate(selectedCount.id),
                    true
                  )} variant="danger">✕ Cancelar</Button>
                )}
              </>
            )}
            <Button onClick={() => { setSelectedCount(null); setCountItems([]); setView('list'); refetchCounts(); }} variant="secondary">← Volver</Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-7xl mx-auto w-full">
            <div className="bg-card border-b border-border-default p-8">
              {hasVarianceView && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-warning/5 border border-warning/10 rounded-2xl p-6 shadow-sm">
                    <p className="text-[10px] font-black text-warning uppercase tracking-[0.2em] mb-1">Varianzas</p>
                    <p className="text-4xl font-black text-warning">{filteredItems.filter(i => getVariance(i).variance !== 0).length}</p>
                  </div>
                  <div className="bg-success/5 border border-success/10 rounded-2xl p-6 shadow-sm">
                    <p className="text-[10px] font-black text-success uppercase tracking-[0.2em] mb-1">Bajo</p>
                    <p className="text-4xl font-black text-success">{filteredItems.filter(i => getVariance(i).variance < 0).length}</p>
                  </div>
                  <div className="bg-danger/5 border border-danger/10 rounded-3xl p-6 shadow-sm">
                    <p className="text-[10px] font-black text-danger uppercase tracking-[0.2em] mb-1">Sobre</p>
                    <p className="text-4xl font-black text-danger">{filteredItems.filter(i => getVariance(i).variance > 0).length}</p>
                  </div>
                </div>
              )}

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

                  {hasVarianceView && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={filterVarianceOnly} onChange={(e) => setFilterVarianceOnly(e.target.checked)} className="rounded w-4 h-4" />
                      <span className="text-sm font-medium">Solo variado</span>
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="bg-card rounded-2xl border border-border-default overflow-hidden shadow-2xl">
                <table className="w-full">
                  <thead className="bg-hover/30 border-b border-border-default">
                    <tr>
                      <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-muted">Item</th>
                      <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-muted">Lote</th>
                      <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-muted">UOM</th>
                      {hasSystemView && <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-muted">Sistema</th>}
                      <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-muted">Conteo</th>
                      {hasVarianceView && <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-muted">Varianza</th>}
                      <th className="px-6 py-5 text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item, index) => {
                      const { variance, percent } = getVariance(item);
                      return (
                        <tr key={item.id} className={`border-b border-border-default/50 hover:bg-hover/40 transition-colors ${variance !== 0 ? 'bg-warning/5' : ''}`}>
                          <td className="px-6 py-5">
                            <p className="font-mono text-sm font-black text-primary">{item.itemCode}</p>
                            <p className="text-[10px] text-muted font-bold uppercase tracking-wider truncate max-w-[250px] mt-1">{item.itemName}</p>
                          </td>
                          <td className="px-6 py-5">
                            <span className="px-2 py-1 rounded-lg bg-hover text-[10px] font-black uppercase tracking-widest text-muted border border-border-default">
                              {item.lot || 'ND'}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right font-bold text-secondary text-sm">{item.uom}</td>
                          {hasSystemView && <td className="px-6 py-5 text-right font-black text-primary">{item.systemQty}</td>}
                          <td className="px-6 py-5">
                            <Input
                              ref={index === 0 ? firstItemQtyRef : null}
                              type="number" value={item.countedQty ?? ''}
                              onChange={(e) => handleItemChange(item.id, parseFloat(e.target.value) || 0)}
                              onKeyDown={(e) => handleQtyKeyDown(e, item.id)}
                              className="w-28 text-right ml-auto bg-card border-border-default h-12 rounded-xl font-black text-lg focus:ring-accent-primary/20"
                            />
                          </td>
                          {hasVarianceView && (
                            <td className={`px-6 py-5 text-right font-black ${variance < 0 ? 'text-success' : variance > 0 ? 'text-danger' : 'text-muted/30'}`}>
                              <div className="flex flex-col items-end">
                                <span className="text-base">{variance >= 0 ? '+' : ''}{variance.toFixed(1)}</span>
                                <span className="text-[10px] opacity-70 tracking-tighter">({percent.toFixed(1)}%)</span>
                              </div>
                            </td>
                          )}
                          <td className="px-6 py-5 text-center">
                            {syncingItemIds.has(item.id) ? (
                              <div className="w-5 h-5 border-2 border-accent-primary/20 border-t-accent-primary rounded-full animate-spin mx-auto"></div>
                            ) : syncedItemIds.has(item.id) ? (
                              <span className="text-success text-xl">✓</span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <ConfirmModal
            isOpen={actionConfirm.isOpen}
            onConfirm={actionConfirm.onConfirm}
            onCancel={() => setActionConfirm(prev => ({ ...prev, isOpen: false }))}
            title={actionConfirm.title}
            message={actionConfirm.message}
            isDangerous={actionConfirm.isDangerous}
          />

          <NotificationModal
            isOpen={notification.isOpen}
            onClose={() => setNotification({ ...notification, isOpen: false })}
            type={notification.type} title={notification.title} message={notification.message}
          />

          <ProcessingModal
            isOpen={processing.isOpen}
            message={processing.message}
            status={processing.status}
            onClose={processing.status !== 'processing' ? stopProcessing : undefined}
          />

        </div>
      </div>
    );
  }

  return null;
}
