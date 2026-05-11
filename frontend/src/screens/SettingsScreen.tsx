import React, { useContext, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView } from 'react-native';
import { apiClient } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';
import { motion } from 'framer-motion';

// ── Framer Motion element ──────────────────────────────────────────────────
const Mv = motion.div as any;

interface ProviderOption { key: string; label: string; icon: string; description: string; }

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
    const { user } = useContext(AuthContext);
    const [selectedProvider, setSelectedProvider] = useState('google_free');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<Toast | null>(null);

    const showToast = (message: string, success: boolean) => {
        setToast({ message, success });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
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
            showToast(`✓ Çeviri motoru: ${label}`, true);
        } catch {
            showToast('Ayar kaydedilemedi', false);
        } finally {
            setSaving(false);
        }
    };

    // ── CSS objects (never spread RN StyleSheet onto motion.div) ────────────
    const css = {
        page: {
            flex: 1,
            backgroundColor: colors.bg,
            minHeight: '100vh',
        } as React.CSSProperties,
        scroll: {
            padding: spacing.lg,
            paddingBottom: 48,
        } as React.CSSProperties,
        center: {
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '80vh',
            gap: 12,
        } as React.CSSProperties,
        heading: {
            fontSize: 26,
            fontWeight: '800',
            color: colors.textPrimary,
            marginBottom: 6,
        } as React.CSSProperties,
        subheading: {
            fontSize: 14,
            color: colors.textMuted,
            lineHeight: 1.6,
            marginBottom: 24,
        } as React.CSSProperties,
        card: (selected: boolean) => ({
            display: 'flex',
            flexDirection: 'row' as const,
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: selected ? colors.primaryDim : colors.surface,
            borderRadius: radius.lg,
            padding: '14px 16px',
            marginBottom: 10,
            border: `1.5px solid ${selected ? colors.primary : colors.border}`,
            cursor: saving ? 'default' : 'pointer',
            userSelect: 'none' as const,
            transition: 'background 0.2s, border-color 0.2s',
        }),
        cardLeft: {
            display: 'flex',
            flexDirection: 'row' as const,
            alignItems: 'center',
            gap: 12,
            flex: 1,
        } as React.CSSProperties,
        radio: (selected: boolean) => ({
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: `2px solid ${selected ? colors.primary : colors.textMuted}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'border-color 0.2s',
        }) as React.CSSProperties,
        radioDot: {
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: colors.primary,
        } as React.CSSProperties,
        icon: { fontSize: 20 } as React.CSSProperties,
        labelGroup: { display: 'flex', flexDirection: 'column' as const, gap: 2 },
        label: (selected: boolean) => ({
            fontSize: 15,
            fontWeight: '600',
            color: selected ? colors.primary : colors.textPrimary,
            transition: 'color 0.2s',
        }),
        desc: {
            fontSize: 12,
            color: colors.textMuted,
        } as React.CSSProperties,
        infoBox: {
            backgroundColor: colors.secondaryDim,
            borderRadius: radius.lg,
            padding: 18,
            marginTop: 20,
            border: `1px solid ${colors.secondary}30`,
        } as React.CSSProperties,
        infoTitle: {
            fontSize: 13,
            fontWeight: '700',
            color: colors.secondary,
            marginBottom: 8,
        } as React.CSSProperties,
        infoText: {
            fontSize: 13,
            color: colors.textMuted,
            lineHeight: 1.6,
            marginBottom: 4,
        } as React.CSSProperties,
        toast: (success: boolean) => ({
            position: 'fixed' as const,
            bottom: 32,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: success ? colors.primary : colors.danger,
            color: success ? colors.bg : '#fff',
            fontWeight: '700',
            fontSize: 14,
            padding: '12px 24px',
            borderRadius: radius.full,
            zIndex: 9999,
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            whiteSpace: 'nowrap' as const,
        }),
    };

    if (loading) return (
        <div style={css.page}>
            <div style={css.center}>
                <Mv
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    style={{
                        width: 36, height: 36, borderRadius: '50%',
                        border: `3px solid ${colors.primaryDim}`,
                        borderTopColor: colors.primary,
                    }}
                />
                <span style={{ color: colors.textMuted, fontSize: 14 }}>Yükleniyor...</span>
            </div>
        </div>
    );

    if (!user) return (
        <div style={css.page}>
            <div style={css.center}>
                <span style={{ fontSize: 40 }}>🔒</span>
                <span style={{ ...css.heading, textAlign: 'center' }}>Giriş gerekli</span>
                <span style={{ ...css.subheading, textAlign: 'center', maxWidth: 280 }}>
                    Çeviri ayarlarını değiştirmek için önce hesabınıza giriş yapın.
                </span>
            </div>
        </div>
    );

    return (
        <div style={css.page}>
            <div style={css.scroll}>
                {/* Header */}
                <Mv
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ marginBottom: 24 }}
                >
                    <h2 style={{ ...css.heading, margin: 0, marginBottom: 6 }}>Çeviri Motoru</h2>
                    <p style={{ ...css.subheading, margin: 0 }}>
                        Kelime çevirisi için kullanılacak servisi seçin.
                        <br />Seçilen servis çalışmazsa diğerleri otomatik denenir.
                    </p>
                </Mv>

                {/* Provider list */}
                {PROVIDERS.map((p, i) => {
                    const selected = p.key === selectedProvider;
                    return (
                        <Mv
                            key={p.key}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.06 + i * 0.05, duration: 0.26 }}
                            whileHover={saving ? {} : { x: 4 }}
                            whileTap={saving ? {} : { scale: 0.98 }}
                            onClick={() => handleSelect(p.key)}
                            style={css.card(selected)}
                        >
                            <div style={css.cardLeft}>
                                {/* Radio */}
                                <div style={css.radio(selected)}>
                                    {selected && <div style={css.radioDot} />}
                                </div>
                                {/* Icon */}
                                <span style={css.icon}>{p.icon}</span>
                                {/* Labels */}
                                <div style={css.labelGroup}>
                                    <span style={css.label(selected)}>{p.label}</span>
                                    <span style={css.desc}>{p.description}</span>
                                </div>
                            </div>
                            {/* Saving spinner */}
                            {saving && selected && (
                                <ActivityIndicator size="small" color={colors.primary} />
                            )}
                        </Mv>
                    );
                })}

                {/* Info box */}
                <Mv
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    style={css.infoBox}
                >
                    <div style={css.infoTitle}>ℹ️ Yedekleme Sırası (Fallback)</div>
                    <div style={css.infoText}>
                        Google Free → MyMemory → Google → Yandex → LibreTranslate → Ollama
                    </div>
                    <div style={{ ...css.infoText, marginBottom: 0 }}>
                        Seçilen motor başarısız olursa, yukarıdaki sıraya göre otomatik olarak bir sonraki motor denenir.
                    </div>
                </Mv>
            </div>

            {/* Toast */}
            {toast && (
                <Mv
                    initial={{ opacity: 0, y: 20, x: '-50%' }}
                    animate={{ opacity: 1, y: 0, x: '-50%' }}
                    exit={{ opacity: 0, y: 20, x: '-50%' }}
                    style={css.toast(toast.success)}
                >
                    {toast.message}
                </Mv>
            )}
        </div>
    );
}
