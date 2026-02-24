import React, { useState, useEffect } from 'react';
import { getApiClient } from '@/services/api';

interface FieldMapping {
  sourceField: string;
  targetField: string;
  dataType: 'string' | 'number' | 'date' | 'boolean';
  transformation?: string;
}

interface AvailableField {
  name: string;
  type: string;
  table: string;
}

interface ERPColumn {
  name: string;
  type: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  maxLength?: number;
}

interface FieldMappingBuilderProps {
  datasetType: string;
  mainTable: string;
  mainTableAlias?: string; // Alias de la tabla principal
  joins?: Array<{ name: string; alias: string }>;
  mappings: FieldMapping[];
  onChange: (mappings: FieldMapping[]) => void;
  connectionId: string; // Requerido para obtener datos dinámicos del ERP
}

const STANDARD_FIELDS = {
  ITEMS: [
    { name: 'itemCode', label: 'Código Item', default: true },
    { name: 'itemName', label: 'Nombre Item', default: true },
    { name: 'description', label: 'Descripción' },
    { name: 'unit', label: 'Unidad' },
    { name: 'category', label: 'Categoría' },
  ],
  STOCK: [
    { name: 'itemCode', label: 'Código Item', default: true },
    { name: 'warehouseId', label: 'ID Bodega', default: true },
    { name: 'quantity', label: 'Cantidad', default: true },
    { name: 'lastUpdate', label: 'Última Actualización' },
  ],
  COST: [
    { name: 'itemCode', label: 'Código Item', default: true },
    { name: 'cost', label: 'Costo', default: true },
    { name: 'currency', label: 'Moneda' },
  ],
  PRICE: [
    { name: 'itemCode', label: 'Código Item', default: true },
    { name: 'price', label: 'Precio', default: true },
    { name: 'currency', label: 'Moneda' },
  ],
};

