import React, { useState, useEffect } from 'react';
import { getApiClient } from '@/services/api';
import { MappingConfig, TableJoin } from '../index';

interface TablesAndJoinsStepProps {
  config: MappingConfig;
  connectionId: string;
  onChange: (mainTable: string, joins: TableJoin[], mainTableAlias?: string) => void;
}

interface ERPTable {
  name: string;
  label?: string;
  columnCount: number;
}

/**
 * Paso 1: Seleccionar Tabla Principal y Agregar JOINs
 *
 * Usuario:
 * 1. Selecciona tabla principal (ej: ARTICULO)
 * 2. Agrega JOINs adicionales (ej: EXISTENCIA_BODEGA, ARTICULO_PRECIO)
 * 3. Configura la condición de JOIN
 */
export const TablesAndJoinsStep: React.FC<TablesAndJoinsStepProps> = ({
  config,
  connectionId,
  onChange,
}) => {
  const [availableTables, setAvailableTables] = useState<ERPTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiClient = getApiClient();

  // Cargar tablas disponibles
  useEffect(() => {
    loadAvailableTables();
  }, [connectionId]);

  const loadAvailableTables = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(
        `/erp-connections/${connectionId}/tables`
      );
      setAvailableTables(response.data.tables || []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message ||
                          err.response?.data?.message ||
                          err.message ||
                          'Error desconocido al cargar tablas';

      // Proporcionar contexto adicional según el tipo de error
      let userFriendlyMessage = `❌ Error cargando tablas: ${errorMessage}`;

      if (err.response?.status === 500 && errorMessage.includes('Failed to connect')) {
        userFriendlyMessage = `⚠️ No se puede conectar con la BD del ERP. Verifica:
- El servidor está disponible
- Las credenciales son correctas
- El puerto es accesible
- El nombre de la base de datos existe

Error: ${errorMessage}`;
      } else if (err.response?.status === 404) {
        userFriendlyMessage = `❌ Conexión no encontrada. Por favor, configura una conexión ERP primero.`;
      }

      setError(userFriendlyMessage);
      console.error('Error cargando tablas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMainTable = (tableName: string) => {
    // Si es la primera vez que selecciona tabla, sugerir alias (primera letra)
    const suggestedAlias = config.mainTableAlias || tableName.charAt(0).toLowerCase();
    onChange(tableName, config.joins, suggestedAlias);
  };

  const handleAddJoin = () => {
    const newJoin: TableJoin = {
      table: '',
      alias: '',
      joinType: 'LEFT',
      joinCondition: '',
    };
    onChange(config.mainTable, [...config.joins, newJoin], config.mainTableAlias);
  };

  const handleUpdateJoin = (index: number, updatedJoin: Partial<TableJoin>) => {
    const newJoins = [...config.joins];
    newJoins[index] = { ...newJoins[index], ...updatedJoin };
    onChange(config.mainTable, newJoins, config.mainTableAlias);
  };

  const handleRemoveJoin = (index: number) => {
    const newJoins = config.joins.filter((_, i) => i !== index);
    onChange(config.mainTable, newJoins, config.mainTableAlias);
  };

  /**
   * Valida un JOIN individual y retorna mensaje de error si es inválido
   */
  const validateJoin = (join: TableJoin, index: number): string | null => {
    // Validar que la tabla existe
    if (!join.table || join.table.trim() === '') {
      return `Tabla no seleccionada`;
    }

    // Validar que tiene alias
    if (!join.alias || join.alias.trim() === '') {
      return `Alias vacío`;
    }

    // Validar que la condición existe
    if (!join.joinCondition || join.joinCondition.trim() === '') {
      return `Condición vacía`;
    }

    const condition = join.joinCondition.trim();
    const parts = condition.split('=').map((p) => p.trim());

    if (parts.length !== 2) {
      return `Condición debe tener un "=" (ej: a.id = eb.id)`;
    }

    for (const part of parts) {
      const fieldParts = part.split('.').map((p) => p.trim());
      if (fieldParts.length !== 2) {
        return `Campo mal formado: "${part}"`;
      }

      const [tableOrAlias, fieldName] = fieldParts;

      // Validar que el alias no es igual al campo
      if (tableOrAlias === fieldName) {
        return `Condición corrupta: "${part}" (no puede ser igual)`;
      }
    }

    return null;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin inline-block w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full mb-2"></div>
        <p>🔄 Conectando con BD del ERP...</p>
        <p className="text-sm text-gray-600 mt-2">Esto puede tomar unos segundos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <p className="whitespace-pre-wrap mb-3">{error}</p>
          <button
            onClick={loadAvailableTables}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            🔄 Reintentar Conexión
          </button>
        </div>
      )}

      {/* Tabla Principal */}
      <div>
        <h3 className="text-lg font-semibold mb-3">📊 Tabla Principal</h3>

        {availableTables.length === 0 && !error && (
          <p className="text-sm text-gray-600 mb-3">Cargando tablas disponibles...</p>
        )}

        {error && (
          <div className="mb-3 p-3 bg-yellow-50 border border-yellow-400 rounded text-sm">
            <p className="text-yellow-800 mb-2">💡 Como alternativa, puedes escribir el nombre de la tabla manualmente:</p>
          </div>
        )}

        {availableTables.length > 0 ? (
          <select
            value={config.mainTable}
            onChange={(e) => handleSelectMainTable(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded bg-white"
          >
            <option value="">-- Selecciona una tabla --</option>
            {availableTables.map((table) => (
              <option key={table.name} value={table.name}>
                {table.label || table.name} ({table.columnCount} columnas)
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={config.mainTable}
            onChange={(e) => handleSelectMainTable(e.target.value)}
            placeholder="Ej: ARTICULO, dbo.ITEMS, etc."
            className="w-full px-4 py-2 border border-gray-300 rounded bg-white"
          />
        )}

        {config.mainTable && (
          <p className="text-sm text-gray-600 mt-2">
            ✓ Tabla seleccionada: <strong>{config.mainTable}</strong>
          </p>
        )}
      </div>

      {/* Alias de Tabla Principal */}
      {config.mainTable && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            📌 Alias de tabla principal (ej: a, c, art)
          </label>
          <input
            type="text"
            value={config.mainTableAlias || ''}
            onChange={(e) => onChange(config.mainTable, config.joins, e.target.value)}
            placeholder="Ej: a, c, art"
            maxLength={10}
            className="w-full px-4 py-2 border border-gray-300 rounded bg-white"
          />
          <p className="text-xs text-gray-500 mt-1">
            Este alias se usará en los JOINs, filtros y selección de columnas
          </p>
        </div>
      )}

      {/* JOINs */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">🔗 JOINs (Opcional)</h3>
          <button
            onClick={handleAddJoin}
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
          >
            + Agregar JOIN
          </button>
        </div>

        {config.joins.length === 0 ? (
          <p className="text-gray-500 py-4">Sin JOINs agregados. Click en "+ Agregar JOIN" para añadir.</p>
        ) : (
          <div className="space-y-4">
            {config.joins.map((join, index) => {
              const joinError = validateJoin(join, index);
              return (
                <div key={index} className={`p-4 border rounded ${joinError ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold">
                      JOIN #{index + 1} {joinError && <span className="text-red-600 text-sm ml-2">⚠️ {joinError}</span>}
                    </h4>
                    <button
                      onClick={() => handleRemoveJoin(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      ✕ Eliminar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Tabla */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tabla
                      </label>
                      {availableTables.length > 0 ? (
                        <select
                          value={join.table}
                          onChange={(e) =>
                            handleUpdateJoin(index, { table: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        >
                          <option value="">-- Selecciona tabla --</option>
                          {availableTables
                            .filter((t) => t.name !== config.mainTable)
                            .map((table) => (
                              <option key={table.name} value={table.name}>
                                {table.label || table.name}
                              </option>
                            ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={join.table}
                          onChange={(e) =>
                            handleUpdateJoin(index, { table: e.target.value })
                          }
                          placeholder="Ej: EXISTENCIA_BODEGA"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        />
                      )}
                    </div>

                    {/* Alias */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Alias (ej: eb, ap)
                      </label>
                      <input
                        type="text"
                        value={join.alias}
                        onChange={(e) =>
                          handleUpdateJoin(index, { alias: e.target.value })
                        }
                        placeholder="eb"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                    </div>

                    {/* Tipo JOIN */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo
                      </label>
                      <select
                        value={join.joinType}
                        onChange={(e) =>
                          handleUpdateJoin(index, {
                            joinType: e.target.value as TableJoin['joinType'],
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      >
                        <option value="INNER">INNER JOIN</option>
                        <option value="LEFT">LEFT JOIN</option>
                        <option value="RIGHT">RIGHT JOIN</option>
                        <option value="FULL">FULL JOIN</option>
                      </select>
                    </div>
                  </div>

                  {/* Condición JOIN */}
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Condición (ej: ARTICULO.id = eb.articulo_id)
                    </label>
                    <input
                      type="text"
                      value={join.joinCondition}
                      onChange={(e) =>
                        handleUpdateJoin(index, { joinCondition: e.target.value })
                      }
                      placeholder="ARTICULO.id = eb.articulo_id"
                      className={`w-full px-3 py-2 border rounded text-sm font-mono ${joinError ? 'border-red-400' : 'border-gray-300'}`}
                    />
                    {!joinError && join.joinCondition && (
                      <p className="text-xs text-green-600 mt-1">✓ Condición válida</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview SQL */}
      {config.mainTable && (
        <div>
          <h3 className="text-lg font-semibold mb-3">📝 Preview SQL</h3>
          <div className="p-4 bg-gray-900 text-green-400 rounded font-mono text-sm overflow-auto">
            <pre>
              {(() => {
                // Usar el alias definido por el usuario, o sugerir uno
                const mainTableAlias = config.mainTableAlias || config.mainTable.charAt(0).toLowerCase();

                return `SELECT *\nFROM ${config.mainTable} ${mainTableAlias}${
                  config.joins
                    .map(
                      (j) =>
                        `\n${j.joinType} JOIN ${j.table} ${j.alias}\n  ON ${j.joinCondition}`
                    )
                    .join('')
                }`;
              })()}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
