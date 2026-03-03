import React from 'react';
import { Table, TableRow, TableCell } from '@/components/atoms/Table';

interface Variance {
  id: string;
  itemCode: string;
  itemName?: string;
  systemQty: number;
  countedQty: number;
  difference: number;
  variancePercent: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ADJUSTED' | 'SUBMITTED';
}

interface VarianceTableProps {
  variances: Variance[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  isLoading?: boolean;
  selectedIds?: string[];
  onSelect?: (id: string) => void;
  onSelectAll?: (ids: string[]) => void;
}

export const VarianceTable: React.FC<VarianceTableProps> = ({
  variances,
  onApprove,
  onReject,
  isLoading = false,
  selectedIds = [],
  onSelect,
  onSelectAll,
}) => {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
      APPROVED: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
      REJECTED: 'bg-red-500/10 text-red-500 border border-red-500/20',
      ADJUSTED: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
      SUBMITTED: 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20',
    };
    return colors[status] || 'bg-[var(--bg-hover)] text-[var(--text-secondary)] border border-[var(--border-default)]';
  };

  if (variances.length === 0) {
    return (
      <div className="text-center py-12 bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] shadow-sm">
        <p className="text-[var(--text-secondary)] font-medium">Sin varianzas registradas</p>
      </div>
    );
  }

  const groupedVariances = variances.reduce((acc, variance: any) => {
    const brand = variance.countItem?.brand || 'Sin Marca';
    if (!acc[brand]) acc[brand] = [];
    acc[brand].push(variance);
    return acc;
  }, {} as Record<string, any[]>);

  const brands = Object.keys(groupedVariances).sort();

  const headers = [
    ...(onSelectAll ? [''] : []),
    'Artículo',
    'Sistema',
    'Físico',
    'Dif.',
    '%',
    'Estado',
    ...((onApprove || onReject) ? ['Acciones'] : [])
  ];

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSelectAll) {
      if (e.target.checked) {
        onSelectAll(variances.map(v => v.id));
      } else {
        onSelectAll([]);
      }
    }
  };

  return (
    <Table headers={headers}>
      {brands.map(brand => (
        <React.Fragment key={brand}>
          <tr className="bg-[var(--bg-active)]">
            <td colSpan={headers.length} className="px-6 py-2 font-bold text-[var(--accent-primary)] uppercase text-[10px] tracking-wider border-y border-[var(--border-default)]">
              📦 MARCA: {brand}
              {groupedVariances[brand].some(v => v.countItem?.brandDescription) && (
                <span className="ml-2 opacity-60 font-medium">({groupedVariances[brand][0].countItem.brandDescription})</span>
              )}
            </td>
          </tr>
          {groupedVariances[brand].map(variance => (
            <TableRow key={variance.id} className={selectedIds.includes(variance.id) ? 'bg-accent-primary/5' : ''}>
              {onSelect && (
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(variance.id)}
                    onChange={() => onSelect(variance.id)}
                    className="w-4 h-4 rounded border-border-default text-accent-primary focus:ring-accent-primary"
                  />
                </TableCell>
              )}
              <TableCell>
                <div className="font-bold text-[var(--text-primary)]">{variance.itemCode}</div>
                {variance.itemName && (
                  <div className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-tight truncate max-w-[200px]">
                    {variance.itemName}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-center font-medium">{Number(variance.systemQty).toFixed(1)}</TableCell>
              <TableCell className="text-center font-medium">{Number(variance.countedQty).toFixed(1)}</TableCell>
              <TableCell className={`text-center font-bold ${Number(variance.difference) > 0 ? 'text-[var(--color-info)]' : Number(variance.difference) < 0 ? 'text-[var(--color-danger)]' : 'text-[var(--text-muted)]'}`}>
                {Number(variance.difference) > 0 ? '+' : ''}{Number(variance.difference).toFixed(1)}
              </TableCell>
              <TableCell className="text-center font-bold text-[var(--text-secondary)]">
                {Number(variance.variancePercent || 0).toFixed(1)}%
              </TableCell>
              <TableCell className="text-center">
                <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusColor(variance.status)}`}>
                  {variance.status}
                </span>
              </TableCell>
              {(onApprove || onReject) && (
                <TableCell className="text-center">
                  {variance.status === 'PENDING' && (
                    <div className="flex gap-2 justify-center">
                      {onApprove && (
                        <button
                          onClick={() => onApprove(variance.id)}
                          disabled={isLoading}
                          className="bg-[var(--color-success)] text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          Aprobar
                        </button>
                      )}
                      {onReject && (
                        <button
                          onClick={() => onReject(variance.id)}
                          disabled={isLoading}
                          className="bg-[var(--color-danger)] text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          Rechazar
                        </button>
                      )}
                    </div>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </React.Fragment>
      ))}
    </Table>
  );
};
