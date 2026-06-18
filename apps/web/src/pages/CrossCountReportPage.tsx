import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getApiClient } from '@/services/api';
import { AdminLayout } from '@/components/templates/AdminLayout';
import { Button } from '@/components/atoms/Button';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip as RechartsTooltip, Cell, PieChart, Pie, Legend, LineChart, Line 
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];
const apiClient = getApiClient();

function ChartRenderer({ content }: { content: string }) {
    const chartData = React.useMemo(() => {
        try {
            const blockMatch = content.match(/```(?:json|json-chart|chart)?\s*(\{[\s\S]*?\})\s*```/);
            if (blockMatch) return JSON.parse(blockMatch[1]);
            
            const startIdx = content.search(/\{\s*"type"\s*:\s*"(?:bar|line|pie)"/);
            if (startIdx !== -1) {
                let braceCount = 0;
                let endIdx = -1;
                for (let i = startIdx; i < content.length; i++) {
                    if (content[i] === '{') braceCount++;
                    if (content[i] === '}') {
                        braceCount--;
                        if (braceCount === 0) {
                            endIdx = i;
                            break;
                        }
                    }
                }
                if (endIdx !== -1) {
                    const rawJson = content.slice(startIdx, endIdx + 1);
                    return JSON.parse(rawJson);
                }
            }
            return null;
        } catch (e) {
            return null;
        }
    }, [content]);

    if (!chartData || !chartData.type || !chartData.data) return null;
    const { type, data, title } = chartData;
    const normalizedData = Array.isArray(data) ? data.map((d: any) => ({
        name: d.name || d.label || 'N/A',
        value: Number(d.value || d.amount || 0)
    })) : [];

    if (normalizedData.length === 0) return null;

    return (
        <div className="mt-8 p-8 bg-app rounded-3xl border border-border-default overflow-hidden min-h-[350px] shadow-2xl bg-gradient-to-b from-card to-hover/20">
            {title && (
                <div className="mb-8 text-center">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-accent-primary mb-1">Visualización Estratégica</h4>
                    <p className="text-sm font-bold text-primary">{title}</p>
                </div>
            )}
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    {type === 'bar' ? (
                        <BarChart data={normalizedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} opacity={0.3} />
                            <XAxis dataKey="name" fontSize={9} tick={{ fill: 'var(--text-secondary)', fontWeight: 800 }} axisLine={false} tickLine={false} />
                            <YAxis fontSize={10} tick={{ fill: 'var(--text-secondary)', fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <RechartsTooltip
                                contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '16px', fontSize: '11px', fontWeight: 700, boxShadow: 'var(--shadow-xl)' }}
                                cursor={{ fill: 'var(--bg-hover)', opacity: 0.4 }}
                            />
                            <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={32}>
                                {normalizedData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={entry.value < 0 ? '#ef4444' : COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    ) : type === 'pie' ? (
                        <PieChart>
                            <Pie data={normalizedData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={10} dataKey="value" stroke="none">
                                {normalizedData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '16px', fontSize: '11px', fontWeight: 700 }} />
                            <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '20px' }} />
                        </PieChart>
                    ) : (
                        <LineChart data={normalizedData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} opacity={0.3} />
                            <XAxis dataKey="name" fontSize={9} tick={{ fill: 'var(--text-secondary)', fontWeight: 800 }} axisLine={false} />
                            <YAxis fontSize={10} tick={{ fill: 'var(--text-secondary)', fontWeight: 700 }} axisLine={false} />
                            <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '16px', fontSize: '11px', fontWeight: 700 }} />
                            <Line type="monotone" dataKey="value" stroke="var(--accent-primary)" strokeWidth={4} dot={{ r: 4, fill: 'var(--accent-primary)', strokeWidth: 2, stroke: 'var(--bg-card)' }} activeDot={{ r: 6 }} />
                        </LineChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export function CrossCountReportPage() {
  const [selectedCountIds, setSelectedCountIds] = useState<string[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const navigate = useNavigate();
  const [emailModal, setEmailModal] = useState({ open: false, email: '' });
  const [sendingEmail, setSendingEmail] = useState(false);

  const handleSendEmail = async () => {
      if (!emailModal.email) return;
      setSendingEmail(true);
      try {
          await apiClient.post('/reports/send-email', {
              to: emailModal.email,
              subject: `Informe de Auditoría IA - ${new Date().toLocaleDateString()}`,
              analysis: aiPanel.content
          });
          alert('Correo enviado correctamente');
          setEmailModal({ open: false, email: '' });
      } catch (error) {
          alert('Error al enviar el correo. Verifica la configuración SMTP.');
      } finally {
          setSendingEmail(false);
      }
  };
  const [aiPanel, setAiPanel] = useState<{ open: boolean; loading: boolean; content: string | null }>({
    open: false,
    loading: false,
    content: null
  });

  // Fetch all completed counts
  const { data: counts = [], isLoading: isLoadingCounts } = useQuery({
    queryKey: ['completed-counts'],
    queryFn: async () => {
      const resp = await apiClient.get('/inventory-counts');
      return resp.data.filter((c: any) => 
        ['COMPLETED', 'SUBMITTED', 'FINALIZED', 'CLOSED'].includes(c.status)
      );
    }
  });

  const compareMutation = useMutation({
    mutationFn: async (countIds: string[]) => {
      const resp = await apiClient.post('/reports/compare', { countIds });
      return resp.data.data;
    },
    onSuccess: (data) => {
      setReportData(data);
    },
    onError: (err) => {
      alert('Error al comparar conteos. Asegúrate de seleccionar al menos 2 conteos válidos.');
    }
  });

  const handleCompare = () => {
    if (selectedCountIds.length < 2) {
      alert('Debes seleccionar al menos 2 conteos para comparar.');
      return;
    }
    compareMutation.mutate(selectedCountIds);
  };

  const handleExportPDF = () => {
    if (!aiPanel.content) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(33, 33, 33);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('CIGUA INVENTORY INTELLIGENCE', 20, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`AUDITORÍA ESTRATÉGICA - ${new Date().toLocaleDateString()}`, 20, 32);
    
    // Content
    doc.setTextColor(44, 62, 80);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Hallazgos de la IA', 20, 55);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    // Split text to fit page width
    const splitContent = doc.splitTextToSize(aiPanel.content, pageWidth - 40);
    doc.text(splitContent, 20, 65);
    
    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount} - Generado por Cigua AI Core`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }
    
    doc.save(`auditoria_cigua_${new Date().getTime()}.pdf`);
  };

  const toggleCountSelection = (id: string) => {
    setSelectedCountIds(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const handleAIAudit = async () => {
    if (selectedCountIds.length === 0) return;
    setAiPanel({ open: true, loading: true, content: null });
    try {
        const res = await apiClient.post('/reports/ai-audit', { auditIds: selectedCountIds, topic: 'CROSS_COUNT' });
        setAiPanel(f => ({ ...f, loading: false, content: res.data.analysis }));
    } catch (error) {
        console.error('Error fetching AI audit:', error);
        setAiPanel(f => ({ ...f, loading: false, content: 'Error al obtener el análisis de IA. Por favor, inténtalo de nuevo.' }));
    }
  };

  const exportToExcel = () => {
    if (!reportData || !reportData.matrix) return;

    const exportRows: any[] = [];
    
    // Header
    const baseHeaders = ['SKU', 'Descripción', 'Marca', 'Categoría', 'Tendencia'];
    const countHeaders = reportData.counts.flatMap((c: any) => [
      `${c.code} (Sist)`, `${c.code} (Fis)`, `${c.code} (Var)`, `${c.code} ($)`
    ]);
    exportRows.push([...baseHeaders, ...countHeaders]);

    // Rows
    for (const row of reportData.matrix) {
      const rowData = [
        row.itemCode,
        row.itemName,
        row.brand,
        row.category,
        row.trend
      ];
      
      for (const count of reportData.counts) {
        const res = row.results[count.id];
        if (res) {
          rowData.push(res.systemQty, res.countedQty, res.variance, res.varianceCost);
        } else {
          rowData.push('-', '-', '-', '-');
        }
      }
      exportRows.push(rowData);
    }

    const ws = XLSX.utils.aoa_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comparador");
    XLSX.writeFile(wb, `Auditoria_Cruzada_${new Date().getTime()}.xlsx`);
  };

  return (
    <AdminLayout title="Auditoría Cruzada (Reconciliación)">
      <div className="space-y-6">
        {/* Selector de Conteos */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-800 mb-4">
            Selecciona los Conteos a Comparar
          </h2>
          
          <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-lg p-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {isLoadingCounts ? (
              <div className="p-4 text-sm text-gray-500">Cargando conteos...</div>
            ) : counts.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No hay conteos completados para comparar.</div>
            ) : (
              counts.map((c: any) => {
                const isSelected = selectedCountIds.includes(c.id);
                return (
                  <div 
                    key={c.id}
                    onClick={() => toggleCountSelection(c.id)}
                    className={`cursor-pointer p-3 rounded-lg border transition-all ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50/50 shadow-sm' 
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-gray-800">{c.code || c.sequenceNumber}</span>
                      {isSelected && <span className="w-3 h-3 bg-blue-500 rounded-full"></span>}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(c.completedAt || c.createdAt).toLocaleString()}
                    </div>
                    {c.description && <div className="text-[10px] text-gray-400 mt-1 truncate">{c.description}</div>}
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-6 flex gap-4">
            <Button 
              onClick={handleCompare} 
              disabled={selectedCountIds.length < 2 || compareMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              {compareMutation.isPending ? 'Procesando...' : 'Analizar Comparación'}
            </Button>
            {reportData && (
              <>
                <Button 
                  onClick={exportToExcel} 
                  variant="secondary"
                  className="font-bold text-green-700 border-green-200 bg-green-50 hover:bg-green-100"
                >
                  📊 Exportar a Excel
                </Button>
                <Button 
                  onClick={handleAIAudit} 
                  variant="primary"
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold animate-in fade-in"
                >
                  🤖 Análisis con IA
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Resultados de la Matriz */}
        {reportData && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden relative z-0">
            <div className="overflow-x-auto max-h-[700px]">
              <table className="w-full text-sm text-left relative">
                <thead className="bg-gray-50 text-gray-600 sticky top-0 uppercase text-[10px] font-bold z-40 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 bg-gray-100 sticky left-0 z-50">SKU</th>
                    <th className="px-4 py-3 bg-gray-100 sticky left-[120px] z-50 min-w-[200px]">Descripción</th>
                    <th className="px-4 py-3 bg-gray-100 border-r border-gray-300">Tendencia</th>
                    {reportData.counts.map((c: any) => (
                      <th key={c.id} colSpan={4} className="px-4 py-3 text-center border-r border-gray-300 bg-blue-50/50">
                        {c.code} <br/>
                        <span className="text-[9px] text-gray-400 font-normal">
                          {new Date(c.date).toLocaleDateString()}
                        </span>
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-gray-50 text-[9px]">
                    <th className="px-4 py-2 bg-gray-50 sticky left-0 z-50 border-b"></th>
                    <th className="px-4 py-2 bg-gray-50 sticky left-[120px] z-50 border-b"></th>
                    <th className="px-4 py-2 bg-gray-50 border-r border-gray-300 border-b"></th>
                    {reportData.counts.map((c: any) => (
                      <React.Fragment key={`sub-${c.id}`}>
                        <th className="px-2 py-2 text-right border-b">ERP</th>
                        <th className="px-2 py-2 text-right border-b">Fís.</th>
                        <th className="px-2 py-2 text-right text-orange-600 border-b">Var.</th>
                        <th className="px-2 py-2 text-right border-r border-gray-300 border-b">Cost $</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.matrix.map((row: any, i: number) => {
                    let trendIcon = '➖';
                    let trendColor = 'text-gray-400';
                    let trendLabel = 'IGUAL';
                    
                    if (row.trend === 'RESOLVED') { trendIcon = '✅'; trendColor = 'text-green-600 bg-green-50'; trendLabel = 'RESUELTO'; }
                    else if (row.trend === 'IMPROVED') { trendIcon = '↗️'; trendColor = 'text-blue-600 bg-blue-50'; trendLabel = 'MEJORÓ'; }
                    else if (row.trend === 'WORSENED') { trendIcon = '🔻'; trendColor = 'text-red-600 bg-red-50'; trendLabel = 'EMPEORÓ'; }

                    return (
                      <tr key={row.itemCode} className="border-b hover:bg-gray-50/80">
                        <td className="px-4 py-2 font-bold text-xs sticky left-0 bg-white z-10">{row.itemCode}</td>
                        <td className="px-4 py-2 text-xs sticky left-[120px] bg-white z-10 truncate max-w-[250px]">{row.itemName}</td>
                        <td className="px-4 py-2 border-r border-gray-200">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold ${trendColor}`}>
                            {trendIcon} {trendLabel}
                          </span>
                        </td>
                        {reportData.counts.map((c: any) => {
                          const res = row.results[c.id];
                          if (!res) {
                            return (
                              <React.Fragment key={`res-${c.id}`}>
                                <td colSpan={4} className="px-2 py-2 text-center text-gray-300 text-xs border-r border-gray-200">- No contado -</td>
                              </React.Fragment>
                            );
                          }
                          return (
                            <React.Fragment key={`res-${c.id}`}>
                              <td className="px-2 py-2 text-right text-xs">{res.expectedStock}</td>
                              <td className="px-2 py-2 text-right text-xs font-bold">{res.countedQty ?? '-'}</td>
                              <td className={`px-2 py-2 text-right text-xs font-bold ${res.variance < 0 ? 'text-red-600' : res.variance > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                {res.variance}
                              </td>
                              <td className="px-2 py-2 text-right text-xs border-r border-gray-200">
                                {res.varianceCost ? `$${res.varianceCost.toLocaleString()}` : '-'}
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
                              <ChartRenderer content={aiPanel.content || ''} />
                          </div>
                      )}
                  </div>

                  <div className="p-8 border-t border-border-default bg-hover/10 flex flex-wrap justify-between items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-[10px] text-muted font-black uppercase tracking-widest">
                            <span className="w-2 h-2 bg-success rounded-full"></span>
                            Análisis Finalizado
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => {
                                    const rawContent = aiPanel.content || '';
                                    
                                    // 1. Cabecera Corporativa
                                    const header = `*AUDITORIA ESTRATEGICA - CIGUA AI*\n` + 
                                                   `------------------------------\n`;
                                    
                                    const footer = `\n------------------------------\n` +
                                                   `_Generado por Cigua AI Core_`;
                                    
                                    // 2. Limpieza Quirúrgica para WhatsApp (Solo durante el envío)
                                    let clean = rawContent
                                        .replace(/<think>[\s\S]*?<\/think>/gi, '') 
                                        // Filtramos solo emojis problemáticos, permitiendo texto enriquecido
                                        .replace(/[^\x00-\x7F\u00C0-\u017F\s\$\%\.\,\:\;\(\)\-\+\*]/g, '') 
                                        .replace(/\*\*(.*?)\*\*/g, '*$1*')          
                                        .replace(/###\s+(.*)/g, '\n\n*>>> $1*') 
                                        .replace(/\|/g, ' ')                        
                                        .replace(/:--/g, '')                        
                                        .replace(/-{3,}/g, '');                     

                                    const lines = clean.split('\n');
                                    const formattedLines = [];
                                    
                                    for (let i = 0; i < lines.length; i++) {
                                        const line = lines[i].trim();
                                        if (!line || line.includes('---')) continue;

                                        const parts = line.split(/\s{2,}/).filter(p => p.trim().length > 0);
                                        
                                        // Si es una fila de tabla con datos reales
                                        if (parts.length >= 3 && /^\d+/.test(parts[0])) {
                                            formattedLines.push(`• *SKU ${parts[0]}*: ${parts[1]} (${parts.slice(2).join(' / ')})`);
                                            continue;
                                        }
                                        
                                        formattedLines.push(line);
                                    }

                                    const finalBody = formattedLines.join('\n').replace(/\n{3,}/g, '\n\n');
                                    const text = encodeURIComponent(`${header}${finalBody}${footer}`);
                                    
                                    window.open(`https://wa.me/?text=${text}`, '_blank');
                                }}
                                className="w-8 h-8 bg-[#25D366] text-white rounded-lg flex items-center justify-center hover:scale-110 transition-all shadow-lg"
                                title="Enviar por WhatsApp"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.232 3.484 8.412-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.309 1.656zm6.224-3.82c1.516.903 3.129 1.378 4.776 1.379 5.432 0 9.851-4.419 9.854-9.851.002-2.63-1.023-5.102-2.887-6.964-1.864-1.864-4.337-2.889-6.966-2.889-5.431 0-9.85 4.419-9.854 9.852 0 1.734.453 3.424 1.312 4.904l-1.03 3.754 3.845-1.006zm11.303-7.464c-.313-.155-1.853-.915-2.142-1.02-.289-.104-.499-.155-.71.155-.211.31-.816 1.02-.999 1.229-.183.208-.366.234-.679.077-.313-.155-1.32-.486-2.515-1.551-.93-.829-1.557-1.853-1.739-2.163-.182-.309-.019-.477.137-.631.141-.138.313-.366.47-.549.155-.182.208-.313.313-.52.104-.208.052-.391-.026-.549-.078-.155-.71-1.711-.972-2.342-.255-.615-.515-.531-.71-.541l-.605-.01c-.211 0-.554.079-.844.391-.29.313-1.107 1.082-1.107 2.639 0 1.558 1.135 3.064 1.293 3.273.158.21 2.235 3.415 5.414 4.787.756.326 1.346.521 1.807.667.76.241 1.45.207 1.996.126.608-.091 1.853-.758 2.116-1.489.264-.731.264-1.36.184-1.489-.08-.129-.294-.207-.607-.361z"/></svg>
                            </button>
                            <button 
                                onClick={() => setEmailModal({ open: true, email: '' })}
                                className="w-8 h-8 bg-[#ea4335] text-white rounded-lg flex items-center justify-center hover:scale-110 transition-all shadow-lg"
                                title="Enviar por Correo (Servidor)"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                            </button>
                        </div>

                        {/* Email Modal */}
                        {emailModal.open && (
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
                                <div className="bg-card border border-border-default rounded-3xl w-full max-w-md shadow-2xl p-8 space-y-6 animate-in zoom-in duration-300">
                                    <div className="text-center space-y-2">
                                        <div className="w-16 h-16 bg-accent-primary/10 rounded-full flex items-center justify-center mx-auto text-3xl">📧</div>
                                        <h3 className="text-xl font-black text-primary uppercase tracking-tight">Enviar Reporte</h3>
                                        <p className="text-xs text-muted">Ingresa el correo electrónico del destinatario.</p>
                                    </div>
                                    <input 
                                        type="email"
                                        placeholder="correo@ejemplo.com"
                                        className="w-full px-4 py-3 rounded-2xl bg-app border border-border-default text-primary outline-none focus:ring-4 focus:ring-accent-primary/10"
                                        value={emailModal.email}
                                        onChange={(e) => setEmailModal(prev => ({ ...prev, email: e.target.value }))}
                                    />
                                    <div className="flex gap-4">
                                        <Button variant="secondary" className="flex-1 rounded-2xl" onClick={() => setEmailModal({ open: false, email: '' })}>Cancelar</Button>
                                        <Button className="flex-1 rounded-2xl" onClick={handleSendEmail} disabled={sendingEmail}>
                                            {sendingEmail ? 'Enviando...' : 'Enviar'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                      </div>

                      <div className="flex gap-4">
                          <Button
                              variant="secondary"
                              size="sm"
                              className="rounded-xl font-bold uppercase tracking-widest text-[9px] bg-hover border-border-default hover:bg-border-default"
                              onClick={handleExportPDF}
                          >
                              📄 Descargar PDF
                          </Button>
                          <Button
                              variant="primary"
                              size="sm"
                              className="rounded-xl font-bold uppercase tracking-widest text-[9px]"
                              onClick={() => navigate('/inventory/chat-ai', { 
                                  state: { 
                                      message: `Continuar análisis sobre los conteos: ${selectedCountIds.join(', ')}`,
                                      topic: 'CROSS_COUNT'
                                  } 
                              })}
                          >
                              💬 Abrir en Chat Completo
                          </Button>
                      </div>
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
}
