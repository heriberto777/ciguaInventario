import { useState, useEffect, useRef, useCallback } from 'react';
import { getApiClient } from '@/services/api';

const apiClient = getApiClient();
const STORAGE_KEY = (countId: string) => `inventory_count_${countId}`;

interface SyncOptions {
  onSyncSuccess?: (count: any) => void;
  onSyncError?: (error: any) => void;
  autoResume?: boolean;
}

export const useInventorySync = (options: SyncOptions = {}) => {
  const [activeCountId, setActiveCountId] = useState<string | null>(null);
  const isInitializedRef = useRef(false);

  // Clean up corrupt localStorage keys
  const cleanCorruptStorage = useCallback(() => {
    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key.startsWith('inventory_count_')) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            if (!parsed || typeof parsed !== 'object') {
              keysToDelete.push(key);
            }
          } catch {
            keysToDelete.push(key);
          }
        }
      }

      if (key === 'active_count_id') {
        const val = localStorage.getItem(key);
        if (val && (val.includes(' ') || val.includes('<') || val.length > 50)) {
          keysToDelete.push(key);
        }
      }
    }

    keysToDelete.forEach(key => {
      console.log(`Cleaning corrupt localStorage: ${key}`);
      localStorage.removeItem(key);
    });
  }, []);

  const saveToLocal = useCallback((count: any, items: any[]) => {
    if (count?.id && items.length > 0) {
      localStorage.setItem('active_count_id', count.id);
      localStorage.setItem(STORAGE_KEY(count.id), JSON.stringify({
        count,
        items,
        lastSaved: new Date().toISOString(),
      }));
    }
  }, []);

  const clearLocal = useCallback((countId: string) => {
    localStorage.removeItem(STORAGE_KEY(countId));
    localStorage.removeItem('active_count_id');
    setActiveCountId(null);
  }, []);

  const fetchFromServer = useCallback(async (countId: string) => {
    if (!countId || countId.includes('<') || countId.includes(' ')) return null;
    try {
      const response = await apiClient.get(`/inventory-counts/${countId}`);
      if (options.onSyncSuccess) options.onSyncSuccess(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching count from server:', error);
      if (options.onSyncError) options.onSyncError(error);
      return null;
    }
  }, [options]);

  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    cleanCorruptStorage();

    if (options.autoResume === false) return;

    const savedCountId = localStorage.getItem('active_count_id');
    if (savedCountId && savedCountId.length > 10 && !savedCountId.includes(' ')) {
      setActiveCountId(savedCountId);
      
      // Flash Load logic
      const savedCountData = localStorage.getItem(STORAGE_KEY(savedCountId));
      if (savedCountData) {
        try {
          const parsed = JSON.parse(savedCountData);
          if (parsed && parsed.count && options.onSyncSuccess) {
            options.onSyncSuccess(parsed.count);
          }
        } catch (e) {
          localStorage.removeItem(STORAGE_KEY(savedCountId));
        }
      }
      
      // Always sync with server
      fetchFromServer(savedCountId);
    }
  }, [cleanCorruptStorage, fetchFromServer, options.autoResume, options.onSyncSuccess]);

  return {
    activeCountId,
    setActiveCountId,
    saveToLocal,
    clearLocal,
    fetchFromServer
  };
};
