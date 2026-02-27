'use client';

import { Input } from '@/components/atoms/Input';

interface CountItem {
  id: string;
  itemCode: string;
  itemName: string;
  systemQty: number;
  countedQty?: number;
  version: number;
  packQty: number;
  uom: string;
  baseUom: string;
  costPrice?: number;
  salePrice?: number;
}

interface InventoryCountsTableProps {
  items: CountItem[];
  onItemChange: (itemId: string, countedQty: number) => void;
  isLoading?: boolean;
  syncingItemIds?: Set<string>;
  syncedItemIds?: Set<string>;
  hasSystemView?: boolean;
}

export function InventoryCountsTable({
  items,
  onItemChange,
  isLoading = false,
  syncingItemIds = new Set(),
  syncedItemIds = new Set(),
  hasSystemView = true,
}: InventoryCountsTableProps) {
  const getVariance = (item: CountItem) => {
    const systemQty = typeof item.systemQty === 'string' ? parseFloat(item.systemQty) : item.systemQty;
    const counted = item.countedQty ?? 0;
    const variance = counted - systemQty;
    const percent = systemQty > 0 ? (variance / systemQty) * 100 : 0;
    return {
      variance: Math.round(variance * 10) / 10,
      percent: Math.round(percent * 10) / 10,
    };
  };

  const getVarianceColor = (item: CountItem) => {
    const { variance } = getVariance(item);
    if (variance < 0) return 'text-green-600';
    if (variance > 0) return 'text-red-600';
    return 'text-gray-400';
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border m-4">
          <p className="text-gray-500">No hay items para mostrar</p>
        </div>
      ) : (
        <div className="m-4">
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Descripción</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">UOM</th>
                  {hasSystemView && (
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Sistema</th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Conteo</th>
                  {hasSystemView && (
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Varianza</th>
                  )}
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Estado</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const { variance, percent } = getVariance(item);
                  const isVariance = variance !== 0;

                  return (
                    <tr
                      key={item.id}
                      className={`border-b hover:bg-gray-50 transition-colors ${isVariance ? 'bg-yellow-50' : ''}`}
                    >
                      <td className="px-4 py-3 font-mono text-sm text-gray-900 font-medium">
                        {item.itemCode}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{item.itemName}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">{item.uom}</td>
                      {hasSystemView && (
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                          {(typeof item.systemQty === 'string' ? parseFloat(item.systemQty) : item.systemQty).toFixed(1)}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          value={item.countedQty ?? ''}
                          onChange={(e) =>
                            onItemChange(item.id, e.target.value ? parseFloat(e.target.value) : 0)
                          }
                          placeholder="0"
                          className="w-28 text-right text-sm"
                          disabled={isLoading}
                        />
                      </td>
                      {hasSystemView && (
                        <td className={`px-4 py-3 text-right text-sm font-semibold ${getVarianceColor(item)}`}>
                          {variance >= 0 ? '+' : ''}{variance.toFixed(1)} <br />
                          <span className="text-xs text-gray-500">({percent.toFixed(1)}%)</span>
                        </td>
                      )}
                      <td className="px-4 py-3 text-center">
                        {item.countedQty !== undefined && (
                          <div className="flex items-center justify-center">
                            {syncingItemIds.has(item.id) ? (
                              <span className="text-blue-600 font-semibold text-xs">⟳ Guardando...</span>
                            ) : syncedItemIds.has(item.id) ? (
                              <span className="text-green-600 font-semibold text-xs">✓ Guardado</span>
                            ) : (
                              <span className="text-gray-400 text-xs">•</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
