import { FastifyInstance } from 'fastify';

export interface ERPConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query(sql: string, params?: any[]): Promise<any[]>;
  testConnection(): Promise<boolean>;
}

export class MSSQLConnector implements ERPConnector {
  private connection: any;

  constructor(
    private host: string,
    private port: number,
    private database: string,
    private username: string,
    private password: string
  ) {}

  async connect(): Promise<void> {
    // Stub: In production, use mssql library
    this.connection = { connected: true };
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      this.connection = null;
    }
  }

  async query(sql: string, params?: any[]): Promise<any[]> {
    // Stub: Return mock data
    return [
      { id: 1, name: 'Item 1', quantity: 100 },
      { id: 2, name: 'Item 2', quantity: 50 },
      { id: 3, name: 'Item 3', quantity: 200 },
    ];
  }

  async testConnection(): Promise<boolean> {
    try {
      // Stub test
      return true;
    } catch {
      return false;
    }
  }
}

export class ERPConnectorFactory {
  static create(
    erpType: string,
    host: string,
    port: number,
    database: string,
    username: string,
    password: string
  ): ERPConnector {
    switch (erpType) {
      case 'MSSQL':
        return new MSSQLConnector(host, port, database, username, password);
      default:
        throw new Error(`Unsupported ERP type: ${erpType}`);
    }
  }
}
