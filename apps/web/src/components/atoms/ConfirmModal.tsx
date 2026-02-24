import React from 'react';
import { createPortal } from 'react-dom';

interface ConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDangerous = false,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className={`relative ${isDangerous ? 'bg-red-50 border border-red-200' : 'bg-white'} rounded-lg shadow-xl max-w-sm w-full mx-4 p-6`}>
        {/* Icon + Title */}
        <div className="flex items-start gap-3 mb-4">
          <div className={`text-3xl flex-shrink-0 ${isDangerous ? 'text-red-600' : 'text-blue-600'}`}>
            {isDangerous ? '⚠️' : '❓'}
          </div>
          <h2 className={`text-lg font-semibold ${isDangerous ? 'text-red-900' : 'text-gray-900'}`}>
            {title}
          </h2>
        </div>

        {/* Message */}
        <p className={`${isDangerous ? 'text-red-800' : 'text-gray-700'} mb-6 ml-12`}>
          {message}
        </p>

        {/* Buttons */}
        <div className="flex justify-end gap-3 ml-12">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg font-medium bg-gray-200 hover:bg-gray-300 text-gray-900 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-medium text-white transition-colors disabled:opacity-50 ${
              isDangerous
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? '⏳ Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
