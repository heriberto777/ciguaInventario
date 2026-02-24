import React from 'react';
import { Modal } from '@/components/atoms/Modal';
import { Button } from '@/components/atoms/Button';

interface NewVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  versionNumber: number;
  itemsCount: number;
  previousVersion: number;
}

export const NewVersionModal: React.FC<NewVersionModalProps> = ({
  isOpen,
  onClose,
  versionNumber,
  itemsCount,
  previousVersion,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="✅ Nueva Versión Creada"
      size="md"
      footer={
        <Button
          onClick={onClose}
          variant="primary"
        >
          ¡Entendido!
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {/* Main Message */}
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            ¡Versión V{versionNumber} creada exitosamente!
          </h3>
          <p className="text-gray-600">
            Se copió de V{previousVersion} a V{versionNumber}
          </p>
        </div>

        {/* Stats */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-700 font-medium">📦 Items para recontar:</span>
            <span className="text-2xl font-bold text-blue-600">{itemsCount}</span>
          </div>
          <div className="text-sm text-gray-600">
            Todos los items están listos sin cantidades para que puedas recontar.
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>💡 Tip:</strong> Recontas todos los {itemsCount} items en V{versionNumber}.
            Cuando termines, haz click en <strong>[✓ Finalizar V{versionNumber}]</strong> para completar el reconteo.
          </p>
        </div>

        {/* Next Steps */}
        <div className="border-t pt-4">
          <h4 className="font-semibold text-gray-900 mb-2">Próximos pasos:</h4>
          <ol className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="font-bold text-blue-600 mr-3">1.</span>
              <span>Recontas todos los {itemsCount} items</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-blue-600 mr-3">2.</span>
              <span>Haz click en <strong>[✓ Finalizar V{versionNumber}]</strong></span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-blue-600 mr-3">3.</span>
              <span>Si hay más varianzas, puedes crear V{versionNumber + 1}</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-blue-600 mr-3">4.</span>
              <span>Si todo está bien, envía a ERP</span>
            </li>
          </ol>
        </div>
      </div>
    </Modal>
  );
};
