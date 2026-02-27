/**
 * ThemeContext — Proveedor global del tema dark/light.
 *
 * Uso en cualquier componente:
 *   const { colors, theme, toggleTheme } = useTheme();
 *
 * El tema se persiste en AsyncStorage ('cigua_mobile_theme').
 * Al reabrir la app, se restaura el tema del usuario.
 */
import React, {
    createContext, useContext, useState, useEffect, ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode, ColorTokens, getColors } from './colors';

const STORAGE_KEY = 'cigua_mobile_theme';

interface ThemeContextValue {
    theme: ThemeMode;
    colors: ColorTokens;
    isDark: boolean;
    setTheme: (mode: ThemeMode) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const systemScheme = useColorScheme();  // 'dark' | 'light' | null
    const [theme, setThemeState] = useState<ThemeMode>(
        systemScheme === 'dark' ? 'dark' : 'light'
    );
    const [loaded, setLoaded] = useState(false);

    // Cargar tema persistido al iniciar
    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
            if (saved === 'dark' || saved === 'light') {
                setThemeState(saved);
            }
            setLoaded(true);
        });
    }, []);

    const setTheme = async (mode: ThemeMode) => {
        setThemeState(mode);
        await AsyncStorage.setItem(STORAGE_KEY, mode);
    };

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    // No renderizar hasta haber cargado el tema guardado
    // (evita el flash de color incorrecto al iniciar)
    if (!loaded) return null;

    return (
        <ThemeContext.Provider value={{
            theme,
            colors: getColors(theme),
            isDark: theme === 'dark',
            setTheme,
            toggleTheme,
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
    return ctx;
}