export const FieldMappingBuilder: React.FC<FieldMappingBuilderProps> = ({
  datasetType,
  mainTable,
  mainTableAlias,
  joins = [],
  mappings,
  onChange,
  connectionId,
}) => {
  const [availableFields, setAvailableFields] = useState<AvailableField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedField, setDraggedField] = useState<AvailableField | null>(null);

  const apiClient = getApiClient();

  // Cargar campos dinámicamente del ERP Catelli
  useEffect(() => {
    if (!mainTable || !connectionId) return;

    const loadFields = async () => {
      setLoading(true);
      setError(null);
      try {
        // Obtener schema de todas las tablas (main + joins) del ERP
        const tables = [mainTable, ...joins.map(j => j.name)];
        const response = await apiClient.post(
          `/erp-connections/${connectionId}/table-schemas`,
          { tableNames: tables }
        );

        // Transformar el formato del backend al formato del frontend
        const fields: AvailableField[] = [];
        response.data.schemas.forEach((schema: { name: string; columns: ERPColumn[] }) => {
          schema.columns.forEach(col => {
            fields.push({
              name: col.name,
              table: schema.name,
              type: col.type,
            });
          });
        });

        setAvailableFields(fields);
      } catch (err: any) {
        setError(`Error cargando campos: ${err.message}`);
        console.error('Error loading fields:', err);
      } finally {
        setLoading(false);
      }
    };

    loadFields();
  }, [mainTable, joins, connectionId]);

  const targetFields = STANDARD_FIELDS[datasetType as keyof typeof STANDARD_FIELDS] || [];

  const addMapping = (targetName: string) => {
    if (!mappings.some(m => m.targetField === targetName)) {
      onChange([
        ...mappings,
        {
          sourceField: '',
          targetField: targetName,
          dataType: 'string',
        },
      ]);
    }
  };

  const removeMapping = (targetName: string) => {
    onChange(mappings.filter(m => m.targetField !== targetName));
  };

  const updateMapping = (targetName: string, updates: Partial<FieldMapping>) => {
    onChange(
      mappings.map(m =>
        m.targetField === targetName ? { ...m, ...updates } : m
      )
    );
  };

  const getMapping = (targetName: string) => {
    return mappings.find(m => m.targetField === targetName);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 p-4 rounded">
        <h3 className="font-semibold text-blue-900 mb-2">📋 Mapeador de Campos</h3>
        <p className="text-sm text-blue-700">
          Arrastra campos de Catelli (izquierda) a nuestros campos estándar (derecha)
        </p>
      </div>

      {loading && <div className="text-center text-gray-500">Cargando campos disponibles...</div>}
      {error && <div className="text-center text-red-500">{error}</div>}

      <div className="grid grid-cols-2 gap-6">
        {/* LADO IZQUIERDO: Campos de Catelli */}
        <div className="border border-gray-300 rounded p-4 bg-gray-50 h-96 overflow-y-auto">
          <h4 className="font-semibold text-gray-700 mb-3">📦 Campos de Catelli</h4>
          {availableFields.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay campos disponibles</p>
          ) : (
            <div className="space-y-2">
              {availableFields.map((field, idx) => (
                <div
                  key={idx}
                  draggable
                  onDragStart={() => setDraggedField(field)}
                  onDragEnd={() => setDraggedField(null)}
                  className={`p-2 bg-white border border-gray-300 rounded cursor-move hover:bg-blue-50 ${
                    draggedField?.name === field.name ? 'opacity-50' : ''
                  }`}
                >
                  <div className="font-mono text-sm">{field.table}.{field.name}</div>
                  <div className="text-xs text-gray-500">{field.type}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* LADO DERECHO: Campos de nuestra app */}
        <div className="border border-gray-300 rounded p-4 bg-green-50 h-96 overflow-y-auto">
          <h4 className="font-semibold text-gray-700 mb-3">✓ Campos de {datasetType}</h4>
          <div className="space-y-3">
            {targetFields.map((targetField) => {
              const mapping = getMapping(targetField.name);
              const isMapped = !!mapping?.sourceField;

              return (
                <div
                  key={targetField.name}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggedField) {
                      const tableAlias = mainTableAlias || mainTable[0].toLowerCase();
                      updateMapping(targetField.name, {
                        sourceField: `${tableAlias}.${draggedField.name}`,
                      });
                      setDraggedField(null);
                    }
                  }}
                  className={`p-3 rounded border-2 border-dashed transition ${
                    isMapped
                      ? 'bg-green-100 border-green-400'
                      : 'bg-white border-gray-300 hover:border-green-400'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-gray-800">{targetField.label}</div>
                      <div className="text-xs text-gray-600 font-mono">
                        {mapping?.sourceField || '(sin mapear)'}
                      </div>
                    </div>
                    {isMapped && (
                      <button
                        onClick={() => removeMapping(targetField.name)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {isMapped && (
                    <div className="mt-2 space-y-1">
                      <select
                        value={mapping.dataType}
                        onChange={(e) =>
                          updateMapping(targetField.name, {
                            dataType: e.target.value as FieldMapping['dataType'],
                          })
                        }
                        className="w-full border border-gray-300 p-1 rounded text-xs"
                      >
                        <option value="string">Texto</option>
                        <option value="number">Número</option>
                        <option value="date">Fecha</option>
                        <option value="boolean">Booleano</option>
                      </select>

                      <input
                        type="text"
                        value={mapping.transformation || ''}
                        onChange={(e) =>
                          updateMapping(targetField.name, {
                            transformation: e.target.value,
                          })
                        }
                        placeholder="Ej: UPPER({}), CAST({} AS INT)"
                        className="w-full border border-gray-300 p-1 rounded text-xs"
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Campos no mapeados */}
            <div className="text-xs text-gray-500 mt-2">
              {mappings.filter(m => !targetFields.some(tf => tf.name === m.targetField))
                .length > 0 && (
                <div>
                  <strong>Campos adicionales:</strong>
                  {mappings.map(
                    (m) =>
                      !targetFields.some(tf => tf.name === m.targetField) && (
                        <div key={m.targetField} className="text-gray-600">
                          {m.targetField} ← {m.sourceField}
                          <button
                            onClick={() => removeMapping(m.targetField)}
                            className="ml-2 text-red-600"
                          >
                            ✕
                          </button>
                        </div>
                      )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="bg-gray-100 p-3 rounded text-sm">
        <strong>Resumen:</strong> {mappings.filter(m => m.sourceField).length} de{' '}
        {mappings.length} campos mapeados
      </div>
    </div>
  );
};
