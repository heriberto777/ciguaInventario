import * as SQLite from 'expo-sqlite';
import { getApiClient } from './api';
import { InventoryCount, CountItem } from '@/hooks/useInventory';

const DB_NAME = 'cigua_inventory.db';

interface PendingSync {
  id: string;
  type: 'update-item' | 'complete-count';
  countId: string;
  itemId?: string;
  data: any;
  timestamp: number;
  retries: number;
}

class OfflineSync {
  private db: SQLite.SQLiteDatabase | null = null;

  async initDB() {
    try {
      this.db = await SQLite.openDatabaseAsync(DB_NAME);

      // Crear tabla de sincronización pendiente
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS pending_sync (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          countId TEXT NOT NULL,
          itemId TEXT,
          data TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          retries INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS cached_counts (
          id TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          timestamp INTEGER NOT NULL
        );
      `);

      console.log('Database initialized');
    } catch (error) {
      console.error('Error initializing database:', error);
    }
  }

  async cacheCount(count: InventoryCount) {
    if (!this.db) return;

    try {
      await this.db.runAsync(
        'INSERT OR REPLACE INTO cached_counts (id, data, timestamp) VALUES (?, ?, ?)',
        [count.id, JSON.stringify(count), Date.now()]
      );
    } catch (error) {
      console.error('Error caching count:', error);
    }
  }

  async getCachedCount(countId: string): Promise<InventoryCount | null> {
    if (!this.db) return null;

    try {
      const result = await this.db.getFirstAsync<{ data: string }>(
        'SELECT data FROM cached_counts WHERE id = ?',
        [countId]
      );

      if (result?.data) {
        return JSON.parse(result.data);
      }
    } catch (error) {
      console.error('Error getting cached count:', error);
    }

    return null;
  }

  async addPendingSync(
    type: 'update-item' | 'complete-count',
    countId: string,
    data: any,
    itemId?: string
  ) {
    if (!this.db) return;

    const id = `${type}-${countId}-${itemId || 'general'}-${Date.now()}`;

    try {
      await this.db.runAsync(
        `INSERT INTO pending_sync (id, type, countId, itemId, data, timestamp, retries)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          type,
          countId,
          itemId || null,
          JSON.stringify(data),
          Date.now(),
          0,
        ]
      );

      console.log('Added pending sync:', id);
    } catch (error) {
      console.error('Error adding pending sync:', error);
    }
  }

  async getPendingSyncs(): Promise<PendingSync[]> {
    if (!this.db) return [];

    try {
      const results = await this.db.getAllAsync<any>(
        'SELECT * FROM pending_sync ORDER BY timestamp ASC LIMIT 50'
      );

      return results.map((row) => ({
        id: row.id,
        type: row.type,
        countId: row.countId,
        itemId: row.itemId,
        data: JSON.parse(row.data),
        timestamp: row.timestamp,
        retries: row.retries,
      }));
    } catch (error) {
      console.error('Error getting pending syncs:', error);
      return [];
    }
  }

  async removePendingSync(id: string) {
    if (!this.db) return;

    try {
      await this.db.runAsync('DELETE FROM pending_sync WHERE id = ?', [id]);
    } catch (error) {
      console.error('Error removing pending sync:', error);
    }
  }

  async incrementRetries(id: string) {
    if (!this.db) return;

    try {
      await this.db.runAsync(
        'UPDATE pending_sync SET retries = retries + 1 WHERE id = ?',
        [id]
      );
    } catch (error) {
      console.error('Error incrementing retries:', error);
    }
  }

  async syncPending(): Promise<{ success: number; failed: number }> {
    const pendingSyncs = await this.getPendingSyncs();
    let success = 0;
    let failed = 0;

    const apiClient = getApiClient();

    for (const sync of pendingSyncs) {
      if (sync.retries > 3) {
        // Descartar después de 3 intentos
        await this.removePendingSync(sync.id);
        failed++;
        continue;
      }

      try {
        if (sync.type === 'update-item') {
          await apiClient.patch(
            `/inventory-counts/${sync.countId}/items/${sync.itemId}`,
            sync.data
          );
        } else if (sync.type === 'complete-count') {
          await apiClient.patch(
            `/inventory-counts/${sync.countId}/complete`,
            sync.data
          );
        }

        await this.removePendingSync(sync.id);
        success++;
      } catch (error) {
        console.error(`Error syncing ${sync.id}:`, error);
        await this.incrementRetries(sync.id);
        failed++;
      }
    }

    return { success, failed };
  }

  async clearOldCache(olderThanHours: number = 24) {
    if (!this.db) return;

    try {
      const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000;
      await this.db.runAsync('DELETE FROM cached_counts WHERE timestamp < ?', [
        cutoff,
      ]);
    } catch (error) {
      console.error('Error clearing old cache:', error);
    }
  }
}

export const offlineSync = new OfflineSync();
