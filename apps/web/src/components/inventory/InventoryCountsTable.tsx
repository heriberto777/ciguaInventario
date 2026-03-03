'use client';

import { Input } from '@/components/atoms/Input';
import { Table, TableRow, TableCell } from '@/components/atoms/Table';

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
    if (variance < 0) return 'text-emerald-500 font-bold';
    if (variance > 0) return 'text-red-500 font-bold';
    return 'text-[var(--text-secondary)] opacity-50';
  };

  const headers = [
    'Código',
    'Descripción',
    'UOM',
    ...(hasSystemView ? ['Sistema'] : []),
    'Conteo',
    ...(hasSystemView ? ['Varianza'] : []),
    'Estado'
  ];

  if (items.length === 0) {
    return (
      <div className="text-center py-12 bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] m-4 shadow-sm">
        <p className="text-[var(--text-secondary)] font-medium">No hay items para mostrar</p>
      </div>
    );
  }

  return (
    <div className="m-4">
      <Table headers={headers}>
        {items.map((item) => {
          const { variance, percent } = getVariance(item);
          const isVariance = variance !== 0;

          return (
            <TableRow
              key={item.id}
              className={`${isVariance ? 'bg-amber-500/5' : ''}`}
            >
              <TableCell className="font-mono text-xs text-[var(--text-primary)] font-bold">
                {item.itemCode}
              </TableCell>
              <TableCell className="text-sm text-[var(--text-primary)] font-medium max-w-md truncate">
                {item.itemName}
              </TableCell>
              <TableCell className="text-right text-xs text-[var(--text-secondary)] font-bold">
                {item.uom}
              </TableCell>
              {hasSystemView && (
                <TableCell className="text-right text-sm font-bold text-[var(--text-primary)]">
                  {(typeof item.systemQty === 'string' ? parseFloat(item.systemQty) : item.systemQty).toFixed(1)}
                </TableCell>
              )}
              <TableCell className="text-right">
                <div className="flex justify-end">
                  <Input
                    type="number"
                    value={item.countedQty ?? ''}
                    onChange={(e) =>
                      onItemChange(item.id, e.target.value ? parseFloat(e.target.value) : 0)
                    }
                    placeholder="0"
                    className="w-24 text-right text-sm"
                    disabled={isLoading}
                  />
                </div>
              </TableCell>
              {hasSystemView && (
                <TableCell className={`text-right text-sm font-bold ${getVarianceColor(item)}`}>
                  {variance >= 0 ? '+' : ''}{variance.toFixed(1)}
                  <div className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-tighter italic">
                    ({percent.toFixed(1)}%)
                  </div>
                </TableCell>
              )}
              <TableCell className="text-center">
                {item.countedQty !== undefined && (
                  <div className="flex items-center justify-center">
                    {syncingItemIds.has(item.id) ? (
                      <span className="text-[var(--accent-primary)] font-semibold text-[10px] animate-pulse">⟳ GUARDANDO...</span>
                    ) : syncedItemIds.has(item.id) ? (
                      <span className="text-[var(--color-success)] font-semibold text-[10px]">✓ GUARDADO</span>
                    ) : (
                      <span className="text-[var(--text-muted)] text-xs opacity-20">•</span>
                    )}
                  </div>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </Table>
    </div>
  );
}
