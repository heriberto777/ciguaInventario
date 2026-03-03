import React, { useState } from 'react';
import { MappingConfig, FieldMapping } from '../index';

interface FieldMappingStepProps {
  config: MappingConfig;
  connectionId: string;
  onChange: (fieldMappings: FieldMapping[]) => void;
}

/**
 * Campos locales de InventoryCount_Item (fuente: esquema real de la BD)
 * - Obligatorios: itemCode, itemName, uom, systemQty
 * - Opcionales enriquecidos: costPrice, salePrice, packQty, baseUom, barCodeInv, barCodeVt, brand, category, subcategory
 */
const STANDARD_FIELDS: Record<string, Array<{ name: string; dataType: string; required: boolean }>> = {
  ITEMS: [
    { name: 'itemCode', dataType: 'string', required: true }, // a.ARTICULO
    { name: 'itemName', dataType: 'string', required: true }, // a.DESCRIPCION
    { name: 'uom', dataType: 'string', required: false }, // a.UNIDAD_ALMACEN
    { name: 'baseUom', dataType: 'string', required: false }, // (alias de uom o hardcode)
    { name: 'systemQty', dataType: 'number', required: false }, // ex.CANT_DISPONIBLE
    { name: 'packQty', dataType: 'number', required: false }, // a.PESO_BRUTO
    { name: 'costPrice', dataType: 'number', required: false }, // a.COSTO_ULT_LOC
    { name: 'salePrice', dataType: 'number', required: false }, // ap.PRECIO
    { name: 'barCodeInv', dataType: 'string', required: false }, // a.CODIGO_BARRAS_INVT
    { name: 'barCodeVt', dataType: 'string', required: false }, // a.CODIGO_BARRAS_VENT
    { name: 'category', dataType: 'string', required: false }, // a.CLASIFICACION_1
    { name: 'subcategory', dataType: 'string', required: false }, // a.CLASIFICACION_2
    { name: 'brand', dataType: 'string', required: false }, // a.CLASIFICACION_3
    { name: 'lot', dataType: 'string', required: false }, // LOTE
  ],
  STOCK: [
    { name: 'itemCode', dataType: 'string', required: true },
    { name: 'warehouseId', dataType: 'string', required: true },
    { name: 'systemQty', dataType: 'number', required: true },
    { name: 'lot', dataType: 'string', required: false },
    { name: 'lastUpdate', dataType: 'date', required: false },
  ],
  PRICES: [
    { name: 'itemCode', dataType: 'string', required: true },
    { name: 'salePrice', dataType: 'number', required: true },
    { name: 'currency', dataType: 'string', required: false },
  ],
  COST: [
    { name: 'itemCode', dataType: 'string', required: true },
    { name: 'costPrice', dataType: 'number', required: true },
    { name: 'currency', dataType: 'string', required: false },
  ],
  DESTINATION: [
    { name: 'itemCode', dataType: 'string', required: true },
    { name: 'countedQty', dataType: 'number', required: true },
    { name: 'systemQty', dataType: 'number', required: false },
    { name: 'variance', dataType: 'number', required: false },
    { name: 'warehouseCode', dataType: 'string', required: false },
    { name: 'locationCode', dataType: 'string', required: false },
    { name: 'uom', dataType: 'string', required: false },
    { name: 'lot', dataType: 'string', required: false },
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

  const isDestination = config.datasetType === 'DESTINATION';

  const unmappedSources = isDestination
    ? standardFields.filter(f => !config.fieldMappings.some(m => m.source === f.name))
    : getSourceFieldsNotMapped();

  const mappedTargets = config.fieldMappings.map((m) => m.target);

  const sourcesForList = isDestination ? standardFields.map(f => f.name) : config.selectedColumns;
  const targetsForList = isDestination ? config.selectedColumns.map(col => ({ name: col, dataType: 'string', required: false })) : standardFields;

  const handleAddCustomMapping = (target: string, type: 'CONSTANT' | 'AUTO_GENERATE', value: string) => {
    const newMapping: FieldMapping = {
      source: value,
      target,
      dataType: 'string',
      transformation: type,
    };
    onChange([...config.fieldMappings.filter(m => m.target !== target), newMapping]);
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-500/10 p-4 border border-blue-500/20 rounded-lg">
        <p className="text-blue-500 text-sm">
          <strong>💡 Cómo mapear:</strong> {isDestination
            ? 'Arrastra los campos locales (derecha) hacia las columnas del ERP (izquierda) o asigna valores constantes.'
            : 'Arrastra los campos del ERP (izquierda) hacia los campos locales (derecha).'}
        </p>
      </div>

      {/* Validación solo para importación (ITEMS, etc) */}
      {!isDestination && standardFields.filter((f) => f.required).some((f) => !mappedTargets.includes(f.name)) && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded">
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

      {/* Dos columnas: Origen y Destino */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* COLUMNA 1: Datos de Origen */}
        <div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
            {isDestination ? '🧩 Campos Locales (Fuente)' : '📦 Columnas ERP (Fuente)'}
          </h3>
          <p className="text-xs text-[var(--text-muted)] mb-3 uppercase tracking-tight font-bold">Información disponible para asignar</p>
          <div className="space-y-2 p-4 bg-[var(--bg-app)] rounded-lg border border-[var(--border-default)] min-h-[400px] shadow-inner overflow-y-auto">
            {sourcesForList.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No hay datos disponibles</p>
            ) : (
              sourcesForList.map((col) => {
                const isMapped = config.fieldMappings.some((m) => m.source === col);
                return (
                  <div
                    key={col}
                    draggable
                    onDragStart={() => handleDragStart(col)}
                    className={`p-3 rounded-lg cursor-move text-xs font-bold uppercase tracking-wider border-2 transition-all shadow-sm ${isMapped
                      ? 'bg-green-500/10 border-green-500/50 text-green-500'
                      : 'bg-blue-500/10 border-blue-500/50 text-blue-500 hover:bg-blue-500/20'
                      }`}
                  >
                    <div className="flex justify-between">
                      {col}
                      {isMapped && <span className="text-green-600 font-bold">✓</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMNA 2: Espacio de Destino */}
        <div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
            {isDestination ? '⚙️ Columnas del ERP (Destino)' : '🎯 Campos de Cigua (Destino)'}
          </h3>
          <p className="text-xs text-[var(--text-muted)] mb-3 uppercase tracking-tight font-bold">Donde se depositará la información</p>
          <div className="space-y-2 p-4 bg-[var(--bg-app)] rounded-lg border border-[var(--border-default)] min-h-[400px] shadow-inner overflow-y-auto">
            {targetsForList.map((field) => {
              const mapping = config.fieldMappings.find((m) => m.target === field.name);
              const isMapped = !!mapping;

              return (
                <div
                  key={field.name}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDropOnTarget(field.name, e)}
                  className={`p-3 rounded-xl border-2 text-sm transition-all shadow-md ${isMapped
                    ? 'bg-[var(--bg-card)] border-green-500/50'
                    : 'bg-[var(--bg-hover)] border-[var(--border-default)] border-dashed hover:border-blue-500/50'
                    }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-[var(--text-primary)] uppercase tracking-tight">
                        {field.name}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] font-bold">({field.dataType})</div>
                    </div>
                    {isMapped && (
                      <button
                        onClick={() => handleRemoveMapping(field.name)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Quitar mapeo"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {isMapped ? (
                    <div className="mt-2 p-2 bg-green-500/5 border border-green-500/20 rounded-lg flex justify-between items-center animate-in fade-in zoom-in duration-200">
                      <span className="font-bold text-green-500 truncate mr-2">
                        {mapping.transformation === 'CONSTANT' ? `"${mapping.source}"` :
                          mapping.transformation === 'AUTO_GENERATE' ? `⚡ ${mapping.source}` :
                            mapping.source}
                      </span>
                      <span className="text-[9px] bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded font-black uppercase">
                        {mapping.transformation || 'CAMPO'}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2 mt-2">
                      <select
                        onChange={(e) => handleSelectMapping(field.name, e.target.value)}
                        value=""
                        className="w-full px-2 py-1.5 border border-[var(--border-default)] bg-[var(--bg-app)] text-[var(--text-primary)] rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/50"
                      >
                        <option value="">-- Asignar campo --</option>
                        {(isDestination ? sourcesForList : unmappedSources).map((col) => (
                          <option key={col as string} value={col as string}>
                            {col as string}
                          </option>
                        ))}
                      </select>

                      <div className="flex gap-1">
                        <button
                          className="flex-1 text-[10px] bg-[var(--bg-app)] text-[var(--text-primary)] px-2 py-1.5 rounded-lg hover:bg-blue-600 hover:text-white transition-colors border border-[var(--border-default)] font-bold"
                          onClick={() => {
                            const val = prompt(`Ingrese valor constante para "${field.name}":`);
                            if (val !== null) handleAddCustomMapping(field.name, 'CONSTANT', val);
                          }}
                        >
                          + Constante
                        </button>
                        <select
                          className="flex-1 text-[10px] bg-[var(--bg-app)] text-[var(--text-primary)] px-1 py-1.5 rounded-lg cursor-pointer border border-[var(--border-default)] hover:bg-blue-600 hover:text-white transition-colors font-bold outline-none"
                          onChange={(e) => {
                            if (e.target.value) handleAddCustomMapping(field.name, 'AUTO_GENERATE', e.target.value);
                          }}
                          value=""
                        >
                          <option value="">+ Auto</option>
                          <option value="CONSECUTIVE">Consecutivo</option>
                          <option value="NOW">Fecha Hoy</option>
                          <option value="USER">Email Usuario</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Resumen de Mappings */}
      {config.fieldMappings.length > 0 && (
        <div className="mt-8 border-t border-[var(--border-default)] pt-6">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black">✓</span>
            Mapeos Definidos ({config.fieldMappings.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {config.fieldMappings.map((mapping) => (
              <div key={mapping.target} className="p-3 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl shadow-sm flex justify-between items-center group hover:border-green-500/50 transition-all">
                <div className="truncate pr-2">
                  <div className="text-[10px] text-[var(--text-muted)] font-black uppercase mb-0.5">{mapping.target}</div>
                  <div className="font-mono text-xs text-[var(--text-primary)] font-bold truncate">
                    {mapping.transformation === 'CONSTANT' ? `"${mapping.source}"` :
                      mapping.transformation === 'AUTO_GENERATE' ? `⚡ ${mapping.source}` :
                        mapping.source}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveMapping(mapping.target)}
                  className="text-gray-300 group-hover:text-red-500 p-1 hover:bg-red-50 rounded"
                  title="Eliminar"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
