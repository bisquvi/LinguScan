import React, { useContext, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, ActivityIndicator, Dimensions } from 'react-native';
import { apiClient } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { colors, radius, spacing, typography } from '../theme';
import { Globe, FileText, Cloud, Layers, Circle, Server, Bot, Lock, Info, Check } from 'lucide-react-native';

const { width: SCREEN_W } = Dimensions.get('window');
const IS_MOBILE = SCREEN_W < 768;

interface ProviderOption { key: string; label: string; Icon: any; description: string; }

const PROVIDERS: ProviderOption[] = [
    { key: 'google_free', label: 'Google Translate (Ücretsiz)', Icon: Globe, description: 'API key gerektirmez' },
    { key: 'mymemory', label: 'MyMemory', Icon: FileText, description: 'API key gerektirmez' },
    { key: 'google', label: 'Google Cloud Translate', Icon: Cloud, description: 'API key gerektirir' },
    { key: 'deepl', label: 'DeepL', Icon: Layers, description: 'API key gerektirir' },
    { key: 'yandex', label: 'Yandex Translate', Icon: Circle, description: 'API key gerektirir' },
    { key: 'libre', label: 'LibreTranslate', Icon: Server, description: 'Kendi sunucunuzda çalışır' },
    { key: 'ollama', label: 'Yerel AI (Ollama)', Icon: Bot, description: 'İnternet gerektirmez' },
];

interface Toast { message: string; success: boolean; }

export default function SettingsScreen() {
    const { user } = useContext(AuthContext);
    const [selectedProvider, setSelectedProvider] = useState('google_free');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<Toast | null>(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;

    const showToast = (message: string, success: boolean) => {
        setToast({ message, success });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
        
        if (!user) { setLoading(false); return; }
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
    }, [user]);

    const handleSelect = async (key: string) => {
        if (key === selectedProvider || saving) return;
        setSaving(true);
        try {
            await apiClient.put('/settings', { translation_provider: key });
            setSelectedProvider(key);
            const label = PROVIDERS.find(p => p.key === key)?.label ?? key;
            showToast(`Çeviri motoru: ${label}`, true);
        } catch {
            showToast('Ayar kaydedilemedi', false);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <View style={s.centerPage}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 12 }}>Yükleniyor...</Text>
        </View>
    );

    if (!user) return (
        <View style={s.centerPage}>
            <Lock size={56} color={colors.textPrimary} style={{ marginBottom: 16 }} />
            <Text style={s.heading}>Giriş gerekli</Text>
            <Text style={[s.subheading, { textAlign: 'center', maxWidth: 280 }]}>
                Çeviri ayarlarını değiştirmek için önce hesabınıza giriş yapın.
            </Text>
        </View>
    );

    return (
        <View style={s.page}>
            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                <Animated.View style={{ opacity: fadeAnim }}>
                    {/* Header */}
                    <View style={{ marginBottom: 24 }}>
                        <Text style={[s.heading, { marginBottom: 6 }]}>Çeviri Motoru</Text>
                        <Text style={s.subheading}>
                            Kelime çevirisi için kullanılacak servisi seçin.{"\n"}
                            Seçilen servis çalışmazsa diğerleri otomatik denenir.
                        </Text>
                    </View>

                    {/* Provider list */}
                    {PROVIDERS.map((p) => {
                        const selected = p.key === selectedProvider;
                        return (
                            <TouchableOpacity
                                key={p.key}
                                activeOpacity={0.7}
                                onPress={() => handleSelect(p.key)}
                                disabled={saving}
                                style={[s.card, selected && s.cardSelected]}
                            >
                                <View style={s.cardLeft}>
                                    {/* Radio */}
                                    <View style={[s.radio, selected && s.radioSelected]}>
                                        {selected && <View style={s.radioDot} />}
                                    </View>
                                    {/* Icon */}
                                    <p.Icon size={20} color={selected ? colors.primary : colors.textPrimary} />
                                    {/* Labels */}
                                    <View style={s.labelGroup}>
                                        <Text style={[s.label, selected && s.labelSelected]}>{p.label}</Text>
                                        <Text style={s.desc}>{p.description}</Text>
                                    </View>
                                </View>
                                {/* Saving spinner */}
                                {saving && selected && (
                                    <ActivityIndicator size="small" color={colors.primary} />
                                )}
                            </TouchableOpacity>
                        );
                    })}

                    {/* Info box */}
                    <View style={s.infoBox}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <Info size={16} color={colors.secondary} />
                            <Text style={[s.infoTitle, { marginBottom: 0 }]}>Yedekleme Sırası (Fallback)</Text>
                        </View>
                        <Text style={s.infoText}>
                            Google Free → MyMemory → Google → Yandex → LibreTranslate → Ollama
                        </Text>
                        <Text style={[s.infoText, { marginBottom: 0 }]}>
                            Seçilen motor başarısız olursa, yukarıdaki sıraya göre otomatik olarak bir sonraki motor denenir.
                        </Text>
                    </View>
                </Animated.View>
            </ScrollView>

            {/* Toast */}
            {toast && (
                <View style={[s.toast, { backgroundColor: toast.success ? colors.primary : colors.danger, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                    {toast.success && <Check size={16} color={colors.bg} />}
                    <Text style={[s.toastText, { color: toast.success ? colors.bg : '#fff' }]}>{toast.message}</Text>
                </View>
            )}
        </View>
    );
}

const s = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    scroll: {
        padding: IS_MOBILE ? spacing.md : spacing.lg,
        paddingBottom: 48,
    },
    centerPage: {
        flex: 1,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    heading: {
        fontSize: IS_MOBILE ? 22 : 26,
        fontWeight: '800',
        color: colors.textPrimary,
    } as any,
    subheading: {
        fontSize: 14,
        color: colors.textMuted,
        lineHeight: 22,
    } as any,
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 10,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    cardSelected: {
        backgroundColor: colors.primaryDim,
        borderColor: colors.primary,
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    } as any,
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.textMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioSelected: {
        borderColor: colors.primary,
    },
    radioDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary,
    },
    icon: { fontSize: 20 },
    labelGroup: { flexDirection: 'column', gap: 2 } as any,
    label: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
    } as any,
    labelSelected: {
        color: colors.primary,
    },
    desc: {
        fontSize: 12,
        color: colors.textMuted,
    } as any,
    infoBox: {
        backgroundColor: colors.secondaryDim,
        borderRadius: radius.lg,
        padding: 18,
        marginTop: 20,
        borderWidth: 1,
        borderColor: `${colors.secondary}30`,
    },
    infoTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.secondary,
        marginBottom: 8,
    } as any,
    infoText: {
        fontSize: 13,
        color: colors.textMuted,
        lineHeight: 20,
        marginBottom: 8,
    } as any,
    toast: {
        position: 'absolute',
        bottom: 32,
        alignSelf: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: radius.full,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
    },
    toastText: {
        fontWeight: '700',
        fontSize: 14,
        textAlign: 'center',
    } as any,
});
