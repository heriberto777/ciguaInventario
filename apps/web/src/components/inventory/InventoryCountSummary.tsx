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
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Resumen del Conteo</h3>

      {items.length === 0 ? (
        <p className="text-gray-500">No hay artículos agregados aún</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-3 rounded">
              <p className="text-sm text-gray-600">Total de Artículos</p>
              <p className="text-2xl font-bold text-blue-600">{items.length}</p>
            </div>
            <div className="bg-yellow-50 p-3 rounded">
              <p className="text-sm text-gray-600">Artículos con Varianza</p>
              <p className="text-2xl font-bold text-yellow-600">{totalVariances}</p>
            </div>
            <div className="bg-red-50 p-3 rounded">
              <p className="text-sm text-gray-600">Diferencia Total</p>
              <p className="text-2xl font-bold text-red-600">{totalDifference}</p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <p className="text-sm text-gray-600">% Exactitud</p>
              <p className="text-2xl font-bold text-green-600">
                {((items.length - totalVariances) / items.length * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
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
                    <tr key={index} className={difference !== 0 ? 'bg-yellow-50' : ''}>
                      <td className="px-4 py-2">{item.locationCode || item.locationId}</td>
                      <td className="px-4 py-2">{item.itemCode}</td>
                      <td className="px-4 py-2 text-center">{item.systemQty}</td>
                      <td className="px-4 py-2 text-center">{item.countedQty}</td>
                      <td className={`px-4 py-2 text-center font-semibold ${difference === 0 ? 'text-green-600' : difference > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {difference > 0 ? '+' : ''}{difference}
                      </td>
                      <td className="px-4 py-2 text-center">{percent.toFixed(1)}%</td>
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
