import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getApiClient } from '@/services/api';
import { SimpleMappingBuilder } from '@/components/SimpleMappingBuilder';

// MappingConfig ahora viene de SimpleMappingBuilder
// Ver: src/components/SimpleMappingBuilder/index.tsx
type MappingConfig = any;

export const MappingConfigAdminPage: React.FC = () => {
  const apiClient = getApiClient();
  const [step, setStep] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedConfig, setSelectedConfig] = useState<MappingConfig | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

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
    },
    onError: (error: any) => {
      console.error('❌ [saveMutation] onError - Error:', error);
      const message = error?.response?.data?.error?.message || error.message || 'Error al guardar el mapping';
      console.error('❌ [saveMutation] Error message:', message);
      setSaveError(message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/mapping-configs/${id}`);
    },
    onSuccess: () => {
      refetch();
    },
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const config = configs?.find((c: any) => c.id === id);
      const res = await apiClient.post(`/mapping-configs/${id}/toggle`, {
        isActive: !config?.isActive,
      });
      return res.data.data;
    },
    onSuccess: () => {
      refetch();
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

    const firstConnection = connections[0].id;
    setSelectedConfig({
      connectionId: firstConnection,
      datasetType: 'ITEMS',
      mainTable: '',
      joins: [],
      filters: [],
      selectedColumns: [],
      fieldMappings: [],
    });
    setStep('create');
  };

  if (isLoading) return <div>Cargando...</div>;

  return (
    <div className="p-6">
      {step === 'list' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Configuración de Mappings</h1>
            <button
              onClick={handleNew}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              + Nuevo Mapping
            </button>
          </div>

          <div className="grid gap-4">
            {configs?.map((config: any) => (
              <div key={config.id} className="border border-gray-300 p-4 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{config.datasetType}</h3>
                    <p className="text-sm text-gray-600">
                      Tabla: {config.mainTable?.name || config.customQuery?.substring(0, 50)}...
                    </p>
                    <p className="text-sm text-gray-600">
                      Campos: {config.fieldMappings?.length || 0} mapeados
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleMutation.mutate(config.id)}
                      className={`px-3 py-1 rounded text-sm ${
                        config.isActive
                          ? 'bg-green-200 text-green-800'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      {config.isActive ? 'Activo' : 'Inactivo'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedConfig(config);
                        setStep('edit');
                      }}
                      className="bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(config.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
