import React, { useState, useEffect } from 'react';
import { getApiClient } from '@/services/api';
import { MappingConfig } from '../index';

interface SelectColumnsStepProps {
  config: MappingConfig;
  connectionId: string;
  onChange: (selectedColumns: string[]) => void;
}

interface ERPColumn {
  name: string;
  type: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
}

interface TableColumns {
  table: string;
  alias: string;
  columns: ERPColumn[];
}

/**
 * Paso 3: Seleccionar Qué Columnas Traer
 *
 * Usuario selecciona checkboxes de las columnas que necesita
 * Solo las columnas seleccionadas se incluirán en el SELECT
 */
export const SelectColumnsStep: React.FC<SelectColumnsStepProps> = ({
  config,
  connectionId,
  onChange,
}) => {
  const [tableColumns, setTableColumns] = useState<TableColumns[]>([]);
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
      const mainTableAlias = config.mainTableAlias || config.mainTable?.charAt(0).toLowerCase() || 'a';
      tableAliasMap[config.mainTable] = mainTableAlias;

      config.joins.forEach((join) => {
        tableAliasMap[join.table] = join.alias;
      });

      // Agrupar por tabla con alias
      const grouped: Record<string, TableColumns> = {};
      response.data.schemas.forEach((schema: any) => {
        grouped[schema.name] = {
          table: schema.name,
          alias: tableAliasMap[schema.name] || schema.name,
          columns: schema.columns,
        };
      });

      setTableColumns(tableNames.map((t) => grouped[t] || { table: t, alias: tableAliasMap[t] || t, columns: [] }));
    } catch (err: any) {
      setError(`Error cargando columnas: ${err.message}`);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getColumnFullName = (table: string, alias: string, columnName: string) => {
    return `${alias}.${columnName}`;
  };

  const isColumnSelected = (fullName: string) => {
    return config.selectedColumns.includes(fullName);
  };

  const handleToggleColumn = (table: string, alias: string, columnName: string) => {
    const fullName = getColumnFullName(table, alias, columnName);
    if (isColumnSelected(fullName)) {
      onChange(config.selectedColumns.filter((c) => c !== fullName));
    } else {
      onChange([...config.selectedColumns, fullName]);
    }
  };

  const handleSelectAllFromTable = (table: string) => {
    const tableData = tableColumns.find((t) => t.table === table);
    if (!tableData) return;

    const allColumnNames = tableData.columns.map((c) =>
      getColumnFullName(table, tableData.alias, c.name)
    );

    // Si todos están seleccionados, deseleccionar; si no, seleccionar todos
    const allSelected = allColumnNames.every((name) => isColumnSelected(name));

    const aliasPrefix = tableData.alias + '.';
    if (allSelected) {
      onChange(
        config.selectedColumns.filter((c) => !c.startsWith(aliasPrefix))
      );
    } else {
      const withoutTable = config.selectedColumns.filter(
        (c) => !c.startsWith(aliasPrefix)
      );
      onChange([...withoutTable, ...allColumnNames]);
    }
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

      <p className="text-gray-700">
        Selecciona las columnas que necesitas traer del ERP. Solo las seleccionadas se
        incluirán en la consulta.
      </p>

      <div className="space-y-4">
        {tableColumns.map((tableData) => {
          const tableSelectionCount = tableData.columns.filter((col) =>
            isColumnSelected(getColumnFullName(tableData.table, tableData.alias, col.name))
          ).length;

          const allSelected =
            tableSelectionCount === tableData.columns.length &&
            tableData.columns.length > 0;

          return (
            <div key={tableData.table} className="border border-gray-300 rounded p-4">
              {/* Tabla Header */}
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => handleSelectAllFromTable(tableData.table)}
                  className="w-4 h-4 text-blue-600"
                />
                <h3 className="font-semibold text-lg text-blue-600">
                  {tableData.table} (alias: <span className="text-orange-600">{tableData.alias}</span>)
                </h3>
                <span className="text-sm text-gray-600">
                  ({tableSelectionCount} de {tableData.columns.length} seleccionadas)
                </span>
              </div>

              {/* Columnas */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-7">
                {tableData.columns.map((column) => {
                  const fullName = getColumnFullName(tableData.table, tableData.alias, column.name);
                  const isSelected = isColumnSelected(fullName);

                  return (
                    <label key={fullName} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          handleToggleColumn(tableData.table, tableData.alias, column.name)
                        }
                        className="w-4 h-4 text-blue-600"
                      />
                      <div>
                        <span className="text-sm">
                          {column.name}
                          {column.isPrimaryKey && (
                            <span className="ml-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                              PK
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">
                          ({column.type})
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Resumen */}
      {config.selectedColumns.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">✓ Columnas Seleccionadas ({config.selectedColumns.length})</h3>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <ul className="space-y-1">
              {config.selectedColumns.map((col) => (
                <li key={col} className="text-sm text-gray-700">
                  ✓ {col}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Preview SQL */}
      {config.selectedColumns.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">📝 Preview SQL</h3>
          <div className="p-4 bg-gray-900 text-green-400 rounded font-mono text-sm overflow-auto max-h-48">
            <pre>
              {`SELECT\n  ${config.selectedColumns.join(',\n  ')}\nFROM ...`}
            </pre>
          </div>
        </div>
      )}

      {config.selectedColumns.length === 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded">
          ⚠️ Debes seleccionar al menos una columna para continuar.
        </div>
      )}
    </div>
  );
};
