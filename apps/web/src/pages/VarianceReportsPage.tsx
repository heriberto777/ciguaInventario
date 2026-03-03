import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AdminLayout } from '@/components/templates/AdminLayout';
import { Button, VarianceTable } from '../components/inventory';
import { getApiClient } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { Select } from '@/components/atoms/Select';
import { useNavigate } from 'react-router-dom';

const VarianceReportsPage: React.FC = () => {
  const apiClient = getApiClient();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const permissions = user?.permissions || [];
  const roles = user?.roles || [];
  const isSuperAdmin = roles.includes('SuperAdmin');
  const hasSystemView = isSuperAdmin || permissions.includes('inventory:view_qty') || permissions.includes('inventory:manage');
  const hasVarianceView = isSuperAdmin || permissions.includes('inventory:view_variances') || permissions.includes('inventory:manage');

  const [selectedCount, setSelectedCount] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [brandFilter, setBrandFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!hasSystemView && !hasVarianceView) {
    return (
      <AdminLayout title="Acceso Denegado">
        <div className="max-w-4xl mx-auto mt-12 text-center p-8 bg-[var(--bg-card)] rounded-lg border border-[var(--border-default)] shadow-sm">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Acceso Restringido</h2>
          <p className="text-[var(--text-secondary)]">No tienes permisos para ver los reportes de varianza o existencias del sistema.</p>
        </div>
      </AdminLayout>
    );
  }

  // Fetch classifications for filters
  const { data: brands, isLoading: loadingBrands } = useQuery({
    queryKey: ['classifications', 'BRAND'],
    queryFn: async () => {
      const res = await apiClient.get('/item-classifications?groupType=BRAND');
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    }
  });

  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ['classifications', 'CATEGORY'],
    queryFn: async () => {
      const res = await apiClient.get('/item-classifications?groupType=CATEGORY');
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    }
  });

  const { data: subCategories, isLoading: loadingSubCategories } = useQuery({
    queryKey: ['classifications', 'SUBCATEGORY'],
    queryFn: async () => {
      const res = await apiClient.get('/item-classifications?groupType=SUBCATEGORY');
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    }
  });

  // Fetch inventory counts - aumentado el límite para visibilidad
  const { data: counts } = useQuery({
    queryKey: ['inventory-counts'],
    queryFn: async () => {
      const res = await apiClient.get('/inventory-counts?pageSize=500');
      return Array.isArray(res.data) ? res.data : res.data.data || res.data.counts || [];
    },
  });

  // Fetch variances
  const { data: variances, refetch: refetchVariances } = useQuery({
    queryKey: ['variance-reports', selectedCount, statusFilter, brandFilter, categoryFilter, subCategoryFilter],
    queryFn: async () => {
      let url = '/variance-reports?pageSize=1000&';
      if (selectedCount) url += `countId=${selectedCount}&`;
      if (statusFilter) url += `status=${statusFilter}&`;
      if (brandFilter) url += `brand=${encodeURIComponent(brandFilter)}&`;
      if (categoryFilter) url += `category=${encodeURIComponent(categoryFilter)}&`;
      if (subCategoryFilter) url += `subCategory=${encodeURIComponent(subCategoryFilter)}&`;
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
          <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-danger font-bold">Error</h3>
                <p className="text-danger opacity-80 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-danger hover:opacity-100 opacity-60 text-xl leading-none"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-card rounded-xl shadow-md border border-border-default p-6 mb-8">
          <div className="flex items-center gap-2 mb-6 border-b border-border-default pb-4">
            <span className="text-xl">🔍</span>
            <h2 className="text-lg font-bold text-primary">Filtros de Reporte</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Select
              label="📅 Conteo de Inventario"
              value={selectedCount}
              onChange={e => setSelectedCount(e.target.value)}
              options={[
                { value: '', label: 'Seleccionar conteo...' },
                ...(counts?.map((count: any) => ({
                  value: count.id,
                  label: `${count.code} - ${count.warehouse?.name} (${count.status})`
                })) || [])
              ]}
            />

            <Select
              label="Estado de Varianza"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'PENDING', label: 'Pendiente' },
                { value: 'APPROVED', label: 'Aprobado' },
                { value: 'REJECTED', label: 'Rechazado' },
                { value: 'ADJUSTED', label: 'Ajustado' },
                { value: 'SUBMITTED', label: 'Sometido (Móvil)' }
              ]}
            />

            <Select
              label="🏷️ Marca"
              value={brandFilter}
              onChange={e => setBrandFilter(e.target.value)}
              disabled={loadingBrands}
              options={[
                { value: '', label: loadingBrands ? 'Cargando marcas...' : 'Todas las marcas' },
                ...(brands?.map((b: any) => ({
                  value: b.description || b.code,
                  label: `${b.description} (${b.code})`
                })) || [])
              ]}
            />

            <Select
              label="📁 Categoría"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              disabled={loadingCategories}
              options={[
                { value: '', label: loadingCategories ? 'Cargando categorías...' : 'Todas las categorías' },
                ...(categories?.map((c: any) => ({
                  value: c.description || c.code,
                  label: `${c.description} (${c.code})`
                })) || [])
              ]}
            />

            <Select
              label="📂 Subcategoría"
              value={subCategoryFilter}
              onChange={e => setSubCategoryFilter(e.target.value)}
              disabled={loadingSubCategories}
              options={[
                { value: '', label: loadingSubCategories ? 'Cargando...' : 'Todas las subcategorías' },
                ...(subCategories?.map((s: any) => ({
                  value: s.description || s.code,
                  label: `${s.description} (${s.code})`
                })) || [])
              ]}
            />

            <div className="flex items-end pb-1">
              <Button
                variant="secondary"
                className="w-full font-black uppercase tracking-widest text-[10px] py-3 h-[42px]"
                onClick={() => {
                  setSelectedCount('');
                  setStatusFilter('');
                  setBrandFilter('');
                  setCategoryFilter('');
                  setSubCategoryFilter('');
                }}
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-card p-5 rounded-2xl border border-border-default shadow-sm transition-transform hover:scale-[1.02]">
              <p className="text-xs font-black uppercase tracking-widest text-secondary mb-1">Total Varianzas</p>
              <p className="text-3xl font-black text-primary">{summary.totalVariances}</p>
            </div>
            <div className="bg-success/10 p-5 rounded-2xl border border-success/20 shadow-sm transition-transform hover:scale-[1.02]">
              <p className="text-xs font-black uppercase tracking-widest text-success opacity-80 mb-1">Aprobadas</p>
              <p className="text-3xl font-black text-success">{summary.approvedVariances}</p>
            </div>
            <div className="bg-danger/10 p-5 rounded-2xl border border-danger/20 shadow-sm transition-transform hover:scale-[1.02]">
              <p className="text-xs font-black uppercase tracking-widest text-danger opacity-80 mb-1">Rechazadas</p>
              <p className="text-3xl font-black text-danger">{summary.rejectedVariances}</p>
            </div>
            <div className="bg-warning/10 p-5 rounded-2xl border border-warning/20 shadow-sm transition-transform hover:scale-[1.02]">
              <p className="text-xs font-black uppercase tracking-widest text-warning opacity-80 mb-1">Pendientes</p>
              <p className="text-3xl font-black text-warning">{summary.pendingVariances}</p>
            </div>
          </div>
        )}

        {/* Variances Table */}
        <div className="bg-card rounded-2xl border border-border-default shadow-xl p-6 overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-black text-primary uppercase tracking-widest opacity-60">Resultados del Reporte</h3>
            {selectedIds.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                className="bg-accent-primary hover:bg-accent-primary-dark text-white rounded-xl shadow-lg shadow-accent-primary/20"
                onClick={() => navigate('/inventory/chat-ai', { state: { message: `Analiza estas ${selectedIds.length} varianzas específicas y detecta anomalías. Indica si hay patrones de error humano o posibles mermas estructurales: ${selectedIds.join(', ')}` } })}
              >
                🤖 Analizar Selección ({selectedIds.length})
              </Button>
            )}
          </div>
          <VarianceTable
            variances={variances?.data || variances || []}
            onApprove={id => approveMutation.mutate(id)}
            onReject={id => rejectMutation.mutate(id)}
            isLoading={approveMutation.isPending || rejectMutation.isPending}
            selectedIds={selectedIds}
            onSelect={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
            onSelectAll={(ids) => setSelectedIds(ids)}
          />
        </div>      </div>
    </AdminLayout>
  );
};

export default VarianceReportsPage;
