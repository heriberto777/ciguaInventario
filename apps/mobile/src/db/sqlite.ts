// SQLite database stub for offline storage
export interface SQLiteDatabase {
  executeSql(sql: string, params?: any[]): Promise<any>;
  transaction(cb: (tx: any) => void): Promise<void>;
}

export class SQLiteAdapter implements SQLiteDatabase {
  private db: any;

  async initialize(): Promise<void> {
    // Stub: In production, use expo-sqlite or react-native-sqlite-storage
    this.db = { ready: true };
  }

  async executeSql(sql: string, params?: any[]): Promise<any> {
    // Stub: Return mock results
    return [];
  }

  async transaction(cb: (tx: any) => void): Promise<void> {
    // Stub: Execute callback
    cb({});
  }

  async close(): Promise<void> {
    this.db = null;
  }
}
