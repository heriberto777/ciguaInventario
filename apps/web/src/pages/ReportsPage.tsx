import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AdminLayout } from '@/components/templates/AdminLayout';
import { getApiClient } from '@/services/api';
import { Button } from '@/components/atoms/Button';
import { usePermissions } from '@/hooks/usePermissions';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const apiClient = getApiClient();

// --- Types ---
interface ReportItem {
  itemCode: string;
  itemProv?: string | null;
  itemName: string;
  category: string;
  categoryName?: string;
  brand: string;
  brandName?: string;
  systemQty: number;
  reservedSeparated: number;
  reservedInAisle: number;
  expectedStock: number;
  countedQty: number | null;
  difference: number | null;
  costPrice: number;
  varianceCost: number | null;
  hasVariance: boolean;
}

interface GroupedReport {
  brand: string;
  items: ReportItem[];
  totalSystemValue: number;
  totalCountedValue: number;
  totalVarianceCost: number;
  totalReservedSeparated: number;
  totalReservedInAisle: number;
}



interface VarianceSummary {
  totalItems: number;
  itemsWithVariance: number;
  totalMissing: number;
  totalSurplus: number;
  accuracyRate: number;
  netVarianceCost: number;
  totalLossValue: number;
  totalGainValue: number;
  totalPhysicalValue: number;
  totalSystemValue: number;
  totalReservedValue: number;
}

