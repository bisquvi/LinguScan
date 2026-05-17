import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Dimensions, Platform, Animated } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { apiClient } from '../api/client';
import { colors, radius, spacing, typography } from '../theme';
import { Brain, Target, Library, BarChart2 } from 'lucide-react-native';
let motion: any = null;
let Mv: any = Animated.View;
if (Platform.OS === 'web') {
    motion = require('framer-motion').motion;
    Mv = motion.div;
}


const { width: SCREEN_W } = Dimensions.get('window');
const IS_MOBILE = SCREEN_W < 768;

type NavProp = NativeStackNavigationProp<RootStackParamList, 'QuizMode'>;
type RoutePropType = RouteProp<RootStackParamList, 'QuizMode'>;



const QUIZ_MODES = [
    {
        type: 'recall' as const,
        Icon: Brain,
        title: 'Recall Quiz',
        desc: 'Türkçe anlamı görürsün, İngilizce karşılığını hatırlamaya çalışırsın. Cevabı kendin açar ve değerlendirirsin.',
        color: colors.secondary,
        badge: 'Aktif Tekrar',
    },
    {
        type: 'multiple_choice' as const,
        Icon: Target,
        title: 'Çoktan Seçmeli',
        desc: 'İngilizce kelimeyi görürsün, 4 Türkçe seçenek arasından doğrusunu seçersin.',
        color: colors.primary,
        badge: 'Hızlı Öğren',
    },
];

export default function QuizModeScreen() {
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RoutePropType>();
    const { deckId, deckName } = route.params;
    const [loading, setLoading] = useState<string | null>(null);

    const startQuiz = async (quizType: 'recall' | 'multiple_choice') => {
        if (loading) return;
        setLoading(quizType);
        try {
            const resp = await apiClient.post('/quiz/session/start', {
                deck_id: deckId,
                quiz_type: quizType,
            });
            const { session_id, cards } = resp.data;
            navigation.navigate('Quiz', {
                deckId,
                sessionId: session_id,
                quizType,
                cards,
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(null);
        }
    };

    return (
        <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <Mv
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    marginBottom: spacing.xl,
                    marginTop: spacing.sm,
                }}
            >
                <View style={[s.deckBadge, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                    <Library size={16} color={colors.primary} />
                    <Text style={s.deckBadgeText}>{deckName}</Text>
                </View>
                <Text style={s.title}>Quiz Modu Seç</Text>
                <Text style={s.subtitle}>Sana en uygun öğrenme modunu seç</Text>
            </Mv>

            {/* Mode Cards — pure inline CSS on Mv to avoid RN StyleSheet crash */}
            <View style={s.modesContainer}>
                {QUIZ_MODES.map((mode, i) => {
                    const isLoading = loading === mode.type;
                    return (
                        <Mv
                            key={mode.type}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, delay: 0.1 + i * 0.1 }}
                            whileHover={loading ? {} : { y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}
                            whileTap={loading ? {} : { scale: 0.98 }}
                            onClick={() => startQuiz(mode.type)}
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'flex-start',
                                gap: 16,
                                backgroundColor: colors.surface,
                                borderRadius: radius.xl,
                                padding: spacing.lg,
                                border: `1.5px solid ${mode.color}40`,
                                cursor: loading ? 'default' : 'pointer',
                                boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                                marginBottom: 16,
                                userSelect: 'none',
                            }}
                        >
                            {/* Icon */}
                            <div style={{
                                width: IS_MOBILE ? 56 : 72, height: IS_MOBILE ? 56 : 72,
                                borderRadius: radius.lg,
                                backgroundColor: mode.color + '18',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <mode.Icon size={IS_MOBILE ? 28 : 36} color={mode.color} />
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1 }}>
                                {/* Title row */}
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 10,
                                    marginBottom: 8,
                                    flexWrap: 'wrap',
                                }}>
                                    <span style={{
                                        fontSize: 17,
                                        fontWeight: '700',
                                        color: colors.textPrimary,
                                    }}>
                                        {mode.title}
                                    </span>
                                    <span style={{
                                        backgroundColor: mode.color + '20',
                                        borderRadius: radius.full,
                                        padding: '3px 10px',
                                        fontSize: 11,
                                        fontWeight: '700',
                                        color: mode.color,
                                        letterSpacing: 0.5,
                                    }}>
                                        {mode.badge}
                                    </span>
                                </div>

                                {/* Description */}
                                <p style={{
                                    margin: 0,
                                    marginBottom: 14,
                                    fontSize: 14,
                                    color: colors.textMuted,
                                    lineHeight: 1.55,
                                }}>
                                    {mode.desc}
                                </p>

                                {/* Start chip */}
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    backgroundColor: mode.color,
                                    borderRadius: radius.full,
                                    padding: '8px 20px',
                                }}>
                                    {isLoading
                                        ? <ActivityIndicator size="small" color={colors.bg} />
                                        : <span style={{ color: colors.bg, fontWeight: '700', fontSize: 14 }}>Başla →</span>
                                    }
                                </div>
                            </div>
                        </Mv>
                    );
                })}
            </View>

            {/* Dashboard CTA */}
            <Mv
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                style={{ display: 'flex', justifyContent: 'center' }}
            >
                <TouchableOpacity
                    style={[s.dashBtn, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                    onPress={() => navigation.navigate('Dashboard')}
                >
                    <BarChart2 size={18} color={colors.textSecondary} />
                    <Text style={s.dashBtnText}>İlerleme Paneli</Text>
                </TouchableOpacity>
            </Mv>
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
    deckBadge: {
        backgroundColor: colors.primaryDim,
        borderRadius: radius.full,
        paddingVertical: 6,
        paddingHorizontal: 16,
        marginBottom: 14,
    },
    deckBadgeText: {
        ...typography.caption,
        color: colors.primary,
        fontWeight: '700',
    } as any,
    title: { ...typography.h1, textAlign: 'center', marginBottom: 6 },
    subtitle: {
        ...typography.body,
        color: colors.textMuted,
        textAlign: 'center',
    } as any,
    modesContainer: { marginBottom: spacing.lg },
    dashBtn: {
        paddingVertical: 12,
        paddingHorizontal: 28,
        borderRadius: radius.full,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        alignSelf: 'center',
    },
    dashBtnText: {
        ...typography.bodyBold,
        color: colors.textSecondary,
    } as any,
});
