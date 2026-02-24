import React, { useState } from 'react';
import { MappingConfig, FieldMapping } from '../index';

interface FieldMappingStepProps {
  config: MappingConfig;
  connectionId: string;
  onChange: (fieldMappings: FieldMapping[]) => void;
}

/**
 * Campos locales estándar por tipo de dataset
 */
const STANDARD_FIELDS: Record<string, Array<{ name: string; dataType: string; required: boolean }>> = {
  ITEMS: [
    { name: 'itemCode', dataType: 'string', required: true },
    { name: 'itemName', dataType: 'string', required: true },
    { name: 'description', dataType: 'string', required: false },
    { name: 'price', dataType: 'number', required: false },
    { name: 'cost', dataType: 'number', required: false },
    { name: 'quantity', dataType: 'number', required: false },
    { name: 'category', dataType: 'string', required: false },
    { name: 'brand', dataType: 'string', required: false },
    { name: 'subcategory', dataType: 'string', required: false },
    { name: 'barCodeInv', dataType: 'string', required: false },
    { name: 'barCodeVt', dataType: 'string', required: false },
    { name: 'weight', dataType: 'number', required: false },
    { name: 'packQty', dataType: 'number', required: false },
    { name: 'uom', dataType: 'string', required: false },
  ],
  STOCK: [
    { name: 'itemCode', dataType: 'string', required: true },
    { name: 'warehouseId', dataType: 'string', required: true },
    { name: 'quantity', dataType: 'number', required: true },
    { name: 'lastUpdate', dataType: 'date', required: false },
  ],
  PRICES: [
    { name: 'itemCode', dataType: 'string', required: true },
    { name: 'price', dataType: 'number', required: true },
    { name: 'currency', dataType: 'string', required: false },
  ],
  COST: [
    { name: 'itemCode', dataType: 'string', required: true },
    { name: 'cost', dataType: 'number', required: true },
    { name: 'currency', dataType: 'string', required: false },
  ],
};

/**
 * Paso 4: Mapear Campos ERP → Local
 *
 * Usuario arrastra campos de ERP (izquierda) a campos locales (derecha)
 * O selecciona de dropdowns
 */
