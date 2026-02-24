import React from 'react';

interface Variance {
  id: string;
  itemCode: string;
  itemName?: string;
  systemQty: number;
  countedQty: number;
  difference: number;
  variancePercent: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ADJUSTED';
}

interface VarianceTableProps {
  variances: Variance[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  isLoading?: boolean;
}

export const VarianceTable: React.FC<VarianceTableProps> = ({
  variances,
  onApprove,
  onReject,
  isLoading = false,
}) => {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-50 text-yellow-800',
      APPROVED: 'bg-green-50 text-green-800',
      REJECTED: 'bg-red-50 text-red-800',
      ADJUSTED: 'bg-blue-50 text-blue-800',
    };
    return colors[status] || 'bg-gray-50 text-gray-800';
  };

  if (variances.length === 0) {
    return <div className="text-center py-8 text-gray-500">Sin varianzas registradas</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left">Código</th>
            <th className="px-4 py-2 text-center">Sistema</th>
            <th className="px-4 py-2 text-center">Contado</th>
            <th className="px-4 py-2 text-center">Diferencia</th>
            <th className="px-4 py-2 text-center">%</th>
            <th className="px-4 py-2 text-center">Estado</th>
            {(onApprove || onReject) && <th className="px-4 py-2 text-center">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {variances.map(variance => (
            <tr key={variance.id} className="border-t hover:bg-gray-50">
              <td className="px-4 py-2">
                <div>{variance.itemCode}</div>
                {variance.itemName && <div className="text-xs text-gray-500">{variance.itemName}</div>}
              </td>
              <td className="px-4 py-2 text-center">{variance.systemQty}</td>
              <td className="px-4 py-2 text-center">{variance.countedQty}</td>
              <td className={`px-4 py-2 text-center font-semibold ${variance.difference > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {variance.difference > 0 ? '+' : ''}{variance.difference}
              </td>
              <td className="px-4 py-2 text-center">{variance.variancePercent.toFixed(1)}%</td>
              <td className="px-4 py-2 text-center">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(variance.status)}`}>
                  {variance.status}
                </span>
              </td>
              {(onApprove || onReject) && (
                <td className="px-4 py-2 text-center">
                  {variance.status === 'PENDING' && (
                    <div className="flex gap-2 justify-center">
                      {onApprove && (
                        <button
                          onClick={() => onApprove(variance.id)}
                          disabled={isLoading}
                          className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 disabled:opacity-50"
                        >
                          Aprobar
                        </button>
                      )}
                      {onReject && (
                        <button
                          onClick={() => onReject(variance.id)}
                          disabled={isLoading}
                          className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 disabled:opacity-50"
                        >
                          Rechazar
                        </button>
                      )}
                    </div>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
