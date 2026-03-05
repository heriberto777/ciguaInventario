import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AdminLayout } from '@/components/templates/AdminLayout';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { ConfirmModal } from '@/components/atoms/ConfirmModal';
import { NotificationModal } from '@/components/atoms/NotificationModal';
import { ProcessingModal } from '@/components/atoms/ProcessingModal';
import { getApiClient } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';

const WarehousesPage: React.FC = () => {
  const apiClient = getApiClient();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('warehouses:manage');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedWarehouseForLocations, setSelectedWarehouseForLocations] = useState<string | null>(null);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [locationFormData, setLocationFormData] = useState({
    code: '',
    description: '',
    capacity: '',
  });
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    city: '',
    manager: '',
  });

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

  // Modal de confirmación genérico
  const [confirmState, setConfirmState] = useState<{
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
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      },
      isDangerous,
    });
  };

  // Modal de notificación
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

  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setNotification({ isOpen: true, type, title, message });
  };

  // Fetch warehouses
  const { data: warehouses, refetch } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res = await apiClient.get('/warehouses');
      return Array.isArray(res.data) ? res.data : res.data.data || [];
    },
  });

  // Fetch locations for selected warehouse
  const { data: locations, refetch: refetchLocations } = useQuery({
    queryKey: ['warehouse-locations', selectedWarehouseForLocations],
    queryFn: async () => {
      if (!selectedWarehouseForLocations) return [];
      const res = await apiClient.get(`/warehouses/${selectedWarehouseForLocations}/locations`);
      return Array.isArray(res.data) ? res.data : res.data.data || [];
    },
    enabled: !!selectedWarehouseForLocations,
  });

  // Create warehouse mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      showProcessing(editingId ? 'Actualizando almacén...' : 'Creando almacén...');
      if (editingId) {
        const res = await apiClient.patch(`/warehouses/${editingId}`, data);
        return res.data.data || res.data;
      } else {
        const res = await apiClient.post('/warehouses', data);
        return res.data.data || res.data;
      }
    },
    onSuccess: () => {
      setError(null);
      refetch();
      setFormData({ code: '', name: '', address: '', city: '', manager: '' });
      setShowForm(false);
      setEditingId(null);
      successProcessing('Operación completada correctamente.');
      setTimeout(stopProcessing, 1500);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error guardando almacén';
      errorProcessing(message);
    },
  });

  // Delete warehouse mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      showProcessing('Eliminando almacén...');
      const res = await apiClient.delete(`/warehouses/${id}`);
      return res.data;
    },
    onSuccess: () => {
      setError(null);
      refetch();
      successProcessing('Almacén eliminado.');
      setTimeout(stopProcessing, 1500);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error eliminando almacén';
      errorProcessing(message);
    },
  });

  // Create location mutation
  const createLocationMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!selectedWarehouseForLocations) throw new Error('No warehouse selected');
      const res = await apiClient.post(`/warehouses/${selectedWarehouseForLocations}/locations`, data);
      return res.data.data || res.data;
    },
    onSuccess: () => {
      setError(null);
      refetchLocations();
      setLocationFormData({ code: '', description: '', capacity: '' });
      setShowLocationForm(false);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error creando ubicación';
      setError(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validación básica
    if (!formData.code || !formData.name) {
      setError('Código y nombre son requeridos');
      return;
    }
    setError(null);
    createMutation.mutate(formData);
  };

  const handleEdit = (warehouse: any) => {
    setEditingId(warehouse.id);
    setFormData({
      code: warehouse.code,
      name: warehouse.name,
      address: warehouse.address || '',
      city: warehouse.city || '',
      manager: warehouse.manager || '',
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    handleActionWithConfirm(
      '⚠️ Eliminar Almacén',
      '¿Estás seguro de que deseas eliminar este almacén? Esta acción no se puede deshacer.',
      () => deleteMutation.mutate(id),
      true
    );
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ code: '', name: '', address: '', city: '', manager: '' });
  };

  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationFormData.code) {
      setError('El código de ubicación es requerido');
      return;
    }
    setError(null);
    createLocationMutation.mutate({
      code: locationFormData.code,
      description: locationFormData.description || undefined,
      capacity: locationFormData.capacity ? parseInt(locationFormData.capacity) : undefined,
    });
  };

  const handleLocationCancel = () => {
    setShowLocationForm(false);
    setLocationFormData({ code: '', description: '', capacity: '' });
  };

  return (
    <AdminLayout title="Almacenes">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          {canManage && (
            <Button onClick={() => {
              setEditingId(null);
              setFormData({ code: '', name: '', address: '', city: '', manager: '' });
              setShowForm(!showForm);
              setError(null);
            }}>
              {showForm ? 'Cancelar' : 'Nuevo Almacén'}
            </Button>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-500 mb-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">Error</h3>
                <p className="text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {showForm && (
          <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-default)] shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)]">{editingId ? 'Editar Almacén' : 'Crear Nuevo Almacén'}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <Input
                label="Código"
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                required
              />
              <Input
                label="Nombre"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Input
                label="Dirección"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
              />
              <Input
                label="Ciudad"
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
              />
              <Input
                label="Encargado"
                value={formData.manager}
                onChange={e => setFormData({ ...formData, manager: e.target.value })}
                className="col-span-2"
              />
              <Button
                type="submit"
                variant="success"
                isLoading={createMutation.isPending}
                className="col-span-1"
              >
                {editingId ? 'Actualizar Almacén' : 'Crear Almacén'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancel}
                className="col-span-1"
              >
                Cancelar
              </Button>
            </form>
          </div>
        )}

        {/* Warehouses Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Warehouses List */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold mb-4 text-[var(--text-primary)]">Almacenes</h2>
            <div className="space-y-3">
              {warehouses?.map((warehouse: any) => (
                <div
                  key={warehouse.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedWarehouseForLocations === warehouse.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-[var(--border-default)] bg-[var(--bg-card)] hover:border-blue-500/30'
                    }`}
                  onClick={() => setSelectedWarehouseForLocations(warehouse.id)}
                >
                  <h3 className="font-semibold text-[var(--text-primary)]">{warehouse.name}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{warehouse.code}</p>
                  {warehouse.city && (
                    <p className="text-sm text-[var(--text-muted)]">{warehouse.city}</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    {canManage && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(warehouse);
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(warehouse.id);
                          }}
                          isLoading={deleteMutation.isPending && deleteMutation.variables === warehouse.id}
                        >
                          Eliminar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Locations List and Form */}
          {selectedWarehouseForLocations && (
            <div className="lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Ubicaciones del Almacén</h2>
                {canManage && (
                  <Button
                    size="sm"
                    onClick={() => setShowLocationForm(!showLocationForm)}
                  >
                    {showLocationForm ? 'Cancelar' : 'Nueva Ubicación'}
                  </Button>
                )}
              </div>

              {showLocationForm && (
                <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-default)] shadow p-4 mb-4">
                  <h3 className="font-semibold mb-4 text-[var(--text-primary)]">Crear Nueva Ubicación</h3>
                  <form onSubmit={handleLocationSubmit} className="space-y-3">
                    <Input
                      label="Código de Ubicación (ej: A-01-01)"
                      value={locationFormData.code}
                      onChange={e => setLocationFormData({ ...locationFormData, code: e.target.value })}
                      required
                    />
                    <Input
                      label="Descripción"
                      value={locationFormData.description}
                      onChange={e => setLocationFormData({ ...locationFormData, description: e.target.value })}
                    />
                    <Input
                      label="Capacidad"
                      type="number"
                      value={locationFormData.capacity}
                      onChange={e => setLocationFormData({ ...locationFormData, capacity: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        variant="success"
                        isLoading={createLocationMutation.isPending}
                      >
                        Crear Ubicación
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleLocationCancel}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-2">
                {locations && locations.length > 0 ? (
                  locations.map((location: any) => (
                    <div key={location.id} className="bg-[var(--bg-card)] rounded-lg shadow-sm p-3 border-l-4 border-blue-500 border border-[var(--border-default)]">
                      <h4 className="font-semibold text-[var(--text-primary)]">{location.code}</h4>
                      {location.description && (
                        <p className="text-sm text-[var(--text-secondary)]">{location.description}</p>
                      )}
                      {location.capacity && (
                        <p className="text-sm text-[var(--text-muted)]">Capacidad: {location.capacity}</p>
                      )}
                      <div className="text-xs text-[var(--text-muted)] mt-1">
                        {location.isActive ? '✅ Activa' : '❌ Inactiva'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-[var(--bg-hover)] rounded-lg p-4 text-center text-[var(--text-muted)]">
                    <p>No hay ubicaciones. Crea la primera ubicación.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmState.isOpen}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        title={confirmState.title}
        message={confirmState.message}
        isDangerous={confirmState.isDangerous}
      />

      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />

      <ProcessingModal
        isOpen={processing.isOpen}
        message={processing.message}
        status={processing.status}
        onClose={processing.status !== 'processing' ? stopProcessing : undefined}
      />
    </AdminLayout>
  );
};

export default WarehousesPage;
