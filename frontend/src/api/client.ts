import axios from 'axios';
import { Platform } from 'react-native';

// For Android emulator, 10.0.2.2 points to host localhost.
// Dynamic resolution for physical devices (LAN and Tunnel):
import Constants from 'expo-constants';

const debuggerHost = Constants.expoConfig?.hostUri;
// e.g. "192.168.1.5:8081" or "xxxxxxxx.ngrok-free.app"

// Replace the bundler port :8081 with backend port :8000
// But if it's ngrok (no explicit port), it might still fail to hit 8000
// We fallback to localhost if debuggerHost is missing
const API_URL = (() => {
    if (Platform.OS === 'web') return 'http://localhost:8000/api';

    if (debuggerHost) {
        // Find if there's a port block :PORT at the end of the host
        const portMatch = debuggerHost.match(/:(\d+)$/);

        if (portMatch) {
            // e.g. "192.168.1.187:8081" -> "192.168.1.187:8000"
            return `http://${debuggerHost.replace(portMatch[0], ':8000')}/api`;
        } else {
            // e.g. "something.ngrok.app" -> For ngrok tunnel, port 8000 won't work on the same URL!
            // If the user uses a tunnel, the tunnel ONLY forwards 8081.
            // But we will return it just in case, or default to LAN:
            return `http://${debuggerHost.split(':')[0]}:8000/api`;
        }
    }

    return Platform.OS === 'android' ? 'http://10.0.2.2:8000/api' : 'http://localhost:8000/api';
})();
export const apiClient = axios.create({
    baseURL: API_URL,
});
