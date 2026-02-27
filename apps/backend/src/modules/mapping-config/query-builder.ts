/**
 * QueryBuilder - Construye queries SQL dinámicamente desde MappingConfig
 * Soporta:
 * - Múltiples tablas con JOINS
 * - Field mappings dinámicos
 * - Filtros WHERE
 * - ORDER BY
 */

import { CreateMappingConfigDTO, FieldMapping, Filter } from './schema';

export class DynamicQueryBuilder {
  private query = '';
  private parameters: Record<string, any> = {};
  private paramCounter = 0;

  constructor(private mapping: CreateMappingConfigDTO) { }

  /**
   * Construye la query SQL completa
   */
  build(): { sql: string; parameters: Record<string, any> } {
    if (this.mapping.customQuery) {
      // Si hay query personalizada, usarla directamente
      return {
        sql: this.mapping.customQuery,
        parameters: this.parameters,
      };
    }

    // Construir query desde mainTable + joins + mappings
    this.buildSelectClause();
    this.buildFromClause();
    this.buildWhereClause();
    this.buildOrderByClause();
    this.buildLimitClause();

    return {
      sql: this.query.trim(),
      parameters: this.parameters,
    };
  }

  /**
   * Construye SELECT con field mappings
   * SELECT a.codigo AS itemCode, a.descripcion AS itemName, ...
   */
  private buildSelectClause(): void {
    const selectParts = this.mapping.fieldMappings.map((mapping: any, index: number) => {
      const source = mapping.source || mapping.sourceField;
      const target = mapping.target || mapping.targetField;

      const transformation = mapping.transformation;

      if (transformation === 'CONSTANT') {
        // SELECT '01' AS branch
        return `'${source}' AS ${target}`;
      }

      if (transformation === 'AUTO_GENERATE') {
        if (source === 'NOW') return `GETDATE() AS ${target}`;
        if (source === 'USER') return `'system' AS ${target}`; // Placeholder, actual user resolved elsewhere if needed
        return `NULL AS ${target}`;
      }

      if (transformation && transformation.includes('{}')) {
        // Aplicar transformación personalizada: UPPER(a.codigo) AS itemCode
        const transformed = transformation.replace('{}', source);
        return `${transformed} AS ${target}`;
      }

      return `${source} AS ${target}`;
    });

    this.query = `SELECT ${selectParts.join(', ')}\n`;
  }

  /**
   * Construye FROM + JOINS
   * FROM articulo a
   * LEFT JOIN existencia_bodega b ON a.id = b.articulo_id
   */
  private buildFromClause(): void {
    const mainTable = this.mapping.mainTable;
    const mainTableAlias = (this.mapping as any).mainTableAlias || '';
    this.query += `FROM ${mainTable} ${mainTableAlias}\n`;

    if (this.mapping.joins && this.mapping.joins.length > 0) {
      for (const join of this.mapping.joins) {
        this.query += `${join.joinType} JOIN ${join.table} ${join.alias} ON ${join.joinCondition}\n`;
      }
    }
  }

  /**
   * Construye WHERE clause desde filters
   * WHERE a.estado = 'ACTIVO' AND b.bodega_id = @bodega_id
   */
  private buildWhereClause(): void {
    if (!this.mapping.filters || this.mapping.filters.length === 0) {
      return;
    }

    const whereParts: string[] = [];

    for (const filter of this.mapping.filters) {
      const paramName = `param${++this.paramCounter}`;
      let whereCondition = '';

      switch (filter.operator) {
        case '=':
          whereCondition = `${filter.field} = @${paramName}`;
          this.parameters[`@${paramName}`] = filter.value;
          break;
        case '!=':
          whereCondition = `${filter.field} != @${paramName}`;
          this.parameters[`@${paramName}`] = filter.value;
          break;
        case '>':
          whereCondition = `${filter.field} > @${paramName}`;
          this.parameters[`@${paramName}`] = filter.value;
          break;
        case '<':
          whereCondition = `${filter.field} < @${paramName}`;
          this.parameters[`@${paramName}`] = filter.value;
          break;
        case 'LIKE':
          whereCondition = `${filter.field} LIKE @${paramName}`;
          this.parameters[`@${paramName}`] = `%${filter.value}%`;
          break;
        case 'IN':
          whereCondition = `${filter.field} IN (${(filter.value as any[])
            .map((v, i) => {
              const pName = `${paramName}_${i}`;
              this.parameters[`@${pName}`] = v;
              return `@${pName}`;
            })
            .join(', ')})`;
          break;
        default:
          whereCondition = `${filter.field} = @${paramName}`;
          this.parameters[`@${paramName}`] = filter.value;
      }

      whereParts.push(whereCondition);
    }

    if (whereParts.length > 0) {
      this.query += `WHERE ${whereParts.join(' AND ')}\n`;
    }
  }

  /**
   * Construye ORDER BY
   * ORDER BY a.codigo ASC, a.descripcion DESC
   */
  private buildOrderByClause(): void {
    if (!this.mapping.orderBy || this.mapping.orderBy.length === 0) {
      return;
    }

    const orderParts = this.mapping.orderBy.map((order) => `${order.field} ${order.direction}`);

    this.query += `ORDER BY ${orderParts.join(', ')}\n`;
  }

  /**
   * Construye LIMIT
   * LIMIT 1000
   */
  private buildLimitClause(): void {
    const limit = this.mapping.limit || 1000;

    if (limit > 10000) {
      throw new Error('Limit cannot exceed 10000');
    }

    this.query += `LIMIT ${limit}`;
  }

  /**
   * Valida que el mapping sea correcto
   */
  static validate(mapping: CreateMappingConfigDTO): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!mapping.datasetType) {
      errors.push('datasetType is required');
    }

    if (!mapping.mainTable && !mapping.customQuery) {
      errors.push('Either mainTable or customQuery is required');
    }

    if (!mapping.fieldMappings || mapping.fieldMappings.length === 0) {
      errors.push('At least one fieldMapping is required');
    }

    // Validar que los fieldMappings apunten a campos válidos
    for (const mapping_item of mapping.fieldMappings || []) {
      if (!mapping_item.source) {
        errors.push(`FieldMapping missing source`);
      }
      if (!mapping_item.target) {
        errors.push(`FieldMapping missing target`);
      }
      if (!mapping_item.dataType) {
        errors.push(`FieldMapping missing dataType`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Genera SQL de preview para validar
   */
  static getPreviewSQL(mapping: CreateMappingConfigDTO): string {
    const builder = new DynamicQueryBuilder(mapping);
    const { sql } = builder.build();
    return sql;
  }
}
