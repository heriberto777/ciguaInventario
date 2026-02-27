/**
 * serverConfig.ts — Servicio de configuración del servidor
 *
 * Gestiona la URL base del backend en AsyncStorage.
 * Debe configurarse ANTES del login (pantalla de Setup).
 * Sin esta configuración, el login no puede conectarse.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'server_config';

export interface ServerConfig {
    host: string;       // Ej: 192.168.1.100  o   mi-servidor.com
    port: string;       // Ej: 3000
    protocol: 'http' | 'https';
    apiPath: string;    // Ej: /api  (normalmente no cambia)
}

const DEFAULT_CONFIG: ServerConfig = {
    host: '',
    port: '3000',
    protocol: 'http',
    apiPath: '/api',
};

/**
 * Construye la URL completa a partir de la configuración.
 * Ej: http://192.168.1.100:3000/api
 */
export function buildApiUrl(config: ServerConfig): string {
    const host = config.host.trim();
    const port = config.port.trim();
    const path = config.apiPath.startsWith('/') ? config.apiPath : `/${config.apiPath}`;
    return `${config.protocol}://${host}:${port}${path}`;
}

export async function getServerConfig(): Promise<ServerConfig | null> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as ServerConfig;
    } catch {
        return null;
    }
}

export async function saveServerConfig(config: ServerConfig): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export async function getApiBaseUrl(): Promise<string | null> {
    const config = await getServerConfig();
    if (!config || !config.host) return null;
    return buildApiUrl(config);
}

export async function clearServerConfig(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
}
