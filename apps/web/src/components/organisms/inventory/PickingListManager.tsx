import React, { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';

interface PickingListManagerProps {
  onReserve: (params: { startDate: string; endDate: string; sellerCode?: string; dryRun: boolean; reservationType: 'IN_AISLE' | 'SEPARATED' }) => void;
  isPending: boolean;
  previewData?: any;
}

export const PickingListManager: React.FC<PickingListManagerProps> = ({
  onReserve,
  isPending,
  previewData
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sellerCode, setSellerCode] = useState('');
  const [reservationType, setReservationType] = useState<'IN_AISLE' | 'SEPARATED'>('SEPARATED');

  const handlePreview = () => {
    if (!startDate || !endDate) return;
    onReserve({ startDate, endDate, sellerCode, dryRun: true, reservationType });
  };

  const handleConfirm = () => {
    if (!startDate || !endDate) return;
    onReserve({ startDate, endDate, sellerCode, dryRun: false, reservationType });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-card rounded-2xl border border-border-default p-10 shadow-lg">
        <h3 className="text-xl font-black text-primary uppercase tracking-widest mb-6">📦 Reserva por Picking List</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted">Fecha Inicio</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted">Fecha Fin</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted">Vendedor (Opcional)</Label>
            <Input placeholder="Código vendedor" value={sellerCode} onChange={(e) => setSellerCode(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted">Estado de Reserva</Label>
            <select 
              value={reservationType} 
              onChange={(e) => setReservationType(e.target.value as any)}
              className="w-full bg-hover/50 border border-border-default rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent-primary/20 appearance-none transition-all"
            >
              <option value="SEPARATED">📦 Separado (Ya recolectado)</option>
              <option value="IN_AISLE">🛒 Pasillo (Sigue en estante)</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <Button onClick={handlePreview} disabled={!startDate || !endDate || isPending} variant="secondary" className="flex-1">
            👁️ Vista Previa
          </Button>
          <Button onClick={handleConfirm} disabled={!startDate || !endDate || isPending} variant="primary" className="flex-1">
            ✅ Reservar Lote
          </Button>
        </div>
      </div>

      {previewData && (
        <div className="bg-card border border-border-default rounded-2xl overflow-hidden shadow-xl animate-in slide-in-from-top-4">
          <div className="p-6 border-b border-border-default bg-hover/30 flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-widest">Vista Previa de Resultados</span>
            <span className="px-3 py-1 bg-accent-primary/10 text-accent-primary rounded-full text-xs font-bold">
              {previewData.invoices?.length || 0} Facturas encontradas
            </span>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-hover/10">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted">Factura</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted">Cliente</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted">Estado</th>
              </tr>
            </thead>
            <tbody>
              {previewData.invoices?.map((inv: any) => (
                <tr key={inv.invoiceNumber} className="border-t border-border-default/50">
                  <td className="px-6 py-4 font-mono text-sm font-bold">{inv.invoiceNumber}</td>
                  <td className="px-6 py-4 text-xs font-medium text-muted">{inv.clientName || '---'}</td>
                  <td className="px-6 py-4">
                    {inv.alreadyReserved ? (
                      <span className="text-[10px] font-black text-warning uppercase">⚠️ Ya reservada</span>
                    ) : (
                      <span className="text-[10px] font-black text-success uppercase">✓ Disponible</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