export const FieldMappingStep: React.FC<FieldMappingStepProps> = ({
  config,
  onChange,
}) => {
  const [draggedSource, setDraggedSource] = useState<string | null>(null);
  const standardFields = STANDARD_FIELDS[config.datasetType] || STANDARD_FIELDS.ITEMS;

  const getSourceFieldsNotMapped = () => {
    const mappedSources = config.fieldMappings.map((m) => m.source);
    return config.selectedColumns.filter((col) => !mappedSources.includes(col));
  };

  const handleDragStart = (source: string) => {
    setDraggedSource(source);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-blue-50');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-blue-50');
  };

  const handleDropOnTarget = (target: string, e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-blue-50');

    if (!draggedSource) return;

    // Verificar si ya existe este mapeo
    const existing = config.fieldMappings.find((m) => m.target === target);
    if (existing) {
      // Reemplazar
      const updated = config.fieldMappings.map((m) =>
        m.target === target
          ? { ...m, source: draggedSource }
          : m
      );
      onChange(updated);
    } else {
      // Agregar nuevo
      const newMapping: FieldMapping = {
        source: draggedSource,
        target,
        dataType: inferDataType(draggedSource),
      };
      onChange([...config.fieldMappings, newMapping]);
    }

    setDraggedSource(null);
  };

  const inferDataType = (fieldName: string): FieldMapping['dataType'] => {
    const lower = fieldName.toLowerCase();
    if (lower.includes('date') || lower.includes('fecha')) return 'date';
    if (lower.includes('precio') || lower.includes('price') || lower.includes('costo') || lower.includes('cost') || lower.includes('cantidad')) return 'number';
    return 'string';
  };

  const handleSelectMapping = (target: string, source: string) => {
    const existing = config.fieldMappings.find((m) => m.target === target);
    if (existing) {
      onChange(
        config.fieldMappings.map((m) =>
          m.target === target
            ? { ...m, source }
            : m
        )
      );
    } else {
      const newMapping: FieldMapping = {
        source,
        target,
        dataType: inferDataType(source),
      };
      onChange([...config.fieldMappings, newMapping]);
    }
  };

  const handleRemoveMapping = (target: string) => {
    onChange(config.fieldMappings.filter((m) => m.target !== target));
  };

  const unmappedSources = getSourceFieldsNotMapped();
  const mappedTargets = config.fieldMappings.map((m) => m.target);
  const unmappedTargets = standardFields.filter((f) => !mappedTargets.includes(f.name));

  return (
    <div className="space-y-6">
      <p className="text-gray-700">
        Mapea los campos del ERP (izquierda) con los campos locales (derecha).
        Puedes hacer drag & drop o usar los selectores.
      </p>

      {/* Validación */}
      {standardFields.filter((f) => f.required).some((f) => !mappedTargets.includes(f.name)) && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded">
          ⚠️ Campos requeridos sin mapear:
          <ul className="mt-2 ml-4">
            {standardFields
              .filter((f) => f.required && !mappedTargets.includes(f.name))
              .map((f) => (
                <li key={f.name}>• {f.name}</li>
              ))}
          </ul>
        </div>
      )}

      {/* Dos columnas: ERP y Local */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* COLUMNA 1: Campos ERP (Fuente) */}
        <div>
          <h3 className="text-lg font-semibold mb-3">📦 Campos ERP Catelli</h3>
          <div className="space-y-2 p-4 bg-gray-50 rounded min-h-64">
            {config.selectedColumns.length === 0 ? (
              <p className="text-gray-500 text-sm">No hay columnas seleccionadas</p>
            ) : (
              config.selectedColumns.map((col) => {
                const isMapped = config.fieldMappings.some((m) => m.source === col);
                return (
                  <div
                    key={col}
                    draggable
                    onDragStart={() => handleDragStart(col)}
                    className={`p-3 rounded cursor-move text-sm border-2 ${
                      isMapped
                        ? 'bg-green-100 border-green-400 text-green-800'
                        : 'bg-blue-100 border-blue-400 text-blue-800 hover:bg-blue-200'
                    }`}
                  >
                    {col}
                    {isMapped && ' ✓'}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMNA 2: Campos Locales (Destino) */}
        <div>
          <h3 className="text-lg font-semibold mb-3">🎯 Campos Locales Cigua</h3>
          <div className="space-y-2 p-4 bg-gray-50 rounded min-h-64">
            {standardFields.map((field) => {
              const mapping = config.fieldMappings.find((m) => m.target === field.name);
              const isMapped = !!mapping;

              return (
                <div
                  key={field.name}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDropOnTarget(field.name, e)}
                  className={`p-3 rounded border-2 text-sm ${
                    isMapped
                      ? 'bg-green-100 border-green-400'
                      : 'bg-gray-200 border-gray-400 border-dashed'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">
                        {field.name}
                        {field.required && <span className="text-red-600 ml-1">*</span>}
                      </div>
                      <div className="text-xs text-gray-600">({field.dataType})</div>
                    </div>
                    {mapping && (
                      <button
                        onClick={() => handleRemoveMapping(field.name)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {mapping ? (
                    <div className="mt-2 p-2 bg-white rounded text-green-700 font-semibold">
                      {mapping.source}
                    </div>
                  ) : (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleSelectMapping(field.name, e.target.value);
                        }
                      }}
                      defaultValue=""
                      className="w-full mt-2 px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="">-- Selecciona campo --</option>
                      {unmappedSources.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Resumen de Mappings */}
      {config.fieldMappings.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">✓ Mappings Creados ({config.fieldMappings.length})</h3>
          <div className="space-y-2">
            {config.fieldMappings.map((mapping) => (
              <div key={mapping.target} className="p-3 bg-green-50 border border-green-200 rounded flex justify-between items-center">
                <div>
                  <span className="font-mono text-sm text-green-800">
                    {mapping.source} → <strong>{mapping.target}</strong>
                  </span>
                  <span className="text-xs text-gray-600 ml-3">({mapping.dataType})</span>
                </div>
                <button
                  onClick={() => handleRemoveMapping(mapping.target)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