export function ReportsPage() {
  const [selectedCountId, setSelectedCountId] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'VARIANCE'>('ALL');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showSummary, setShowSummary] = useState(true);
  const { hasPermission } = usePermissions();
  const canExport = hasPermission('reports:export');

  // Queries
  const { data: counts = [] } = useQuery({
    queryKey: ['inventory-counts'],
    queryFn: async () => {
      const resp = await apiClient.get('/inventory-counts');
      return resp.data.filter((c: any) => c.status === 'COMPLETED' || c.status === 'ACTIVE' || c.status === 'SUBMITTED' || c.status === 'FINALIZED' || c.status === 'CLOSED');
    }
  });

  const { data: reportData = [], isLoading: isReportLoading } = useQuery({
    queryKey: ['report-inventory', selectedCountId, filterMode, selectedBrand, selectedCategory],
    queryFn: async () => {
      const resp = await apiClient.get(`/reports/${selectedCountId}/physical-inventory`, {
        params: {
          onlyVariances: filterMode === 'VARIANCE',
          brand: selectedBrand || undefined,
          category: selectedCategory || undefined
        }
      });
      return resp.data.data as GroupedReport[];
    },
    enabled: !!selectedCountId
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['classifications', 'BRAND'],
    queryFn: async () => {
      const res = await apiClient.get('/item-classifications?groupType=BRAND');
      return res.data.data as any[];
    }
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['classifications', 'CATEGORY'],
    queryFn: async () => {
      const res = await apiClient.get('/item-classifications?groupType=CATEGORY');
      return res.data.data as any[];
    }
  });

  const { data: summary } = useQuery({
    queryKey: ['report-summary', selectedCountId],
    queryFn: async () => {
      const resp = await apiClient.get(`/reports/${selectedCountId}/variance-summary`);
      return resp.data.data as VarianceSummary;
    },
    enabled: !!selectedCountId
  });


  const exportToExcel = () => {
    const reportItems = reportData;
    // 1. Executive Summary Sheet
    const summaryRows = [
      { Concepto: 'CONTEO', Valor: counts.find((c: any) => c.id === selectedCountId)?.code || selectedCountId },
      { Concepto: 'FECHA REPORTE', Valor: new Date().toLocaleString() },
      { Concepto: '', Valor: '' },
      { Concepto: 'RESUMEN DEL CONTEO', Valor: '' },
      { Concepto: 'Total Ítems', Valor: summary?.totalItems },
      { Concepto: 'Varianzas', Valor: summary?.itemsWithVariance },
      { Concepto: 'Faltante (Cant.)', Valor: summary?.totalMissing },
      { Concepto: 'Sobrante (Cant.)', Valor: summary?.totalSurplus },
      { Concepto: 'Exactitud (ERI)', Valor: `${summary?.accuracyRate.toFixed(2)}%` },
      { Concepto: '', Valor: '' },
      { Concepto: 'Costo total de los sobrantes', Valor: summary?.totalGainValue },
      { Concepto: 'Costo total de los faltantes', Valor: -summary?.totalLossValue! },
      { Concepto: 'Costo total de las diferencias', Valor: summary?.netVarianceCost },
      { Concepto: '', Valor: '' },
      { Concepto: 'Total Inventario Físico', Valor: summary?.totalPhysicalValue },
      { Concepto: 'Total Inventario Cómputo', Valor: summary?.totalSystemValue },
      { Concepto: 'Total en Reserva (Facturas)', Valor: -summary?.totalReservedValue! },
      { Concepto: 'Total Diferencia Inventario', Valor: summary?.netVarianceCost },
    ];

    // 2. Detailed Data grouped by brand
    const detailRows: any[][] = [];
    for (const group of reportItems) {
      detailRows.push([{ content: group.brand, colSpan: 7, styles: { fontStyle: 'bold', fontSize: 9, fillColor: [240, 240, 240] } }]);
      for (const item of group.items) {
        detailRows.push([
          item.itemCode,
          `   ${item.itemName}`,
          item.costPrice,
          item.systemQty,
          item.reservedSeparated || 0,
          item.countedQty ?? 0,
          item.difference ?? 0,
          item.varianceCost ?? 0,
        ]);
      }
    }

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    
    // Build detail sheet with brand grouping
    const detailSheetData: any[][] = [['Código', 'Art. Prov.', 'Descripción', 'Costo', 'Sistema', 'Sep.', 'Físico', 'Diferencia', 'Costo Dif.']];
    for (const group of reportItems) {
      detailSheetData.push([group.brand, '', '', '', '', '', '', '', '']);
      for (const item of group.items) {
        detailSheetData.push([
          item.itemCode,
          item.itemProv || '',
          `   ${item.itemName}`,
          item.costPrice,
          item.systemQty,
          item.reservedSeparated || 0,
          item.countedQty ?? 0,
          item.difference ?? 0,
          item.varianceCost ?? 0,
        ]);
      }
    }
    const wsDetails = XLSX.utils.aoa_to_sheet(detailSheetData);
    
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");
    XLSX.utils.book_append_sheet(wb, wsDetails, "Detalle Inventario");
    XLSX.writeFile(wb, `Reporte_Inventario_${selectedCountId.slice(0, 8)}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4'); 
    const count = counts.find((c: any) => c.id === selectedCountId);
    const dateStr = new Date().toLocaleDateString();

    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text('REPORTE DE INVENTARIO FÍSICO', 14, 20);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Cigua Inv - Sistema de Gestión de Inventarios`, 14, 27);
    doc.text(`Fecha: ${dateStr}`, 14, 32);
    doc.text(`ID Inventario: ${count?.code || selectedCountId}`, 14, 37);

    if (summary) {
      doc.setFontSize(9);
      doc.setTextColor(0);
      doc.text('RESUMEN DEL CONTEO', 14, 46);
      
      autoTable(doc, {
        startY: 50,
        head: [['TOTAL ÍTEMS', 'VARIANZAS', 'FALTANTE', 'SOBRANTE', 'ERI %']],
        body: [[
          summary.totalItems,
          summary.itemsWithVariance,
          summary.totalMissing,
          summary.totalSurplus,
          `${summary.accuracyRate.toFixed(2)}%`
        ]],
        theme: 'plain',
        headStyles: { textColor: [100, 100, 100], fontSize: 7 },
        styles: { fontSize: 12, fontStyle: 'bold' }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 3;
      
      autoTable(doc, {
        startY: finalY,
        body: [
          ['Costo total de los sobrantes:', `+$${summary.totalGainValue.toLocaleString()}`, 'Total Inventario Físico:', `$${summary.totalPhysicalValue.toLocaleString()}`],
          ['Costo total de los faltantes:', `-$${summary.totalLossValue.toLocaleString()}`, 'Total Inventario Cómputo:', `$${summary.totalSystemValue.toLocaleString()}`],
          ['Costo total de las diferencias:', `$${summary.netVarianceCost.toLocaleString()}`, 'Total en Reserva (Facturas):', `-$${summary.totalReservedValue.toLocaleString()}`],
          ['', '', 'Total Diferencia Inventario:', `$${summary.netVarianceCost.toLocaleString()}`]
        ],
        theme: 'plain',
        styles: { fontSize: 7 },
        columnStyles: {
          1: { halign: 'right', fontStyle: 'bold' },
          3: { halign: 'right', fontStyle: 'bold' }
        }
      });
    }

    // Build grouped table data: brand headers + item rows
    const tableBody: any[][] = [];
    for (const group of reportData) {
      // Brand header row
      tableBody.push([
        { content: group.brand, colSpan: 7, styles: { fontStyle: 'bold', fontSize: 8, fillColor: [235, 235, 235], textColor: [30, 30, 30] } }
      ]);
      // Item detail rows
      for (const item of group.items) {
        tableBody.push([
          item.itemCode,
          item.itemProv || '',
          `   ${item.itemName}`,
          item.costPrice.toFixed(2),
          Number(item.systemQty).toLocaleString('en', { minimumFractionDigits: 2 }),
          Number(item.reservedSeparated || 0).toLocaleString('en', { minimumFractionDigits: 2 }),
          item.countedQty !== null ? Number(item.countedQty).toLocaleString('en', { minimumFractionDigits: 2 }) : '0.00',
          item.difference !== null ? Number(item.difference).toLocaleString('en', { minimumFractionDigits: 2 }) : '0.00',
          item.varianceCost !== null ? Number(item.varianceCost).toLocaleString('en', { minimumFractionDigits: 2 }) : '0.00',
        ]);
      }
    }

    autoTable(doc, {
      startY: (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : 60,
      head: [['Código', 'Art. Prov.', 'Descripción', 'Costo', 'Sistema', 'Sep.', 'Físico', 'Dif.', 'Costo Dif.']],
      body: tableBody,
      theme: 'plain',
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontSize: 7 },
      styles: { fontSize: 7, cellPadding: 1.5 },
      columnStyles: {
        0: { cellWidth: 14 },
        1: { cellWidth: 18 },
        2: { cellWidth: 45 },
        3: { halign: 'right', cellWidth: 16 },
        4: { halign: 'right', cellWidth: 22 },
        5: { halign: 'right', cellWidth: 14 },
        6: { halign: 'right', cellWidth: 22 },
        7: { halign: 'right', cellWidth: 18 },
        8: { halign: 'right', cellWidth: 22 }
      }
    });

    doc.save(`Reporte_Inventario_${count?.code || 'export'}.pdf`);
  };

  return (
    <AdminLayout title="Reportes de Inventario">
      <div className="space-y-6">

        {/* Top Actions */}
        <div className="bg-[var(--bg-card)] rounded-xl shadow-sm p-4 border border-[var(--border-default)] flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Seleccionar Conteo</label>
            <select
              className="w-full h-11 px-4 rounded-xl bg-[var(--bg-hover)] border-none text-sm font-semibold text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
              value={selectedCountId}
              onChange={(e) => {
                setSelectedCountId(e.target.value);
                setSelectedBrand('');
                setSelectedCategory('');
              }}
            >
              <option value="">-- Seleccione un inventario --</option>
              {counts.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.code || `#${c.sequenceNumber}`} - {new Date(c.createdAt).toLocaleDateString()} ({c.status})
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[150px]">
            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Categoría</label>
            <select
              className="w-full h-11 px-4 rounded-xl bg-[var(--bg-hover)] border-none text-sm font-semibold text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Todas</option>
              {categories.map((c: any) => (
                <option key={c.code} value={c.code}>{c.description}</option>
              ))}
            </select>
          </div>

          <div className="min-w-[150px]">
            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Marca</label>
            <select
              className="w-full h-11 px-4 rounded-xl bg-[var(--bg-hover)] border-none text-sm font-semibold text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
            >
              <option value="">Todas</option>
              {brands.map((b: any) => (
                <option key={b.code} value={b.code}>{b.description}</option>
              ))}
            </select>
          </div>

          <div className="flex bg-[var(--bg-hover)] p-1 rounded-lg">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filterMode === 'ALL' ? 'bg-[var(--bg-card)] shadow text-blue-600' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              Todo
            </button>
            <button
              onClick={() => setFilterMode('VARIANCE')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filterMode === 'VARIANCE' ? 'bg-[var(--bg-card)] shadow text-red-600' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              Solo Varianzas
            </button>
          </div>

          {canExport && (
            <>
              <Button
                onClick={exportToExcel}
                disabled={!selectedCountId || isReportLoading}
                variant="secondary"
                className="flex items-center gap-2"
              >
                📊 Excel
              </Button>

              <Button
                onClick={exportToPDF}
                disabled={!selectedCountId || isReportLoading}
                variant="secondary"
                className="flex items-center gap-2 bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
              >
                📄 PDF
              </Button>
            </>
          )}
        </div>

        {selectedCountId ? (
          <>
            {summary && (
              <div className="bg-[var(--bg-card)] rounded-3xl shadow-sm border border-[var(--border-default)] overflow-hidden transition-all">
                <div className="px-6 py-4 border-b border-[var(--border-default)] flex justify-between items-center bg-[var(--bg-card)]">
                  <h3 className="font-black text-lg text-[var(--text-primary)] uppercase tracking-tight">Resumen del Conteo</h3>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="text-[10px] font-black uppercase tracking-widest px-4 py-1 h-8 rounded-full border-[var(--border-default)] hover:bg-[var(--bg-hover)]"
                    onClick={() => setShowSummary(!showSummary)}
                  >
                    {showSummary ? 'Ocultar Resumen' : 'Mostrar Resumen'}
                  </Button>
                </div>
                
                {showSummary && (
                  <div className="p-8 space-y-8 animate-in fade-in duration-500">
                    <div className="flex gap-12">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Total Ítems</p>
                        <p className="text-4xl font-black text-[var(--text-primary)]">{summary.totalItems}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Varianzas</p>
                        <p className="text-4xl font-black text-orange-500">{summary.itemsWithVariance}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Faltante</p>
                        <p className="text-4xl font-black text-red-500">{summary.totalMissing}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Sobrante</p>
                        <p className="text-4xl font-black text-green-500">{summary.totalSurplus}</p>
                      </div>
                    </div>

                    <div className="h-px bg-gray-100 w-full" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-4">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-[var(--text-muted)] font-medium">Costo total de los sobrantes:</span>
                          <span className="text-sm font-bold text-green-600">+${summary.totalGainValue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-[var(--text-muted)] font-medium">Costo total de los faltantes:</span>
                          <span className="text-sm font-bold text-red-600">-${summary.totalLossValue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                          <span className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">Costo total de las diferencias:</span>
                          <span className={`text-lg font-black ${summary.netVarianceCost >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {summary.netVarianceCost >= 0 ? '+' : ''}${summary.netVarianceCost.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-[var(--text-muted)] font-medium">Total Inventario Físico:</span>
                          <span className="text-sm font-bold text-[var(--text-primary)]">${summary.totalPhysicalValue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-[var(--text-muted)] font-medium">Total Inventario Cómputo:</span>
                          <span className="text-sm font-bold text-[var(--text-primary)]">${summary.totalSystemValue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-[var(--text-muted)] font-medium">Total en Reserva (Facturas):</span>
                          <span className="text-sm font-bold text-blue-600">-${summary.totalReservedValue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                          <span className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">Total Diferencia Inventario:</span>
                          <span className={`text-lg font-black ${summary.netVarianceCost >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {summary.netVarianceCost >= 0 ? '+' : ''}${summary.netVarianceCost.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Report Table */}
            <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-default)] overflow-hidden">
              <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 sticky top-0 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="px-4 py-3">Artículo</th>
                      <th className="px-4 py-3">Art. Prov.</th>
                      <th className="px-4 py-3">Descripción</th>
                      <th className="px-4 py-3">Categoría</th>
                      <th className="px-4 py-3 text-right">Sistema</th>
                      <th className="px-4 py-3 text-right text-blue-600 font-black">Sep.</th>
                      <th className="px-4 py-3 text-right text-cyan-600 font-black">Pas.</th>
                      <th className="px-4 py-3 text-right">Físico</th>
                      <th className="px-4 py-3 text-right">Dif.</th>
                      <th className="px-4 py-3 text-right">Costo Dif.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((group) => (
                      <React.Fragment key={group.brand}>
                        <tr className="bg-blue-50/30">
                          <td colSpan={10} className="px-4 py-2 font-bold text-blue-700">
                            📦 MARCA: {group.brand}
                            <span className="ml-4 text-[10px] text-gray-500">
                              (Impacto: ${group.totalVarianceCost.toLocaleString()} | Sep: {group.totalReservedSeparated} | Pas: {group.totalReservedInAisle})
                            </span>
                          </td>
                        </tr>
                        {group.items.map((item) => (
                          <tr key={item.itemCode} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-4 py-2 font-mono text-gray-600">{item.itemCode}</td>
                            <td className="px-4 py-2 font-mono text-gray-400 text-[11px]">{item.itemProv || '–'}</td>
                            <td className="px-4 py-2 text-gray-800">{item.itemName}</td>
                            <td className="px-4 py-2 text-gray-600 text-[10px] uppercase font-bold tracking-tighter">{item.categoryName || item.category}</td>
                            <td className="px-4 py-2 text-right">{item.systemQty}</td>
                            <td className="px-4 py-2 text-right font-black text-blue-600 bg-blue-50/30">{item.reservedSeparated || '0'}</td>
                            <td className="px-4 py-2 text-right font-black text-cyan-600 bg-cyan-50/30">{item.reservedInAisle || '0'}</td>
                            <td className="px-4 py-2 text-right font-semibold">{item.countedQty ?? '–'}</td>
                            <td className={`px-4 py-2 text-right font-bold ${item.difference && item.difference < 0 ? 'text-red-600' : item.difference && item.difference > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                              {item.difference ?? '–'}
                            </td>
                            <td className={`px-4 py-2 text-right font-bold ${item.varianceCost && item.varianceCost < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                              {item.varianceCost ? `$${item.varianceCost.toLocaleString()}` : '–'}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
                {reportData.length === 0 && !isReportLoading && (
                  <div className="p-10 text-center text-gray-400">Seleccione un conteo para ver datos</div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-dashed border-[var(--border-default)] p-20 text-center">
            <span className="text-5xl block mb-4">📈</span>
            <h3 className="text-xl font-bold text-gray-800">Sistema de Reportes de Inventario</h3>
            <p className="text-gray-500 max-w-md mx-auto mt-2">
              Seleccione un inventario completado en la parte superior para comenzar el análisis financiero y operativo.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
