import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';

interface MappingConfig {
  id: string;
  datasetType: string;
  erpConnectionId: string;
  isActive: boolean;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface LoadResult {
  countId: string;
  itemsLoaded: number;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  message: string;
  errors?: string[];
}

export const LoadInventoryFromERPPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedMapping, setSelectedMapping] = useState<string>('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [openDialog, setOpenDialog] = useState(false);
  const [loadResult, setLoadResult] = useState<LoadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cargar configuraciones de mapeo
  const { data: mappings = [], isLoading: mappingsLoading } = useQuery(
    'mappings',
    async () => {
      const response = await fetch('/api/mapping-config');
      if (!response.ok) throw new Error('Failed to load mappings');
      const data = await response.json();
      return data.data || [];
    }
  );

  // Cargar almacenes
  const { data: warehouses = [], isLoading: warehousesLoading } = useQuery(
    'warehouses',
    async () => {
      const response = await fetch('/api/warehouses');
      if (!response.ok) throw new Error('Failed to load warehouses');
      const data = await response.json();
      return data.data || [];
    }
  );

  // Cargar ubicaciones del almacén seleccionado
  const { data: locations = [], isLoading: locationsLoading } = useQuery(
    ['warehouse-locations', selectedWarehouse],
    async () => {
      if (!selectedWarehouse) return [];
      const response = await fetch(`/api/warehouses/${selectedWarehouse}/locations`);
      if (!response.ok) throw new Error('Failed to load locations');
      const data = await response.json();
      return data.data || [];
    },
    {
      enabled: !!selectedWarehouse,
    }
  );

  // Reset location when warehouse changes
  React.useEffect(() => {
    setSelectedLocation('');
  }, [selectedWarehouse]);

  // Mutación para cargar inventario
  const { mutate: loadInventory, isLoading: isLoadingInventory } = useMutation(
    async () => {
      const response = await fetch('/api/inventory/load-from-erp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mappingId: selectedMapping,
          warehouseId: selectedWarehouse,
          locationId: selectedLocation,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load inventory');
      }

      return response.json();
    },
    {
      onSuccess: (data) => {
        setError(null);
        setLoadResult(data);
        setOpenDialog(true);
        queryClient.invalidateQueries('inventoryCounts');
      },
      onError: (error: any) => {
        const message = error?.message || 'Failed to load inventory';
        setError(message);
        setLoadResult({
          countId: '',
          itemsLoaded: 0,
          status: 'FAILED',
          message: message,
        });
        setOpenDialog(true);
      },
    }
  );

  const handleLoadInventory = () => {
    if (!selectedMapping || !selectedWarehouse || !selectedLocation) {
      alert('Please select mapping, warehouse, and location');
      return;
    }
    loadInventory();
  };

  const handleNavigateToCount = () => {
    if (loadResult?.countId) {
      navigate(`/inventory-counts/${loadResult.countId}`);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  if (mappingsLoading || warehousesLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  const activeMappings = mappings.filter((m: MappingConfig) => m.isActive);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
      <h1>📦 Cargar Inventario desde ERP</h1>
      <p style={{ color: '#666' }}>
        Carga automáticamente el inventario desde Catelli utilizando una configuración de mapeo.
      </p>

      {/* Error Alert */}
      {error && (
        <div style={{
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <h3 style={{ color: '#c33', margin: '0 0 0.5rem 0' }}>Error</h3>
              <p style={{ color: '#a33', margin: '0', fontSize: '0.9rem' }}>{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#c33',
                cursor: 'pointer',
                fontSize: '1.5rem',
                padding: '0',
                lineHeight: '1'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div style={{
        background: '#fff',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '2rem'
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Configuración de Mapeo
          </label>
          <select
            value={selectedMapping}
            onChange={(e: any) => setSelectedMapping(e.target.value)}
            disabled={isLoadingInventory || activeMappings.length === 0}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
          >
            <option value="">Selecciona una configuración</option>
            {activeMappings.map((mapping: MappingConfig) => (
              <option key={mapping.id} value={mapping.id}>
                {mapping.datasetType} - {mapping.id.substring(0, 8)}...
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Almacén de Destino
          </label>
          <select
            value={selectedWarehouse}
            onChange={(e: any) => setSelectedWarehouse(e.target.value)}
            disabled={isLoadingInventory || warehouses.length === 0}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
          >
            <option value="">Selecciona un almacén</option>
            {warehouses.map((warehouse: Warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name} ({warehouse.code})
              </option>
            ))}
          </select>
        </div>

        {selectedWarehouse && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Ubicación dentro del Almacén
            </label>
            {locationsLoading ? (
              <div style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                color: '#666'
              }}>
                Cargando ubicaciones...
              </div>
            ) : locations.length > 0 ? (
              <select
                value={selectedLocation}
                onChange={(e: any) => setSelectedLocation(e.target.value)}
                disabled={isLoadingInventory}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              >
                <option value="">Selecciona una ubicación</option>
                {locations.map((location: any) => (
                  <option key={location.id} value={location.id}>
                    {location.code} {location.description ? `- ${location.description}` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div style={{
                width: '100%',
                padding: '1rem',
                border: '1px solid #ffc107',
                borderRadius: '4px',
                background: '#fff3cd',
                color: '#856404'
              }}>
                ⚠️ No hay ubicaciones en este almacén. Por favor, crea ubicaciones primero.
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleLoadInventory}
          disabled={
            !selectedMapping ||
            !selectedWarehouse ||
            !selectedLocation ||
            isLoadingInventory ||
            activeMappings.length === 0
          }
          style={{
            width: '100%',
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '4px',
            background: selectedMapping && selectedWarehouse && selectedLocation ? '#1976d2' : '#ccc',
            color: 'white',
            cursor: selectedMapping && selectedWarehouse && selectedLocation ? 'pointer' : 'default',
          }}
        >
          {isLoadingInventory ? 'Cargando...' : '📥 Cargar Inventario'}
        </button>

        {activeMappings.length === 0 && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            color: '#856404'
          }}>
            ⚠️ No hay configuraciones de mapeo activas
          </div>
        )}

        {warehouses.length === 0 && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            color: '#856404'
          }}>
            ⚠️ No hay almacenes disponibles
          </div>
        )}
      </div>

      {/* Información sobre el proceso */}
      <div style={{
        background: '#f5f5f5',
        padding: '1.5rem',
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <h3>¿Cómo funciona?</h3>
        <ol style={{ paddingLeft: '1.5rem' }}>
          <li>Selecciona una configuración de mapeo que define qué campos cargar</li>
          <li>Selecciona el almacén de destino en Cigua</li>
          <li>Haz clic en 'Cargar Inventario'</li>
          <li>El sistema consultará automáticamente Catelli</li>
          <li>Los artículos se cargarán con sus cantidades del ERP</li>
          <li>Luego puedes ingresar las cantidades físicas encontradas</li>
        </ol>
      </div>

      {/* Dialog con resultado */}
      {openDialog && loadResult && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>Resultado de Carga</h2>
              <span style={{
                fontSize: '1.5rem',
                color: loadResult.status === 'SUCCESS' ? '#28a745' : loadResult.status === 'PARTIAL' ? '#ffc107' : '#dc3545'
              }}>
                {loadResult.status === 'SUCCESS' ? '✓' : loadResult.status === 'PARTIAL' ? '⚠' : '✕'}
              </span>
            </div>

            <div style={{ marginBottom: '1rem', padding: '0.5rem 1rem', background: '#f0f0f0', borderRadius: '4px' }}>
              <strong>Status:</strong> <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                background: loadResult.status === 'SUCCESS' ? '#d4edda' : loadResult.status === 'PARTIAL' ? '#fff3cd' : '#f8d7da',
                color: loadResult.status === 'SUCCESS' ? '#155724' : loadResult.status === 'PARTIAL' ? '#856404' : '#721c24',
                display: 'inline-block'
              }}>
                {loadResult.status}
              </span>
            </div>

            <p>{loadResult.message}</p>

            {loadResult.status !== 'FAILED' && (
              <div style={{ padding: '0.75rem 1rem', background: '#d1ecf1', borderRadius: '4px', color: '#0c5460', marginBottom: '1rem' }}>
                Se cargaron exitosamente <strong>{loadResult.itemsLoaded} artículos</strong> en el conteo.
              </div>
            )}

            {loadResult.errors && loadResult.errors.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <strong>Errores:</strong>
                <ul style={{ color: '#dc3545', margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
                  {loadResult.errors.slice(0, 3).map((error, idx) => (
                    <li key={idx} style={{ fontSize: '0.9rem' }}>{error}</li>
                  ))}
                  {loadResult.errors.length > 3 && (
                    <li>... y {loadResult.errors.length - 3} errores más</li>
                  )}
                </ul>
              </div>
            )}

            {loadResult.countId && (
              <div style={{ padding: '0.75rem 1rem', background: '#d1ecf1', borderRadius: '4px', color: '#0c5460', marginBottom: '1rem', fontSize: '0.9rem' }}>
                ID del Conteo: <code>{loadResult.countId}</code>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              {loadResult.status !== 'FAILED' && loadResult.countId && (
                <button
                  onClick={handleNavigateToCount}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Ir al Conteo
                </button>
              )}
              <button
                onClick={handleCloseDialog}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#ddd',
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadInventoryFromERPPage;
