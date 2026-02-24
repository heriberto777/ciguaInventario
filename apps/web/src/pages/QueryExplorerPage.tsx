import React, { useState, useEffect } from 'react';
import { getApiClient } from '@/services/api';

interface QueryBuilderState {
  mainTable: { name: string; alias: string };
  selectedColumns: string[];
  joins: Array<any>;
  filters: Array<any>;
  orderBy?: Array<{ field: string; direction: 'ASC' | 'DESC' }>;
  limit?: number;
}

export const QueryExplorerPage: React.FC = () => {
  const [erpConnections, setErpConnections] = useState<any[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');

  const [query, setQuery] = useState<QueryBuilderState>({
    mainTable: { name: '', alias: 'a' },
    selectedColumns: [],
    joins: [],
    filters: [],
    limit: 100,
  });

  const [availableTables, setAvailableTables] = useState<any[]>([]);
  const [tableSchemas, setTableSchemas] = useState<Record<string, any[]>>({});
  const [previewSQL, setPreviewSQL] = useState<string>('');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingMapping, setSavingMapping] = useState(false);
  const [mappingName, setMappingName] = useState('');
  const [mappingWarehouse, setMappingWarehouse] = useState('');
  const [warehouses, setWarehouses] = useState<any[]>([]);

  const apiClient = getApiClient();

  // Cargar conexiones ERP disponibles
  useEffect(() => {
    fetchErpConnections();
    fetchWarehouses();
  }, []);

  // Cargar tablas cuando cambia la conexión
  useEffect(() => {
    if (selectedConnectionId) {
      fetchAvailableTables();
    }
  }, [selectedConnectionId]);

  // Cargar schemas cuando cambia la tabla principal
  useEffect(() => {
    if (selectedConnectionId && query.mainTable.name) {
      fetchTableSchemas([query.mainTable.name]);
    }
  }, [selectedConnectionId, query.mainTable.name]);

  const fetchErpConnections = async () => {
    try {
      const response = await apiClient.get('/erp-connections');
      setErpConnections(response.data.data || []);
      if (response.data.data?.length > 0) {
        setSelectedConnectionId(response.data.data[0].id);
      }
    } catch (err: any) {
      setError(`Error cargando conexiones: ${err.message}`);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await apiClient.get('/warehouses');
      setWarehouses(response.data.data || []);
    } catch (err: any) {
      console.error('Error cargando warehouses:', err);
    }
  };

  const fetchAvailableTables = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/erp-connections/${selectedConnectionId}/tables`);
      setAvailableTables(response.data.tables || []);
    } catch (err: any) {
      setError(`Error cargando tablas: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableSchemas = async (tableNames: string[]) => {
    try {
      const response = await apiClient.post(
        `/erp-connections/${selectedConnectionId}/table-schemas`,
        { tableNames }
      );

      const schemas: Record<string, any[]> = {};
      response.data.schemas?.forEach((schema: any) => {
        schemas[schema.name] = schema.columns;
      });
      setTableSchemas(schemas);
    } catch (err: any) {
      setError(`Error cargando schema: ${err.message}`);
    }
  };

  const generatePreviewSQL = (): string => {
    let sql = `SELECT ${query.selectedColumns.length > 0 ? query.selectedColumns.join(', ') : '*'}
FROM ${query.mainTable.name} ${query.mainTable.alias}`;

    if (query.joins?.length > 0) {
      query.joins.forEach((join: any) => {
        sql += `\n${join.joinType} JOIN ${join.name} ${join.alias} ON ${join.joinCondition}`;
      });
    }

    if (query.filters?.length > 0) {
      sql += '\nWHERE ';
      sql += query.filters
        .map((f: any, i: number) => {
          const prefix = i === 0 ? '' : `${f.logicalOperator || 'AND'} `;
          return `${prefix}${f.field} ${f.operator} '${f.value}'`;
        })
        .join(' ');
    }

    if (query.orderBy?.length > 0) {
      sql += '\nORDER BY ' + query.orderBy.map(o => `${o.field} ${o.direction}`).join(', ');
    }

    if (query.limit) {
      sql += `\nLIMIT ${query.limit}`;
    }

    return sql;
  };

  const handleExecuteQuery = async () => {
    try {
      setLoading(true);
      setError(null);

      const sql = generatePreviewSQL();
      setPreviewSQL(sql);

      const response = await apiClient.post(
        `/erp-connections/${selectedConnectionId}/preview-query`,
        { sql, limit: query.limit || 100 }
      );

      setPreviewData(response.data.data || []);

      // Extraer nombres de columnas
      if (response.data.data?.length > 0) {
        setPreviewColumns(Object.keys(response.data.data[0]));
      }
    } catch (err: any) {
      setError(`Error ejecutando query: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsMapping = async () => {
    if (!mappingName.trim()) {
      setError('Ingresa un nombre para el mapping');
      return;
    }

    if (!mappingWarehouse) {
      setError('Selecciona un warehouse');
      return;
    }

    try {
      setSavingMapping(true);
      setError(null);

      const sql = generatePreviewSQL();

      await apiClient.post('/mapping-configs', {
        name: mappingName.trim(),
        description: `Query Explorer - ${new Date().toLocaleString()}`,
        erpConnectionId: selectedConnectionId,
        warehouseId: mappingWarehouse,
        sourceTable: query.mainTable.name,
        fieldMappings: query.selectedColumns.map((col: string) => ({
          erpField: col,
          systemField: col.toLowerCase(),
        })),
        customSql: sql,
      });

      setMappingName('');
      setMappingWarehouse('');
      alert('Mapping guardado exitosamente');
    } catch (err: any) {
      setError(`Error guardando mapping: ${err.message}`);
    } finally {
      setSavingMapping(false);
    }
  };

  const getColumnsForTable = (tableName: string): any[] => {
    return tableSchemas[tableName] || [];
  };

  const columnStyles = {
    container: { display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' as const },
    section: {
      flex: 1,
      minWidth: '300px',
      border: '1px solid #ddd',
      padding: '15px',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9',
    },
    label: { fontWeight: 'bold', marginBottom: '8px', display: 'block', fontSize: '14px' },
    select: {
      width: '100%',
      padding: '8px',
      borderRadius: '4px',
      border: '1px solid #ddd',
      fontFamily: 'monospace',
      fontSize: '13px',
    },
    input: {
      width: '100%',
      padding: '8px',
      borderRadius: '4px',
      border: '1px solid #ddd',
      marginBottom: '8px',
      fontSize: '13px',
    },
    button: {
      padding: '10px 16px',
      marginRight: '8px',
      marginTop: '8px',
      borderRadius: '4px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
    },
    primaryButton: {
      backgroundColor: '#007bff',
      color: 'white',
    },
    successButton: {
      backgroundColor: '#28a745',
      color: 'white',
    },
    secondaryButton: {
      backgroundColor: '#6c757d',
      color: 'white',
    },
    errorMessage: {
      color: '#dc3545',
      padding: '12px',
      backgroundColor: '#f8d7da',
      borderRadius: '4px',
      marginBottom: '16px',
      border: '1px solid #f5c6cb',
    },
    sqlPreview: {
      backgroundColor: '#f4f4f4',
      border: '1px solid #ddd',
      borderRadius: '4px',
      padding: '12px',
      fontFamily: 'monospace',
      fontSize: '12px',
      whiteSpace: 'pre-wrap' as const,
      marginBottom: '16px',
      maxHeight: '200px',
      overflowY: 'auto' as const,
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      marginTop: '16px',
      border: '1px solid #ddd',
    },
    th: {
      backgroundColor: '#007bff',
      color: 'white',
      padding: '12px',
      textAlign: 'left' as const,
      fontWeight: 'bold',
      borderRight: '1px solid #0056b3',
    },
    td: {
      padding: '10px',
      borderBottom: '1px solid #ddd',
      borderRight: '1px solid #ddd',
      fontSize: '13px',
      fontFamily: 'monospace',
    },
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>🔍 Query Explorer</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Explora datos del ERP sin crear mappings. Construye queries visuales, ejecútalas y opcionalmente guardarlas.
      </p>

      {error && <div style={columnStyles.errorMessage}>{error}</div>}

      {/* PASO 1: Seleccionar Conexión */}
      <div style={columnStyles.section}>
        <label style={columnStyles.label}>📡 Selecciona ERP Connection</label>
        <select
          style={columnStyles.select}
          value={selectedConnectionId}
          onChange={(e) => setSelectedConnectionId(e.target.value)}
        >
          <option value="">-- Seleccionar --</option>
          {erpConnections.map((conn) => (
            <option key={conn.id} value={conn.id}>
              {conn.name} ({conn.erpType})
            </option>
          ))}
        </select>
      </div>

      {selectedConnectionId && (
        <>
          {/* PASO 2: Seleccionar Tabla Principal */}
          <div style={columnStyles.section}>
            <label style={columnStyles.label}>📋 Tabla Principal</label>
            <select
              style={columnStyles.select}
              value={query.mainTable.name}
              onChange={(e) => {
                setQuery({
                  ...query,
                  mainTable: { name: e.target.value, alias: 'a' },
                  selectedColumns: [],
                });
              }}
            >
              <option value="">-- Seleccionar tabla --</option>
              {availableTables.map((table) => (
                <option key={table.name} value={table.name}>
                  {table.label || table.name} ({table.columnCount} cols)
                </option>
              ))}
            </select>
          </div>

          {/* PASO 3: Seleccionar Columnas */}
          {query.mainTable.name && (
            <div style={columnStyles.section}>
              <label style={columnStyles.label}>📊 Columnas a Obtener</label>
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
                {getColumnsForTable(query.mainTable.name).map((col: any) => (
                  <label
                    key={col.name}
                    style={{
                      display: 'flex',
                      padding: '8px',
                      borderBottom: '1px solid #eee',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={query.selectedColumns.includes(col.name)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setQuery({
                            ...query,
                            selectedColumns: [...query.selectedColumns, col.name],
                          });
                        } else {
                          setQuery({
                            ...query,
                            selectedColumns: query.selectedColumns.filter((c) => c !== col.name),
                          });
                        }
                      }}
                      style={{ marginRight: '8px', cursor: 'pointer' }}
                    />
                    <span>{col.name}</span>
                    <span style={{ marginLeft: '8px', color: '#999', fontSize: '12px' }}>({col.type})</span>
                  </label>
                ))}
              </div>
              <label style={{ ...columnStyles.label, marginTop: '12px' }}>
                Límite de Filas
                <input
                  type="number"
                  value={query.limit || 100}
                  onChange={(e) => setQuery({ ...query, limit: parseInt(e.target.value) || 100 })}
                  style={{ ...columnStyles.input, width: '100px' }}
                />
              </label>
            </div>
          )}
        </>
      )}

      {/* PASO 4: Preview SQL y Ejecución */}
      {query.mainTable.name && query.selectedColumns.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <button
            style={{ ...columnStyles.button, ...columnStyles.primaryButton }}
            onClick={handleExecuteQuery}
            disabled={loading}
          >
            {loading ? '⏳ Ejecutando...' : '▶️ Ejecutar Query'}
          </button>

          {previewSQL && (
            <>
              <h3>📝 SQL Generado:</h3>
              <div style={columnStyles.sqlPreview}>{previewSQL}</div>
            </>
          )}
        </div>
      )}

      {/* RESULTADOS */}
      {previewData.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>📈 Resultados ({previewData.length} filas)</h3>
            <div>
              <input
                type="text"
                placeholder="Nombre del mapping"
                value={mappingName}
                onChange={(e) => setMappingName(e.target.value)}
                style={{ ...columnStyles.input, width: '200px', display: 'inline-block', marginRight: '8px' }}
              />
              <select
                value={mappingWarehouse}
                onChange={(e) => setMappingWarehouse(e.target.value)}
                style={{ ...columnStyles.select, width: '200px', display: 'inline-block', marginRight: '8px' }}
              >
                <option value="">-- Seleccionar warehouse --</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name}
                  </option>
                ))}
              </select>
              <button
                style={{ ...columnStyles.button, ...columnStyles.successButton }}
                onClick={handleSaveAsMapping}
                disabled={savingMapping || !mappingName.trim() || !mappingWarehouse}
              >
                {savingMapping ? '⏳ Guardando...' : '💾 Guardar como Mapping'}
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={columnStyles.table}>
              <thead>
                <tr>
                  {previewColumns.map((col) => (
                    <th key={col} style={columnStyles.th}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 50).map((row, idx) => (
                  <tr key={idx}>
                    {previewColumns.map((col) => (
                      <td key={`${idx}-${col}`} style={columnStyles.td}>
                        {String(row[col] ?? '').substring(0, 100)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {previewData.length > 50 && (
            <p style={{ marginTop: '12px', color: '#666', fontSize: '12px' }}>
              Mostrando primeras 50 filas de {previewData.length} total
            </p>
          )}
        </div>
      )}

      {/* INSTRUCCIONES */}
      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '8px' }}>
        <h4>📖 Cómo Usar:</h4>
        <ol style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>Selecciona una conexión ERP</li>
          <li>Elige la tabla principal de donde obtener datos</li>
          <li>Selecciona las columnas que necesitas</li>
          <li>Click en "Ejecutar Query" para ver los datos</li>
          <li>(Opcional) Guarda como Mapping para reusarlo en Conteos Físicos</li>
        </ol>
      </div>
    </div>
  );
};

export default QueryExplorerPage;
