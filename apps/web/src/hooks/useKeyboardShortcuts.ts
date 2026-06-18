import { useEffect } from 'react';

interface ShortcutHandlers {
  onSearch?: () => void;
  onSwitchToItems?: () => void;
  onSwitchToDispatches?: () => void;
}

export const useKeyboardShortcuts = (handlers: ShortcutHandlers) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2: Focus Search
      if (e.key === 'F2') {
        e.preventDefault();
        if (handlers.onSearch) handlers.onSearch();
      }

      // Alt + I: Items Tab
      if (e.altKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        if (handlers.onSwitchToItems) handlers.onSwitchToItems();
      }

      // Alt + P: Dispatches Tab (Reservas/Facturas)
      if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (handlers.onSwitchToDispatches) handlers.onSwitchToDispatches();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
};
