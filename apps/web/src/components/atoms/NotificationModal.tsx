import React from 'react';
import { createPortal } from 'react-dom';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  icon?: React.ReactNode;
  autoClose?: number; // milliseconds
}

const typeStyles = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: '✓',
    iconColor: 'text-green-600',
    titleColor: 'text-green-900',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: '✕',
    iconColor: 'text-red-600',
    titleColor: 'text-red-900',
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    icon: '⚠',
    iconColor: 'text-yellow-600',
    titleColor: 'text-yellow-900',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'ⓘ',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-900',
  },
};

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  icon,
  autoClose,
}) => {
  // Auto-close functionality
  React.useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(onClose, autoClose);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, onClose]);

  if (!isOpen) return null;

  const styles = typeStyles[type];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className={`relative ${styles.bg} border ${styles.border} rounded-lg shadow-xl max-w-sm w-full mx-4 p-6`}>
        {/* Icon + Title */}
        <div className="flex items-start gap-3 mb-3">
          {icon ? (
            <div className={`text-2xl flex-shrink-0 ${styles.iconColor}`}>
              {icon}
            </div>
          ) : (
            <div className={`text-2xl flex-shrink-0 ${styles.iconColor}`}>
              {styles.icon}
            </div>
          )}
          <h2 className={`text-lg font-semibold ${styles.titleColor}`}>
            {title}
          </h2>
        </div>

        {/* Message */}
        <p className="text-gray-700 mb-6 ml-11">
          {message}
        </p>

        {/* Button */}
        <div className="flex justify-end gap-2 ml-11">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              type === 'success'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : type === 'error'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : type === 'warning'
                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
