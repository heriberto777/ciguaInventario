import React from 'react';
import { Input } from '@/components/atoms/Input';
import { CountItem } from '@/services/inventory.types';

interface CountItemsListProps {
  items: CountItem[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onItemChange: (itemId: string, qty: number) => void;
  onRefresh: (itemCode: string) => void;
  syncingItemIds: Set<string>;
  syncedItemIds: Set<string>;
  refreshingItemCodes: Set<string>;
  canEdit: boolean;
  hasSystemView: boolean;
  hasVarianceView: boolean;
  selectedMappingId: string;
  onMappingChange: (mappingId: string) => void;
  mappings: { id: string; name: string }[];
  filters: {
    category: string;
    subcategory: string;
    brand: string;
    varianceOnly: boolean;
  };
  setFilters: (filters: any) => void;
  categories: { label: string; value: string }[];
  subcategories: { label: string; value: string }[];
  brands: { label: string; value: string }[];
}

export const CountItemsList: React.FC<CountItemsListProps> = ({
  items,
  searchTerm,
  onSearchChange,
  onItemChange,
  onRefresh,
  syncingItemIds,
  syncedItemIds,
  refreshingItemCodes,
  canEdit,
  hasSystemView,
  hasVarianceView,
  selectedMappingId,
  onMappingChange,
  mappings,
  filters,
  setFilters,
  categories,
  subcategories,
  brands
}) => {
  const getVariance = (item: any) => {
    const systemQty = Number(item.systemQty ?? 0);
    const counted = Number(item.countedQty ?? 0);
    const separated = Number(item.reservedSeparated ?? 0);
    const inAisle = Number(item.reservedInAisle ?? 0);

    // Fórmula unificada:
    // Separado: ERP lo tiene, pero ya no está en estante → restar
    // Pasillo: ERP ya lo descontó (factura pendiente), pero sigue en estante → sumar
    // Stock Esperado = ERP - Separado + Pasillo
    const expectedStock = systemQty - separated + inAisle;
    const variance = counted - expectedStock;
    const percent = expectedStock > 0 ? (variance / expectedStock) * 100 : 0;
    return { variance, percent };
  };

  const selectStyle = {
    backgroundColor: 'rgba(var(--color-hover), 0.5)',
    border: '1px solid var(--color-border-default)',
    borderRadius: '1rem',
    padding: '0.5rem 1rem',
    fontSize: '0.75rem',
    fontWeight: 'black',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em'
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border-b border-border-default p-8">
        <div className="space-y-3">
          <Input
            placeholder="🔍 Escanea o busca por código/descripción..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <div className="flex gap-2 flex-wrap">
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              style={selectStyle}
            >
              <option value="">📁 Todas las Categorías</option>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>

            <select
              value={filters.subcategory}
              onChange={(e) => setFilters({ ...filters, subcategory: e.target.value })}
              style={selectStyle}
            >
              <option value="">📂 Todas las Subcategorías</option>
              {subcategories.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            <select
              value={filters.brand}
              onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
              style={selectStyle}
            >
              <option value="">🏷️ Todas las Marcas</option>
              {brands.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>

            {hasVarianceView && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.varianceOnly}
                  onChange={(e) => setFilters({ ...filters, varianceOnly: e.target.checked })}
                  className="rounded w-4 h-4"
                />
                <span className="text-sm font-medium">Solo variado</span>
              </label>
            )}

            <div className="h-8 w-px bg-border-default mx-2"></div>

            <div className="flex gap-2">
              <select
                value={selectedMappingId}
                onChange={(e) => onMappingChange(e.target.value)}
                style={{ ...selectStyle, borderColor: 'var(--color-accent-primary)' }}
              >
                <option value="">⚙️ Mapping ERP para Sincronizar</option>
                {mappings.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.displayName || `${m.datasetType} v${m.version}`}</option>
                ))}
              </select>

              {selectedMappingId && (
                <button
                  onClick={() => onRefresh('*')}
                  disabled={refreshingItemCodes.size > 0}
                  className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] border transition-all flex items-center gap-3 shadow-sm ${
                    refreshingItemCodes.size > 0 
                    ? 'bg-hover text-muted border-border-default opacity-50' 
                    : 'bg-primary text-white border-primary hover:bg-primary/90 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0'
                  }`}
                >
                  {refreshingItemCodes.size > 0 ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <span className="text-sm">🔄</span>
                  )}
                  Sincronizar Stock Teórico
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="bg-card rounded-2xl border border-border-default overflow-hidden shadow-2xl">
          <table className="w-full">
            <thead className="bg-hover/30 border-b border-border-default">
              <tr>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-muted">Item</th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-muted">Lote</th>
                <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-muted">UOM</th>
                {hasSystemView && <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-muted">Stock Teórico</th>}
                <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-muted">Reserva</th>
                <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-muted">Conteo Físico</th>
                {hasVarianceView && <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-muted">Diferencia</th>}
                <th className="px-6 py-5 text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted">Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const { variance, percent } = getVariance(item);
                return (
                  <tr key={item.id} className={`border-b border-border-default/50 hover:bg-hover/40 transition-colors ${variance !== 0 ? 'bg-warning/5' : ''}`}>
                    <td className="px-6 py-5">
                      <p className="font-mono text-sm font-black text-primary">{item.itemCode}</p>
                      <p className="text-[10px] text-muted font-bold uppercase tracking-wider truncate max-w-[250px] mt-1">{item.itemName}</p>
                    </td>
                    <td className="px-6 py-5">
                      <span className="px-2 py-1 rounded-lg bg-hover text-[10px] font-black uppercase tracking-widest text-muted border border-border-default">
                        {item.lot || 'ND'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right font-bold text-secondary text-sm">{item.uom}</td>
                    {hasSystemView && (
                      <td className="px-6 py-5 text-right font-black text-primary">
                        {Number(item.systemQty ?? 0).toFixed(1)}
                      </td>
                    )}
                    <td className="px-6 py-5 text-right">
                      {item.reservedQty && item.reservedQty > 0 ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className="px-2 py-1 rounded bg-accent-secondary/10 text-accent-secondary font-black text-xs">
                            -{Number(item.reservedQty || 0).toFixed(1)}
                          </span>
                          <div className="flex gap-2">
                            {item.reservedInAisle && item.reservedInAisle > 0 && (
                              <div className="flex items-center gap-1 text-[9px] font-black text-amber-500 bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/20" title="En Pasillo">
                                <span>🛒</span>
                                <span>{Number(item.reservedInAisle).toFixed(1)}</span>
                              </div>
                            )}
                            {item.reservedSeparated && item.reservedSeparated > 0 && (
                              <div className="flex items-center gap-1 text-[9px] font-black text-blue-500 bg-blue-500/5 px-1.5 py-0.5 rounded border border-blue-500/20" title="Separado">
                                <span>📦</span>
                                <span>{Number(item.reservedSeparated).toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted/30 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <Input
                        type="number"
                        value={item.countedQty ?? ''}
                        onChange={(e) => onItemChange(item.id, parseFloat(e.target.value) || 0)}
                        className="w-28 text-right ml-auto bg-card border-border-default h-12 rounded-xl font-black text-lg focus:ring-accent-primary/20"
                        disabled={!canEdit}
                      />
                    </td>
                    {hasVarianceView && (
                      <td className={`px-6 py-5 text-right font-black ${variance < 0 ? 'text-danger' : variance > 0 ? 'text-success' : 'text-muted/30'}`}>
                        <div className="flex flex-col items-end">
                          <span className="text-base">{variance >= 0 ? '+' : ''}{Number(variance || 0).toFixed(1)}</span>
                          <span className="text-[10px] opacity-70 tracking-tighter">({Number(percent || 0).toFixed(1)}%)</span>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-5 text-center">
                      {syncingItemIds.has(item.id) ? (
                        <div className="w-5 h-5 border-2 border-accent-primary/20 border-t-accent-primary rounded-full animate-spin mx-auto"></div>
                      ) : syncedItemIds.has(item.id) ? (
                        <span className="text-success text-xl">✓</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
