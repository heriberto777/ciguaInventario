import React from 'react';
import { createPortal } from 'react-dom';

interface ProcessingModalProps {
    isOpen: boolean;
    message: string;
    status?: 'processing' | 'success' | 'error';
    onClose?: () => void;
}

export const ProcessingModal: React.FC<ProcessingModalProps> = ({
    isOpen,
    message,
    status = 'processing',
    onClose,
}) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop blur overlay */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity animate-in fade-in duration-300" />

            {/* Modal Container */}
            <div className="relative bg-[var(--bg-card)] rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] max-w-sm w-full p-10 flex flex-col items-center text-center border border-[var(--border-default)] transform transition-all animate-in zoom-in-95 duration-200">

                {status === 'processing' && (
                    <>
                        {/* Spinning Loader */}
                        <div className="relative w-24 h-24 mb-8">
                            <div className="absolute inset-0 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin shadow-lg shadow-[var(--accent-primary)]/20" />
                            <div className="absolute inset-0 border-4 border-[var(--accent-primary)] opacity-10 rounded-full" />
                        </div>

                        <h3 className="text-2xl font-black text-[var(--text-primary)] mb-3 tracking-tight">
                            Procesando...
                        </h3>
                        <p className="text-[var(--text-secondary)] text-sm font-medium leading-relaxed">
                            {message}
                        </p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-24 h-24 bg-[var(--color-success)]/10 text-[var(--color-success)] rounded-full flex items-center justify-center mb-8 scale-110 animate-bounce shadow-xl border border-[var(--color-success)]/20">
                            <span className="text-5xl font-bold">✓</span>
                        </div>
                        <h3 className="text-2xl font-black text-[var(--text-primary)] mb-3 tracking-tight">
                            ¡Listo!
                        </h3>
                        <p className="text-[var(--text-secondary)] text-sm font-medium leading-relaxed mb-8">
                            {message}
                        </p>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="w-full bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-95"
                            >
                                Continuar
                            </button>
                        )}
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-24 h-24 bg-[var(--color-danger)]/10 text-[var(--color-danger)] rounded-full flex items-center justify-center mb-8 shadow-xl border border-[var(--color-danger)]/20">
                            <span className="text-5xl font-bold">✕</span>
                        </div>
                        <h3 className="text-2xl font-black text-[var(--color-danger)] mb-3 tracking-tight">
                            Error
                        </h3>
                        <p className="text-[var(--text-secondary)] text-sm font-medium leading-relaxed mb-8">
                            {message}
                        </p>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="w-full bg-[var(--color-danger)] hover:opacity-90 text-white font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-95"
                            >
                                Cerrar
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>,
        document.body
    );
};
