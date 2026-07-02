import * as SQLite from 'expo-sqlite';
import { getApiClient } from './api';
import { InventoryCount, CountItem } from '@/hooks/useInventory';

const DB_NAME = 'cigua_inventory.db';

export type SyncType = 'update-item' | 'complete-count' | 'add-item' | 'delete-item';

export interface SyncLog {
  id: string;
  timestamp: number;
  type: SyncType;
  countId: string;
  itemId?: string;
  status: 'success' | 'failed' | 'discarded';
  httpStatus?: number;
  errorMessage?: string;
  retries: number;
}

interface PendingSync {
  id: string;
  type: SyncType;
  countId: string;
  itemId?: string;
  data: any;
  timestamp: number;
  retries: number;
}

class OfflineSync {
  private db: SQLite.SQLiteDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async initDB() {
    // Si ya se está inicializando o ya terminó, devolver el proceso existente
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        this.db = await SQLite.openDatabaseAsync(DB_NAME);

        // Crear tablas si no existen
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

          CREATE TABLE IF NOT EXISTS classifications (
            id TEXT PRIMARY KEY,
            companyId TEXT NOT NULL,
            code TEXT NOT NULL,
            description TEXT NOT NULL,
            groupType TEXT NOT NULL,
            groupNumber INTEGER NOT NULL,
            timestamp INTEGER NOT NULL
          );

          CREATE TABLE IF NOT EXISTS sync_logs (
            id TEXT PRIMARY KEY,
            timestamp INTEGER NOT NULL,
            type TEXT NOT NULL,
            countId TEXT NOT NULL,
            itemId TEXT,
            status TEXT NOT NULL,
            httpStatus INTEGER,
            errorMessage TEXT,
            retries INTEGER DEFAULT 0
          );
        `);

        console.log('📦 Database initialized successfully');
      } catch (error) {
        console.error('❌ Error initializing database:', error);
        this.initPromise = null; // Permitir reintento si falló
        throw error;
      }
    })();

    return this.initPromise;
  }

  private async ensureDB(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) {
      // Intentar inicializar si se llama a una operación y no está lista
      await this.initDB();
    }
    if (!this.db) {
      throw new Error('Database not available');
    }
    return this.db;
  }

  async cacheCount(count: InventoryCount) {
    try {
      const db = await this.ensureDB();
      await db.runAsync(
        'INSERT OR REPLACE INTO cached_counts (id, data, timestamp) VALUES (?, ?, ?)',
        [count.id, JSON.stringify(count), Date.now()]
      );
    } catch (error) {
      console.error('Error caching count:', error);
    }
  }

  // Cachea un conteo proveniente del listado (sin myQty/contributions).
  // Si ya existe una entrada en SQLite, preserva los myQty locales de los ítems
  // para no sobreescribir cantidades digitadas offline que aún no se han sincronizado.
  async cacheCountFromList(count: InventoryCount) {
    try {
      const existing = await this.getCachedCount(count.id);
      if (existing) {
        const mergedItems = count.countItems.map(item => {
          const cachedItem = existing.countItems.find(ci => ci.id === item.id);
          return {
            ...item,
            myQty: item.myQty ?? cachedItem?.myQty ?? null,
          };
        });
        await this.cacheCount({ ...count, countItems: mergedItems });
      } else {
        await this.cacheCount(count);
      }
    } catch (error) {
      console.error('Error in cacheCountFromList:', error);
    }
  }

  async clearCachedCount(countId: string) {
    try {
      const db = await this.ensureDB();
      await db.runAsync('DELETE FROM cached_counts WHERE id = ?', [countId]);
    } catch (error) {
      console.error('Error clearing cached count:', error);
    }
  }

  async getAllCachedCounts(): Promise<InventoryCount[]> {
    try {
      const db = await this.ensureDB();
      const results = await db.getAllAsync<{ data: string }>(
        'SELECT data FROM cached_counts ORDER BY timestamp DESC'
      );
      return results.map(r => JSON.parse(r.data));
    } catch (error) {
      console.error('Error getting all cached counts:', error);
      return [];
    }
  }

  async getCachedCount(countId: string): Promise<InventoryCount | null> {
    try {
      const db = await this.ensureDB();
      const result = await db.getFirstAsync<{ data: string }>(
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

  async cacheClassifications(classifications: any[]) {
    try {
      const db = await this.ensureDB();
      // Usar transacción para rapidez
      await db.withTransactionAsync(async () => {
        // Limpiamos la tabla antes de insertar las nuevas
        await db.runAsync('DELETE FROM classifications');

        for (const c of classifications) {
          await db.runAsync(
            `INSERT INTO classifications (id, companyId, code, description, groupType, groupNumber, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [c.id, c.companyId, c.code, c.description, c.groupType, c.groupNumber, Date.now()]
          );
        }
      });
      console.log('Classifications cached:', classifications.length);
    } catch (error) {
      console.error('Error caching classifications:', error);
    }
  }

  async getClassifications(groupType?: string): Promise<any[]> {
    try {
      const db = await this.ensureDB();
      const query = groupType
        ? 'SELECT * FROM classifications WHERE groupType = ? ORDER BY description ASC'
        : 'SELECT * FROM classifications ORDER BY description ASC';
      const args = groupType ? [groupType] : [];

      const results = await db.getAllAsync<any>(query, args);
      return results;
    } catch (error) {
      console.error('Error getting classifications:', error);
      return [];
    }
  }

  async syncGlobalClassifications() {
    try {
      const apiClient = getApiClient();
      const response = await apiClient.get('/item-classifications');
      const data = response.data?.data || response.data || [];
      if (Array.isArray(data)) {
        await this.cacheClassifications(data);
      }
    } catch (error) {
      console.warn('Could not sync global classifications (offline mode?):', error);
    }
  }

  async addPendingSync(
    type: SyncType,
    countId: string,
    data: any,
    itemId?: string
  ) {
    const id = `${type}-${countId}-${itemId || 'general'}-${Date.now()}`;

    try {
      const db = await this.ensureDB();
      await db.runAsync(
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
    try {
      const db = await this.ensureDB();
      const results = await db.getAllAsync<any>(
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
    try {
      const db = await this.ensureDB();
      await db.runAsync('DELETE FROM pending_sync WHERE id = ?', [id]);
    } catch (error) {
      console.error('Error removing pending sync:', error);
    }
  }

  async incrementRetries(id: string) {
    try {
      const db = await this.ensureDB();
      await db.runAsync(
        'UPDATE pending_sync SET retries = retries + 1 WHERE id = ?',
        [id]
      );
    } catch (error) {
      console.error('Error incrementing retries:', error);
    }
  }

  // ─── Sync Logs ────────────────────────────────────────────────────────────

  async addSyncLog(entry: Omit<SyncLog, 'id' | 'timestamp'>) {
    try {
      const db = await this.ensureDB();
      const id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      await db.runAsync(
        `INSERT INTO sync_logs (id, timestamp, type, countId, itemId, status, httpStatus, errorMessage, retries)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          Date.now(),
          entry.type,
          entry.countId,
          entry.itemId ?? null,
          entry.status,
          entry.httpStatus ?? null,
          entry.errorMessage ?? null,
          entry.retries,
        ]
      );
      // Retener solo los últimos 100 registros
      await db.runAsync(
        `DELETE FROM sync_logs WHERE id NOT IN (
           SELECT id FROM sync_logs ORDER BY timestamp DESC LIMIT 100
         )`
      );
    } catch (error) {
      console.error('Error adding sync log:', error);
    }
  }

  async getSyncLogs(limit = 50): Promise<SyncLog[]> {
    try {
      const db = await this.ensureDB();
      const results = await db.getAllAsync<any>(
        'SELECT * FROM sync_logs ORDER BY timestamp DESC LIMIT ?',
        [limit]
      );
      return results.map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        type: row.type as SyncType,
        countId: row.countId,
        itemId: row.itemId ?? undefined,
        status: row.status as SyncLog['status'],
        httpStatus: row.httpStatus ?? undefined,
        errorMessage: row.errorMessage ?? undefined,
        retries: row.retries,
      }));
    } catch (error) {
      console.error('Error getting sync logs:', error);
      return [];
    }
  }

  async clearSyncLogs() {
    try {
      const db = await this.ensureDB();
      await db.runAsync('DELETE FROM sync_logs');
    } catch (error) {
      console.error('Error clearing sync logs:', error);
    }
  }

  // ─── Sync ─────────────────────────────────────────────────────────────────

  async syncPending(): Promise<{ success: number; failed: number; affectedCountIds: string[] }> {
    const pendingSyncs = await this.getPendingSyncs();
    let success = 0;
    let failed = 0;
    const affectedCountIds = new Set<string>();

    const apiClient = getApiClient();

    for (const sync of pendingSyncs) {
      if (sync.retries > 3) {
        await this.removePendingSync(sync.id);
        await this.addSyncLog({
          type: sync.type,
          countId: sync.countId,
          itemId: sync.itemId,
          status: 'discarded',
          errorMessage: `Descartado tras ${sync.retries} intentos fallidos`,
          retries: sync.retries,
        });
        failed++;
        continue;
      }

      try {
        switch (sync.type) {
          case 'update-item':
            await apiClient.patch(
              `/inventory-counts/${sync.countId}/items/${sync.itemId}`,
              sync.data
            );
            break;
          case 'complete-count':
            await apiClient.post(
              `/inventory-counts/${sync.countId}/complete`,
              sync.data
            );
            break;
          case 'add-item':
            await apiClient.post(
              `/inventory-counts/${sync.countId}/items`,
              sync.data
            );
            break;
          case 'delete-item':
            await apiClient.delete(
              `/inventory-counts/${sync.countId}/items/${sync.itemId}`
            );
            break;
        }

        await this.removePendingSync(sync.id);
        await this.addSyncLog({
          type: sync.type,
          countId: sync.countId,
          itemId: sync.itemId,
          status: 'success',
          retries: sync.retries,
        });
        affectedCountIds.add(sync.countId);
        success++;
      } catch (error: any) {
        console.error(`Error syncing ${sync.id}:`, error);

        const httpStatus: number | undefined = error.response?.status;
        const serverMessage: string | undefined =
          error.response?.data?.error?.message ||
          error.response?.data?.message ||
          error.message;

        if (httpStatus === 404) {
          await this.removePendingSync(sync.id);
          await this.addSyncLog({
            type: sync.type,
            countId: sync.countId,
            itemId: sync.itemId,
            status: 'discarded',
            httpStatus,
            errorMessage: serverMessage || 'Elemento no encontrado (404)',
            retries: sync.retries,
          });
          failed++;
        } else {
          await this.incrementRetries(sync.id);
          await this.addSyncLog({
            type: sync.type,
            countId: sync.countId,
            itemId: sync.itemId,
            status: 'failed',
            httpStatus,
            errorMessage: serverMessage || (httpStatus ? `HTTP ${httpStatus}` : 'Sin conexión'),
            retries: sync.retries,
          });
          failed++;
        }
      }
    }

    return { success, failed, affectedCountIds: Array.from(affectedCountIds) };
  }

  async clearOldCache(olderThanHours: number = 24) {
    try {
      const db = await this.ensureDB();
      const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000;
      await db.runAsync('DELETE FROM cached_counts WHERE timestamp < ?', [
        cutoff,
      ]);
    } catch (error) {
      console.error('Error clearing old cache:', error);
    }
  }
}

export const offlineSync = new OfflineSync();
