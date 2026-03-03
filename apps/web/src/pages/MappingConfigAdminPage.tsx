import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getApiClient } from '@/services/api';
import { SimpleMappingBuilder } from '@/components/SimpleMappingBuilder';
import { Button } from '@/components/atoms/Button';
import { ConfirmModal } from '@/components/atoms/ConfirmModal';
import { NotificationModal } from '@/components/atoms/NotificationModal';
import { ProcessingModal } from '@/components/atoms/ProcessingModal';

// MappingConfig ahora viene de SimpleMappingBuilder
// Ver: src/components/SimpleMappingBuilder/index.tsx
type MappingConfig = any;

export const MappingConfigAdminPage: React.FC = () => {
  const apiClient = getApiClient();
  const [step, setStep] = useState<'list' | 'create' | 'edit' | 'select_type'>('list');
  const [selectedConfig, setSelectedConfig] = useState<MappingConfig | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  // Fetch connections
  const { data: connections } = useQuery({
    queryKey: ['erp-connections'],
    queryFn: async () => {
      const res = await apiClient.get('/erp-connections');
      return Array.isArray(res.data) ? res.data : res.data.data || [];
    },
  });

  // Fetch mappings
  const { data: configs, isLoading, refetch } = useQuery({
    queryKey: ['mappings'],
    queryFn: async () => {
      const res = await apiClient.get('/mapping-configs');
      const rawData = Array.isArray(res.data) ? res.data : res.data.data || [];
      // Normalizar erpConnectionId → connectionId
      return rawData.map((config: any) => ({
        ...config,
        connectionId: config.erpConnectionId || config.connectionId,
      }));
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: MappingConfig) => {
      console.log('💾 [saveMutation] Starting save with data:', data);
      showProcessing(data.id ? 'Actualizando mapping...' : 'Creando mapping...');

      // Validación básica
      if (!data.connectionId) {
        throw new Error('Debe seleccionar una conexión al ERP');
      }
      if (!data.datasetType) {
        throw new Error('Debe especificar un tipo de dataset');
      }
      if (!data.fieldMappings || data.fieldMappings.length === 0) {
        throw new Error('Debe agregar al menos un mapeo de campo');
      }
      // SimpleMappingBuilder envía mainTable como string, no como objeto
      if (!data.mainTable && !data.customQuery) {
        throw new Error('Debe seleccionar una tabla principal o proporcionar una query personalizada');
      }

      console.log('✅ [saveMutation] Validation passed, proceeding to API');

      // El backend acepta tanto connectionId como erpConnectionId
      // Enviar como está sin mapeos adicionales
      const dataToSend = {
        ...data,
        // Cambiar connectionId a erpConnectionId para consistencia con la BD
        erpConnectionId: data.connectionId || (data as any).erpConnectionId,
      };
      delete dataToSend.connectionId;

      if (data.id) {
        console.log('🔄 [saveMutation] Updating existing mapping:', data.id);
        const res = await apiClient.patch(`/mapping-configs/${data.id}`, dataToSend);
        console.log('✅ [saveMutation] Update successful:', res.data);
        return res.data.data;
      } else {
        console.log('✨ [saveMutation] Creating new mapping');
        const res = await apiClient.post('/mapping-configs', dataToSend);
        console.log('✅ [saveMutation] Create successful:', res.data);
        return res.data.data;
      }
    },
    onSuccess: (data) => {
      console.log('🎉 [saveMutation] onSuccess - Data saved:', data);
      setSaveError(null);
      refetch();
      setStep('list');
      setSelectedConfig(null);
      successProcessing('Mapping guardado correctamente.');
      setTimeout(stopProcessing, 1500);
    },
    onError: (error: any) => {
      console.error('❌ [saveMutation] onError - Error:', error);
      const message = error?.response?.data?.error?.message || error.message || 'Error al guardar el mapping';
      console.error('❌ [saveMutation] Error message:', message);
      setSaveError(message);
      errorProcessing(message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      showProcessing('Eliminando mapping...');
      await apiClient.delete(`/mapping-configs/${id}`);
    },
    onSuccess: () => {
      refetch();
      successProcessing('Mapping eliminado.');
      setTimeout(stopProcessing, 1500);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error al eliminar el mapping';
      errorProcessing(message);
    },
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const config = configs?.find((c: any) => c.id === id);
      showProcessing(!config?.isActive ? 'Activando mapping...' : 'Desactivando mapping...');
      const res = await apiClient.post(`/mapping-configs/${id}/toggle`, {
        isActive: !config?.isActive,
      });
      return res.data.data;
    },
    onSuccess: () => {
      refetch();
      successProcessing('Estado actualizado.');
      setTimeout(stopProcessing, 1500);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error al cambiar estado';
      errorProcessing(message);
    },
  });

  const handleSave = (config: MappingConfig) => {
    saveMutation.mutate(config);
  };

  const handleNew = () => {
    if (!connections || connections.length === 0) {
      setSaveError('No hay conexiones ERP disponibles. Por favor, crea una primero.');
      return;
    }
    setStep('select_type');
  };

  const handleCreateWithType = (type: 'ITEMS' | 'STOCK' | 'PRICES' | 'COST' | 'DESTINATION') => {
    if (!connections || connections.length === 0) return;

    const firstConnection = connections[0].id;
    setSelectedConfig({
      connectionId: firstConnection,
      datasetType: type,
      mainTable: '',
      joins: [],
      filters: [],
      selectedColumns: [],
      fieldMappings: [],
    } as any);
    setStep('create');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 border-4 border-accent-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted font-black uppercase tracking-widest text-[10px] animate-pulse">Cargando Mapeos...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {step === 'list' && (
        <div>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-black text-primary tracking-tight">Mapeos de Datos</h1>
              <p className="text-muted text-sm mt-1 uppercase font-black tracking-widest opacity-60">Configuración de integración ERP</p>
            </div>
            <Button
              onClick={handleNew}
              variant="primary"
              className="rounded-xl px-6 py-6 shadow-lg shadow-accent-primary/20"
            >
              ✨ Nuevo Mapping
            </Button>
          </div>

          <div className="grid gap-4">
            {configs?.length === 0 && (
              <div className="text-center py-24 bg-hover/30 rounded-2xl border-2 border-dashed border-border-default/50">
                <div className="text-6xl mb-6 opacity-20">🧭</div>
                <p className="text-muted font-black uppercase tracking-[0.2em] text-xs">No hay mappings configurados. ¡Crea el primero!</p>
              </div>
            )}
            {configs?.map((config: any) => (
              <div key={config.id} className="bg-card border border-border-default p-6 rounded-2xl shadow-sm hover:shadow-xl-hover transition-all group overflow-hidden relative">
                <div className="absolute right-0 top-0 w-1 h-full bg-accent-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${config.datasetType === 'DESTINATION' ? 'bg-accent-secondary/10 text-accent-secondary border-accent-secondary/20' :
                        config.datasetType === 'ITEMS' ? 'bg-accent-primary/10 text-accent-primary border-accent-primary/20' :
                          'bg-hover text-muted border-border-default'
                        }`}>
                        {config.datasetType}
                      </span>
                      <h3 className="text-xl font-black text-primary tracking-tight">{config.datasetType === 'DESTINATION' ? 'Exportación a ERP' : 'Carga desde ERP'}</h3>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1">
                      <span className="opacity-60">📍 Tabla:</span>
                      <code className="bg-[var(--bg-hover)] px-1 rounded text-blue-500 font-mono text-xs border border-[var(--border-default)]">
                        {config.mainTable || (config.customQuery ? 'Query Personalizada' : 'Sin definir')}
                      </code>
                    </p>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                      <span className="opacity-60">🔗 Campos:</span> <strong>{config.fieldMappings?.length || 0}</strong> mapeados
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleMutation.mutate(config.id)}
                      disabled={toggleMutation.isPending && toggleMutation.variables === config.id}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${config.isActive
                        ? 'bg-success/10 text-success border-success/20 shadow-sm shadow-success/5'
                        : 'bg-hover text-muted border-border-default'
                        } disabled:opacity-50`}
                    >
                      {toggleMutation.isPending && toggleMutation.variables === config.id && (
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      )}
                      {config.isActive ? 'Activo' : 'Inactivo'}
                    </button>
                    <button
                      onClick={() => {
                        let configToEdit = { ...config };
                        // Si existe config.filters, lo aplanamos para el builder
                        if (config.filters) {
                          try {
                            const parsedFilters = typeof config.filters === 'string'
                              ? JSON.parse(config.filters)
                              : config.filters;

                            configToEdit = {
                              ...configToEdit,
                              ...parsedFilters,
                              // Asegurar que no quede el objeto original estorbando
                              filters: Array.isArray(parsedFilters.filters) ? parsedFilters.filters : (configToEdit.filters || []),
                              joins: Array.isArray(parsedFilters.joins) ? parsedFilters.joins : (configToEdit.joins || []),
                              mainTable: parsedFilters.mainTable || config.mainTable,
                              selectedColumns: Array.isArray(parsedFilters.selectedColumns) ? parsedFilters.selectedColumns : (configToEdit.selectedColumns || []),
                              fieldMappings: Array.isArray(parsedFilters.fieldMappings) ? parsedFilters.fieldMappings : (configToEdit.fieldMappings || []),
                            };
                          } catch (e) {
                            console.error('Error parsing filters for edit:', e);
                          }
                        }
                        console.log('✏️ [MappingConfigAdminPage] Editing config:', configToEdit);
                        setSelectedConfig(configToEdit);
                        setStep('edit');
                      }}
                      className="p-2.5 rounded-lg bg-hover text-muted hover:text-accent-primary hover:bg-accent-primary/10 transition-all border border-transparent hover:border-accent-primary/20"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleActionWithConfirm(
                        '⚠️ Eliminar Mapping',
                        '¿Estás seguro de que deseas eliminar este mapping? Esta acción afectará la sincronización con el ERP.',
                        () => deleteMutation.mutate(config.id),
                        true
                      )}
                      disabled={deleteMutation.isPending && deleteMutation.variables === config.id}
                      className="p-2.5 rounded-lg bg-hover text-muted hover:text-danger hover:bg-danger/10 transition-all border border-transparent hover:border-danger/20 disabled:opacity-50 flex items-center justify-center"
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 'select_type' && (
        <div className="max-w-2xl mx-auto py-12">
          <h2 className="text-3xl font-bold mb-8 text-center text-gray-800">¿Qué tipo de mapping deseas crear?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => handleCreateWithType('ITEMS')}
              className="group p-8 border border-border-default bg-card rounded-3xl hover:border-accent-primary hover:shadow-xl-hover transition-all text-left shadow-lg overflow-hidden relative"
            >
              <div className="absolute -right-4 -bottom-4 text-7xl opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-500">📦</div>
              <div className="w-14 h-14 bg-accent-primary/10 text-accent-primary rounded-2xl flex items-center justify-center mb-6 group-hover:bg-accent-primary group-hover:text-white transition-all shadow-inner">
                <span className="text-3xl">📦</span>
              </div>
              <h3 className="text-2xl font-black mb-2 text-primary tracking-tight">Carga de Artículos</h3>
              <p className="text-sm text-secondary leading-relaxed font-medium">Importa códigos, descripciones y unidades de medida desde el ERP para iniciar conteos.</p>
            </button>

            <button
              onClick={() => handleCreateWithType('DESTINATION')}
              className="group p-8 border border-border-default bg-card rounded-3xl hover:border-accent-secondary hover:shadow-xl-hover transition-all text-left shadow-lg overflow-hidden relative"
            >
              <div className="absolute -right-4 -bottom-4 text-7xl opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-500">🚀</div>
              <div className="w-14 h-14 bg-accent-secondary/10 text-accent-secondary rounded-2xl flex items-center justify-center mb-6 group-hover:bg-accent-secondary group-hover:text-white transition-all shadow-inner">
                <span className="text-3xl">🚀</span>
              </div>
              <h3 className="text-2xl font-black mb-2 text-primary tracking-tight">Exportación Hub</h3>
              <p className="text-sm text-secondary leading-relaxed font-medium">Envía los resultados del conteo a una tabla específica del ERP (ej: Boleta de Inventario).</p>
            </button>

            <button
              onClick={() => handleCreateWithType('STOCK')}
              className="group p-8 border-2 border-[var(--border-default)] bg-[var(--bg-card)] rounded-2xl hover:border-blue-500 hover:bg-blue-500/5 transition-all text-left shadow-sm opacity-60 hover:opacity-100"
            >
              <div className="w-12 h-12 bg-[var(--bg-hover)] rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-black mb-2 text-[var(--text-primary)]">Carga de Existencia</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">Importa el stock teórico actual desde el ERP para compararlo con el conteo físico.</p>
            </button>

            <button
              onClick={() => setStep('list')}
              className="col-span-full mt-4 text-center text-gray-500 hover:text-gray-800 font-medium"
            >
              ← Volver a la lista
            </button>
          </div>
        </div>
      )}

      {(step === 'create' || step === 'edit') && selectedConfig && (
        <MappingEditor
          config={selectedConfig}
          onSave={handleSave}
          onCancel={() => {
            setStep('list');
            setSelectedConfig(null);
            setSaveError(null);
          }}
          saveError={saveError}
          setSaveError={setSaveError}
          isSaving={saveMutation.isPending}
          saveMutation={saveMutation}
        />
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

interface EditorProps {
  config: MappingConfig;
  onSave: (config: MappingConfig) => void;
  onCancel: () => void;
  saveError: string | null;
  setSaveError: (error: string | null) => void;
  isSaving: boolean;
  saveMutation: any;
}

const MappingEditor: React.FC<EditorProps> = ({
  config,
  onSave,
  onCancel,
  saveError,
  setSaveError,
  isSaving,
  saveMutation,
}) => {
  const apiClient = getApiClient();

  // Cargar conexiones disponibles
  const { data: connections } = useQuery({
    queryKey: ['erp-connections'],
    queryFn: async () => {
      const res = await apiClient.get('/erp-connections');
      return Array.isArray(res.data) ? res.data : res.data.data || [];
    },
  });

  const selectedConnection = connections?.find((c: any) => c.id === config.connectionId);

  return (
    <div className="border border-gray-300 p-6 rounded bg-gray-50 w-full">
      <h2 className="text-2xl font-bold mb-6">
        {config.id ? 'Editar' : 'Crear'} Mapping - {config.datasetType}
      </h2>

      <div className="space-y-6">
        {/* Connection Info */}
        {selectedConnection && (
          <div className="bg-blue-50 p-4 rounded border border-blue-200">
            <p className="text-sm text-blue-700 mb-1">
              <strong>🔗 Conexión ERP:</strong> {selectedConnection?.name || 'Sin nombre'}
            </p>
            <p className="text-sm text-blue-700 mb-1">
              <strong>🗄️ Base de datos:</strong> {selectedConnection?.database || 'Catelli'}@{selectedConnection?.host}:{selectedConnection?.port || 1433}
            </p>
            <p className="text-sm text-blue-700 mb-1">
              <strong>📊 Dataset:</strong> {config.datasetType}
            </p>
            <p className="text-xs text-blue-600 mt-2">
              💡 Si obtienes error "Conexión no válida", verifica que los datos de la conexión ERP sean correctos.
            </p>
          </div>
        )}

        {/* SimpleMappingBuilder - Nuevo componente */}
        {config.connectionId ? (
          <SimpleMappingBuilder
            connectionId={config.connectionId}
            datasetType={config.datasetType}
            initialConfig={config}
            onSave={async (newConfig) => {
              console.log('🔄 [MappingEditor.onSave] newConfig:', newConfig);
              setSaveError(null);

              const configToSave = {
                ...config,
                ...newConfig,
                id: config.id, // Preservar ID si es edit
              };

              console.log('🔄 [MappingEditor.onSave] configToSave:', configToSave);

              // Retornar Promise que se resuelva cuando mutación termine
              return new Promise<void>((resolve, reject) => {
                saveMutation.mutate(configToSave, {
                  onSuccess: () => {
                    console.log('✅ [MappingEditor.onSave] Mutate success');
                    resolve();
                  },
                  onError: (error: any) => {
                    console.error('❌ [MappingEditor.onSave] Mutate error:', error);
                    reject(error);
                  },
                });
              });
            }}
          />
        ) : (
          <div className="p-4 bg-yellow-50 border border-yellow-400 rounded">
            <p className="text-yellow-800">
              ⚠️ Selecciona una conexión ERP antes de continuar.
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2 justify-end pt-4 border-t">
          {saveError && (
            <div className="flex-1 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
              ❌ {saveError}
            </div>
          )}
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
