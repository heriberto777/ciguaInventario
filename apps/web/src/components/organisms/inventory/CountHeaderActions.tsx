import React from 'react';
import { Button } from '@/components/atoms/Button';
import { InventoryCount } from '@/services/inventory.types';

interface CountHeaderActionsProps {
  count: InventoryCount;
  permissions: {
    canCreate: boolean;
    canDelete: boolean;
    canComplete: boolean;
    canSyncERP: boolean;
    canExport: boolean;
  };
  actions: {
    onStart: () => void;
    onComplete: () => void;
    onPause: () => void;
    onResume: () => void;
    onFinalize: () => void;
    onCreateVersion: () => void;
    onSyncERP: () => void;
    onExportExcel: () => void;
    onCancel: () => void;
    onBack: () => void;
    onRefreshData: () => void;
  };
  isLoading?: {
    refresh?: boolean;
    complete?: boolean;
    finalize?: boolean;
    sync?: boolean;
    version?: boolean;
  };
}

export const CountHeaderActions: React.FC<CountHeaderActionsProps> = ({
  count,
  permissions,
  actions,
  isLoading
}) => {
  const { status } = count;

  return (
    <div className="flex-shrink-0 border-b border-border-default bg-card px-8 py-4">
      <div className="max-w-7xl mx-auto flex gap-3 flex-wrap">
        {status === 'DRAFT' && (
          <>
            {permissions.canCreate && (
              <Button onClick={actions.onStart} variant="primary">✓ Iniciar Conteo</Button>
            )}
            {permissions.canDelete && (
              <Button onClick={actions.onCancel} variant="danger">✕ Cancelar</Button>
            )}
          </>
        )}

        {status === 'ACTIVE' && (
          <>
            {permissions.canComplete && (
              <Button onClick={actions.onComplete} variant="primary" isLoading={isLoading?.complete}>✓ Finalizar</Button>
            )}
            {permissions.canComplete && (
              <Button onClick={actions.onPause} variant="secondary">⏸ Pausar</Button>
            )}
            {permissions.canDelete && (
              <Button onClick={actions.onCancel} variant="danger">✕ Cancelar</Button>
            )}
          </>
        )}

        {status === 'ON_HOLD' && (
          <>
            {permissions.canComplete && (
              <>
                <Button onClick={actions.onResume} variant="primary">▶️ Reanudar</Button>
                <Button onClick={actions.onComplete} variant="secondary" isLoading={isLoading?.complete}>✓ Finalizar / Entregar</Button>
              </>
            )}
            {permissions.canDelete && (
              <Button onClick={actions.onCancel} variant="danger">✕ Cancelar</Button>
            )}
          </>
        )}

        {status === 'SUBMITTED' && (
          <>
            <Button onClick={actions.onFinalize} variant="primary" isLoading={isLoading?.finalize}>🏆 Finalizar Conteo</Button>
            <Button onClick={actions.onCreateVersion} variant="secondary" isLoading={isLoading?.version}>🔄 Nueva Versión (Recontar)</Button>
            {permissions.canExport && (
              <Button onClick={actions.onExportExcel} variant="secondary">📥 Exportar Excel</Button>
            )}
            {permissions.canDelete && (
              <Button onClick={actions.onCancel} variant="danger">✕ Cancelar</Button>
            )}
          </>
        )}

        {(status === 'COMPLETED' || status === 'FINALIZED') && (
          <>
            {status === 'COMPLETED' && permissions.canCreate && (
              <Button onClick={actions.onCreateVersion} variant="secondary" isLoading={isLoading?.version}>🔄 Crear Versión</Button>
            )}
            {permissions.canExport && (
              <Button onClick={actions.onExportExcel} variant="secondary">📥 Exportar Excel</Button>
            )}
            {permissions.canSyncERP && (
              <Button onClick={actions.onSyncERP} variant="primary" isLoading={isLoading?.sync}>🚀 Enviar a ERP</Button>
            )}
            {permissions.canDelete && (
              <Button onClick={actions.onCancel} variant="danger">✕ Cancelar</Button>
            )}
          </>
        )}

        <Button onClick={actions.onBack} variant="secondary">← Volver</Button>
        <button
          onClick={actions.onRefreshData}
          disabled={isLoading?.refresh}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${
            isLoading?.refresh
              ? 'bg-hover text-muted border-border-default'
              : 'bg-accent-primary/10 text-accent-primary border-accent-primary/20 hover:bg-accent-primary/20'
          }`}
          title="Recargar datos del servidor"
        >
          <span className={`text-sm ${isLoading?.refresh ? 'animate-spin' : ''}`}>🔄</span>
          {isLoading?.refresh ? 'Cargando...' : 'Refrescar'}
        </button>
      </div>
    </div>
  );
};
