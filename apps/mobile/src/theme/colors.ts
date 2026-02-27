/**
 * theme.ts — Sistema de tokens de color para dark/light mode en mobile.
 *
 * Regla: NUNCA usar colores hardcodeados en los StyleSheet.
 * Siempre usar: const { colors } = useTheme();
 */

export type ThemeMode = 'light' | 'dark';

export interface ColorTokens {
    // Fondos
    bgApp: string;
    bgCard: string;
    bgInput: string;
    bgHover: string;
    bgHeader: string;

    // Textos
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    textInverse: string;

    // Bordes
    border: string;
    borderFocus: string;

    // Acento de marca (indigo)
    accent: string;
    accentLight: string;
    accentText: string;   // texto sobre fondo accent

    // Semánticos
    success: string;
    successLight: string;
    warning: string;
    warningLight: string;
    danger: string;
    dangerLight: string;
    info: string;
    infoLight: string;

    // Separadores / divisores
    separator: string;

    // Modal overlay
    overlay: string;
}

export const LIGHT_COLORS: ColorTokens = {
    bgApp: '#f1f5f9',
    bgCard: '#ffffff',
    bgInput: '#fafafa',
    bgHover: '#f8fafc',
    bgHeader: '#ffffff',

    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    textInverse: '#ffffff',

    border: '#e2e8f0',
    borderFocus: '#6366f1',

    accent: '#6366f1',
    accentLight: '#eff0ff',
    accentText: '#ffffff',

    success: '#059669',
    successLight: '#dcfce7',
    warning: '#d97706',
    warningLight: '#fef3c7',
    danger: '#dc2626',
    dangerLight: '#fee2e2',
    info: '#2563eb',
    infoLight: '#eff6ff',

    separator: '#e5e7eb',
    overlay: 'rgba(0,0,0,0.5)',
};

export const DARK_COLORS: ColorTokens = {
    bgApp: '#0f172a',
    bgCard: '#1e293b',
    bgInput: '#1e293b',
    bgHover: '#1e2d3d',
    bgHeader: '#1e293b',

    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    textInverse: '#0f172a',

    border: '#334155',
    borderFocus: '#818cf8',

    accent: '#818cf8',
    accentLight: '#1e1e3a',
    accentText: '#ffffff',

    success: '#34d399',
    successLight: '#064e3b',
    warning: '#fbbf24',
    warningLight: '#451a03',
    danger: '#f87171',
    dangerLight: '#450a0a',
    info: '#60a5fa',
    infoLight: '#0c1a3a',

    separator: '#334155',
    overlay: 'rgba(0,0,0,0.7)',
};

export function getColors(mode: ThemeMode): ColorTokens {
    return mode === 'dark' ? DARK_COLORS : LIGHT_COLORS;
}
