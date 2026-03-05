import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/templates/AdminLayout';
import { Button, Input } from '@/components/inventory';
import { Table, TableRow, TableCell } from '@/components/atoms/Table';
import { getApiClient } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';

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

  const { hasPermission } = usePermissions();

  const canCreateCount = hasPermission('inv_counts:create');
  const canViewVariances = hasPermission('inventory:view_variances');
  const canViewHub = hasPermission('inv_counts:view') || hasPermission('warehouses:view');
  const canViewAudit = hasPermission('audit:view');
  const canViewSettings = hasPermission('settings:view') || hasPermission('settings:manage');

  const canViewStats = hasPermission('dashboards:view_stats');
  const canViewRecentList = hasPermission('dashboards:view_recent_list');
  const canViewHighVariances = hasPermission('dashboards:view_high_variances');

  return (
    <AdminLayout title="Dashboard de Inventario">
      <div className="max-w-7xl mx-auto">
        {isError && (
          <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 mb-6">
            <p className="text-danger font-bold">Error cargando datos</p>
            <p className="text-danger opacity-80 text-sm">{error instanceof Error ? error.message : 'No se pudo cargar el dashboard'}</p>
          </div>
        )}

        {isLoading && (
          <div className="bg-accent-primary/10 border border-accent-primary/20 rounded-xl p-4 mb-6">
            <p className="text-accent-primary font-bold animate-pulse">Cargando datos del inventario...</p>
          </div>
        )}
        {/* Quick Actions */}
        <div className="mb-12">
          <h2 className="text-sm font-black text-muted uppercase tracking-[0.2em] mb-6 flex items-center gap-3 opacity-60">
            <span className="w-8 h-[1px] bg-muted/30"></span>
            Acciones Rápidas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {canCreateCount && (
              <button
                onClick={() => navigate('/inventory/counts')}
                className="group relative overflow-hidden bg-card border border-border-default/60 p-6 rounded-2xl hover:shadow-2xl hover:shadow-accent-primary/10 hover:border-accent-primary transition-all duration-500 text-left"
              >
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                  <span className="text-6xl">📊</span>
                </div>
                <div className="w-14 h-14 bg-accent-primary/10 text-accent-primary rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 group-hover:bg-accent-primary group-hover:text-white transition-all duration-500 mb-4 shadow-sm">📊</div>
                <div>
                  <div className="font-black text-primary text-lg tracking-tight mb-1">Nuevo Conteo</div>
                  <div className="text-[10px] text-muted font-black uppercase tracking-[0.2em] opacity-60 group-hover:text-accent-primary group-hover:opacity-100 transition-all">Iniciar registro</div>
                </div>
              </button>
            )}

            {canViewVariances && (
              <button
                onClick={() => navigate('/inventory/variances')}
                className="group relative overflow-hidden bg-card border border-border-default/60 p-6 rounded-2xl hover:shadow-2xl hover:shadow-warning/10 hover:border-warning transition-all duration-500 text-left"
              >
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                  <span className="text-6xl">📈</span>
                </div>
                <div className="w-14 h-14 bg-warning/10 text-warning rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 group-hover:bg-warning group-hover:text-white transition-all duration-500 mb-4 shadow-sm">📈</div>
                <div>
                  <div className="font-black text-primary text-lg tracking-tight mb-1">Ver Varianzas</div>
                  <div className="text-[10px] text-muted font-black uppercase tracking-[0.2em] opacity-60 group-hover:text-warning group-hover:opacity-100 transition-all">Analizar discrepancias</div>
                </div>
              </button>
            )}

            {canViewHub && (
              <button
                onClick={() => navigate('/inventory/hub')}
                className="group relative overflow-hidden bg-card border border-border-default/60 p-6 rounded-2xl hover:shadow-2xl hover:shadow-accent-secondary/10 hover:border-accent-secondary transition-all duration-500 text-left"
              >
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                  <span className="text-6xl">🧭</span>
                </div>
                <div className="w-14 h-14 bg-accent-secondary/10 text-accent-secondary rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 group-hover:bg-accent-secondary group-hover:text-white transition-all duration-500 mb-4 shadow-sm">🧭</div>
                <div>
                  <div className="font-black text-primary text-lg tracking-tight mb-1">Módulos</div>
                  <div className="text-[10px] text-muted font-black uppercase tracking-[0.2em] opacity-60 group-hover:text-accent-secondary group-hover:opacity-100 transition-all">Centro de inventario</div>
                </div>
              </button>
            )}

            {canViewAudit && (
              <button
                onClick={() => navigate('/inventory/audit')}
                className="group relative overflow-hidden bg-card border border-border-default/60 p-6 rounded-2xl hover:shadow-2xl hover:shadow-success/10 hover:border-success transition-all duration-500 text-left"
              >
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                  <span className="text-6xl">🤖</span>
                </div>
                <div className="w-14 h-14 bg-success/10 text-success rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 group-hover:bg-success group-hover:text-white transition-all duration-500 mb-4 shadow-sm">🤖</div>
                <div>
                  <div className="font-black text-primary text-lg tracking-tight mb-1">Auditoría IA</div>
                  <div className="text-[10px] text-muted font-black uppercase tracking-[0.2em] opacity-60 group-hover:text-success group-hover:opacity-100 transition-all">Análisis de historial</div>
                </div>
              </button>
            )}

            {canViewSettings && (
              <button
                onClick={() => navigate('/settings')}
                className="group relative overflow-hidden bg-card border border-border-default/60 p-6 rounded-2xl hover:shadow-2xl hover:shadow-primary/10 hover:border-primary transition-all duration-500 text-left"
              >
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                  <span className="text-6xl">⚙️</span>
                </div>
                <div className="w-14 h-14 bg-hover text-muted rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500 mb-4 shadow-sm">⚙️</div>
                <div>
                  <div className="font-black text-primary text-lg tracking-tight mb-1">Configuración</div>
                  <div className="text-[10px] text-muted font-black uppercase tracking-[0.2em] opacity-60 group-hover:text-primary group-hover:opacity-100 transition-all">Ajustes del sistema</div>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        {canViewStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-accent-primary-dark to-accent-primary rounded-2xl shadow-lg p-8 text-white overflow-hidden relative group border border-white/10">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <span className="text-8xl">📊</span>
              </div>
              <div className="relative z-10">
                <p className="text-white/80 text-xs font-black uppercase tracking-[0.2em] mb-2 drop-shadow-sm">Conteos Totales</p>
                <p className="text-6xl font-black mb-3 drop-shadow-md tracking-tight">
                  {stats?.counts?.length || 0}
                </p>
                <div className="h-1.5 w-16 bg-white/40 rounded-full shadow-inner"></div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-warning-dark to-warning rounded-2xl shadow-lg p-8 text-white overflow-hidden relative group border border-white/10">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <span className="text-8xl">📈</span>
              </div>
              <div className="relative z-10">
                <p className="text-white/80 text-xs font-black uppercase tracking-[0.2em] mb-1.5 drop-shadow-sm">Varianzas</p>
                <p className="text-6xl font-black mb-3 drop-shadow-md tracking-tight">
                  {stats?.variances?.totalVariances || 0}
                </p>
                <div className="h-1.5 w-16 bg-white/40 rounded-full shadow-inner"></div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-success-dark to-success rounded-2xl shadow-lg p-8 text-white overflow-hidden relative group border border-white/10">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <span className="text-8xl">✅</span>
              </div>
              <div className="relative z-10">
                <p className="text-white/80 text-xs font-black uppercase tracking-[0.2em] mb-1.5 drop-shadow-sm">Aprobadas</p>
                <p className="text-6xl font-black mb-3 drop-shadow-md tracking-tight">
                  {stats?.variances?.approvedVariances || 0}
                </p>
                <div className="h-1.5 w-16 bg-white/40 rounded-full shadow-inner"></div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recientes Conteos */}
          {canViewRecentList && (
            <div className="lg:col-span-2 bg-card rounded-2xl border border-border-default shadow-lg-card p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-primary uppercase tracking-tight">Conteos Recientes</h2>
                <Button variant="secondary" size="sm" onClick={() => navigate('/inventory/counts')} className="rounded-xl text-[10px] uppercase font-black tracking-widest">Ver Todos</Button>
              </div>
              <div className="overflow-x-auto">
                <Table headers={['Código', 'Almacén', 'Estado', 'Fecha']}>
                  {stats?.counts?.slice(0, 5).map((count: any) => (
                    <TableRow key={count.id}>
                      <TableCell className="font-bold text-primary uppercase tracking-tight">{count.code}</TableCell>
                      <TableCell className="text-secondary font-medium">{count.warehouse?.name}</TableCell>
                      <TableCell>
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase ${count.status === 'CLOSED' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' :
                          count.status === 'FINALIZED' ? 'bg-success/10 text-success border border-success/20' :
                            count.status === 'COMPLETED' ? 'bg-success/5 text-success/80 border border-success/10' :
                              count.status === 'SUBMITTED' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                'bg-warning/10 text-warning border border-warning/20'
                          }`}>
                          {count.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted text-[10px] font-black uppercase tracking-widest opacity-60">
                        {new Date(count.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </Table>
              </div>
              {(!stats?.counts || stats.counts.length === 0) && (
                <div className="py-20 text-center text-muted">
                  <div className="text-6xl mb-6 opacity-20">📥</div>
                  <p className="font-black uppercase tracking-[0.2em] text-xs">No hay conteos pendientes</p>
                </div>
              )}
            </div>
          )}

          {/* Artículos con Mayor Varianza */}
          {canViewHighVariances && (
            <div className="bg-card rounded-[2rem] shadow-lg-card border border-border-default p-8">
              <h2 className="text-xl font-black mb-8 text-primary uppercase tracking-tight">Top Varianzas</h2>
              <div className="space-y-4">
                {stats?.highVariance?.slice(0, 5).map((item: any) => (
                  <div key={item.id} className="bg-danger/5 p-5 rounded-2xl border border-danger/10 group hover:bg-danger/10 hover:border-danger transition-all cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-black text-[10px] uppercase tracking-[0.15em] text-danger">{item.itemCode}</p>
                      <span className="text-[10px] font-black text-danger bg-danger/10 px-2.5 py-0.5 rounded-full border border-danger/10 shadow-sm uppercase tracking-widest">
                        {typeof item.variancePercent === 'number' ? item.variancePercent.toFixed(1) : '0.0'}%
                      </span>
                    </div>
                    <p className="text-sm text-secondary mb-3 font-bold line-clamp-1">{item.itemName}</p>
                    <div className="flex justify-between items-center pt-3 border-t border-border-default/50">
                      <span className="text-[10px] uppercase font-black text-muted tracking-widest opacity-60">Sistema</span>
                      <span className="text-sm font-black text-danger">{item.systemQty}</span>
                    </div>
                  </div>
                ))}
                {(!stats?.highVariance || stats.highVariance.length === 0) && (
                  <div className="py-12 text-center text-muted italic">
                    <div className="text-4xl mb-4 opacity-10">✨</div>
                    <p className="text-[10px] font-black uppercase tracking-widest">Sin varianzas críticas</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default InventoryDashboardPage;
