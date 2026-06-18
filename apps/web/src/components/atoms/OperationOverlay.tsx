import React from 'react';

interface OperationOverlayProps {
  isActive: boolean;
  message: string;
}

/**
 * Overlay visual que cubre toda la pantalla con un indicador de carga
 * cuando una operación de larga duración está en progreso.
 * Previene interacción del usuario durante la operación.
 */
export const OperationOverlay: React.FC<OperationOverlayProps> = ({ isActive, message }) => {
  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card rounded-3xl border border-border-default shadow-2xl px-12 py-10 flex flex-col items-center gap-6 max-w-sm mx-4">
        {/* Spinner */}
        <div className="relative">
          <div className="w-16 h-16 border-4 border-accent-primary/20 rounded-full"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-accent-primary rounded-full animate-spin"></div>
        </div>

        {/* Mensaje */}
        <div className="text-center space-y-2">
          <p className="text-lg font-black text-primary tracking-tight">{message}</p>
          <p className="text-xs font-bold text-muted uppercase tracking-widest">Por favor espere...</p>
        </div>

        {/* Barra de progreso animada */}
        <div className="w-full h-1.5 bg-hover rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary rounded-full animate-pulse" style={{ width: '60%' }}></div>
        </div>
      </div>
    </div>
  );
};
