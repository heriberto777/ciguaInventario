import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/templates/AdminLayout';
import { Button, Input } from '@/components/inventory';
import { Table, TableRow, TableCell } from '@/components/atoms/Table';
import { getApiClient } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    LineChart, Line, PieChart, Pie
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const AuditHubPage: React.FC = () => {
    const apiClient = getApiClient();
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const canAnalyze = hasPermission('ai:audit');

    // Filters State
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        warehouseId: '',
        status: ['FINALIZED', 'COMPLETED', 'CLOSED']
    });

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [aiPanel, setAiPanel] = useState<{ open: boolean; loading: boolean; content: string | null }>({
        open: false,
        loading: false,
        content: null
    });
    // Fetch Historical Data
    const { data: auditData, isLoading, refetch } = useQuery({
        queryKey: ['historical-audit', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.warehouseId) params.append('warehouseId', filters.warehouseId);
            filters.status.forEach(s => params.append('status', s));

            const res = await apiClient.get(`/reports/historical-audit?${params.toString()}`);
            return res.data.data || [];
        }
    });

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleAIAudit = async () => {
        if (selectedIds.length === 0) return;

        setAiPanel({ open: true, loading: true, content: null });

        try {
            const res = await apiClient.post('/reports/ai-audit', { auditIds: selectedIds });
            setAiPanel(f => ({ ...f, loading: false, content: res.data.analysis }));
        } catch (error) {
            console.error('Error fetching AI audit:', error);
            setAiPanel(f => ({ ...f, loading: false, content: 'Error al obtener el análisis de IA. Por favor, inténtalo de nuevo.' }));
        }
    };

    // Stats for Charts
    const chartData = auditData?.map((d: any) => ({
        name: d.code,
        accuracy: d.accuracy,
        loss: Math.abs(d.loss),
        gain: d.gain
    })).reverse() || [];

    return (
        <AdminLayout title="Hub de Auditoría IA">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* FILTERS PANEL (Option A) */}
                <div className="bg-card rounded-3xl border border-border-default/60 p-8 shadow-sm">
                    <div className="flex flex-col lg:flex-row gap-6 items-end">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted opacity-60 ml-1">Desde</label>
                                <Input
                                    type="date"
                                    value={filters.startDate}
                                    onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted opacity-60 ml-1">Hasta</label>
                                <Input
                                    type="date"
                                    value={filters.endDate}
                                    onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2 flex items-end">
                                <Button variant="primary" className="w-full rounded-xl py-3 font-black tracking-tight" onClick={() => refetch()}>
                                    🔍 Filtrar Historial
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* VISUAL TRENDS (Option C) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-card rounded-3xl border border-border-default shadow-lg-card p-8">
                        <h3 className="text-sm font-black text-primary uppercase tracking-widest mb-6 opacity-80">Tendencia de Precisión (%)</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                                    <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                                    />
                                    <Line type="monotone" dataKey="accuracy" stroke="#6366f1" strokeWidth={4} dot={{ r: 6, fill: '#6366f1' }} activeDot={{ r: 8 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-card rounded-3xl border border-border-default shadow-lg-card p-8">
                        <h3 className="text-sm font-black text-primary uppercase tracking-widest mb-6 opacity-80">Valor en Riesgo (Mermas vs Sobrantes)</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                                    <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="loss" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="gain" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* AUDIT TABLE (Option B Integration) */}
                <div className="bg-card rounded-3xl border border-border-default shadow-lg-card p-8 overflow-hidden">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                        <div>
                            <h2 className="text-xl font-black text-primary tracking-tight">HISTORIAL DE CONTEOS</h2>
                            <p className="text-[10px] font-black uppercase text-muted tracking-widest opacity-60">Selecciona uno o más para auditoría profunda</p>
                        </div>

                        {selectedIds.length > 0 && canAnalyze && (
                            <Button
                                variant="primary"
                                className="bg-accent-primary hover:bg-accent-primary-dark text-white rounded-2xl px-8 py-4 shadow-xl shadow-accent-primary/20 animate-in fade-in zoom-in duration-300 transform active:scale-95 group"
                                onClick={handleAIAudit}
                            >
                                <span className="flex items-center gap-3 font-black tracking-tight text-lg">
                                    🤖 Analizar {selectedIds.length} Conteos con IA
                                    <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
                                </span>
                            </Button>
                        )}
                    </div>

                    <div className="overflow-x-auto -mx-8 px-8">
                        <Table headers={['', 'Código', 'Fecha', 'Almacén', 'Estado', 'Precisión', 'Mermas', 'Sobrantes']}>
                            {auditData?.map((item: any) => (
                                <TableRow key={item.id} className={selectedIds.includes(item.id) ? 'bg-accent-primary/5 border-l-4 border-l-accent-primary' : ''}>
                                    <TableCell>
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded-lg border-2 border-border-default text-accent-primary focus:ring-accent-primary cursor-pointer"
                                            checked={selectedIds.includes(item.id)}
                                            onChange={() => toggleSelect(item.id)}
                                        />
                                    </TableCell>
                                    <TableCell className="font-black text-primary uppercase tracking-tight">{item.code}</TableCell>
                                    <TableCell className="text-[10px] font-black text-muted uppercase tracking-widest opacity-70">
                                        {new Date(item.date).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="font-bold text-secondary">{item.warehouse}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase border 
                      ${item.status === 'FINALIZED' ? 'bg-success/5 text-success border-success/20' : 'bg-muted/10 text-muted border-border-default/50'}`}>
                                            {item.status}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-12 h-1.5 bg-border-default rounded-full overflow-hidden">
                                                <div className={`h-full ${item.accuracy > 95 ? 'bg-success' : item.accuracy > 80 ? 'bg-warning' : 'bg-danger'}`} style={{ width: `${item.accuracy}%` }}></div>
                                            </div>
                                            <span className="font-black text-xs">{item.accuracy.toFixed(1)}%</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-black text-danger text-sm">
                                        {item.loss > 0 ? `-$${item.loss.toLocaleString()}` : '$0'}
                                    </TableCell>
                                    <TableCell className="font-black text-success text-sm">
                                        {item.gain > 0 ? `+$${item.gain.toLocaleString()}` : '$0'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </Table>

                        {(!auditData || auditData.length === 0) && !isLoading && (
                            <div className="py-24 text-center">
                                <div className="text-7xl mb-6 opacity-10">📂</div>
                                <p className="font-black uppercase tracking-[0.2em] text-xs text-muted">No se encontraron conteos para auditar</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* AI AUDITOR SLIDE-OVER PANEL */}
            {aiPanel.open && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] animate-in fade-in duration-300"
                        onClick={() => setAiPanel(f => ({ ...f, open: false }))}
                    />
                    {/* Panel */}
                    <div className="fixed top-0 right-0 w-full max-w-2xl h-full bg-card border-l border-border-default z-[101] shadow-2xl animate-in slide-in-from-right duration-500 overflow-hidden flex flex-col">
                        <div className="p-8 border-b border-border-default flex items-center justify-between bg-hover/20">
                            <div className="flex items-center gap-4">
                                <div className="text-3xl">🧠</div>
                                <div>
                                    <h2 className="text-xl font-black text-primary tracking-tight uppercase">Analista de Auditoría IA</h2>
                                    <p className="text-[10px] text-muted font-black uppercase tracking-widest opacity-60">Resultados Estratégicos</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setAiPanel(f => ({ ...f, open: false }))}
                                className="w-10 h-10 rounded-full hover:bg-hover flex items-center justify-center transition-all text-muted hover:text-primary"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-card/50">
                            {aiPanel.loading ? (
                                <div className="flex flex-col items-center justify-center h-full gap-8">
                                    <div className="relative">
                                        <div className="w-20 h-20 border-4 border-border-default border-t-accent-primary rounded-full animate-spin"></div>
                                        <div className="absolute inset-0 flex items-center justify-center text-2xl animate-pulse">🧠</div>
                                    </div>
                                    <div className="text-center space-y-2">
                                        <p className="text-primary font-black uppercase tracking-[0.2em] text-xs">Procesando Big Data...</p>
                                        <p className="text-muted text-[10px] font-medium max-w-[200px] leading-relaxed">Cruzando varianzas, históricos y patrones operativos para tu auditoría.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="markdown-content animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {aiPanel.content || ''}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </div>

                        <div className="p-8 border-t border-border-default bg-hover/10 flex justify-between items-center gap-4">
                            <div className="flex items-center gap-2 text-[10px] text-muted font-black uppercase tracking-widest">
                                <span className="w-2 h-2 bg-success rounded-full"></span>
                                Análisis Finalizado
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                className="rounded-xl font-bold uppercase tracking-widest text-[9px]"
                                onClick={() => navigate('/inventory/chat-ai', { state: { message: `Continuar análisis sobre los conteos: ${selectedIds.join(', ')}` } })}
                            >
                                💬 Abrir en Chat Completo
                            </Button>
                        </div>
                    </div>
                </>
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-default); border-radius: 10px; }
                
                .markdown-content table { border-collapse: separate; border-spacing: 0; width: 100%; margin: 1.5rem 0; background: var(--bg-hover); border-radius: 1rem; overflow: hidden; border: 1px solid var(--border-default); }
                .markdown-content th, .markdown-content td { padding: 1rem; border-bottom: 1px solid var(--border-default); text-align: left; font-size: 13px; }
                .markdown-content th { background: var(--bg-app); color: var(--text-primary); font-weight: 900; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em; }
                .markdown-content p { margin-bottom: 0.75rem; line-height: 1.6; }
                .markdown-content strong { color: var(--accent-primary); font-weight: 800; }
                .markdown-content h1, .markdown-content h2, .markdown-content h3 { color: var(--text-primary); font-weight: 900; margin: 1.5rem 0 0.75rem 0; text-transform: uppercase; font-size: 14px; letter-spacing: 0.05em; }
                .markdown-content li { margin-bottom: 0.5rem; border-left: 2px solid var(--accent-primary); padding-left: 1rem; list-style: none; font-size: 13px; }
            `}</style>
        </AdminLayout>
    );
};

export default AuditHubPage;
