import React, { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { apiClient } from '../api/client';
import { colors, radius, spacing, typography } from '../theme';
import { BarChart2, Sparkles, Flame, RefreshCw, Star, AlertCircle, CheckCircle, Leaf } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Animated } from 'react-native';

let motion: any = null;
let Mv: any = Animated.View;
if (Platform.OS === 'web') {
    motion = require('framer-motion').motion;
    Mv = motion.div;
}

const { width: SCREEN_W } = Dimensions.get('window');
const IS_MOBILE = SCREEN_W < 768;

interface DashboardData {
    total_cards: number;
    new_cards: number;
    learning_cards: number;
    review_cards: number;
    mastered_cards: number;
    total_quizzes: number;
    overall_success_rate: number;
    most_difficult_cards: { id: number; front: string; back: string }[];
    best_known_cards: { id: number; front: string; back: string }[];
}

const MotionView = Mv as any;

export default function DashboardScreen() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchDashboard = async () => {
        setLoading(true);
        try {
            const resp = await apiClient.get('/dashboard');
            setData(resp.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchDashboard(); }, []));

    if (loading) return (
        <View style={s.loadingContainer}>
            <MotionView
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                style={{ width: 40, height: 40, borderRadius: 20, border: `3px solid ${colors.primaryDim}`, borderTopColor: colors.primary }}
            />
            <Text style={[typography.caption, { marginTop: 12 }]}>Yükleniyor...</Text>
        </View>
    );

    if (!data) return (
        <View style={s.container}>
            <Text style={{ ...typography.body, color: colors.textMuted, textAlign: 'center' }}>
                Veri yüklenemedi.
            </Text>
        </View>
    );

    const successRate = data.overall_success_rate ?? 0;
    const rateColor = successRate >= 70 ? colors.success : successRate >= 40 ? colors.warning : colors.danger;

    return (
        <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <MotionView
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                style={s.header}
            >
                <BarChart2 size={36} color={colors.primary} />
                <View>
                    <Text style={s.headerTitle}>İlerleme Paneli</Text>
                    <Text style={s.headerSub}>Öğrenme yolculuğuna bak</Text>
                </View>
            </MotionView>

            {/* XP / Success Rate Hero Card */}
            <MotionView
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                style={s.heroCard}
            >
                <Text style={s.heroLabel}>GENEL BAŞARI ORANI</Text>
                <Text style={[s.heroValue, { color: rateColor }]}>
                    %{successRate.toFixed(1)}
                </Text>
                {/* Animated progress bar */}
                <View style={s.progressTrack}>
                    <MotionView
                        initial={{ width: '0%' }}
                        animate={{ width: `${Math.min(successRate, 100)}%` }}
                        transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
                        style={{
                            height: 8,
                            borderRadius: radius.full,
                            backgroundColor: rateColor,
                        }}
                    />
                </View>
                <View style={s.heroStats}>
                    <View style={s.heroStatItem}>
                        <Text style={[s.heroStatValue, { color: colors.textPrimary }]}>{data.total_cards}</Text>
                        <Text style={s.heroStatLabel}>Toplam Kart</Text>
                    </View>
                    <View style={s.heroStatDivider} />
                    <View style={s.heroStatItem}>
                        <Text style={[s.heroStatValue, { color: colors.primary }]}>{data.total_quizzes}</Text>
                        <Text style={s.heroStatLabel}>Toplam Quiz</Text>
                    </View>
                </View>
            </MotionView>

            {/* Card Status Grid */}
            <Text style={s.sectionTitle}>Kart Durumları</Text>
            <View style={s.statusGrid}>
                {[
                    { label: 'Yeni', value: data.new_cards, color: colors.textMuted, Icon: Sparkles },
                    { label: 'Öğreniliyor', value: data.learning_cards, color: colors.warning, Icon: Flame },
                    { label: 'Tekrar', value: data.review_cards, color: colors.secondary, Icon: RefreshCw },
                    { label: 'Ustası', value: data.mastered_cards, color: colors.success, Icon: Star },
                ].map((item, i) => (
                    <MotionView
                        key={item.label}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.15 + i * 0.07 }}
                        whileHover={{ y: -3, boxShadow: `0 8px 24px rgba(0,0,0,0.4)` }}
                        style={{
                            flex: 1,
                            backgroundColor: colors.surface,
                            borderRadius: radius.lg,
                            padding: 12,
                            alignItems: 'center',
                            border: `1.5px solid ${item.color}30`,
                            cursor: 'default',
                        }}
                    >
                        <item.Icon size={24} color={item.color} style={{ marginBottom: 6 }} />
                        <Text style={[s.statusValue, { color: item.color }]}>{item.value}</Text>
                        <Text style={s.statusLabel}>{item.label}</Text>
                    </MotionView>
                ))}
            </View>

            {/* Difficult Cards */}
            {data.most_difficult_cards.length > 0 && (
                <MotionView
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.4 }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <AlertCircle size={20} color={colors.danger} />
                        <Text style={[s.sectionTitle, { marginBottom: 0, marginTop: 0 }]}>En Zor Kelimeler</Text>
                    </View>
                    {data.most_difficult_cards.map((c, i) => (
                        <MotionView
                            key={c.id}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + i * 0.07 }}
                            style={{
                                backgroundColor: colors.surface,
                                borderRadius: radius.md,
                                padding: 14,
                                marginBottom: 8,
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderLeft: `3px solid ${colors.danger}`,
                            }}
                        >
                            <Text style={s.wordFront}>{c.front}</Text>
                            <Text style={[s.wordBack, { color: colors.danger }]}>{c.back}</Text>
                        </MotionView>
                    ))}
                </MotionView>
            )}

            {/* Best Known Cards */}
            {data.best_known_cards.length > 0 && (
                <MotionView
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.5 }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <CheckCircle size={20} color={colors.success} />
                        <Text style={[s.sectionTitle, { marginBottom: 0, marginTop: 0 }]}>En İyi Bilinen Kelimeler</Text>
                    </View>
                    {data.best_known_cards.map((c, i) => (
                        <MotionView
                            key={c.id}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 + i * 0.07 }}
                            style={{
                                backgroundColor: colors.surface,
                                borderRadius: radius.md,
                                padding: 14,
                                marginBottom: 8,
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderLeft: `3px solid ${colors.success}`,
                            }}
                        >
                            <Text style={s.wordFront}>{c.front}</Text>
                            <Text style={[s.wordBack, { color: colors.success }]}>{c.back}</Text>
                        </MotionView>
                    ))}
                </MotionView>
            )}

            {data.total_cards === 0 && (
                <View style={s.emptyBox}>
                    <Leaf size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
                    <Text style={s.emptyTitle}>Henüz kart yok</Text>
                    <Text style={s.emptyText}>Quiz yaptıkça istatistikler burada görünür.</Text>
                </View>
            )}
        </ScrollView>
    );
}

