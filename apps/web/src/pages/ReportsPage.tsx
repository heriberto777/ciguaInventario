import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AdminLayout } from '@/components/templates/AdminLayout';
import { getApiClient } from '@/services/api';
import { Button } from '@/components/atoms/Button';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const apiClient = getApiClient();

// --- Types ---
interface ReportItem {
  itemCode: string;
  itemName: string;
  category: string;
  brand: string;
  systemQty: number;
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
}

interface VarianceSummary {
  totalItems: number;
  itemsWithVariance: number;
  accuracyRate: number;
  netVarianceCost: number;
  totalLossValue: number;
  totalGainValue: number;
}

export function ReportsPage() {
  const [selectedCountId, setSelectedCountId] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'VARIANCE'>('ALL');

  // Queries
  const { data: counts = [] } = useQuery({
    queryKey: ['inventory-counts'],
    queryFn: async () => {
      const resp = await apiClient.get('/inventory-counts');
      return resp.data.filter((c: any) => c.status === 'COMPLETED' || c.status === 'ACTIVE');
    }
  });

  const { data: reportData = [], isLoading: isReportLoading } = useQuery({
    queryKey: ['report-inventory', selectedCountId, filterMode],
    queryFn: async () => {
      const resp = await apiClient.get(`/reports/${selectedCountId}/physical-inventory`, {
        params: { onlyVariances: filterMode === 'VARIANCE' }
      });
      return resp.data.data as GroupedReport[];
    },
    enabled: !!selectedCountId
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
    const flatData = reportData.flatMap(group =>
      group.items.map(item => ({
        Marca: group.brand,
        Articulo: item.itemCode,
        Descripcion: item.itemName,
        Costo: item.costPrice,
        Sistema: item.systemQty,
        Fisico: item.countedQty ?? 0,
        Diferencia: item.difference ?? 0,
        Costo_Diferencia: item.varianceCost ?? 0
      }))
    );

    const ws = XLSX.utils.json_to_sheet(flatData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario Fisico");
    XLSX.writeFile(wb, `Reporte_Inventario_${selectedCountId.slice(0, 8)}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const count = counts.find((c: any) => c.id === selectedCountId);
    const dateStr = new Date().toLocaleDateString();

    // Header
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text('REPORT DE INVENTARIO FÍSICO', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Cigua Inv - Sistema de Gestión de Inventarios`, 14, 30);
    doc.text(`Fecha: ${dateStr}`, 14, 35);
    doc.text(`ID Inventario: ${count?.code || selectedCountId}`, 14, 40);

    // Summary (Optional)
    if (summary) {
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text('RESUMEN EJECUTIVO', 14, 50);
      autoTable(doc, {
        startY: 55,
        head: [['Exactitud (ERI)', 'Items con Varianza', 'Impacto Neto']],
        body: [[
          `${summary.accuracyRate.toFixed(2)}%`,
          `${summary.itemsWithVariance} / ${summary.totalItems}`,
          `$${summary.netVarianceCost.toLocaleString()}`
        ]],
        theme: 'striped',
        headStyles: { fillColor: [63, 81, 181] }
      });
    }

    // Detailed Table
    const tableData = reportData.flatMap(group =>
      group.items.map(item => [
        group.brand,
        item.itemCode,
        item.itemName,
        item.systemQty,
        item.countedQty ?? '–',
        item.difference ?? '–',
        item.varianceCost ? `$${item.varianceCost.toLocaleString()}` : '–'
      ])
    );

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Marca', 'Artículo', 'Descripción', 'Sist.', 'Fis.', 'Dif.', 'Costo Dif.']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40] },
      styles: { fontSize: 8 },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' }
      }
    });

    doc.save(`Reporte_Inventario_${count?.code || 'export'}.pdf`);
  };

  return (
    <AdminLayout title="Reportes de Inventario">
      <div className="space-y-6">

        {/* Top Actions */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[250px]">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Seleccionar Conteo</label>
            <select
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={selectedCountId}
              onChange={(e) => setSelectedCountId(e.target.value)}
            >
              <option value="">-- Seleccione un inventario --</option>
              {counts.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.code || `#${c.sequenceNumber}`} - {new Date(c.createdAt).toLocaleDateString()} ({c.status})
                </option>
              ))}
            </select>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filterMode === 'ALL' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Todo
            </button>
            <button
              onClick={() => setFilterMode('VARIANCE')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filterMode === 'VARIANCE' ? 'bg-white shadow text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Solo Varianzas
            </button>
          </div>

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
        </div>

        {selectedCountId ? (
          <>
            {/* Summary Cards */}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Exactitud (ERI)</p>
                  <p className={`text-2xl font-black ${summary.accuracyRate > 95 ? 'text-green-600' : 'text-orange-500'}`}>
                    {summary.accuracyRate.toFixed(2)}%
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Items con Varianza</p>
                  <p className="text-2xl font-black text-gray-800">{summary.itemsWithVariance} / {summary.totalItems}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Valor total Merma</p>
                  <p className="text-2xl font-black text-red-600">-${summary.totalLossValue.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Impacto Neto</p>
                  <p className={`text-2xl font-black ${summary.netVarianceCost >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${summary.netVarianceCost.toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {/* Main Report Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800">Cuerpo del Reporte por Marca</h3>
                </div>
                <div className="overflow-x-auto max-h-[600px]">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 sticky top-0 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="px-4 py-3">Artículo</th>
                        <th className="px-4 py-3">Descripción</th>
                        <th className="px-4 py-3 text-right">Sistema</th>
                        <th className="px-4 py-3 text-right">Físico</th>
                        <th className="px-4 py-3 text-right">Dif.</th>
                        <th className="px-4 py-3 text-right">Costo Dif.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((group) => (
                        <React.Fragment key={group.brand}>
                          <tr className="bg-blue-50/50">
                            <td colSpan={6} className="px-4 py-2 font-bold text-blue-700">
                              📦 MARCA: {group.brand}
                              <span className="ml-4 text-[10px] text-gray-500">
                                (Impacto: ${group.totalVarianceCost.toLocaleString()})
                              </span>
                            </td>
                          </tr>
                          {group.items.map((item) => (
                            <tr key={item.itemCode} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-gray-600">{item.itemCode}</td>
                              <td className="px-4 py-2 text-gray-800">{item.itemName}</td>
                              <td className="px-4 py-2 text-right">{item.systemQty}</td>
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

            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-20 text-center">
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
