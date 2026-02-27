import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

/**
 * Aplica la clase 'dark' al <html> para activar las variables CSS dark mode.
 * Se llama en cada cambio de tema y al rehidratar el store.
 */
function applyThemeToDom(theme: Theme) {
    const root = document.documentElement;
    if (theme === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            theme: 'light',

            setTheme: (theme) => {
                applyThemeToDom(theme);
                set({ theme });
            },

            toggleTheme: () => {
                const next: Theme = get().theme === 'light' ? 'dark' : 'light';
                applyThemeToDom(next);
                set({ theme: next });
            },
        }),
        {
            name: 'cigua-theme',
            onRehydrateStorage: () => (state) => {
                // Aplica el tema guardado al recargar la página
                if (state) {
                    applyThemeToDom(state.theme);
                }
            },
        }
    )
);
