import React, { useState, useEffect } from 'react';
import { getApiClient } from '@/services/api';

interface TableJoin {
  name: string;
  alias: string;
  joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  joinCondition: string;
}

interface Filter {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'IN' | 'LIKE' | 'BETWEEN';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

interface QueryBuilderState {
  mainTable: { name: string; alias: string };
  selectedColumns: string[];
  joins: TableJoin[];
  filters: Filter[];
  orderBy?: Array<{ field: string; direction: 'ASC' | 'DESC' }>;
  limit?: number;
}

interface QueryBuilderProps {
  query: QueryBuilderState; // ← AHORA ES PROP (CONTROLADO)
  onChange: (query: QueryBuilderState) => void;
  onPreview: (query: QueryBuilderState) => void;
  connectionId: string; // Requerido para obtener datos dinámicos del ERP
}

interface ERPTable {
  name: string;
  label?: string;
  columnCount: number;
}

interface ERPColumn {
  name: string;
  type: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  maxLength?: number;
}

export const QueryBuilder: React.FC<QueryBuilderProps> = ({
  query, // ← RECIBIR COMO PROP
  onChange,
  onPreview,
  connectionId,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  // ✅ YA NO HAY setQuery - solo usamos la prop del padre

  // Estado para datos dinámicos del ERP
  const [availableTables, setAvailableTables] = useState<ERPTable[]>([]);
  const [tableSchemas, setTableSchemas] = useState<Record<string, ERPColumn[]>>({});
  const [availableColumns, setAvailableColumns] = useState<Array<{ table: string; column: ERPColumn }>>([]);
  const [previewSQL, setPreviewSQL] = useState<string>('');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const apiClient = getApiClient();

  // Cargar tablas disponibles del ERP al iniciar
  useEffect(() => {
    if (connectionId) {
      fetchAvailableTables();
    }
  }, [connectionId]);

  // Cargar schema cuando cambia la tabla principal o joins
  useEffect(() => {
    if (query.mainTable.name) {
      fetchTableSchemas([
        query.mainTable.name,
        ...query.joins.map(j => j.name),
      ]);
    }
  }, [query.mainTable, query.joins]);

  const fetchAvailableTables = async () => {
    try {
      setLoadingTables(true);
      setError(null);
      const response = await apiClient.get(
        `/erp-connections/${connectionId}/tables`
      );
      setAvailableTables(response.data.tables || []);
    } catch (err: any) {
      setError(`Error cargando tablas: ${err.message}`);
      console.error('Error fetching tables:', err);
    } finally {
      setLoadingTables(false);
    }
  };

  const fetchTableSchemas = async (tableNames: string[]) => {
    try {
      setLoadingSchema(true);
      setError(null);
      const response = await apiClient.post(
        `/erp-connections/${connectionId}/table-schemas`,
        { tableNames }
      );

      const schemas: Record<string, ERPColumn[]> = {};
      const allColumns: Array<{ table: string; column: ERPColumn }> = [];

      response.data.schemas.forEach((schema: { name: string; columns: ERPColumn[] }) => {
        schemas[schema.name] = schema.columns;
        schema.columns.forEach(col => {
          allColumns.push({ table: schema.name, column: col });
        });
      });

      setTableSchemas(schemas);
      setAvailableColumns(allColumns);
    } catch (err: any) {
      setError(`Error cargando schema: ${err.message}`);
      console.error('Error fetching schemas:', err);
    } finally {
      setLoadingSchema(false);
    }
  };

  const handleSelectTable = (tableName: string) => {
    const newQuery = {
      ...query,
      mainTable: { name: tableName, alias: 'a' },
      selectedColumns: [],
      joins: [],
      filters: [],
    };
    // ✅ SOLO llamar onChange - El padre actualiza el estado
    onChange(newQuery);
    setStep(2);
  };

  const handleSelectColumns = (columns: string[]) => {
    const newQuery = { ...query, selectedColumns: columns };
    // ✅ SOLO onChange
    onChange(newQuery);
    setStep(3);
  };

  const addJoin = (table: string, alias: string, condition: string, joinType: TableJoin['joinType']) => {
    const newQuery = {
      ...query,
      joins: [
        ...query.joins,
        { name: table, alias, joinCondition: condition, joinType },
      ],
    };
    // ✅ SOLO onChange
    onChange(newQuery);
  };

  const removeJoin = (idx: number) => {
    const newQuery = {
      ...query,
      joins: query.joins.filter((_, i) => i !== idx),
    };
    // ✅ SOLO onChange
    onChange(newQuery);
  };

  const addFilter = (filter: Filter) => {
    const newQuery = {
      ...query,
      filters: [...query.filters, filter],
    };
    // ✅ SOLO onChange
    onChange(newQuery);
  };

  const removeFilter = (idx: number) => {
    const newQuery = {
      ...query,
      filters: query.filters.filter((_, i) => i !== idx),
    };
    // ✅ SOLO onChange
    onChange(newQuery);
  };

  // Función auxiliar para convertir nombres de tabla completamente calificados a referencias con alias
  const resolveFieldReference = (fieldName: string): string => {
    // fieldName viene como "catelli.ARTICULO_PRECIO.VERSION" o "ARTICULO_PRECIO.VERSION"
    // Necesitamos convertirlo a "ap.VERSION" (usando el alias)

    if (!fieldName) return fieldName;

    const parts = fieldName.split('.');
    if (parts.length === 3) {
      // Schema.Table.Column
      const [schema, table, column] = parts;
      const fullTableName = `${schema}.${table}`;

      // Buscar el alias de esta tabla
      if (query.mainTable.name === fullTableName) {
        return `${query.mainTable.alias}.${column}`;
      }

      const joinTable = query.joins.find(j => j.name === fullTableName);
      if (joinTable) {
        return `${joinTable.alias}.${column}`;
      }
    } else if (parts.length === 2) {
      // Table.Column - buscar la tabla en los joins o tabla principal
      const [table, column] = parts;

      // Buscar en tabla principal
      const mainTableName = query.mainTable.name.split('.').pop(); // Obtener el último segment
      if (mainTableName === table) {
        return `${query.mainTable.alias}.${column}`;
      }

      // Buscar en joins
      const joinTable = query.joins.find(j => j.name.split('.').pop() === table);
      if (joinTable) {
        return `${joinTable.alias}.${column}`;
      }
    }

    // Si no se puede resolver, retornar tal cual (para mantener compatibilidad)
    return fieldName;
  };

  // Función para procesar condiciones de JOIN (que pueden contener referencias completamente calificadas)
  const resolveJoinCondition = (condition: string): string => {
    // Reemplazar referencias completamente calificadas en la condición del JOIN
    // Ejemplo: "catelli.ARTICULO_PRECIO.ID = catelli.ARTICULO_PRECIO_DETAIL.ARTICULO_ID"
    // Convertir a: "ap.ID = apd.ARTICULO_ID"

    // Regex para encontrar referencias Schema.Table.Column
    const schemaTableColumnRegex = /(\w+\.\w+\.\w+)/g;
    let resolved = condition;

    resolved = resolved.replace(schemaTableColumnRegex, (match) => {
      return resolveFieldReference(match);
    });

    return resolved;
  };

  const generatePreviewSQL = () => {
    // Procesar columnas seleccionadas
    const processedColumns = query.selectedColumns.length > 0
      ? query.selectedColumns.map(col => resolveFieldReference(col)).join(', ')
      : '*';

    let sql = `SELECT ${processedColumns}\nFROM ${query.mainTable.name} ${query.mainTable.alias}`;

    if (query.joins.length > 0) {
      query.joins.forEach(join => {
        const resolvedCondition = resolveJoinCondition(join.joinCondition);
        sql += `\n${join.joinType} JOIN ${join.name} ${join.alias} ON ${resolvedCondition}`;
      });
    }

    if (query.filters.length > 0) {
      sql += '\nWHERE ';
      sql += query.filters
        .map((f, i) => {
          const prefix = i === 0 ? '' : `${f.logicalOperator || 'AND'} `;
          const resolvedField = resolveFieldReference(f.field);
          return `${prefix}${resolvedField} ${f.operator} '${f.value}'`;
        })
        .join(' ');
    }

    if (query.orderBy && query.orderBy.length > 0) {
      sql += `\nORDER BY ${query.orderBy.map(o => {
        const resolvedField = resolveFieldReference(o.field);
        return `${resolvedField} ${o.direction}`;
      }).join(', ')}`;
    }

    // NO agregar LIMIT - el backend maneja MSSQL TOP syntax
    console.log('Generated SQL:', sql);
    setPreviewSQL(sql);
    return sql;
  };

  const handlePreview = async () => {
    // Generar SQL primero
    const generatedSQL = generatePreviewSQL();
    try {
      setPreviewLoading(true);
      setError(null);

      console.log('Sending to backend:', generatedSQL);

      // Ejecutar query contra ERP para obtener preview
      const response = await apiClient.post(
        `/erp-connections/${connectionId}/preview-query`,
        {
          sql: generatedSQL,
          limit: 10,
        }
      );
      console.log('Preview response:', response.data);
      setPreviewData(response.data.data || response.data || []);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message;
      setError(`Error ejecutando preview: ${errorMsg}`);
      console.error('Error previewing query:', err);
    } finally {
      setPreviewLoading(false);
    }
    onPreview(query);
  };

  const handleSaveMapping = () => {
    // Validar que haya al menos tabla y una columna
    if (!query.mainTable?.name) {
      setSaveMessage({ text: 'Debe seleccionar una tabla principal', type: 'error' });
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }
    if (query.selectedColumns.length === 0) {
      setSaveMessage({ text: 'Debe seleccionar al menos una columna', type: 'error' });
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    // Llamar onChange para actualizar al padre
    onChange(query);

    // Mostrar mensaje de éxito
    setSaveMessage({ text: '✅ Query actualizada correctamente', type: 'success' });
    setTimeout(() => setSaveMessage(null), 2000);
  };

  // Obtener columnas para la tabla actual
  const getColumnsForTable = (tableName: string): ERPColumn[] => {
    return tableSchemas[tableName] || [];
  };

  const getTableLabel = (tableName: string): string => {
    const table = availableTables.find(t => t.name === tableName);
    return table?.label || tableName;
  };

  // Convertir columnas disponibles a formato string para FilterBuilder
  const getAvailableFieldStrings = (): string[] => {
    return availableColumns.map(ac => `${ac.table}.${ac.column.name}`);
  };

  // Obtener tablas disponibles para JOINs (excluyendo la tabla principal)
  const getAvailableTablesForJoins = (): ERPTable[] => {
    const usedTables = [
      query.mainTable.name,
      ...query.joins.map(j => j.name),
    ];
    return availableTables.filter(t => !usedTables.includes(t.name));
  };

  const renderError = () => {
    if (!error) return null;
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
        ⚠️ {error}
      </div>
    );
  };

  const renderSaveMessage = () => {
    if (!saveMessage) return null;
    const bgColor = saveMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700';
    return (
      <div className={`p-3 border rounded text-sm ${bgColor}`}>
        {saveMessage.text}
      </div>
    );
  };

  const renderLoading = (message: string) => (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">
      ⏳ {message}
    </div>
  );

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg border border-gray-300">
      {renderError()}
      {renderSaveMessage()}

      {/* Indicador de paso */}
      <div className="flex items-center gap-2 justify-between bg-gray-100 p-3 rounded">
        <div className="flex gap-4">
          {[1, 2, 3, 4, 5].map(s => (
            <div key={s} className={`px-3 py-1 rounded text-sm font-semibold ${
              s === step
                ? 'bg-blue-600 text-white'
                : s < step
                ? 'bg-green-500 text-white'
                : 'bg-gray-300 text-gray-600'
            }`}>
              {s}
            </div>
          ))}
        </div>
        <span className="text-sm text-gray-600">
          Paso {step} de 5
        </span>
      </div>

      {/* PASO 1: Seleccionar tabla principal - DINÁMICO */}
      {step === 1 && (
        <div>
          <h3 className="text-lg font-bold mb-4">1️⃣ Selecciona la Tabla Principal</h3>

          {loadingTables && renderLoading('Cargando tablas del ERP...')}

          {!loadingTables && availableTables.length === 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-700">
              ⚠️ No se encontraron tablas en el ERP. Verifica la conexión.
            </div>
          )}

          {!loadingTables && availableTables.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {availableTables.map(table => (
                <button
                  key={table.name}
                  onClick={() => handleSelectTable(table.name)}
                  className="p-4 border-2 border-gray-300 rounded hover:border-blue-500 hover:bg-blue-50 text-left transition"
                >
                  <div className="font-semibold">{table.label || table.name}</div>
                  <div className="text-xs text-gray-600">{table.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {table.columnCount} columnas
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PASO 2: Seleccionar columnas - DINÁMICO */}
      {step === 2 && query.mainTable.name && (
        <div>
          <h3 className="text-lg font-bold mb-4">2️⃣ Selecciona las Columnas</h3>

          {loadingSchema && renderLoading('Cargando schema de la tabla...')}

          {!loadingSchema && (
            <div className="bg-gray-50 p-4 rounded border border-gray-200">
              <p className="text-sm text-gray-600 mb-3">
                Tabla: <strong>{getTableLabel(query.mainTable.name)}</strong> ({query.mainTable.alias})
              </p>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {getColumnsForTable(query.mainTable.name).map(col => (
                  <label key={col.name} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-100 rounded">
                    <input
                      type="checkbox"
                      checked={query.selectedColumns.includes(`${query.mainTable.alias}.${col.name}`)}
                      onChange={(e) => {
                        const fullName = `${query.mainTable.alias}.${col.name}`;
                        if (e.target.checked) {
                          handleSelectColumns([...query.selectedColumns, fullName]);
                        } else {
                          handleSelectColumns(query.selectedColumns.filter(c => c !== fullName));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">
                      <strong>{col.name}</strong>
                      <span className="text-gray-500 ml-2 text-xs">({col.type})</span>
                    </span>
                    {col.isPrimaryKey && (
                      <span className="text-xs bg-yellow-200 px-2 py-1 rounded ml-auto">PK</span>
                    )}
                  </label>
                ))}
              </div>
              {getColumnsForTable(query.mainTable.name).length === 0 && (
                <p className="text-sm text-gray-500">Sin columnas disponibles</p>
              )}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setStep(1)}
              className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setStep(3)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* PASO 3: Agregar JOINs */}
      {step === 3 && (
        <div>
          <h3 className="text-lg font-bold mb-4">3️⃣ Agregar JOINs (Opcional)</h3>

          <div className="space-y-4">
            {/* JOINs existentes */}
            {query.joins.length > 0 && (
              <div className="bg-blue-50 p-4 rounded border border-blue-200 space-y-2">
                {query.joins.map((join, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white border border-blue-300 rounded">
                    <div className="font-mono text-sm">
                      {join.joinType} JOIN {join.name} {join.alias} ON {join.joinCondition}
                    </div>
                    <button
                      onClick={() => removeJoin(idx)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Agregar nuevo JOIN */}
            <JoinBuilder
              onAdd={addJoin}
              existingTables={[query.mainTable.name, ...query.joins.map(j => j.name)]}
              availableTables={availableTables}
            />
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setStep(2)}
              className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setStep(4)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* PASO 4: Agregar FILTROs */}
      {step === 4 && (
        <div>
          <h3 className="text-lg font-bold mb-4">4️⃣ Agregar Filtros WHERE (Opcional)</h3>

          <div className="space-y-4">
            {/* FILTROs existentes */}
            {query.filters.length > 0 && (
              <div className="bg-green-50 p-4 rounded border border-green-200 space-y-2">
                {query.filters.map((filter, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white border border-green-300 rounded">
                    <div className="font-mono text-sm">
                      {idx > 0 && <span className="mr-2 text-orange-600">{filter.logicalOperator}</span>}
                      {filter.field} {filter.operator} {filter.value}
                    </div>
                    <button
                      onClick={() => removeFilter(idx)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Agregar nuevo FILTRO */}
            <FilterBuilder
              onAdd={addFilter}
              availableFields={getAvailableFieldStrings()}
            />
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setStep(3)}
              className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setStep(5)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* PASO 5: Preview y Guardar */}
      {step === 5 && (
        <div>
          <h3 className="text-lg font-bold mb-4">5️⃣ Preview y Guardar</h3>

          <div className="space-y-4">
            {/* SQL Preview */}
            <div className="bg-gray-900 p-4 rounded text-gray-100 font-mono text-xs overflow-x-auto">
              <pre>{previewSQL || 'Click "Vista Previa" para generar SQL'}</pre>
            </div>

            {/* Opciones */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Orden (ORDER BY)</label>
                <input
                  type="text"
                  placeholder="Ej: a.codigo ASC, a.nombre DESC"
                  value={query.orderBy?.map(o => `${o.field} ${o.direction}`).join(', ') || ''}
                  onChange={(e) => {
                    if (!e.target.value) {
                      onChange({ ...query, orderBy: [] });
                      return;
                    }
                    const parts = e.target.value.split(',').map(p => {
                      const trimmed = p.trim();
                      const lastSpace = trimmed.lastIndexOf(' ');
                      const field = trimmed.substring(0, lastSpace).trim() || trimmed;
                      const direction = (trimmed.substring(lastSpace + 1).trim() as 'ASC' | 'DESC') || 'ASC';
                      return { field, direction };
                    });
                    onChange({ ...query, orderBy: parts });
                  }}
                  className="w-full border border-gray-300 p-2 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Límite de Filas</label>
                <input
                  type="number"
                  value={query.limit}
                  onChange={(e) => onChange({ ...query, limit: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 p-2 rounded text-sm"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setStep(4)}
              className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
            >
              ← Anterior
            </button>
            <button
              onClick={handlePreview}
              className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
            >
              👁️ Vista Previa
            </button>
            <button
              onClick={handleSaveMapping}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              💾 Guardar Mapping
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente para agregar JOINs - DINÁMICO
const JoinBuilder: React.FC<{
  onAdd: (table: string, alias: string, condition: string, joinType: TableJoin['joinType']) => void;
  existingTables: string[];
  availableTables: ERPTable[];
}> = ({ onAdd, existingTables, availableTables }) => {
  const [table, setTable] = useState('');
  const [alias, setAlias] = useState('');
  const [condition, setCondition] = useState('');
  const [joinType, setJoinType] = useState<TableJoin['joinType']>('LEFT');

  const handleAdd = () => {
    if (table && alias && condition) {
      onAdd(table, alias, condition, joinType);
      setTable('');
      setAlias('');
      setCondition('');
      setJoinType('LEFT');
    }
  };

  const availableJoinTables = availableTables.filter((t: ERPTable) => !existingTables.includes(t.name));

  return (
    <div className="border-2 border-dashed border-gray-300 p-4 rounded bg-gray-50">
      <h4 className="font-semibold text-gray-700 mb-3">Agregar JOIN</h4>
      <div className="grid grid-cols-4 gap-2">
        <select
          value={table}
          onChange={(e) => setTable(e.target.value)}
          className="border border-gray-300 p-2 rounded text-sm"
        >
          <option value="">Selecciona tabla</option>
          {availableJoinTables.map((t: ERPTable) => (
            <option key={t.name} value={t.name}>{t.label || t.name}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Alias (ej: b)"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          className="border border-gray-300 p-2 rounded text-sm"
        />

        <select
          value={joinType}
          onChange={(e) => setJoinType(e.target.value as TableJoin['joinType'])}
          className="border border-gray-300 p-2 rounded text-sm"
        >
          <option value="INNER">INNER</option>
          <option value="LEFT">LEFT</option>
          <option value="RIGHT">RIGHT</option>
          <option value="FULL">FULL</option>
        </select>

        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Agregar
        </button>
      </div>

      <input
        type="text"
        placeholder="Condición JOIN (ej: a.id = b.articulo_id)"
        value={condition}
        onChange={(e) => setCondition(e.target.value)}
        className="w-full border border-gray-300 p-2 rounded text-sm mt-2"
      />
    </div>
  );
};

// Componente para agregar FILTROs
const FilterBuilder: React.FC<{
  onAdd: (filter: Filter) => void;
  availableFields: string[];
}> = ({ onAdd, availableFields }) => {
  const [field, setField] = useState('');
  const [operator, setOperator] = useState<Filter['operator']>('=');
  const [value, setValue] = useState('');

  const handleAdd = () => {
    if (field && value) {
      onAdd({ field, operator, value, logicalOperator: 'AND' });
      setField('');
      setOperator('=');
      setValue('');
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-300 p-4 rounded bg-gray-50">
      <h4 className="font-semibold text-gray-700 mb-3">Agregar Filtro</h4>
      <div className="grid grid-cols-4 gap-2">
        <select
          value={field}
          onChange={(e) => setField(e.target.value)}
          className="border border-gray-300 p-2 rounded text-sm"
        >
          <option value="">Selecciona campo</option>
          {availableFields.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>

        <select
          value={operator}
          onChange={(e) => setOperator(e.target.value as Filter['operator'])}
          className="border border-gray-300 p-2 rounded text-sm"
        >
          <option>=</option>
          <option>!=</option>
          <option>&gt;</option>
          <option>&lt;</option>
          <option>&gt;=</option>
          <option>&lt;=</option>
          <option>IN</option>
          <option>LIKE</option>
        </select>

        <input
          type="text"
          placeholder="Valor"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="border border-gray-300 p-2 rounded text-sm"
        />

        <button
          onClick={handleAdd}
          className="bg-green-600 text-white rounded hover:bg-green-700 text-sm"
        >
          Agregar
        </button>
      </div>
    </div>
  );
};
