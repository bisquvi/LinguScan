import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const BACKEND_PORT = 8000;

/**
 * Resolves the backend API URL based on the current platform and environment.
 *
 * Priority:
 *   1. Explicit override via app.json extra.apiUrl (for production / custom deploys)
 *   2. Auto-detection from Expo dev server host (LAN / physical device)
 *   3. Platform-specific localhost fallback
 */
const resolveApiUrl = (): string => {
    // 1. Explicit override — set in app.json → extra.apiUrl
    const explicitUrl = Constants.expoConfig?.extra?.apiUrl;
    if (explicitUrl) return explicitUrl;

    // 2. Web always uses same-origin localhost
    if (Platform.OS === 'web') {
        return `http://localhost:${BACKEND_PORT}/api`;
    }

    // 3. Auto-detect from Expo dev server host (works for LAN / physical devices)
    const debuggerHost = Constants.expoConfig?.hostUri;
    if (debuggerHost) {
        // Extract hostname without port (e.g. "192.168.1.187:8081" → "192.168.1.187")
        const hostname = debuggerHost.replace(/:\d+$/, '');
        return `http://${hostname}:${BACKEND_PORT}/api`;
    }

    // 4. Fallback — Android emulator uses 10.0.2.2, iOS simulator uses localhost
    return Platform.OS === 'android'
        ? `http://10.0.2.2:${BACKEND_PORT}/api`
        : `http://localhost:${BACKEND_PORT}/api`;
};

const API_URL = resolveApiUrl();

export const apiClient = axios.create({
    baseURL: API_URL,
});
