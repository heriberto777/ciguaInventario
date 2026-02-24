import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/templates/AdminLayout';
import { Button, Input } from '../components/inventory';
import { getApiClient } from '@/services/api';

const InventoryDashboardPage: React.FC = () => {
  const apiClient = getApiClient();
  const navigate = useNavigate();

  // Fetch dashboard stats
  const { data: stats, isLoading, isError, error } = useQuery({
    queryKey: ['inventory-stats'],
    queryFn: async () => {
      try {
        const [countsRes, variancesRes, highVarianceRes] = await Promise.all([
          apiClient.get('/inventory-counts'),
          apiClient.get('/variance-reports/summary'),
          apiClient.get('/variance-reports/high-variance?threshold=10'),
        ]);

        return {
          counts: Array.isArray(countsRes.data) ? countsRes.data : countsRes.data.data || [],
          variances: variancesRes.data.data || variancesRes.data || {},
          highVariance: Array.isArray(highVarianceRes.data) ? highVarianceRes.data : highVarianceRes.data.data || [],
        };
      } catch (err) {
        console.error('Error fetching inventory stats:', err);
        return {
          counts: [],
          variances: {},
          highVariance: [],
        };
      }
    },
  });

  return (
    <AdminLayout title="Dashboard de Inventario">
      <div className="max-w-7xl mx-auto">
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-semibold">Error cargando datos</p>
            <p className="text-red-600 text-sm">{error instanceof Error ? error.message : 'No se pudo cargar el dashboard'}</p>
          </div>
        )}

        {isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800">Cargando datos del inventario...</p>
          </div>
        )}
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
                  {stats?.counts?.slice(0, 5).map((count) => {
                    const c = count as any;
                    return (
                      <tr key={c.id} className="border-t">
                        <td className="px-4 py-2 font-semibold">{c.code}</td>
                        <td className="px-4 py-2">{c.warehouse?.name}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            c.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Artículos con Mayor Varianza */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Top Varianzas</h2>
            <div className="space-y-3">
              {stats?.highVariance?.slice(0, 5).map((item) => {
                const i = item as any;
                return (
                  <div key={i.id} className="bg-red-50 p-3 rounded">
                    <p className="font-semibold text-sm">{i.itemCode}</p>
                    <p className="text-xs text-gray-600 mb-1">{i.itemName}</p>
                    <div className="flex justify-between">
                      <span className="text-xs">
                        Sistema: {i.systemQty}
                      </span>
                      <span className="text-xs font-bold text-red-600">
                        {i.variancePercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default InventoryDashboardPage;
