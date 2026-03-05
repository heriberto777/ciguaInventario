import { useWindowDimensions } from 'react-native';

/**
 * useResponsive — Hook para adaptar el layout en Mobile.
 * 
 * Basado en breakpoints estándar:
 * - Phone: < 600dp
 * - Tablet: >= 600dp
 * 
 * Retorna flags y utilidades para layouts dinámicos.
 */
export const useResponsive = () => {
    const { width, height } = useWindowDimensions();

    const isTablet = width >= 600;
    const isPhone = !isTablet;

    // Utilidades para Grid / Layout
    const numColumns = isTablet ? 2 : 1;
    const spacing = isTablet ? 16 : 12;
    const contentWidth = isTablet ? Math.min(width * 0.9, 1000) : width;

    // Tablet Split-View Constants
    const masterWidth = isTablet ? 400 : width;
    const detailWidth = isTablet ? width - masterWidth : 0;

    return {
        isTablet,
        isPhone: !isTablet,
        numColumns,
        spacing,
        contentWidth,
        masterWidth,
        detailWidth,
        windowWidth: width,
        windowHeight: height,
    };
};
