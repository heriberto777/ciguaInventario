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

interface MappingItem {
  itemCode: string;
  itemName: string;
  packQty: number;
  uom: string;
  baseUom: string;
  systemQty: number;
  costPrice?: number;
  salePrice?: number;
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
            JSON.parse(value);
          } catch {
            keysToDelete.push(key);
          }
        }
      }
    }

    keysToDelete.forEach(key => {
      console.log(`Limpiando localStorage corrupto: ${key}`);
      localStorage.removeItem(key);
    });

    // Si el active_count_id apunta a algo que no existe, limpiar también
    const activeCountId = localStorage.getItem('active_count_id');
    if (activeCountId && !localStorage.getItem(STORAGE_KEY(activeCountId))) {
      localStorage.removeItem('active_count_id');
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

  // Modal de confirmación para eliminar
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [countIdToDelete, setCountIdToDelete] = useState<string | null>(null);

  // Refs para debounce
  const debounceTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const pendingUpdatesRef = useRef<{ [key: string]: number }>({});
  const isInitializedRef = useRef(false);

  // Recuperar datos guardados del localStorage al cargar
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    try {
      const savedCountId = localStorage.getItem('active_count_id');
      if (savedCountId) {
        // Primero, intentar recuperar del localStorage
        const savedCountData = localStorage.getItem(STORAGE_KEY(savedCountId));
        if (savedCountData) {
          try {
            const parsed = JSON.parse(savedCountData);
            console.log('Recuperando del localStorage:', {
              count: parsed.count,
              itemsCount: parsed.items?.length
            });
            setSelectedCount(parsed.count);
            setCountItems(parsed.items || []);
            setView('process');
          } catch (parseError) {
            console.error('Error parseando localStorage:', parseError);
            localStorage.removeItem(STORAGE_KEY(savedCountId));
          }
        } else {
          // Si no hay en localStorage, traer del servidor
          console.log('No hay en localStorage, trayendo del servidor...');
          fetchCountFromServer(savedCountId);
        }
      }
    } catch (error) {
      console.error('Error al recuperar datos:', error);
      localStorage.removeItem('active_count_id');
    }
  }, []);

  // Función para traer el conteo del servidor
  const fetchCountFromServer = async (countId: string) => {
    try {
      const response = await apiClient.get(`/inventory-counts/${countId}`);
      const count = response.data as InventoryCount;
      console.log('Conteo traído del servidor:', {
        id: count.id,
        itemsCount: count.countItems?.length
      });
      setSelectedCount(count);
      setCountItems(count.countItems || []);
      setView('process');
    } catch (error) {
      console.error('Error trayendo conteo del servidor:', error);
      localStorage.removeItem('active_count_id');
    }
  };

  // Guardar datos cuando cambian
  useEffect(() => {
    if (selectedCount && countItems.length > 0) {
      console.log('Guardando a localStorage:', {
        countId: selectedCount.id,
        itemsCount: countItems.length
      });
      localStorage.setItem('active_count_id', selectedCount.id);
      localStorage.setItem(STORAGE_KEY(selectedCount.id), JSON.stringify({
        count: selectedCount,
        items: countItems,
        lastSaved: new Date().toISOString(),
      }));
    }
  }, [selectedCount?.id, countItems]);

  // Load items cuando selectedCount cambia y countItems está vacío
  // (solo si NO es recuperación del localStorage)
  useEffect(() => {
    if (selectedCount && countItems.length === 0) {
      const stored = localStorage.getItem(STORAGE_KEY(selectedCount.id));
      if (!stored) {
        console.log('Cargando items desde selectedCount');
        setCountItems(selectedCount.countItems || []);
      }
    }
  }, [selectedCount?.id]);

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

  // Cargar mappings disponibles (ITEMS, STOCK, etc.)
  const { data: availableMappings = [], isLoading: mappingsLoading, error: mappingsError } = useQuery({
    queryKey: ['available-mappings'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/mapping-configs');
        console.log('📊 [availableMappings] Response:', response.data);

        // Retornar configuraciones únicas por datasetType
        const rawData = Array.isArray(response.data) ? response.data : response.data.data || [];
        console.log('📊 [availableMappings] Raw data:', rawData);

        const uniqueMappings = Array.from(
          new Map(
            rawData.map((m: any) => [m.datasetType, m])
          ).values()
        );

        console.log('📊 [availableMappings] Unique mappings:', uniqueMappings);
        return uniqueMappings;
      } catch (error: any) {
        console.error('❌ [availableMappings] Error:', error);
        return [];
      }
    },
  });

  const { data: mappingData = [] } = useQuery({
    queryKey: ['mapping-data', mappingId],
    queryFn: async () => {
      if (!mappingId) return [];
      try {
        // Usar endpoint POST /config/mapping/test para obtener preview de datos
        const response = await apiClient.post('/config/mapping/test', {
          mappingId: mappingId,
          limitRows: 1000,
        });
        console.log('📊 [mappingData] Response:', response.data);
        const result = response.data?.data || response.data;
        return Array.isArray(result) ? result : [result];
      } catch (error: any) {
        console.error('❌ [mappingData] Error:', error);
        return [];
      }
    },
    enabled: !!mappingId,
  });

  // Mutations
  const createCountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/inventory-counts', {
        warehouseId,
        locationId,
        description: `Conteo físico - ${new Date().toLocaleDateString()}`,
      });
      return response.data as InventoryCount;
    },
    onSuccess: async (count) => {
      console.log('✅ [createCountMutation] Count created:', count.id);

      // Si hay mapping seleccionado, cargar artículos desde el mapping
      if (mappingId) {
        try {
          console.log('📊 [createCountMutation] Loading items from mapping:', mappingId);
          const loadResponse = await apiClient.post(`/inventory-counts/${count.id}/load-from-mapping`, {
            warehouseId,
            mappingId,
            locationId: locationId || undefined,
          });
          console.log('✅ [createCountMutation] Items loaded from mapping:', loadResponse.data);

          // Actualizar count con los items cargados
          setSelectedCount(loadResponse.data);
          setCountItems(loadResponse.data.items || []);
        } catch (error: any) {
          console.error('❌ [createCountMutation] Error loading from mapping:', error);
          // Si falla la carga automática, al menos se creó el conteo
          setSelectedCount(count);
          setCountItems([]);
        }
      } else {
        // Si no hay mapping, solo mostrar el conteo vacío
        setSelectedCount(count);
        setCountItems([]);
      }

      setView('process');
      setWarehouseId('');
      setLocationId('');
      setMappingId('');
    },
  });

  const startCountMutation = useMutation({
    mutationFn: async (countId: string) => {
      const response = await apiClient.post(`/inventory-counts/${countId}/start`, {});
      return response.data.count as InventoryCount;
    },
    onSuccess: (count) => {
      setSelectedCount(count);
      setCountItems(count.countItems || []);
      setView('process');
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
      // Actualizar selectedCount con el estado COMPLETED
      setSelectedCount(count);
      setCountItems(count.countItems || []);
      // NO cambiar de vista - mantener en 'process' para ver botones nuevos
    },
  });

  const createVersionMutation = useMutation({
    mutationFn: async (countId: string) => {
      // 1. Crear nueva versión
      const createResponse = await apiClient.post(`/inventory-counts/${countId}/new-version`, {});
      localStorage.removeItem(STORAGE_KEY(countId));

      // 2. Obtener el conteo actualizado con items de la nueva versión
      const getResponse = await apiClient.get(`/inventory-counts/${countId}`);
      return getResponse.data as InventoryCount;
    },
    onSuccess: (count) => {
      setSelectedCount(count);
      setCountItems(count.countItems || []);
      setView('process');

      // Mostrar modal en lugar de alert
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
      const response = await apiClient.post(`/inventory-counts/${countId}/send-to-erp`, {});
      localStorage.removeItem(STORAGE_KEY(countId));
      localStorage.removeItem('active_count_id');
      return response.data;
    },
    onSuccess: () => {
      setSelectedCount(null);
      setCountItems([]);
      setView('list');
      showNotification('success', '✅ Éxito', 'Conteo enviado al ERP exitosamente');
    },
  });

  const loadFromMappingMutation = useMutation({
    mutationFn: async (countId: string) => {
      await apiClient.post(`/inventory-counts/${countId}/load-from-mapping`, {});
      const response = await apiClient.get(`/inventory-counts/${countId}`);
      return response.data as InventoryCount;
    },
    onSuccess: (count) => {
      setSelectedCount(count);
      setCountItems(count.countItems);
    },
  });

  const closeMutation = useMutation({
    mutationFn: async (countId: string) => {
      await apiClient.post(`/inventory-counts/${countId}/close`, {});
    },
    onSuccess: () => {
      setView('list');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (countId: string) => {
      await apiClient.delete(`/inventory-counts/${countId}`);
    },
    onSuccess: () => {
      // Refrescar lista y volver a la vista de lista
      refetchCounts();
      setSelectedCount(null);
      setCountItems([]);
      setView('list');
      setShowDeleteConfirm(false);
      setCountIdToDelete(null);
      showNotification('success', '✅ Eliminado', 'Conteo eliminado correctamente');
    },
    onError: (error: any) => {
      console.error('Error al eliminar conteo:', error);
      showNotification('error', '❌ Error', 'No se pudo eliminar el conteo. Intenta nuevamente.');
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
    },
  });

  // La sincronización de items ahora se maneja con debounce en handleItemChange
  // en lugar de usar una mutación tradicional

  // Función helper para mostrar notificaciones
  const showNotification = useCallback((
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string
  ) => {
    setNotification({
      isOpen: true,
      type,
      title,
      message,
    });
  }, []);

  // Handlers
  const handleItemChange = useCallback((itemId: string, countedQty: number) => {
    // Actualizar estado local inmediatamente (sin esperar sync)
    setCountItems((prev) => {
      const updated = prev.map((item) =>
        item.id === itemId ? { ...item, countedQty } : item
      );
      // Guardar cantidad pendiente en ref
      pendingUpdatesRef.current[itemId] = countedQty;
      return updated;
    });

    // Limpiar timeout anterior
    if (debounceTimeoutRef.current[itemId]) {
      clearTimeout(debounceTimeoutRef.current[itemId]);
    }

    // Configurar nuevo timeout (500ms después de que deje de escribir)
    debounceTimeoutRef.current[itemId] = setTimeout(async () => {
      const finalCountedQty = pendingUpdatesRef.current[itemId];
      setSyncingItemIds((prev) => new Set([...prev, itemId]));

      try {
        const response = await apiClient.patch(
          `/inventory-counts/${selectedCount?.id}/items/${itemId}`,
          { countedQty: finalCountedQty }
        );

        // Actualizar con la respuesta del servidor para asegurar consistencia
        if (response.data) {
          setCountItems((prev) =>
            prev.map((item) =>
              item.id === itemId ? { ...item, countedQty: response.data.countedQty } : item
            )
          );
        }

        setSyncedItemIds((prev) => new Set([...prev, itemId]));
        console.log(`Item ${itemId} sincronizado correctamente`);
      } catch (error) {
        console.error('Error syncing item:', error);
        // Revertar el cambio local si falla
        setCountItems((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, countedQty: undefined } : item
          )
        );
      } finally {
        setSyncingItemIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
        delete debounceTimeoutRef.current[itemId];
      }
    }, 500); // Esperar 500ms después de que deje de escribir
  }, [selectedCount?.id]);

  // Fetch fresh data when entering process view
  const handleProcessCount = useCallback(async (countId: string) => {
    try {
      const response = await apiClient.get(`/inventory-counts/${countId}`);
      const freshCount = response.data as InventoryCount;

      // Actualizar con datos frescos del servidor
      setSelectedCount(freshCount);
      setCountItems(freshCount.countItems || []);

      // Actualizar localStorage
      localStorage.setItem('active_count_id', freshCount.id);
      localStorage.setItem(STORAGE_KEY(freshCount.id), JSON.stringify({
        count: freshCount,
        items: freshCount.countItems,
        lastSaved: new Date().toISOString(),
      }));

      // Limpiar sincronización previa
      setSyncingItemIds(new Set());
      setSyncedItemIds(new Set());

      setView('process');
    } catch (error) {
      console.error('Error cargando conteo:', error);
      alert('Error al cargar el conteo');
    }
  }, []);

  const filteredItems = countItems.filter((item) => {
    const matchesSearch =
      item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.itemName.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterVarianceOnly) {
      const systemQty = typeof item.systemQty === 'string' ? parseFloat(item.systemQty) : item.systemQty;
      const counted = item.countedQty ?? 0;
      return matchesSearch && Math.round((counted - systemQty) * 10) / 10 !== 0;
    }

    return matchesSearch;
  });

  // Variance calculation
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

  const getVarianceColor = (item: CountItem) => {
    const { variance } = getVariance(item);
    if (variance < 0) return 'text-green-600';
    if (variance > 0) return 'text-red-600';
    return 'text-gray-400';
  };

  // LIST VIEW
  if (view === 'list') {
    return (
      <>
        <div className="w-full">
          <div className="border-b bg-white p-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Conteo Físico</h1>
            <Button onClick={() => setView('create')} variant="primary">
              + Nuevo Conteo
            </Button>
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
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          count.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
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
                        <div className="flex gap-1 justify-center flex-wrap">
                          {/* DRAFT STATE */}
                          {count.status === 'DRAFT' && (
                            <>
                              <Button
                                onClick={() => handleProcessCount(count.id)}
                                variant="primary"
                                size="sm"
                                title="Abrir para configurar y procesar"
                              >
                                📋 Procesar
                              </Button>
                              <Button
                                onClick={() => {
                                  setCountIdToDelete(count.id);
                                  setShowDeleteConfirm(true);
                                }}
                                variant="danger"
                                size="sm"
                                title="Eliminar este conteo"
                              >
                                🗑 Eliminar
                              </Button>
                            </>
                          )}

                          {/* ACTIVE STATE */}
                          {count.status === 'ACTIVE' && (
                            <>
                              <Button
                                onClick={() => handleProcessCount(count.id)}
                                variant="primary"
                                size="sm"
                                title="Abrir para registrar cantidades"
                              >
                                📝 Procesar
                              </Button>
                              <Button
                                onClick={() => completeCountMutation.mutate(count.id)}
                                variant="success"
                                size="sm"
                                title="Finalizar este conteo"
                              >
                                ✓ Finalizar
                              </Button>
                              <Button
                                onClick={() => pauseMutation.mutate(count.id)}
                                variant="secondary"
                                size="sm"
                                title="Pausar temporalmente"
                              >
                                ⏸ Pausar
                              </Button>
                              <Button
                                onClick={() => {
                                  setCountIdToDelete(count.id);
                                  setShowDeleteConfirm(true);
                                }}
                                variant="danger"
                                size="sm"
                                title="Eliminar este conteo"
                              >
                                🗑 Eliminar
                              </Button>
                            </>
                          )}

                          {/* ON_HOLD STATE */}
                          {count.status === 'ON_HOLD' && (
                            <>
                              <Button
                                onClick={() => handleProcessCount(count.id)}
                                variant="primary"
                                size="sm"
                                title="Reanudar y continuar registrando"
                              >
                                ▶ Continuar
                              </Button>
                              <Button
                                onClick={() => completeCountMutation.mutate(count.id)}
                                variant="success"
                                size="sm"
                                title="Finalizar este conteo"
                              >
                                ✓ Finalizar
                              </Button>
                            </>
                          )}

                          {/* COMPLETED STATE */}
                          {count.status === 'COMPLETED' && (
                            <>
                              <Button
                                onClick={() => createVersionMutation.mutate(count.id)}
                                variant="secondary"
                                size="sm"
                                title="Crear nueva versión para recontar"
                              >
                                🔄 Versión
                              </Button>
                              <Button
                                onClick={() => sendToERPMutation.mutate(count.id)}
                                variant="primary"
                                size="sm"
                                title="Enviar al ERP"
                              >
                                🚀 ERP
                              </Button>
                            </>
                          )}

                          {/* IN_PROGRESS STATE */}
                          {count.status === 'IN_PROGRESS' && (
                            <>
                              <Button
                                onClick={() => handleProcessCount(count.id)}
                                variant="primary"
                                size="sm"
                                title="Abrir para recontar V{n}"
                              >
                                📝 Recontar
                              </Button>
                              <Button
                                onClick={() => completeCountMutation.mutate(count.id)}
                                variant="success"
                                size="sm"
                                title="Finalizar esta versión"
                              >
                                ✓ Finalizar
                              </Button>
                            </>
                          )}

                          {/* CLOSED STATE */}
                          {count.status === 'CLOSED' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled
                              title="Conteo archivado"
                            >
                              🔒 Archivado
                            </Button>
                          )}

                          {/* CANCELLED STATE */}
                          {count.status === 'CANCELLED' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled
                              title="Conteo cancelado"
                            >
                              ❌ Cancelado
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
      </div>

      {/* Modal de Confirmación para Eliminar */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onConfirm={() => {
          if (countIdToDelete) {
            setShowDeleteConfirm(false);
            setCountIdToDelete(null);
            deleteMutation.mutate(countIdToDelete);
          }
        }}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setCountIdToDelete(null);
        }}
        title="⚠️ Eliminar Conteo"
        message="¿Estás seguro de que deseas eliminar este conteo? Se eliminarán todos sus items asociados y esta acción no se puede deshacer."
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        isDangerous={true}
        isLoading={deleteMutation.isPending}
      />
    </>
    );
  }

  // CREATE VIEW
  if (view === 'create') {
    const isFormValid = warehouseId && mappingId;

    return (
      <div className="w-full h-full flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="border rounded-lg p-8 max-w-md w-full bg-white shadow-lg">
          <h2 className="text-2xl font-bold mb-2">📝 Crear Nuevo Conteo</h2>
          <p className="text-sm text-gray-500 mb-6">Completa todos los campos requeridos</p>

          <div className="space-y-4">
            {/* Almacén */}
            <div>
              <Label htmlFor="warehouse" className="font-semibold">
                📦 Almacén <span className="text-red-500">*</span>
              </Label>
              <select
                id="warehouse"
                value={warehouseId}
                onChange={(e) => {
                  setWarehouseId(e.target.value);
                  setLocationId('');
                }}
                className={`w-full mt-2 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
                  warehouseId
                    ? 'border-green-300 focus:ring-green-500 bg-green-50'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
              >
                <option value="">Selecciona un almacén</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              {warehouseId && (
                <p className="text-xs text-green-600 mt-1">✓ Almacén seleccionado</p>
              )}
            </div>

            {/* Ubicación */}
            {warehouseId && (
              <div>
                <Label htmlFor="location">
                  📍 Ubicación <span className="text-gray-400">(opcional)</span>
                </Label>
                <select
                  id="location"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full mt-2 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas las ubicaciones</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.code}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Mapeo de Datos */}
            <div>
              <Label htmlFor="mapping" className="font-semibold">
                🔗 Mapeo de Datos <span className="text-red-500">*</span>
              </Label>

              {mappingsLoading && (
                <div className="w-full mt-2 p-3 bg-blue-50 text-blue-700 rounded-md text-sm border border-blue-200">
                  ⏳ Cargando mappings...
                </div>
              )}

              {mappingsError && (
                <div className="w-full mt-2 p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
                  ❌ Error cargando mappings
                  <p className="text-xs mt-1">Verifica que la conexión ERP esté configurada correctamente</p>
                </div>
              )}

              {!mappingsLoading && availableMappings.length === 0 && (
                <div className="w-full mt-2 p-3 bg-yellow-50 text-yellow-700 rounded-md text-sm border border-yellow-200">
                  ⚠️ No hay mappings disponibles
                  <p className="text-xs mt-1">Ve a Settings → Mappings para crear uno</p>
                </div>
              )}

              {!mappingsLoading && availableMappings.length > 0 && (
                <>
                  <select
                    id="mapping"
                    value={mappingId}
                    onChange={(e) => setMappingId(e.target.value)}
                    className={`w-full mt-2 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
                      mappingId
                        ? 'border-green-300 focus:ring-green-500 bg-green-50'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  >
                    <option value="">Selecciona un mapeo</option>
                    {availableMappings.map((mapping: any) => (
                      <option key={mapping.id} value={mapping.id}>
                        {mapping.datasetType}
                      </option>
                    ))}
                  </select>
                  {mappingId && (
                    <p className="text-xs text-green-600 mt-1">✓ Mapeo seleccionado</p>
                  )}
                </>
              )}
            </div>

            {/* Botones de Acción */}
            <div className="flex gap-2 pt-6 border-t">
              <Button
                onClick={() => createCountMutation.mutate()}
                disabled={!isFormValid || createCountMutation.isPending}
                variant="primary"
                className="flex-1"
              >
                {createCountMutation.isPending ? (
                  <>⏳ Creando...</>
                ) : (
                  <>✓ Crear Conteo</>
                )}
              </Button>
              <Button
                onClick={() => setView('list')}
                variant="secondary"
                className="flex-1"
              >
                ✕ Cancelar
              </Button>
            </div>

            {/* Ayuda */}
            {!isFormValid && (
              <div className="mt-4 p-3 bg-amber-50 text-amber-700 rounded-md text-xs border border-amber-200">
                📌 <strong>Pasos:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Selecciona un almacén</li>
                  <li>Selecciona un mapeo de datos</li>
                  <li>Haz click en "Crear Conteo"</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // PROCESS VIEW
  if (view === 'process' && selectedCount) {
    return (
      <div className="w-full h-full flex flex-col bg-gray-50">
        {/* Title and Status Bar */}
        <div className="flex-shrink-0 border-b bg-white px-6 py-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">{selectedCount.sequenceNumber}</h1>
              <p className="text-sm text-gray-500">{selectedCount.code}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              selectedCount.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
              selectedCount.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
              selectedCount.status === 'IN_PROGRESS' ? 'bg-purple-100 text-purple-700' :
              selectedCount.status === 'CLOSED' ? 'bg-gray-100 text-gray-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {selectedCount.status}
            </span>
          </div>

          {/* Estado informativo */}
          <div className="mt-3 p-3 rounded-md text-sm">
            {selectedCount.status === 'DRAFT' && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700">
                📄 <strong>Conteo recién creado</strong>
                <p>Carga items desde el ERP y luego haz click en "✓ Iniciar Conteo" para comenzar</p>
              </div>
            )}
            {selectedCount.status === 'ACTIVE' && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700">
                📝 <strong>Registrando items</strong>
                <p>Completa las cantidades en la tabla y haz click en "✓ Finalizar" cuando termines</p>
              </div>
            )}
            {selectedCount.status === 'ON_HOLD' && (
              <div className="bg-orange-50 border border-orange-200 text-orange-700">
                ⏸ <strong>Conteo pausado</strong>
                <p>Haz click en "▶ Reanudar" para continuar o "✓ Finalizar" para terminar</p>
              </div>
            )}
            {selectedCount.status === 'IN_PROGRESS' && (
              <div className="bg-purple-50 border border-purple-200 text-purple-700">
                🔄 <strong>Versión {selectedCount.currentVersion} de {selectedCount.totalVersions}</strong>
                <p>Recontar {countItems.length} items con varianza</p>
              </div>
            )}
            {selectedCount.status === 'COMPLETED' && (
              <div className="bg-green-50 border border-green-200 text-green-700">
                ✅ <strong>Conteo completado</strong>
                <p>Crea una nueva versión si hay varianza o envía al ERP para finalizar</p>
              </div>
            )}
            {selectedCount.status === 'CLOSED' && (
              <div className="bg-gray-50 border border-gray-200 text-gray-700">
                🔒 <strong>Conteo archivado</strong>
                <p>Enviado al ERP. Solo puedes visualizar los datos</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 border-b bg-white px-6 py-4">
          <div className="flex gap-2 flex-wrap">
            {selectedCount.status === 'DRAFT' && (
              <>
                <Button
                  onClick={() => startCountMutation.mutate(selectedCount.id)}
                  variant="primary"
                  disabled={startCountMutation.isPending}
                >
                  ✓ Iniciar Conteo
                </Button>
                <Button
                  onClick={() => cancelCountMutation.mutate(selectedCount.id)}
                  variant="danger"
                  disabled={cancelCountMutation.isPending}
                >
                  ✕ Cancelar
                </Button>
              </>
            )}

            {selectedCount.status === 'ACTIVE' && (
              <>
                <Button
                  onClick={() => completeCountMutation.mutate(selectedCount.id)}
                  variant="primary"
                  disabled={completeCountMutation.isPending || countItems.length === 0}
                  title={countItems.length === 0 ? "No hay items para finalizar" : "Finalizar conteo"}
                >
                  ✓ Finalizar
                </Button>
                <Button
                  onClick={() => pauseMutation.mutate(selectedCount.id)}
                  variant="secondary"
                  disabled={pauseMutation.isPending}
                  title="Pausar temporalmente (puedes reanudar después)"
                >
                  ⏸ Pausar
                </Button>
                <Button
                  onClick={() => cancelCountMutation.mutate(selectedCount.id)}
                  variant="danger"
                  disabled={cancelCountMutation.isPending}
                  title="Cancelar definitivamente (no se puede recuperar)"
                >
                  ✕ Cancelar
                </Button>
              </>
            )}

            {selectedCount.status === 'ON_HOLD' && (
              <>
                <Button
                  onClick={() => resumeMutation.mutate(selectedCount.id)}
                  variant="secondary"
                  disabled={resumeMutation.isPending}
                  title="Reanudar conteo desde donde pausó"
                >
                  ▶ Reanudar
                </Button>
                <Button
                  onClick={() => completeCountMutation.mutate(selectedCount.id)}
                  variant="primary"
                  disabled={completeCountMutation.isPending}
                  title="Finalizar conteo sin más cambios"
                >
                  ✓ Finalizar
                </Button>
                <Button
                  onClick={() => cancelCountMutation.mutate(selectedCount.id)}
                  variant="danger"
                  disabled={cancelCountMutation.isPending}
                  title="Cancelar definitivamente"
                >
                  ✕ Cancelar
                </Button>
              </>
            )}

            {selectedCount.status === 'IN_PROGRESS' && (
              <>
                <Button
                  onClick={() => completeCountMutation.mutate(selectedCount.id)}
                  variant="primary"
                  disabled={completeCountMutation.isPending || countItems.length === 0}
                  title={countItems.length === 0 ? "No hay items para finalizar" : `Finalizar versión ${selectedCount.currentVersion}`}
                >
                  ✓ Finalizar V{selectedCount.currentVersion}
                </Button>
                <Button
                  onClick={() => pauseMutation.mutate(selectedCount.id)}
                  variant="secondary"
                  disabled={pauseMutation.isPending}
                  title="Pausar recontar"
                >
                  ⏸ Pausar
                </Button>
                <Button
                  onClick={() => cancelCountMutation.mutate(selectedCount.id)}
                  variant="danger"
                  disabled={cancelCountMutation.isPending}
                  title="Cancelar definitivamente"
                >
                  ✕ Cancelar
                </Button>
              </>
            )}

            {selectedCount.status === 'COMPLETED' && (
              <>
                <Button
                  onClick={() => createVersionMutation.mutate(selectedCount.id)}
                  variant="secondary"
                  disabled={createVersionMutation.isPending}
                  title="Crear nueva versión para recontar items con varianza"
                >
                  🔄 Crear Versión
                </Button>
                <Button
                  onClick={() => sendToERPMutation.mutate(selectedCount.id)}
                  variant="primary"
                  disabled={sendToERPMutation.isPending}
                  title="Enviar datos del conteo al ERP"
                >
                  🚀 Enviar a ERP
                </Button>
                <Button
                  onClick={() => cancelCountMutation.mutate(selectedCount.id)}
                  variant="danger"
                  disabled={cancelCountMutation.isPending}
                  title="Cancelar conteo"
                >
                  ✕ Cancelar
                </Button>
              </>
            )}

            <Button
              onClick={() => {
                if (selectedCount) {
                  localStorage.removeItem(STORAGE_KEY(selectedCount.id));
                  localStorage.removeItem('active_count_id');
                }
                setSelectedCount(null);
                setCountItems([]);
                setView('list');
              }}
              variant="secondary"
              title="Volver a la lista"
            >
              ← Volver a la lista
            </Button>
          </div>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto">
          {/* HEADER - Stats and Filters */}
          <div className="bg-white border-b">
            <div className="p-6">
              {/* Stats Row */}
              <div className="flex gap-4 mb-6">
                {/* Varianzas Card */}
                <div className="flex-1 bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">Varianzas</p>
                  <p className="text-4xl font-bold text-yellow-600 mt-2">
                    {filteredItems.filter((i) => getVariance(i).variance !== 0).length}
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">Items con diferencia</p>
                </div>

                {/* Bajo Card */}
                <div className="flex-1 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Bajo</p>
                  <p className="text-4xl font-bold text-green-600 mt-2">
                    {filteredItems.filter((i) => getVariance(i).variance < 0).length}
                  </p>
                  <p className="text-xs text-green-600 mt-1">Cantidad insuficiente</p>
                </div>

                {/* Sobre Card */}
                <div className="flex-1 bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Sobre</p>
                  <p className="text-4xl font-bold text-red-600 mt-2">
                    {filteredItems.filter((i) => getVariance(i).variance > 0).length}
                  </p>
                  <p className="text-xs text-red-600 mt-1">Cantidad excesiva</p>
                </div>
              </div>

              {/* Search and Filter */}
              <div className="pt-4 border-t space-y-3">
                <Input
                  placeholder="🔍 Buscar por código o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterVarianceOnly}
                    onChange={(e) => setFilterVarianceOnly(e.target.checked)}
                    className="rounded w-4 h-4"
                  />
                  <span className="text-sm font-medium">Solo items con varianza</span>
                </label>
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-gray-50 p-4">
            {filteredItems.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border">
                <p className="text-gray-500">
                  No hay items para mostrar
                  {countItems.length > 0 && ` (${countItems.length} items en estado local)`}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border overflow-hidden">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Código</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Descripción</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">UOM</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Sistema</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Conteo</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Varianza</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      const { variance, percent } = getVariance(item);
                      const isVariance = variance !== 0;

                      return (
                        <tr
                          key={item.id}
                          className={`border-b hover:bg-gray-50 transition-colors ${isVariance ? 'bg-yellow-50' : ''}`}
                        >
                          <td className="px-4 py-3 font-mono text-sm text-gray-900 font-medium">
                            {item.itemCode}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{item.itemName}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">{item.uom}</td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                            {(typeof item.systemQty === 'string' ? parseFloat(item.systemQty) : item.systemQty).toFixed(1)}
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              value={item.countedQty ?? ''}
                              onChange={(e) =>
                                handleItemChange(item.id, e.target.value ? parseFloat(e.target.value) : 0)
                              }
                              placeholder="0"
                              className="w-28 text-right text-sm"
                            />
                          </td>
                          <td className={`px-4 py-3 text-right text-sm font-semibold ${
                            variance < 0 ? 'text-green-600' : variance > 0 ? 'text-red-600' : 'text-gray-400'
                          }`}>
                            {variance >= 0 ? '+' : ''}{variance.toFixed(1)} <br />
                            <span className="text-xs text-gray-500">({percent.toFixed(1)}%)</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.countedQty !== undefined && (
                              <div className="flex items-center justify-center">
                                {syncingItemIds.has(item.id) ? (
                                  <span className="text-blue-600 font-semibold text-xs">⟳ Guardando...</span>
                                ) : syncedItemIds.has(item.id) ? (
                                  <span className="text-green-600 font-semibold text-xs">✓ Guardado</span>
                                ) : (
                                  <span className="text-gray-400 text-xs">•</span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* FOOTER - Summary Stats */}
          {filteredItems.length > 0 && (
            <div className="bg-white border-t">
              <div className="px-6 py-4">
                <div className="flex gap-6 items-center">
                  {/* Total Items */}
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Total Items</p>
                    <p className="text-3xl font-bold text-gray-900">{filteredItems.length}</p>
                  </div>

                  {/* Contados */}
                  <div className="flex-1 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Contados</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {filteredItems.filter((i) => i.countedQty !== undefined).length}
                    </p>
                  </div>

                  {/* Con Varianza */}
                  <div className="flex-1 bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-2">Con Varianza</p>
                    <p className="text-3xl font-bold text-yellow-600">
                      {filteredItems.filter((i) => getVariance(i).variance !== 0).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal para Nueva Versión */}
        {newVersionData && (
          <NewVersionModal
            isOpen={showNewVersionModal}
            onClose={() => {
              setShowNewVersionModal(false);
              setNewVersionData(null);
            }}
            versionNumber={newVersionData.versionNumber}
            itemsCount={newVersionData.itemsCount}
            previousVersion={newVersionData.previousVersion}
          />
        )}

        {/* Modal de Notificación Simple */}
        <NotificationModal
          isOpen={notification.isOpen}
          onClose={() => setNotification({ ...notification, isOpen: false })}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          autoClose={3000}
        />

        {/* Modal de Confirmación para Eliminar */}
        <ConfirmModal
          isOpen={showDeleteConfirm}
          onConfirm={() => {
            if (countIdToDelete) {
              setShowDeleteConfirm(false);
              setCountIdToDelete(null);
              deleteMutation.mutate(countIdToDelete);
            }
          }}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setCountIdToDelete(null);
          }}
          title="⚠️ Eliminar Conteo"
          message="¿Estás seguro de que deseas eliminar este conteo? Se eliminarán todos sus items asociados y esta acción no se puede deshacer."
          confirmText="Sí, Eliminar"
          cancelText="Cancelar"
          isDangerous={true}
          isLoading={deleteMutation.isPending}
        />
      </div>
    );
  }

  return null;
}
