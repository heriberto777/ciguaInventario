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
        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="p-1 bg-blue-100 rounded text-blue-600">⚡</span>
            Acciones Rápidas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/inventory/counts')}
              className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-blue-300 transition-all text-left"
            >
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-xl">📊</div>
              <div>
                <div className="font-bold text-gray-900">Nuevo Conteo</div>
                <div className="text-xs text-gray-500">Iniciar registro físico</div>
              </div>
            </button>
            <button
              onClick={() => navigate('/inventory/variances')}
              className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-yellow-300 transition-all text-left"
            >
              <div className="w-10 h-10 bg-yellow-50 text-yellow-600 rounded-lg flex items-center justify-center text-xl">📈</div>
              <div>
                <div className="font-bold text-gray-900">Ver Varianzas</div>
                <div className="text-xs text-gray-500">Analizar discrepancias</div>
              </div>
            </button>
            <button
              onClick={() => navigate('/inventory/hub')}
              className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-purple-300 transition-all text-left"
            >
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center text-xl">🧭</div>
              <div>
                <div className="font-bold text-gray-900">Módulos</div>
                <div className="text-xs text-gray-500">Explorar centro de inventario</div>
              </div>
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-gray-300 transition-all text-left"
            >
              <div className="w-10 h-10 bg-gray-50 text-gray-600 rounded-lg flex items-center justify-center text-xl">⚙️</div>
              <div>
                <div className="font-bold text-gray-900">Configuración</div>
                <div className="text-xs text-gray-500">Ajustes del sistema</div>
              </div>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white overflow-hidden relative group">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <span className="text-8xl">📊</span>
            </div>
            <p className="text-blue-100 text-sm font-medium mb-1 uppercase tracking-wider">Conteos Totales</p>
            <p className="text-4xl font-black mb-2">
              {stats?.counts?.length || 0}
            </p>
            <div className="h-1 w-12 bg-blue-300 rounded-full"></div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl shadow-lg p-6 text-white overflow-hidden relative group">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <span className="text-8xl">📈</span>
            </div>
            <p className="text-amber-50 text-sm font-medium mb-1 uppercase tracking-wider">Varianzas Detectadas</p>
            <p className="text-4xl font-black mb-2">
              {stats?.variances?.totalVariances || 0}
            </p>
            <div className="h-1 w-12 bg-amber-300 rounded-full"></div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white overflow-hidden relative group">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <span className="text-8xl">✅</span>
            </div>
            <p className="text-emerald-50 text-sm font-medium mb-1 uppercase tracking-wider">Varianzas Aprobadas</p>
            <p className="text-4xl font-black mb-2">
              {stats?.variances?.approvedVariances || 0}
            </p>
            <div className="h-1 w-12 bg-emerald-300 rounded-full"></div>
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
                  {stats?.counts?.slice(0, 5).map((count: any) => (
                    <tr key={count.id} className="border-t hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-gray-700">{count.code}</td>
                      <td className="px-4 py-3 text-gray-600">{count.warehouse?.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-black tracking-wider uppercase ${count.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                          }`}>
                          {count.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(count.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!stats?.counts || stats.counts.length === 0) && (
                <div className="py-12 text-center text-gray-400">
                  <span className="text-4xl block mb-2">📥</span>
                  No hay conteos recientes
                </div>
              )}
            </div>
          </div>

          {/* Artículos con Mayor Varianza */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold mb-6 text-gray-800">Top Varianzas</h2>
            <div className="space-y-4">
              {stats?.highVariance?.slice(0, 5).map((item: any) => (
                <div key={item.id} className="bg-red-50 p-4 rounded-xl border border-red-100 group hover:bg-red-100 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold text-sm text-red-900">{item.itemCode}</p>
                    <span className="text-sm font-black text-red-600 bg-white px-2 py-0.5 rounded-lg shadow-sm">
                      {typeof item.variancePercent === 'number' ? item.variancePercent.toFixed(1) : '0.0'}%
                    </span>
                  </div>
                  <p className="text-xs text-red-700 mb-2 font-medium line-clamp-1">{item.itemName}</p>
                  <div className="flex justify-between items-center pt-2 border-t border-red-200/50">
                    <span className="text-[10px] uppercase font-bold text-red-400">Existencia Sistema</span>
                    <span className="text-xs font-bold text-red-800">{item.systemQty}</span>
                  </div>
                </div>
              ))}
              {(!stats?.highVariance || stats.highVariance.length === 0) && (
                <div className="py-8 text-center text-gray-400 italic text-sm">
                  Sin varianzas críticas reportadas
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default InventoryDashboardPage;
