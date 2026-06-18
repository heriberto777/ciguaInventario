import React, { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { Label } from '@/components/atoms/Label';

interface ReservationExcelImportProps {
  onUpload: (file: File, type: 'IN_AISLE' | 'SEPARATED') => void;
  isPending: boolean;
}

export const ReservationExcelImport: React.FC<ReservationExcelImportProps> = ({
  onUpload,
  isPending
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [reservationType, setReservationType] = useState<'IN_AISLE' | 'SEPARATED'>('IN_AISLE');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (file) {
      onUpload(file, reservationType);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border-default p-10 shadow-lg animate-in fade-in duration-500">
      <h3 className="text-xl font-black text-primary uppercase tracking-widest mb-6">📊 Reserva desde Excel</h3>
      <p className="text-muted text-xs mb-8 font-medium">Sube un archivo Excel con las columnas <span className="text-primary font-bold">itemCode</span> y <span className="text-primary font-bold">qty</span> para reservar ítems localmente.</p>
      
      <div className="space-y-4">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted">Seleccionar Archivo</Label>
        <div className="relative group">
          <input 
            type="file" 
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="border-2 border-dashed border-border-default rounded-xl p-8 text-center transition-all group-hover:border-accent-primary group-hover:bg-accent-primary/5">
            <span className="text-xs font-bold text-muted group-hover:text-accent-primary">
              {file ? file.name : 'Haz clic o arrastra un archivo Excel aquí'}
            </span>
          </div>
        </div>

        <div className="space-y-2 mt-6">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted">Estado de Reserva</Label>
          <select 
            value={reservationType} 
            onChange={(e) => setReservationType(e.target.value as any)}
            className="w-full bg-hover/50 border border-border-default rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent-primary/20 appearance-none transition-all"
          >
            <option value="IN_AISLE">🛒 Pasillo (Sigue en estante)</option>
            <option value="SEPARATED">📦 Separado (Ya recolectado)</option>
          </select>
        </div>
      </div>

      <Button 
        onClick={handleUpload} 
        disabled={!file || isPending} 
        variant="primary" 
        className="w-full mt-8"
      >
        {isPending ? '⏳ Subiendo...' : '🚀 Importar Reservas'}
      </Button>
    </div>
  );
};
