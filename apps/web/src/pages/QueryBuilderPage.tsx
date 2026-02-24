import React, { useState } from 'react';
import { getApiClient } from '@/services/api';

interface QueryBuilderColumn {
  table: string;
  column: string;
  alias: string;
}

interface QueryBuilderJoin {
  leftTable: string;
  rightTable: string;
  condition: string;
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
}

interface QueryBuilderFilter {
  column: string;
  operator: '=' | '!=' | '>' | '<' | 'LIKE' | 'IN';
  value: string;
}

/**
 * QueryBuilderPage - Interfaz visual para Opción B (Query Directa)
 * Permite:
 * - Seleccionar tablas y columnas visualmente
 * - Definir JOINS
 * - Agregar WHERE clauses
 * - Previsualizar query SQL
 * - Ejecutar y probar
 */
export const QueryBuilderPage: React.FC = () => {
  const apiClient = getApiClient();
  const [step, setStep] = useState<'builder' | 'preview'>('builder');
  const [tableName, setTableName] = useState('articulo');
  const [columns, setColumns] = useState<QueryBuilderColumn[]>([]);
  const [joins, setJoins] = useState<QueryBuilderJoin[]>([]);
  const [filters, setFilters] = useState<QueryBuilderFilter[]>([]);
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Estado para formularios de JOIN y FILTER
  const [joinType, setJoinType] = useState<'INNER' | 'LEFT' | 'RIGHT' | 'FULL'>('INNER');
  const [joinRightTable, setJoinRightTable] = useState('');
  const [joinCondition, setJoinCondition] = useState('');

  const [filterColumn, setFilterColumn] = useState('');
  const [filterOperator, setFilterOperator] = useState<'=' | '!=' | '>' | '<' | 'LIKE' | 'IN'>('=');
  const [filterValue, setFilterValue] = useState('');

  // Tablas y columnas disponibles en Catelli (esto debería venir de la BD)
  const availableTables = {
    articulo: [
      'id',
      'codigo',
      'descripcion',
      'cantidad_empaque',
      'unidad_empaque',
      'unidad_base',
      'estado',
      'peso_gruto',
    ],
    existencia_bodega: ['id', 'articulo_id', 'bodega_id', 'cantidad', 'estado'],
    articulo_precio: [
      'id',
      'articulo_id',
      'costo',
      'precio_venta',
      'estado',
      'fecha_efectiva',
    ],
  };

  const generateSQL = () => {
    // SELECT
    const selectParts = columns.map((col) => `${col.table}.${col.column} AS ${col.alias}`);
    let sql = `SELECT ${selectParts.join(', ')}\n`;

    // FROM
    sql += `FROM ${tableName}\n`;

    // JOINS
    joins.forEach((join) => {
      sql += `${join.type} JOIN ${join.rightTable} ON ${join.condition}\n`;
    });

    // WHERE
    if (filters.length > 0) {
      const whereParts = filters.map((f) => {
        if (f.operator === 'LIKE') {
          return `${f.column} LIKE '%${f.value}%'`;
        }
        return `${f.column} ${f.operator} '${f.value}'`;
      });
      sql += `WHERE ${whereParts.join(' AND ')}\n`;
    }

    sql += 'LIMIT 1000';

    setGeneratedSQL(sql);
  };

  const addJoin = () => {
    if (!joinRightTable || !joinCondition) {
      alert('Por favor completa todos los campos del JOIN');
      return;
    }
    setJoins([
      ...joins,
      {
        leftTable: tableName,
        rightTable: joinRightTable,
        condition: joinCondition,
        type: joinType,
      },
    ]);
    // Limpiar formulario
    setJoinRightTable('');
    setJoinCondition('');
    setJoinType('INNER');
  };

  const addFilter = () => {
    if (!filterColumn || !filterValue) {
      alert('Por favor completa todos los campos del FILTRO');
      return;
    }
    setFilters([
      ...filters,
      {
        column: filterColumn,
        operator: filterOperator,
        value: filterValue,
      },
    ]);
    // Limpiar formulario
    setFilterColumn('');
    setFilterValue('');
    setFilterOperator('=');
  };

  const testQuery = async () => {
    setIsLoading(true);
    try {
      // Aquí iría la llamada al backend para ejecutar la query
      // Por ahora, solo mostramos la query generada
      generateSQL();
      setStep('preview');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Constructor de Queries - Opción B</h1>

      {step === 'builder' && (
        <div className="space-y-6">
          {/* Tabla Principal */}
          <section className="border border-gray-300 p-4 rounded">
            <h2 className="text-xl font-semibold mb-3">1. Tabla Principal</h2>
            <select
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              className="border border-gray-300 p-2 rounded"
            >
              <option>articulo</option>
              <option>existencia_bodega</option>
              <option>articulo_precio</option>
            </select>
          </section>

          {/* Columnas */}
          <section className="border border-gray-300 p-4 rounded">
            <h2 className="text-xl font-semibold mb-3">2. Columnas a Seleccionar</h2>
            <div className="space-y-2 mb-3">
              {columns.map((col, idx) => (
                <div key={idx} className="flex gap-2 items-center p-2 bg-blue-50 rounded">
                  <span>
                    {col.table}.{col.column} AS {col.alias}
                  </span>
                  <button
                    onClick={() => setColumns(columns.filter((_, i) => i !== idx))}
                    className="ml-auto text-red-600 hover:text-red-800"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    const [table, column] = e.target.value.split('.');
                    setColumns([
                      ...columns,
                      {
                        table,
                        column,
                        alias: column,
                      },
                    ]);
                    e.target.value = '';
                  }
                }}
                className="border border-gray-300 p-2 rounded flex-1"
              >
                <option value="">Agregar columna...</option>
                {Object.entries(availableTables).map(([table, cols]) =>
                  cols.map((col) => (
                    <option key={`${table}.${col}`} value={`${table}.${col}`}>
                      {table}.{col}
                    </option>
                  ))
                )}
              </select>
            </div>
          </section>

          {/* JOINs */}
          <section className="border border-gray-300 p-4 rounded">
            <h2 className="text-xl font-semibold mb-3">3. Joins</h2>
            <div className="space-y-2 mb-3">
              {joins.map((join, idx) => (
                <div key={idx} className="flex gap-2 items-center p-2 bg-green-50 rounded">
                  <span className="text-sm">
                    {join.type} JOIN {join.rightTable} ON {join.condition}
                  </span>
                  <button
                    onClick={() => setJoins(joins.filter((_, i) => i !== idx))}
                    className="ml-auto text-red-600 hover:text-red-800"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-2">
              <select
                value={joinType}
                onChange={(e) => setJoinType(e.target.value as 'INNER' | 'LEFT' | 'RIGHT' | 'FULL')}
                className="border border-gray-300 p-2 rounded text-sm"
              >
                <option>INNER</option>
                <option>LEFT</option>
                <option>RIGHT</option>
                <option>FULL</option>
              </select>
              <input
                type="text"
                placeholder="existencia_bodega"
                value={joinRightTable}
                onChange={(e) => setJoinRightTable(e.target.value)}
                className="border border-gray-300 p-2 rounded text-sm"
              />
              <input
                type="text"
                placeholder="a.id = b.articulo_id"
                value={joinCondition}
                onChange={(e) => setJoinCondition(e.target.value)}
                className="border border-gray-300 p-2 rounded text-sm"
              />
              <button
                onClick={addJoin}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
              >
                Agregar
              </button>
            </div>
          </section>

          {/* Filtros */}
          <section className="border border-gray-300 p-4 rounded">
            <h2 className="text-xl font-semibold mb-3">4. Filtros WHERE</h2>
            <div className="space-y-2 mb-3">
              {filters.map((filter, idx) => (
                <div key={idx} className="flex gap-2 items-center p-2 bg-yellow-50 rounded">
                  <span className="text-sm">
                    {filter.column} {filter.operator} {filter.value}
                  </span>
                  <button
                    onClick={() => setFilters(filters.filter((_, i) => i !== idx))}
                    className="ml-auto text-red-600 hover:text-red-800"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="a.estado"
                value={filterColumn}
                onChange={(e) => setFilterColumn(e.target.value)}
                className="border border-gray-300 p-2 rounded text-sm"
              />
              <select
                value={filterOperator}
                onChange={(e) => setFilterOperator(e.target.value as '=' | '!=' | '>' | '<' | 'LIKE' | 'IN')}
                className="border border-gray-300 p-2 rounded text-sm"
              >
                <option>=</option>
                <option>!=</option>
                <option>&gt;</option>
                <option>&lt;</option>
                <option>LIKE</option>
                <option>IN</option>
              </select>
              <input
                type="text"
                placeholder="ACTIVO"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="border border-gray-300 p-2 rounded text-sm"
              />
              <button
                onClick={addFilter}
                className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
              >
                Agregar
              </button>
            </div>
          </section>

          {/* Acciones */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={generateSQL}
              disabled={isLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Generando...' : 'Previsualizar SQL'}
            </button>
            <button
              onClick={testQuery}
              disabled={isLoading}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Ejecutando...' : 'Ejecutar Query'}
            </button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-6">
          {/* SQL Generado */}
          <section className="border border-gray-300 p-4 rounded">
            <h2 className="text-xl font-semibold mb-3">SQL Generado</h2>
            <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto font-mono text-sm">
              {generatedSQL}
            </pre>
            <button
              onClick={() => {
                navigator.clipboard.writeText(generatedSQL);
                alert('SQL copiado al portapapeles');
              }}
              className="mt-2 bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
            >
              Copiar SQL
            </button>
          </section>

          {/* Resultados */}
          {previewData.length > 0 && (
            <section className="border border-gray-300 p-4 rounded">
              <h2 className="text-xl font-semibold mb-3">Resultados ({previewData.length} filas)</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-gray-200">
                    <tr>
                      {Object.keys(previewData[0] || {}).map((key) => (
                        <th key={key} className="border border-gray-300 p-2">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                        {Object.values(row).map((val, i) => (
                          <td key={i} className="border border-gray-300 p-2">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Botones */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setStep('builder')}
              className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
            >
              Volver
            </button>
            <button
              onClick={() => {
                // Guardar como MappingConfig
                console.log('Guardar SQL como MappingConfig');
              }}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Guardar como Mapping
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
