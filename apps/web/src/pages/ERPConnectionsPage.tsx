import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/templates/AdminLayout';
import { ERPConnectionForm } from '@/components/organisms/ERPConnectionForm';
import { ERPConnectionsTable } from '@/components/organisms/ERPConnectionsTable';
import { Button } from '@/components/atoms/Button';
import { ConfirmModal } from '@/components/atoms/ConfirmModal';
import { NotificationModal } from '@/components/atoms/NotificationModal';
import { ProcessingModal } from '@/components/atoms/ProcessingModal';
import { getApiClient } from '@/services/api';

interface ERPConnection {
  id: string;
  companyId: string;
  erpType: string;
  host: string;
  port: number;
  database: string;
  username: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ERPConnectionsResponse {
  data: ERPConnection[];
  pagination: {
    skip: number;
    take: number;
    total: number;
  };
}

const ITEMS_PER_PAGE = 10;

export const ERPConnectionsContent: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ERPConnection | null>(null);
  const [erpTypeFilter, setErpTypeFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

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

  // Fetch ERP connections
  const { data: connectionsData, isLoading: connectionsLoading } =
    useQuery<ERPConnectionsResponse>({
      queryKey: ['erp-connections', currentPage, erpTypeFilter],
      queryFn: async () => {
        const params = new URLSearchParams({
          skip: (currentPage * ITEMS_PER_PAGE).toString(),
          take: ITEMS_PER_PAGE.toString(),
          ...(erpTypeFilter && { erpType: erpTypeFilter }),
        });
        const response = await getApiClient().get(`/erp-connections?${params}`);
        return response.data;
      },
    });

  // Create connection mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      erpType: string;
      host: string;
      port: number;
      database: string;
      username: string;
      password: string;
    }) => {
      showProcessing('Creando conexión ERP...');
      const response = await getApiClient().post('/erp-connections', data);
      return response.data;
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['erp-connections'] });
      setShowForm(false);
      successProcessing('Conexión creada con éxito.');
      setTimeout(stopProcessing, 1500);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error creating connection';
      errorProcessing(message);
    },
  });

  // Update connection mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        host?: string;
        port?: number;
        database?: string;
        username?: string;
        password?: string;
      };
    }) => {
      const response = await getApiClient().patch(`/erp-connections/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['erp-connections'] });
      setEditingConnection(null);
      setShowForm(false);
      successProcessing('Conexión actualizada.');
      setTimeout(stopProcessing, 1500);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error updating connection';
      errorProcessing(message);
    },
  });

  // Delete connection mutation
  const deleteMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      showProcessing('Eliminando conexión ERP...');
      await getApiClient().delete(`/erp-connections/${connectionId}`);
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['erp-connections'] });
      successProcessing('Conexión eliminada.');
      setTimeout(stopProcessing, 1500);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error deleting connection';
      errorProcessing(message);
    },
  });

  // Toggle connection mutation
  const toggleMutation = useMutation({
    mutationFn: async ({
      id,
      isActive,
    }: {
      id: string;
      isActive: boolean;
    }) => {
      showProcessing(isActive ? 'Activando conexión...' : 'Desactivando conexión...');
      const response = await getApiClient().post(`/erp-connections/${id}/toggle`, {
        isActive,
      });
      return response.data;
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['erp-connections'] });
      successProcessing('Estado actualizado.');
      setTimeout(stopProcessing, 1500);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error toggling connection';
      errorProcessing(message);
    },
  });

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: async (data: {
      erpType: string;
      host: string;
      port: number;
      database: string;
      username: string;
      password: string;
    }) => {
      const response = await getApiClient().post('/erp-connections/test', data);
      return response.data;
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error testing connection';
      setError(message);
    },
  });

  const handleCreate = async (data: {
    erpType: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  }) => {
    await createMutation.mutateAsync(data);
  };

  const handleUpdate = async (data: {
    erpType: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  }) => {
    if (!editingConnection) return;
    await updateMutation.mutateAsync({
      id: editingConnection.id,
      data: {
        host: data.host !== editingConnection.host ? data.host : undefined,
        port: data.port !== editingConnection.port ? data.port : undefined,
        database:
          data.database !== editingConnection.database ? data.database : undefined,
        username:
          data.username !== editingConnection.username ? data.username : undefined,
        password: data.password ? data.password : undefined,
      },
    });
  };

  const handleDelete = async (connectionId: string) => {
    handleActionWithConfirm(
      '⚠️ Eliminar Conexión',
      '¿Estás seguro de que deseas eliminar esta conexión ERP? Todas las configuraciones de mapeo que la usen dejarán de funcionar.',
      () => deleteMutation.mutate(connectionId),
      true
    );
  };

  const handleTestConnection = async (data: {
    erpType: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  }): Promise<boolean> => {
    try {
      await testMutation.mutateAsync(data);
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleToggle = async (connectionId: string, isActive: boolean) => {
    await toggleMutation.mutateAsync({ id: connectionId, isActive });
  };

  const totalPages = connectionsData
    ? Math.ceil(connectionsData.pagination.total / ITEMS_PER_PAGE)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-[var(--text-primary)]">ERP Connections</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Manage connections to your ERP systems
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingConnection(null);
            setShowForm(!showForm);
            setError(null);
          }}
          disabled={showForm}
        >
          {showForm ? 'Cancel' : 'Add Connection'}
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 text-danger">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold uppercase tracking-widest text-[10px]">Error de Conexión</h3>
              <p className="text-sm mt-1 opacity-90">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-danger hover:opacity-100 opacity-60 text-xl leading-none"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-card rounded-2xl border border-border-default shadow-xl p-8 mb-8 animate-in slide-in-from-top-4 duration-500">
          <h2 className="text-2xl font-black text-primary mb-6 tracking-tight">
            {editingConnection
              ? '📝 Editar Conexión ERP'
              : '🔌 Nueva Conexión ERP'}
          </h2>
          <ERPConnectionForm
            onSubmit={editingConnection ? handleUpdate : handleCreate}
            onTestConnection={handleTestConnection}
            isLoading={
              createMutation.isPending || updateMutation.isPending
            }
            initialData={
              editingConnection
                ? {
                  erpType: editingConnection.erpType as 'MSSQL' | 'SAP' | 'ORACLE',
                  host: editingConnection.host,
                  port: editingConnection.port,
                  database: editingConnection.database,
                  username: editingConnection.username,
                  password: '',
                }
                : undefined
            }
            isEditing={!!editingConnection}
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-card rounded-2xl border border-border-default shadow-sm p-6 mb-8">
        <label className="block text-[10px] font-black text-muted mb-3 uppercase tracking-[0.2em]">
          Filtrar por Tipo de ERP
        </label>
        <div className="relative max-w-xs">
          <select
            value={erpTypeFilter}
            onChange={(e) => {
              setErpTypeFilter(e.target.value);
              setCurrentPage(0);
            }}
            className="w-full px-5 py-3 border border-border-default bg-hover/30 text-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-primary/20 transition-all font-bold appearance-none"
          >
            <option value="">Todos los tipos</option>
            <option value="MSSQL">Microsoft SQL Server</option>
            <option value="SAP">SAP</option>
            <option value="ORACLE">Oracle Database</option>
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">▼</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] shadow-sm overflow-hidden">
        <ERPConnectionsTable
          connections={connectionsData?.data || []}
          isLoading={connectionsLoading}
          onEdit={(connection) => {
            setEditingConnection(connection);
            setShowForm(true);
          }}
          onDelete={handleDelete}
          onToggle={handleToggle}
          isDeletingId={deleteMutation.isPending ? deleteMutation.variables : null}
          isTogglingId={toggleMutation.isPending ? toggleMutation.variables?.id : null}
        />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
          >
            Previous
          </Button>
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`w-10 h-10 rounded-xl font-black transition-all ${currentPage === i
                  ? 'bg-accent-primary text-white shadow-lg shadow-accent-primary/20'
                  : 'bg-hover text-muted hover:text-primary'
                  }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <Button
            variant="secondary"
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1}
          >
            Next
          </Button>
        </div>
      )}

      {/* Status messages */}
      {deleteMutation.isError && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-6 py-4 rounded-2xl font-bold text-sm mt-4">
          ⚠️ Error al eliminar la conexión. Es posible que esté en uso por configuraciones de mapeo activas.
        </div>
      )}
      {createMutation.isError && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-6 py-4 rounded-2xl font-bold text-sm mt-4">
          ⚠️ Error al crear la conexión. Por favor verifica las credenciales y el host.
        </div>
      )}

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
    </div>
  );
};

export const ERPConnectionsPage: React.FC = () => {
  return (
    <AdminLayout>
      <ERPConnectionsContent />
    </AdminLayout>
  );
};
