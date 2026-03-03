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
      <div className={`relative ${isDangerous ? 'bg-red-500/5 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'bg-[var(--bg-card)] border border-[var(--border-default)] shadow-xl'} rounded-2xl max-w-sm w-full mx-4 p-6 backdrop-blur-sm overflow-hidden`}>
        {/* Icon + Title */}
        <div className="flex items-start gap-3 mb-4">
          <div className={`text-3xl flex-shrink-0 ${isDangerous ? 'text-red-600' : 'text-blue-600'}`}>
            {isDangerous ? '⚠️' : '❓'}
          </div>
          <h2 className={`text-lg font-bold ${isDangerous ? 'text-red-500' : 'text-[var(--text-primary)]'}`}>
            {title}
          </h2>
        </div>

        {/* Message */}
        <p className={`${isDangerous ? 'text-red-400' : 'text-[var(--text-secondary)]'} mb-6 ml-12 text-sm leading-relaxed font-medium`}>
          {message}
        </p>

        {/* Buttons */}
        <div className="flex justify-end gap-3 ml-12">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg font-bold uppercase text-[10px] tracking-wider bg-[var(--bg-hover)] hover:bg-[var(--border-default)] text-[var(--text-primary)] transition-all disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-bold uppercase text-[10px] tracking-wider text-white transition-all shadow-md active:scale-95 disabled:opacity-50 ${isDangerous
                ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
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
