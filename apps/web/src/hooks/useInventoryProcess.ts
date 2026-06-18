import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { getApiClient } from '@/services/api';
import { CountItem } from '@/services/inventory.types';

export const useInventoryProcess = (countId: string | undefined) => {
  const apiClient = getApiClient();
  const [countItems, setCountItems] = useState<CountItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    subcategory: '',
    brand: '',
    varianceOnly: false,
  });
  const [syncingItemIds, setSyncingItemIds] = useState<Set<string>>(new Set());
  const [syncedItemIds, setSyncedItemIds] = useState<Set<string>>(new Set());

  // Reset state when countId changes to prevent state pollution between different counts
  useEffect(() => {
    setCountItems([]);
    setSearchTerm('');
    setFilters({ category: '', subcategory: '', brand: '', varianceOnly: false });
    setSyncingItemIds(new Set());
    setSyncedItemIds(new Set());
  }, [countId]);

  const debounceTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const pendingUpdatesRef = useRef<{ [key: string]: number }>({});

  const handleItemChange = useCallback((itemId: string, countedQty: number) => {
    setCountItems((prev) => {
      const updated = prev.map((item) =>
        item.id === itemId ? { ...item, countedQty } : item
      );
      pendingUpdatesRef.current[itemId] = countedQty;
      return updated;
    });

    if (debounceTimeoutRef.current[itemId]) {
      clearTimeout(debounceTimeoutRef.current[itemId]);
    }

    debounceTimeoutRef.current[itemId] = setTimeout(async () => {
      if (!countId) return;
      const finalCountedQty = pendingUpdatesRef.current[itemId];
      setSyncingItemIds((prev) => new Set([...prev, itemId]));

      try {
        const response = await apiClient.patch(
          `/inventory-counts/${countId}/items/${itemId}`,
          { countedQty: finalCountedQty }
        );

        if (response.data) {
          setCountItems((prev) =>
            prev.map((item) =>
              item.id === itemId ? { ...item, countedQty: response.data.countedQty } : item
            )
          );
        }

        setSyncedItemIds((prev) => new Set([...prev, itemId]));
      } catch (error) {
        console.error('Error syncing item:', error);
      } finally {
        setSyncingItemIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
        delete debounceTimeoutRef.current[itemId];
      }
    }, 500);
  }, [countId]);

  const filteredItems = useMemo(() => {
    return countItems.filter((item) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        item.itemCode.toLowerCase().includes(q) ||
        item.itemName.toLowerCase().includes(q) ||
        item.barCodeInv?.toLowerCase().includes(q) ||
        item.barCodeVt?.toLowerCase().includes(q);

      const matchesCategory = !filters.category || item.category === filters.category;
      const matchesSubcategory = !filters.subcategory || item.subcategory === filters.subcategory;
      const matchesBrand = !filters.brand || item.brand === filters.brand;

      if (filters.varianceOnly) {
        const systemQty = typeof item.systemQty === 'string' ? parseFloat(item.systemQty) : item.systemQty;
        const counted = item.countedQty ?? 0;
        return matchesSearch && matchesCategory && matchesSubcategory && matchesBrand &&
          Math.round((counted - systemQty) * 10) / 10 !== 0;
      }
      return matchesSearch && matchesCategory && matchesSubcategory && matchesBrand;
    });
  }, [countItems, searchTerm, filters]);

  const classifications = useMemo(() => {
    const cats = new Set<string>();
    const subcats = new Set<string>();
    const brands = new Set<string>();

    countItems.forEach(item => {
      if (item.category) cats.add(item.category);
      if (item.subcategory) subcats.add(item.subcategory);
      if (item.brand) brands.add(item.brand);
    });

    const mapToOptions = (set: Set<string>) => 
      Array.from(set).sort().map(val => ({ label: val, value: val }));

    return {
      categories: mapToOptions(cats),
      subcategories: mapToOptions(subcats),
      brands: mapToOptions(brands)
    };
  }, [countItems]);

  return {
    countItems,
    setCountItems,
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    filteredItems,
    handleItemChange,
    syncingItemIds,
    syncedItemIds,
    classifications // <--- New dynamic data
  };
};
