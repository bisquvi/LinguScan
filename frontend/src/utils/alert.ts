import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirmation dialog.
 * - On native (iOS / Android): uses React Native's Alert.alert with buttons.
 * - On web: uses window.confirm because Alert.alert is a silent no-op in Expo Web.
 */
export function confirmAction(
    title: string,
    message: string,
    onConfirm: () => void,
    confirmLabel = 'Sil',
) {
    if (Platform.OS === 'web') {
        if (window.confirm(`${title}\n\n${message}`)) {
            onConfirm();
        }
    } else {
        Alert.alert(title, message, [
            { text: 'İptal', style: 'cancel' },
            { text: confirmLabel, style: 'destructive', onPress: onConfirm },
        ]);
    }
}

/**
 * Cross-platform info / error alert.
 * - On native: Alert.alert
 * - On web: window.alert
 */
export function showAlert(title: string, message: string) {
    if (Platform.OS === 'web') {
        window.alert(`${title}\n\n${message}`);
    } else {
        Alert.alert(title, message);
    }
}
