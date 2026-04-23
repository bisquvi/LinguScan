import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, ScrollView,
} from 'react-native';
import { apiClient } from '../api/client';

interface ProviderOption {
    key: string;
    label: string;
    icon: string;
    description: string;
}

const PROVIDERS: ProviderOption[] = [
    { key: 'google_free', label: 'Google Translate (Ücretsiz)', icon: '🌐', description: '🆓 API key gerektirmez' },
    { key: 'mymemory', label: 'MyMemory', icon: '📝', description: '🆓 API key gerektirmez' },
    { key: 'google', label: 'Google Cloud Translate', icon: '☁️', description: 'API key gerektirir' },
    { key: 'deepl', label: 'DeepL', icon: '🔷', description: 'API key gerektirir' },
    { key: 'yandex', label: 'Yandex Translate', icon: '🟡', description: 'API key gerektirir' },
    { key: 'libre', label: 'LibreTranslate', icon: '🟢', description: 'Kendi sunucunuzda çalışır' },
    { key: 'ollama', label: 'Yerel AI (Ollama)', icon: '🤖', description: 'İnternet gerektirmez' },
];

interface Toast { message: string; success: boolean; }

export default function SettingsScreen() {
    const [selectedProvider, setSelectedProvider] = useState('google');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<Toast | null>(null);

    const showToast = (message: string, success: boolean) => {
        setToast({ message, success });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        (async () => {
            try {
                const resp = await apiClient.get('/settings');
                setSelectedProvider(resp.data.translation_provider);
            } catch {
                showToast('Ayarlar yüklenemedi', false);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleSelect = async (key: string) => {
        if (key === selectedProvider) return;
        setSaving(true);
        try {
            await apiClient.put('/settings', { translation_provider: key });
            setSelectedProvider(key);
            const label = PROVIDERS.find(p => p.key === key)?.label ?? key;
            showToast(`✅ Çeviri motoru: ${label}`, true);
        } catch {
            showToast('❌ Ayar kaydedilemedi', false);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#1DB954" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.sectionTitle}>Çeviri Motoru</Text>
                <Text style={styles.sectionSubtitle}>
                    Kelime çevirisi için kullanılacak servisi seçin.
                    {'\n'}Eğer seçilen servis çalışmazsa, sırasıyla diğer servisler denenir.
                </Text>

                {PROVIDERS.map((p) => {
                    const isSelected = p.key === selectedProvider;
                    return (
                        <TouchableOpacity
                            key={p.key}
                            style={[styles.providerCard, isSelected && styles.providerCardActive]}
                            onPress={() => handleSelect(p.key)}
                            disabled={saving}
                            activeOpacity={0.7}
                        >
                            <View style={styles.providerLeft}>
                                <View style={[styles.radio, isSelected && styles.radioActive]}>
                                    {isSelected && <View style={styles.radioInner} />}
                                </View>
                                <Text style={styles.providerIcon}>{p.icon}</Text>
                                <View>
                                    <Text style={[styles.providerLabel, isSelected && styles.providerLabelActive]}>
                                        {p.label}
                                    </Text>
                                    <Text style={styles.providerDesc}>{p.description}</Text>
                                </View>
                            </View>
                            {saving && isSelected && <ActivityIndicator size="small" color="#1DB954" />}
                        </TouchableOpacity>
                    );
                })}

                <View style={styles.infoBox}>
                    <Text style={styles.infoTitle}>ℹ️ Yedekleme Sırası (Fallback)</Text>
                    <Text style={styles.infoText}>
                        Google Free → MyMemory → Google → Yandex → LibreTranslate → Ollama
                    </Text>
                    <Text style={styles.infoText}>
                        Seçilen motor başarısız olursa, yukarıdaki sıraya göre otomatik olarak
                        bir sonraki motor denenir.
                    </Text>
                </View>
            </ScrollView>

            {toast && (
                <View style={[styles.toast, toast.success ? styles.toastSuccess : styles.toastError]}>
                    <Text style={styles.toastText}>{toast.message}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
    scrollContent: { padding: 20, paddingBottom: 40 },

    sectionTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
    sectionSubtitle: { fontSize: 13, color: '#b3b3b3', marginBottom: 24, lineHeight: 20 },

    providerCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#1e1e1e', borderRadius: 14, padding: 16, marginBottom: 10,
        borderWidth: 1.5, borderColor: 'transparent',
    },
    providerCardActive: { borderColor: '#1DB954', backgroundColor: '#1a2e1f' },
    providerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },

    radio: {
        width: 22, height: 22, borderRadius: 11,
        borderWidth: 2, borderColor: '#555',
        alignItems: 'center', justifyContent: 'center',
    },
    radioActive: { borderColor: '#1DB954' },
    radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#1DB954' },

    providerIcon: { fontSize: 22 },
    providerLabel: { fontSize: 16, fontWeight: '600', color: '#e0e0e0' },
    providerLabelActive: { color: '#1DB954' },
    providerDesc: { fontSize: 12, color: '#888', marginTop: 2 },

    infoBox: {
        backgroundColor: '#1a1a2e', borderRadius: 14, padding: 18, marginTop: 20,
        borderWidth: 1, borderColor: '#2D46B9',
    },
    infoTitle: { fontSize: 14, fontWeight: 'bold', color: '#8b9cf7', marginBottom: 8 },
    infoText: { fontSize: 13, color: '#b3b3b3', lineHeight: 20, marginBottom: 4 },

    toast: {
        position: 'absolute', bottom: 40, left: 20, right: 20,
        padding: 16, borderRadius: 12, zIndex: 9999,
        shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8,
    },
    toastSuccess: { backgroundColor: '#1DB954' },
    toastError: { backgroundColor: '#E91429' },
    toastText: { color: '#fff', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
});
