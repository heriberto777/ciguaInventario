import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AdminLayout } from '@/components/templates/AdminLayout';
import { Button, Input } from '../components/inventory';

const InventoryDashboardPage: React.FC = () => {
  // Fetch dashboard stats
  const { data: stats } = useQuery({
    queryKey: ['inventory-stats'],
    queryFn: async () => {
      const [counts, variances, highVariance] = await Promise.all([
        fetch('/api/inventory-counts').then(r => r.json()),
        fetch('/api/variance-reports/summary').then(r => r.json()),
        fetch('/api/variance-reports/high-variance?threshold=10').then(r => r.json()),
      ]);

      return {
        counts,
        variances,
        highVariance,
      };
    },
  });

  return (
    <AdminLayout title="Dashboard de Inventario">
      <div className="max-w-7xl mx-auto">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-2">Conteos Totales</p>
            <p className="text-3xl font-bold text-blue-600">
              {stats?.counts?.length || 0}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-2">Varianzas Detectadas</p>
            <p className="text-3xl font-bold text-yellow-600">
              {stats?.variances?.totalVariances || 0}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-2">Varianzas Aprobadas</p>
            <p className="text-3xl font-bold text-green-600">
              {stats?.variances?.approvedVariances || 0}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-2">Pendientes de Revisar</p>
            <p className="text-3xl font-bold text-red-600">
              {stats?.variances?.pendingVariances || 0}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recientes Conteos */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Conteos Recientes</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Código</th>
                    <th className="px-4 py-2 text-left">Almacén</th>
                    <th className="px-4 py-2 text-left">Estado</th>
                    <th className="px-4 py-2 text-left">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.counts?.slice(0, 5).map(count => (
                    <tr key={count.id} className="border-t">
                      <td className="px-4 py-2 font-semibold">{count.code}</td>
                      <td className="px-4 py-2">{count.warehouse?.name}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          count.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {count.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {new Date(count.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Artículos con Mayor Varianza */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Top Varianzas</h2>
            <div className="space-y-3">
              {stats?.highVariance?.slice(0, 5).map(item => (
                <div key={item.id} className="bg-red-50 p-3 rounded">
                  <p className="font-semibold text-sm">{item.itemCode}</p>
                  <p className="text-xs text-gray-600 mb-1">{item.itemName}</p>
                  <div className="flex justify-between">
                    <span className="text-xs">
                      Sistema: {item.systemQty}
                    </span>
                    <span className="text-xs font-bold text-red-600">
                      {item.variancePercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default InventoryDashboardPage;
