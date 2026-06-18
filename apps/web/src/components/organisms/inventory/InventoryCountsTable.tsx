import React from 'react';
import { Button } from '@/components/atoms/Button';
import { InventoryCount } from '@/services/inventory.types';

interface InventoryCountsTableProps {
  counts: InventoryCount[];
  onProcess: (count: InventoryCount) => void;
  onDelete: (id: string) => void;
  canDelete?: boolean;
}

export const InventoryCountsTable: React.FC<InventoryCountsTableProps> = ({
  counts,
  onProcess,
  onDelete,
  canDelete = true
}) => {
  return (
    <div className="bg-card rounded-2xl border border-border-default overflow-hidden shadow-2xl">
      <table className="w-full">
        <thead className="bg-hover/30 border-b border-border-default">
          <tr>
            <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-muted">Secuencia</th>
            <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-muted">Código</th>
            <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-muted">Estado</th>
            <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-muted">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {counts.map((count) => (
            <tr key={count.id} className="border-b border-border-default/50 hover:bg-hover/40 transition-colors">
              <td className="px-6 py-5">
                <p className="text-sm font-black text-primary">{count.sequenceNumber}</p>
                <p className="text-[10px] text-muted font-bold uppercase">{new Date(count.createdAt).toLocaleDateString()}</p>
              </td>
              <td className="px-6 py-5">
                <span className="font-mono text-xs text-secondary">{count.code}</span>
              </td>
              <td className="px-6 py-5">
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                  count.status === 'COMPLETED' || count.status === 'FINALIZED' ? 'bg-success/10 text-success border-success/20' :
                  count.status === 'ACTIVE' ? 'bg-accent-primary/10 text-accent-primary border-accent-primary/20' :
                  count.status === 'ON_HOLD' ? 'bg-warning/10 text-warning border-warning/20' :
                  'bg-muted/10 text-muted border-border-default'
                }`}>
                  {count.status}
                </span>
              </td>
              <td className="px-6 py-5 text-right">
                <div className="flex gap-2 justify-end">
                  <Button onClick={() => onProcess(count)} variant="primary" size="sm">
                    {count.status === 'DRAFT' ? 'Iniciar' : 'Procesar'}
                  </Button>
                  {canDelete && (
                    <Button onClick={() => onDelete(count.id)} variant="danger" size="sm">
                      Eliminar
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {counts.length === 0 && (
            <tr>
              <td colSpan={4} className="px-6 py-20 text-center">
                <p className="text-4xl mb-4">📋</p>
                <p className="text-muted font-black uppercase tracking-widest text-xs">No hay conteos registrados</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
