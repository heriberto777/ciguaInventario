import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AdminLayout } from '@/components/templates/AdminLayout';
import { Button, VarianceTable } from '../components/inventory';
import { getApiClient } from '@/services/api';
import { useAuthStore } from '@/store/auth';

const VarianceReportsPage: React.FC = () => {
  const apiClient = getApiClient();
  const user = useAuthStore((state) => state.user);
  const permissions = user?.permissions || [];
  const roles = user?.roles || [];
  const isSuperAdmin = roles.includes('SuperAdmin');
  const hasSystemView = isSuperAdmin || permissions.includes('inventory:view_qty');

  const [selectedCount, setSelectedCount] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!hasSystemView) {
    return (
      <AdminLayout title="Acceso Denegado">
        <div className="max-w-4xl mx-auto mt-12 text-center p-8 bg-white rounded-lg shadow">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Acceso Restringido</h2>
          <p className="text-gray-600">No tienes permisos para ver los reportes de varianza o existencias del sistema.</p>
        </div>
      </AdminLayout>
    );
  }

  // Fetch inventory counts
  const { data: counts } = useQuery({
    queryKey: ['inventory-counts'],
    queryFn: async () => {
      const res = await apiClient.get('/inventory-counts');
      return Array.isArray(res.data) ? res.data : res.data.data || [];
    },
  });

  // Fetch variances
  const { data: variances, refetch: refetchVariances } = useQuery({
    queryKey: ['variance-reports', selectedCount, statusFilter],
    queryFn: async () => {
      let url = '/variance-reports?';
      if (selectedCount) url += `countId=${selectedCount}&`;
      if (statusFilter) url += `status=${statusFilter}&`;
      const res = await apiClient.get(url);
      return res.data.data || res.data || [];
    },
  });

  // Fetch summary
  const { data: summary } = useQuery({
    queryKey: ['variance-summary', selectedCount],
    queryFn: async () => {
      let url = '/variance-reports/summary?';
      if (selectedCount) url += `countId=${selectedCount}`;
      const res = await apiClient.get(url);
      return res.data.data || res.data || {};
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.patch(`/variance-reports/${id}/approve`, { resolution: 'Aprobado' });
      return res.data;
    },
    onSuccess: () => {
      setError(null);
      refetchVariances();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error approving variance';
      setError(message);
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.patch(`/variance-reports/${id}/reject`, { reason: 'Rechazado por el usuario' });
      return res.data;
    },
    onSuccess: () => {
      setError(null);
      refetchVariances();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error rejecting variance';
      setError(message);
    },
  });

  return (
    <AdminLayout title="Reportes de Varianza">
      <div className="max-w-6xl mx-auto">

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-red-800 font-semibold">Error</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800 text-xl leading-none"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Filtrar por Conteo</label>
              <select
                value={selectedCount}
                onChange={e => setSelectedCount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Todos los conteos</option>
                {counts?.map((count: any) => (
                  <option key={count.id} value={count.id}>
                    {count.code} - {count.warehouse?.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Filtrar por Estado</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Todos los estados</option>
                <option value="PENDING">Pendiente</option>
                <option value="APPROVED">Aprobado</option>
                <option value="REJECTED">Rechazado</option>
                <option value="ADJUSTED">Ajustado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">Total Varianzas</p>
              <p className="text-2xl font-bold">{summary.totalVariances}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">Aprobadas</p>
              <p className="text-2xl font-bold text-green-600">{summary.approvedVariances}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">Rechazadas</p>
              <p className="text-2xl font-bold text-red-600">{summary.rejectedVariances}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600">{summary.pendingVariances}</p>
            </div>
          </div>
        )}

        {/* Variances Table */}
        <div className="bg-white rounded-lg shadow p-4">
          <VarianceTable
            variances={variances?.data || variances || []}
            onApprove={id => approveMutation.mutate(id)}
            onReject={id => rejectMutation.mutate(id)}
            isLoading={approveMutation.isPending || rejectMutation.isPending}
          />
        </div>
      </div>
    </AdminLayout>
  );
};

export default VarianceReportsPage;
