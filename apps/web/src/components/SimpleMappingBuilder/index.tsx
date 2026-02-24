import React, { useState } from 'react';
import { TablesAndJoinsStep } from './steps/TablesAndJoinsStep';
import { FiltersStep } from './steps/FiltersStep';
import { SelectColumnsStep } from './steps/SelectColumnsStep';
import { FieldMappingStep } from './steps/FieldMappingStep';

export interface TableJoin {
  table: string;
  alias: string;
  joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  joinCondition: string;
}

export interface Filter {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'IN' | 'LIKE' | 'BETWEEN';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface FieldMapping {
  source: string;
  target: string;
  dataType: 'string' | 'number' | 'date' | 'boolean';
  transformation?: string;
}

export interface MappingConfig {
  id?: string;
  connectionId: string;
  datasetType: 'ITEMS' | 'STOCK' | 'PRICES' | 'COST';
  mainTable: string;
  mainTableAlias?: string; // Alias de la tabla principal (ej: 'a', 'c')
  joins: TableJoin[];
  filters: Filter[];
  selectedColumns: string[];
  fieldMappings: FieldMapping[];
  isActive?: boolean;
  version?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SimpleMappingBuilderProps {
  connectionId: string;
  datasetType: 'ITEMS' | 'STOCK' | 'PRICES' | 'COST';
  onSave: (config: MappingConfig) => Promise<void>;
  initialConfig?: Partial<MappingConfig>;
}

type Step = 1 | 2 | 3 | 4;

/**
 * SimpleMappingBuilder - Constructor de Mappings Paso a Paso
 *
 * Pasos:
 * 1. Seleccionar tablas y JOINs
 * 2. Agregar filtros
 * 3. Seleccionar columnas
 * 4. Mapear campos ERP ↔ Local
 */
export const SimpleMappingBuilder: React.FC<SimpleMappingBuilderProps> = ({
  connectionId,
  datasetType,
  onSave,
  initialConfig,
}) => {
  const [step, setStep] = useState<Step>(1);
  const [config, setConfig] = useState<MappingConfig>({
    connectionId,
    datasetType,
    mainTable: initialConfig?.mainTable || '',
    joins: initialConfig?.joins || [],
    filters: initialConfig?.filters || [],
    selectedColumns: initialConfig?.selectedColumns || [],
    fieldMappings: initialConfig?.fieldMappings || [],
    ...initialConfig,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    if (step < 4) {
      setStep((step + 1) as Step);
      setError(null);
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
      setError(null);
    }
  };

  /**
   * Valida que los JOINs sean correctos y no tengan patrones corruptos
   */
  const validateJoins = (): string | null => {
    // Crear mapa de aliases válidos
    const mainTableName = config.mainTable.split('.').pop() || config.mainTable;
    const mainTableAlias = mainTableName.charAt(0).toLowerCase();
    const validAliases = new Set([mainTableAlias]); // Agregar alias de tabla principal

    // Agregar aliases de JOINs
    for (const join of config.joins) {
      if (join.alias) {
        validAliases.add(join.alias);
      }
    }

    console.log('🔍 [validateJoins] Valid aliases:', Array.from(validAliases));

    for (const join of config.joins) {
      // 1. Validar que la tabla existe
      if (!join.table || join.table.trim() === '') {
        return `❌ JOIN #${config.joins.indexOf(join) + 1}: Tabla no seleccionada`;
      }

      // 2. Validar que tiene alias
      if (!join.alias || join.alias.trim() === '') {
        return `❌ JOIN #${config.joins.indexOf(join) + 1}: Alias vacío para tabla "${join.table}"`;
      }

      // 3. Validar que la condición existe
      if (!join.joinCondition || join.joinCondition.trim() === '') {
        return `❌ JOIN #${config.joins.indexOf(join) + 1}: Condición vacía para tabla "${join.table}"`;
      }

      const condition = join.joinCondition.trim();

      // 4. Validar patrones corruptos: tabla.alias = alias.alias (ej: a.a = ap.ap)
      const parts = condition.split('=').map((p) => p.trim());
      if (parts.length !== 2) {
        return `❌ JOIN #${config.joins.indexOf(join) + 1}: Condición debe tener un signo "=" (ej: a.id = eb.id)`;
      }

      for (const part of parts) {
        // Patrón: alias.campo
        const fieldParts = part.split('.').map((p) => p.trim());
        if (fieldParts.length !== 2) {
          return `❌ JOIN #${config.joins.indexOf(join) + 1}: Campo mal formado "${part}" (debe ser: tabla.campo o alias.campo)`;
        }

        const [tableOrAlias, fieldName] = fieldParts;

        // 5. Validar que el alias no es igual al campo (corrupto: a.a, ap.ap)
        if (tableOrAlias === fieldName) {
          return `❌ JOIN #${config.joins.indexOf(join) + 1}: Condición corrupta "${part}" (tabla/alias no puede ser igual al campo)`;
        }

        // 6. Validar que el alias usado existe en validAliases
        if (!validAliases.has(tableOrAlias)) {
          return `❌ JOIN #${config.joins.indexOf(join) + 1}: Alias "${tableOrAlias}" no válido. Alias válidos: ${Array.from(validAliases).join(', ')}`;
        }
      }
    }

    return null;
  };

  const handleSave = async () => {
    // Validar campos requeridos
    console.log('handleSave - config actual:', config);
    console.log('handleSave - mainTable:', config.mainTable);
    console.log('handleSave - fieldMappings:', config.fieldMappings);
    console.log('handleSave - fieldMappings.length:', config.fieldMappings.length);

    if (!config.mainTable) {
      setError('❌ Debe seleccionar una tabla principal. Config: ' + JSON.stringify(config));
      return;
    }

    // Validar JOINs
    const joinError = validateJoins();
    if (joinError) {
      setError(joinError);
      return;
    }

    if (config.fieldMappings.length === 0) {
      setError('❌ Debe crear al menos un mapeo de campo. FieldMappings: ' + JSON.stringify(config.fieldMappings));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🔄 [SimpleMappingBuilder] Calling onSave with config:', config);
      await onSave(config);
      console.log('✅ [SimpleMappingBuilder] Save completed successfully');
    } catch (err: any) {
      console.error('❌ [SimpleMappingBuilder] Save failed:', err);
      setError(err.message || 'Error al guardar el mapping');
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = (s: Step) => {
    switch (s) {
      case 1:
        return '📋 Paso 1: Seleccionar Tablas y JOINs';
      case 2:
        return '🔍 Paso 2: Agregar Filtros';
      case 3:
        return '✓ Paso 3: Seleccionar Columnas';
      case 4:
        return '🔗 Paso 4: Mapear Campos';
      default:
        return '';
    }
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{getStepTitle(step)}</h2>
        <p className="text-gray-600 mt-2">
          Paso {step} de 4 - {config.datasetType}
        </p>
        {/* Progress Bar */}
        <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="mb-8">
        {step === 1 && (
          <TablesAndJoinsStep
            config={config}
            connectionId={connectionId}
            onChange={(mainTable, joins, mainTableAlias) => {
              setConfig({
                ...config,
                mainTable,
                joins,
                mainTableAlias,
              });
            }}
          />
        )}

        {step === 2 && (
          <FiltersStep
            config={config}
            connectionId={connectionId}
            onChange={(filters) => {
              setConfig({
                ...config,
                filters,
              });
            }}
          />
        )}

        {step === 3 && (
          <SelectColumnsStep
            config={config}
            connectionId={connectionId}
            onChange={(selectedColumns) => {
              setConfig({
                ...config,
                selectedColumns,
              });
            }}
          />
        )}

        {step === 4 && (
          <FieldMappingStep
            config={config}
            connectionId={connectionId}
            onChange={(fieldMappings) => {
              setConfig({
                ...config,
                fieldMappings,
              });
            }}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between gap-4">
        <button
          onClick={handlePrev}
          disabled={step === 1}
          className="px-6 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Anterior
        </button>

        <div className="flex gap-4">
          {step < 4 && (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Siguiente →
            </button>
          )}

          {step === 4 && (
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : '✓ Guardar Mapping'}
            </button>
          )}
        </div>
      </div>

      {/* Debug Info (desarrollo) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-6 p-4 bg-gray-100 rounded text-xs">
          <summary className="cursor-pointer font-bold">Configuración Actual (DEBUG)</summary>
          <pre className="mt-2 overflow-auto">{JSON.stringify(config, null, 2)}</pre>
        </details>
      )}
    </div>
  );
};
