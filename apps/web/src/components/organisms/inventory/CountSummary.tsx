import React from 'react';

interface CountSummaryProps {
  data: {
    totalItems: number;
    variances: number;
    shortages: number;
    overages: number;
    totalCostOverages: number;
    totalCostShortages: number;
    totalCostDifferences: number;
    totalPhysicalValue: number;
    totalSystemValue: number;
    totalReservedValue: number;
    totalInventoryDifference: number;
  };
  onToggle: () => void;
  isVisible: boolean;
}

export const CountSummary: React.FC<CountSummaryProps> = ({ data, onToggle, isVisible }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(val);
  };

  if (!isVisible) {
    return (
      <div className="px-8 py-4 bg-card border-b border-border-default flex justify-between items-center">
        <h2 className="text-lg font-black text-primary uppercase tracking-tight">Resumen del Conteo</h2>
        <button 
          onClick={onToggle}
          className="px-4 py-2 rounded-xl bg-hover text-[10px] font-black uppercase tracking-widest text-primary border border-border-default hover:bg-accent-primary/10 hover:text-accent-primary transition-all"
        >
          Mostrar Resumen
        </button>
      </div>
    );
  }

  const itemsWithZeroCost = data.totalItems > 0 && data.totalPhysicalValue === 0 && data.totalSystemValue === 0;

  return (
    <div className="px-8 py-6 bg-card border-b border-border-default space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-black text-primary tracking-tighter">Resumen del Conteo</h2>
          {itemsWithZeroCost && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 animate-pulse">
              <span className="text-xs font-black uppercase tracking-widest">⚠️ Costos en Cero Detectados</span>
            </div>
          )}
        </div>
        <button 
          onClick={onToggle}
          className="px-4 py-2 rounded-xl bg-hover text-[10px] font-black uppercase tracking-widest text-primary border border-border-default hover:bg-danger/10 hover:text-danger transition-all"
        >
          Ocultar Resumen
        </button>
      </div>

      <div className="p-8 rounded-3xl border border-border-default bg-hover/10 shadow-sm space-y-8">
        {/* Contadores Principales */}
        <div className="flex gap-10 items-center border-b border-border-default pb-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Total Ítems</span>
            <span className="text-2xl font-black text-primary">{data.totalItems}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Varianzas</span>
            <span className="text-2xl font-black text-amber-500">{data.variances}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Faltante</span>
            <span className="text-2xl font-black text-danger">{data.shortages}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Sobrante</span>
            <span className="text-2xl font-black text-success">{data.overages}</span>
          </div>
        </div>

        {/* Detalles Financieros */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-border-default/50 pb-2">
              <span className="text-xs font-bold text-muted">Costo total de los sobrantes:</span>
              <span className="text-sm font-black text-success">+{formatCurrency(data.totalCostOverages)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-border-default/50 pb-2">
              <span className="text-xs font-bold text-muted">Costo total de los faltantes:</span>
              <span className="text-sm font-black text-danger">-{formatCurrency(data.totalCostShortages)}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm font-black text-primary">Costo total de las diferencias:</span>
              <span className={`text-sm font-black ${data.totalCostDifferences >= 0 ? 'text-success' : 'text-danger'}`}>
                {data.totalCostDifferences >= 0 ? '+' : ''}{formatCurrency(data.totalCostDifferences)}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-border-default/50 pb-2">
              <span className="text-xs font-bold text-muted">Total Inventario Físico:</span>
              <span className="text-sm font-black text-primary">{formatCurrency(data.totalPhysicalValue)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-border-default/50 pb-2">
              <span className="text-xs font-bold text-muted">Total Inventario Cómputo:</span>
              <span className="text-sm font-black text-primary">{formatCurrency(data.totalSystemValue)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-border-default/50 pb-2">
              <span className="text-xs font-bold text-muted">Total en Reserva (Facturas):</span>
              <span className="text-sm font-black text-accent-secondary">-{formatCurrency(data.totalReservedValue)}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm font-black text-primary">Total Diferencia Inventario:</span>
              <span className={`text-sm font-black ${data.totalInventoryDifference >= 0 ? 'text-success' : 'text-danger'}`}>
                {data.totalInventoryDifference >= 0 ? '+' : ''}{formatCurrency(data.totalInventoryDifference)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
