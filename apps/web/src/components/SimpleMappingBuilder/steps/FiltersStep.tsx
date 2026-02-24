import React, { useState, useEffect } from 'react';
import { getApiClient } from '@/services/api';
import { MappingConfig, Filter } from '../index';

interface FiltersStepProps {
  config: MappingConfig;
  connectionId: string;
  onChange: (filters: Filter[]) => void;
}

interface ERPColumn {
  name: string;
  type: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
}

/**
 * Paso 2: Agregar Filtros (WHERE clause)
 *
 * Usuario agrega filtros para limitar qué registros traer
 * Ej: ARTICULO.estado = 'ACTIVO' AND existencia_bodega.cantidad > 0
 */
export const FiltersStep: React.FC<FiltersStepProps> = ({
  config,
  connectionId,
  onChange,
}) => {
  const [availableColumns, setAvailableColumns] = useState<
    Array<{ table: string; column: ERPColumn; alias: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiClient = getApiClient();

  // Cargar esquemas de tablas
  useEffect(() => {
    if (config.mainTable) {
      loadTableSchemas();
    }
  }, [config.mainTable, config.joins]);

  const loadTableSchemas = async () => {
    try {
      setLoading(true);
      setError(null);

      const tableNames = [config.mainTable, ...config.joins.map((j) => j.table)];

      const response = await apiClient.post(
        `/erp-connections/${connectionId}/table-schemas`,
        { tableNames }
      );

      // Crear mapa de tabla → alias
      const tableAliasMap: Record<string, string> = {};
      // Usar el alias definido por el usuario, o generar uno
      const mainTableAlias = config.mainTableAlias || config.mainTable?.charAt(0).toLowerCase() || 'a';
      tableAliasMap[config.mainTable] = mainTableAlias;

      // Mapear alias de los JOINs
      config.joins.forEach((join) => {
        tableAliasMap[join.table] = join.alias;
      });

      const columns: Array<{ table: string; column: ERPColumn; alias: string }> = [];
      response.data.schemas.forEach((schema: any) => {
        schema.columns.forEach((col: ERPColumn) => {
          const alias = tableAliasMap[schema.name] || schema.name;
          columns.push({ table: schema.name, column: col, alias });
        });
      });

      setAvailableColumns(columns);
    } catch (err: any) {
      setError(`Error cargando columnas: ${err.message}`);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFilter = () => {
    const newFilter: Filter = {
      field: '',
      operator: '=',
      value: '',
      logicalOperator: 'AND',
    };
    onChange([...config.filters, newFilter]);
  };

  const handleUpdateFilter = (index: number, updatedFilter: Partial<Filter>) => {
    const newFilters = [...config.filters];
    newFilters[index] = { ...newFilters[index], ...updatedFilter };
    onChange(newFilters);
  };

  const handleRemoveFilter = (index: number) => {
    const newFilters = config.filters.filter((_, i) => i !== index);
    onChange(newFilters);
  };

  if (loading) {
    return <div className="text-center py-8">Cargando columnas...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">🔍 Filtros (WHERE clause)</h3>
          <button
            onClick={handleAddFilter}
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
          >
            + Agregar Filtro
          </button>
        </div>

        {config.filters.length === 0 ? (
          <p className="text-gray-500 py-4">
            Sin filtros. Los datos no están filtrados. Click en "+ Agregar Filtro" para limitar.
          </p>
        ) : (
          <div className="space-y-3">
            {config.filters.map((filter, index) => (
              <div
                key={index}
                className="p-4 border border-gray-300 rounded bg-gray-50 flex gap-4 items-end"
              >
                {/* Operador lógico (AND/OR) */}
                {index > 0 && (
                  <div className="flex-shrink-0">
                    <select
                      value={filter.logicalOperator || 'AND'}
                      onChange={(e) =>
                        handleUpdateFilter(index, {
                          logicalOperator: e.target.value as 'AND' | 'OR',
                        })
                      }
                      className="px-2 py-2 border border-gray-300 rounded text-sm"
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                  </div>
                )}

                {/* Campo */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campo
                  </label>
                  <select
                    value={filter.field}
                    onChange={(e) =>
                      handleUpdateFilter(index, { field: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  >
                    <option value="">-- Selecciona campo --</option>
                    {availableColumns.map((col) => {
                      const fieldRef = `${col.alias}.${col.column.name}`;
                      return (
                        <option key={fieldRef} value={fieldRef}>
                          {col.alias}.{col.column.name} ({col.column.type})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Operador */}
                <div className="flex-shrink-0">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Operador
                  </label>
                  <select
                    value={filter.operator}
                    onChange={(e) =>
                      handleUpdateFilter(index, {
                        operator: e.target.value as Filter['operator'],
                      })
                    }
                    className="px-3 py-2 border border-gray-300 rounded text-sm"
                  >
                    <option value="=">=</option>
                    <option value="!=">!=</option>
                    <option value=">">{">"}</option>
                    <option value="<">{"<"}</option>
                    <option value=">=">{">="}</option>
                    <option value="<=">{">="}</option>
                    <option value="IN">IN</option>
                    <option value="LIKE">LIKE</option>
                    <option value="BETWEEN">BETWEEN</option>
                  </select>
                </div>

                {/* Valor */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor
                  </label>
                  <input
                    type="text"
                    value={filter.value}
                    onChange={(e) =>
                      handleUpdateFilter(index, { value: e.target.value })
                    }
                    placeholder="ej: ACTIVO, 0, 100"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>

                {/* Eliminar */}
                <button
                  onClick={() => handleRemoveFilter(index)}
                  className="px-3 py-2 text-red-500 hover:text-red-700 text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview SQL */}
      {config.filters.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">📝 Preview SQL</h3>
          <div className="p-4 bg-gray-900 text-green-400 rounded font-mono text-sm overflow-auto">
            <pre>
              WHERE{' '}
              {config.filters
                .map((f, i) => {
                  const logicalOp = i === 0 ? '' : `${f.logicalOperator} `;
                  return `${logicalOp}${f.field} ${f.operator} '${f.value}'`;
                })
                .join('\n')}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
