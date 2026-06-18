import React from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';

interface ReservationListProps {
  reservations: any[];
  onReserve: (invoiceNumber: string, type: 'IN_AISLE' | 'SEPARATED') => void;
  onRemove: (id: string) => void;
  isPending?: boolean;
}

export const ReservationList: React.FC<ReservationListProps> = ({
  reservations,
  onReserve,
  onRemove,
  isPending
}) => {
  const [invoiceNumber, setInvoiceNumber] = React.useState('');
  const [reservationType, setReservationType] = React.useState<'IN_AISLE' | 'SEPARATED'>('IN_AISLE');

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="bg-card rounded-2xl border border-border-default p-10 shadow-lg">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1">
            <h3 className="text-xl font-black text-primary uppercase tracking-widest">Reserva por Factura</h3>
            <p className="text-muted text-xs font-bold uppercase tracking-widest mt-1">Sincronización con ERP para conciliación de despachos</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <label className="text-[9px] font-black uppercase tracking-widest text-muted px-1">Estado de Reserva</label>
              <select 
                value={reservationType} 
                onChange={(e) => setReservationType(e.target.value as any)}
                className="bg-hover/50 border border-border-default rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent-primary/20 transition-all h-10"
              >
                <option value="IN_AISLE">🛒 Pasillo (Sigue en estante)</option>
                <option value="SEPARATED">📦 Separado (Ya recolectado)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5 flex-1 md:min-w-[250px]">
              <label className="text-[9px] font-black uppercase tracking-widest text-muted px-1"># Factura ERP</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Introduce # factura..."
                  className="flex-1 h-10"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onReserve(invoiceNumber, reservationType)}
                />
                <Button
                  onClick={() => { onReserve(invoiceNumber, reservationType); setInvoiceNumber(''); }}
                  disabled={!invoiceNumber || isPending}
                  variant="primary"
                  className="h-10 px-6"
                >
                  {isPending ? '⏳' : '🔍 Reservar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reservations?.map((inv: any) => (
          <div key={inv.id} className="bg-card border border-border-default rounded-2xl p-6 shadow-md hover:shadow-xl transition-all group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onRemove(inv.id)}
                className="text-danger hover:scale-110 transition-transform p-2 bg-danger/10 rounded-xl"
              >
                🗑
              </button>
            </div>
            <div className="mb-4">
              <div className="flex justify-between items-start mb-1">
                <p className="text-[10px] font-black text-muted uppercase tracking-widest">Factura ERP</p>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${inv.type === 'SEPARATED' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                  {inv.type === 'SEPARATED' ? '📦 Separado' : '🛒 Pasillo'}
                </span>
              </div>
              <h4 className="text-xl font-black text-primary">{inv.invoiceNumber}</h4>
              <p className="text-xs font-bold text-accent-secondary mt-1">{inv.clientName || 'Consumidor Final'}</p>
            </div>
            <div className="space-y-2 border-t border-border-default/50 pt-4">
              {inv.items?.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center text-xs font-bold">
                  <span className="text-muted truncate max-w-[150px]">{item.itemCode}</span>
                  <span className="text-accent-secondary">-{item.reservedQty} {item.uom}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {(!reservations || reservations.length === 0) && (
          <div className="col-span-full py-20 bg-hover/10 border-2 border-dashed border-border-default rounded-2xl text-center">
            <p className="text-4xl mb-4">🚚</p>
            <p className="text-muted font-black uppercase tracking-widest text-xs">No hay facturas reservadas aún</p>
          </div>
        )}
      </div>
    </div>
  );
};
