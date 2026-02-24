// SQL Templates Allowlist - Only predefined queries allowed
export const SQL_TEMPLATES_ALLOWLIST: Record<string, string> = {
  ITEMS_QUERY: `
    SELECT
      id, name, sku, description, category, unit_price
    FROM {tableName}
    WHERE company_id = @companyId
      AND is_active = 1
      {whereClause}
    LIMIT {limit}
  `,
  STOCK_QUERY: `
    SELECT
      item_id, warehouse_id, quantity_on_hand, quantity_reserved, quantity_available
    FROM {tableName}
    WHERE company_id = @companyId
      {whereClause}
    LIMIT {limit}
  `,
  COST_QUERY: `
    SELECT
      item_id, cost_center, unit_cost, total_cost, cost_date
    FROM {tableName}
    WHERE company_id = @companyId
      AND cost_date >= @startDate
      {whereClause}
    LIMIT {limit}
  `,
  PRICE_QUERY: `
    SELECT
      item_id, currency, unit_price, discount_percentage, effective_date
    FROM {tableName}
    WHERE company_id = @companyId
      AND effective_date <= GETDATE()
      {whereClause}
    LIMIT {limit}
  `,
  DESTINATION_QUERY: `
    SELECT
      item_id, warehouse_id, aisle, shelf, bin_position, quantity
    FROM {tableName}
    WHERE company_id = @companyId
      {whereClause}
    LIMIT {limit}
  `,
};

export class SqlTemplateBuilder {
  private template: string;
  private parameters: Record<string, any> = {};

  constructor(templateKey: string) {
    const template = SQL_TEMPLATES_ALLOWLIST[templateKey];
    if (!template) {
      throw new Error(`Template not found: ${templateKey}`);
    }
    this.template = template;
  }

  setTableName(tableName: string): this {
    // Validate table name to prevent injection
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new Error('Invalid table name');
    }
    this.template = this.template.replace('{tableName}', tableName);
    return this;
  }

  addParameter(key: string, value: any): this {
    this.parameters[`@${key}`] = value;
    return this;
  }

  addWhereClause(clause: string): this {
    // Ensure where clause doesn't contain raw SQL
    if (clause.includes(';') || clause.toLowerCase().includes('drop')) {
      throw new Error('Potentially dangerous SQL detected');
    }
    const formatted = clause ? `AND ${clause}` : '';
    this.template = this.template.replace('{whereClause}', formatted);
    return this;
  }

  setLimit(limit: number): this {
    if (limit > 10000) {
      throw new Error('Limit cannot exceed 10000');
    }
    this.template = this.template.replace('{limit}', limit.toString());
    return this;
  }

  build(): { sql: string; parameters: Record<string, any> } {
    // Replace remaining placeholders
    this.template = this.template.replace(/{limit}/g, '1000');
    this.template = this.template.replace(/{whereClause}/g, '');

    return {
      sql: this.template.trim(),
      parameters: this.parameters,
    };
  }
}