const s = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: colors.bg,
        padding: spacing.lg,
        paddingBottom: 48,
    } as any,
    loadingContainer: {
        flex: 1,
        backgroundColor: colors.bg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: spacing.lg,
    } as any,
    headerEmoji: { fontSize: 36 },
    headerTitle: {
        ...typography.h2,
        marginBottom: 2,
    },
    headerSub: {
        ...typography.caption,
        color: colors.textMuted,
    },
    heroCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        border: `1px solid ${colors.border}`,
        boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
    } as any,
    heroLabel: {
        ...typography.label,
        marginBottom: 8,
    },
    heroValue: {
        fontSize: IS_MOBILE ? 40 : 52,
        fontWeight: '800',
        marginBottom: 16,
    } as any,
    progressTrack: {
        height: 8,
        backgroundColor: colors.surfaceHigh,
        borderRadius: radius.full,
        overflow: 'hidden',
        marginBottom: spacing.lg,
    },
    progressFill: {
        height: 8,
        borderRadius: radius.full,
    } as any,
    heroStats: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    heroStatItem: { flex: 1, alignItems: 'center' },
    heroStatValue: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 2,
    } as any,
    heroStatLabel: { ...typography.caption },
    heroStatDivider: {
        width: 1,
        height: 32,
        backgroundColor: colors.border,
        marginHorizontal: spacing.md,
    },
    sectionTitle: {
        ...typography.label,
        marginBottom: spacing.sm,
        marginTop: spacing.md,
    },
    statusGrid: {
        flexDirection: 'row',
        flexWrap: IS_MOBILE ? 'wrap' as const : 'nowrap' as const,
        gap: 10,
        marginBottom: spacing.md,
    } as any,
    statusCard: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: 12,
        alignItems: 'center',
        border: `1.5px solid transparent`,
        cursor: 'default',
    } as any,
    statusValue: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 2,
    } as any,
    statusLabel: { ...typography.caption, textAlign: 'center' },
    wordCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: 14,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderLeftWidth: 3,
        borderLeftColor: colors.success,
    } as any,
    wordFront: { ...typography.bodyBold, flex: 1 },
    wordBack: {
        ...typography.body,
        flex: 1,
        textAlign: 'right',
    } as any,
    emptyBox: {
        alignItems: 'center',
        marginTop: 48,
        paddingBottom: 32,
    },
    emptyTitle: { ...typography.h3, marginBottom: 8 },
    emptyText: {
        ...typography.body,
        color: colors.textMuted,
        textAlign: 'center',
    } as any,
});
