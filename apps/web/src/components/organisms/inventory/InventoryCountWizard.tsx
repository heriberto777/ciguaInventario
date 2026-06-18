import React, { useState, useEffect } from 'react';
import { Button } from '@/components/atoms/Button';
import { Label } from '@/components/atoms/Label';
import { ItemSelectionModal } from '@/components/inventory/ItemSelectionModal';
import { Warehouse, Location } from '@/services/inventory.types';

interface InventoryCountWizardProps {
  warehouses: Warehouse[];
  locations: Location[];
  availableMappings: any[];
  onWarehouseChange: (id: string) => void;
  onConfirm: (data: {
    warehouseId: string;
    locationId?: string;
    mappingId?: string;
    creationMode: 'erp' | 'excel' | 'random';
    excelFile?: File;
    selectedItemCodes?: string[];
  }) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export const InventoryCountWizard: React.FC<InventoryCountWizardProps> = ({
  warehouses,
  locations,
  availableMappings,
  onWarehouseChange,
  onConfirm,
  onCancel,
  isPending
}) => {
  const [warehouseId, setWarehouseId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [mappingId, setMappingId] = useState('');
  const [creationMode, setCreationMode] = useState<'erp' | 'excel' | 'random'>('erp');
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [selectedItemCodes, setSelectedItemCodes] = useState<string[]>([]);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);

  const isFormValid = warehouseId && (
    creationMode === 'erp' ? mappingId :
      creationMode === 'random' ? (mappingId && selectedItemCodes.length > 0) :
        excelFile
  );

  const handleConfirm = () => {
    onConfirm({
      warehouseId,
      locationId: locationId || undefined,
      mappingId: mappingId || undefined,
      creationMode,
      excelFile: excelFile || undefined,
      selectedItemCodes: creationMode === 'random' ? selectedItemCodes : undefined
    });
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-8 bg-app">
      <div className="border border-border-default rounded-2xl p-10 max-w-lg w-full bg-card shadow-2xl relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent-primary/5 rounded-full blur-3xl -mr-16 -mt-16"></div>

        <h2 className="text-3xl font-black text-primary mb-2 tracking-tight">📝 Nuevo Conteo</h2>
        <p className="text-xs font-bold text-muted uppercase tracking-widest mb-10">Configuración de auditoría física</p>

        <div className="space-y-8">
          <div>
            <Label htmlFor="warehouse" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 block">📦 Almacén de Origen</Label>
            <select
              id="warehouse"
              value={warehouseId}
              onChange={(e) => { 
                setWarehouseId(e.target.value); 
                onWarehouseChange(e.target.value);
                setLocationId(''); 
              }}
              className="w-full bg-hover/50 border border-border-default rounded-2xl px-5 py-4 text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 transition-all font-medium appearance-none"
            >
              <option value="">Selecciona un almacén</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          <div>
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 block">🎯 Método de Recopilación</Label>
            <div className="flex gap-2 bg-hover/30 p-1 rounded-2xl border border-border-default">
              {['erp', 'random', 'excel'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setCreationMode(mode as any)}
                  className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${creationMode === mode ? 'bg-accent-primary text-white shadow-lg' : 'text-muted hover:text-primary'}`}
                >
                  {mode === 'erp' ? '🔗 ERP Sync' : mode === 'random' ? '🎲 Aleatorio' : '📊 Excel'}
                </button>
              ))}
            </div>
          </div>

          {(creationMode === 'erp' || creationMode === 'random') && (
            <div className="animate-in slide-in-from-top-2 duration-300 space-y-6">
              <div>
                <Label htmlFor="mapping" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 block">🔗 Mapeo de Integración</Label>
                <select
                  id="mapping" value={mappingId} onChange={(e) => setMappingId(e.target.value)}
                  className="w-full bg-hover/50 border border-border-default rounded-2xl px-5 py-4 text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 transition-all font-medium appearance-none"
                >
                  <option value="">Selecciona un mapeo</option>
                  {availableMappings.map((mapping: any) => <option key={mapping.id} value={mapping.id}>{mapping.datasetType}</option>)}
                </select>
              </div>

              {creationMode === 'random' && mappingId && (
                <div className="bg-accent-primary/5 p-4 rounded-2xl border border-accent-primary/20 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-accent-primary">Selección de Ítems</span>
                    <span className="text-[10px] font-bold text-muted">{selectedItemCodes.length} filtrados</span>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => setIsSelectionModalOpen(true)}
                    className="w-full py-3 text-[10px] uppercase font-black"
                  >
                    🎲 Configurar Aleatorio / Filtros
                  </Button>
                </div>
              )}
            </div>
          )}

          {creationMode === 'excel' && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div
                className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all group ${excelFile ? 'border-success bg-success/5' : 'border-border-default bg-hover/20 hover:border-accent-primary/50'}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.[0]) setExcelFile(e.dataTransfer.files[0]); }}
              >
                <input type="file" id="excel-upload" accept=".xlsx,.xls" className="hidden" onChange={(e) => setExcelFile(e.target.files?.[0] || null)} />
                <Label htmlFor="excel-upload" className="cursor-pointer block">
                  {excelFile ? (
                    <div className="space-y-2">
                      <p className="text-2xl">📄</p>
                      <p className="text-sm font-black text-success uppercase truncate max-w-xs mx-auto">{excelFile.name}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-2xl group-hover:scale-110 transition-transform">📁</p>
                      <p className="text-[10px] text-muted font-black uppercase tracking-widest">Haz click o arrastra (.xlsx)</p>
                    </div>
                  )}
                </Label>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="location" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 block">📍 Pasillo / Ubicación <span className="text-[8px] opacity-50">(OPCIONAL)</span></Label>
            <select
              id="location" value={locationId} onChange={(e) => setLocationId(e.target.value)}
              className="w-full bg-hover/50 border border-border-default rounded-2xl px-5 py-4 text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 transition-all font-medium appearance-none"
            >
              <option value="">Todas las ubicaciones</option>
              {locations.map((l: any) => <option key={l.id} value={l.id}>{l.code}</option>)}
            </select>
          </div>

          <div className="flex gap-3 pt-6 border-t border-border-default">
            <Button
              onClick={handleConfirm}
              disabled={!isFormValid || isPending}
              variant="primary"
              className="flex-1 py-6 rounded-2xl shadow-xl shadow-accent-primary/20"
            >
              {isPending ? '⏳ Procesando...' : '✓ Crear Conteo'}
            </Button>
            <Button
              onClick={onCancel}
              variant="secondary"
              className="flex-1 py-6 rounded-2xl"
            >
              ✕ Cancelar
            </Button>
          </div>
        </div>
      </div>

      {mappingId && (
        <ItemSelectionModal
          isOpen={isSelectionModalOpen}
          onClose={() => setIsSelectionModalOpen(false)}
          onConfirm={(codes) => setSelectedItemCodes(codes)}
          mappingId={mappingId}
          warehouseId={warehouseId}
        />
      )}
    </div>
  );
};
