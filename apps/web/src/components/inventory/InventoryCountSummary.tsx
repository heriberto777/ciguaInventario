import React from 'react';
import Button from './Button';

interface CountItem {
  id?: string;
  locationId: string;
  locationCode?: string;
  itemCode: string;
  itemName?: string;
  systemQty: number;
  countedQty: number;
  uom: string;
  notes?: string;
}

interface InventoryCountSummaryProps {
  items: CountItem[];
  onRemoveItem: (index: number) => void;
  onComplete: () => void;
  isLoading?: boolean;
}

export const InventoryCountSummary: React.FC<InventoryCountSummaryProps> = ({
  items,
  onRemoveItem,
  onComplete,
  isLoading = false,
}) => {
  const totalVariances = items.filter(item => item.countedQty !== item.systemQty).length;
  const totalDifference = items.reduce((sum, item) => sum + (item.countedQty - item.systemQty), 0);

  return (
    <div className="bg-[var(--bg-card)] p-6 rounded-2xl shadow-xl border border-[var(--border-default)]">
      <h3 className="text-xl font-bold mb-6 text-[var(--text-primary)]">Resumen del Conteo</h3>

      {items.length === 0 ? (
        <p className="text-[var(--text-muted)] italic font-medium">No hay artículos agregados aún</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-500 mb-1">Total de Artículos</p>
              <p className="text-3xl font-black text-blue-500">{items.length}</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 mb-1">Artículos con Varianza</p>
              <p className="text-3xl font-black text-amber-500">{totalVariances}</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-wider text-red-500 mb-1">Diferencia Total</p>
              <p className="text-3xl font-black text-red-500">{totalDifference}</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-500 mb-1">% Exactitud</p>
              <p className="text-3xl font-black text-emerald-500">
                {((items.length - totalVariances) / items.length * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="overflow-x-auto mb-6 rounded-xl border border-[var(--border-default)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-hover)] border-b border-[var(--border-default)] uppercase text-[10px] font-black tracking-wider text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-2 text-left">Ubicación</th>
                  <th className="px-4 py-2 text-left">Código</th>
                  <th className="px-4 py-2 text-center">Sistema</th>
                  <th className="px-4 py-2 text-center">Contado</th>
                  <th className="px-4 py-2 text-center">Diferencia</th>
                  <th className="px-4 py-2 text-center">%</th>
                  <th className="px-4 py-2 text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const difference = item.countedQty - item.systemQty;
                  const percent = item.systemQty > 0 ? (difference / item.systemQty) * 100 : 0;

                  return (
                    <tr key={index} className={`border-b border-[var(--border-default)] hover:bg-[var(--bg-hover)] transition-colors ${difference !== 0 ? 'bg-amber-500/5' : ''}`}>
                      <td className="px-4 py-2 font-mono text-[var(--text-muted)] text-xs font-bold">{item.locationCode || item.locationId}</td>
                      <td className="px-4 py-2 font-bold text-[var(--text-primary)]">{item.itemCode}</td>
                      <td className="px-4 py-2 text-center text-[var(--text-primary)] font-medium">{item.systemQty}</td>
                      <td className="px-4 py-2 text-center text-[var(--text-primary)] font-bold">{item.countedQty}</td>
                      <td className={`px-4 py-2 text-center font-black ${difference === 0 ? 'text-emerald-500' : difference > 0 ? 'text-blue-500' : 'text-red-500'}`}>
                        {difference > 0 ? '+' : ''}{difference}
                      </td>
                      <td className="px-4 py-2 text-center text-[var(--text-muted)] font-black">({percent.toFixed(1)}%)</td>
                      <td className="px-4 py-2 text-center">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => onRemoveItem(index)}
                        >
                          Eliminar
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <Button
              variant="success"
              onClick={onComplete}
              disabled={isLoading}
            >
              {isLoading ? 'Completando...' : 'Completar Conteo'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
