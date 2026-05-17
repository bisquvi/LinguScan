import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Platform, Animated } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { colors, radius, spacing, typography } from '../theme';
import { Trophy, ThumbsUp, Zap, Library, CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';
let motion: any = null;
let Mv: any = Animated.View;
if (Platform.OS === 'web') {
    motion = require('framer-motion').motion;
    Mv = motion.div;
}


const { width: SCREEN_W } = Dimensions.get('window');
const IS_MOBILE = SCREEN_W < 768;

type NavProp = NativeStackNavigationProp<RootStackParamList, 'QuizResult'>;
type RoutePropType = RouteProp<RootStackParamList, 'QuizResult'>;

const MotionView = Mv as any;

export default function QuizResultScreen() {
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RoutePropType>();
    const { result } = route.params;

    const accuracy: number = result.accuracy ?? 0;
    const isExcellent = accuracy >= 80;
    const isGood = accuracy >= 50;
    const rateColor = isExcellent ? colors.success : isGood ? colors.warning : colors.danger;
    const EmojiIcon = isExcellent ? Trophy : isGood ? ThumbsUp : Zap;
    const message = isExcellent ? 'Mükemmel! Harika iş çıkardın!' : isGood ? 'İyi gidiyor, devam et!' : 'Pes etme, pratik seni geliştirir!';

    return (
        <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
            {/* Hero */}
            <MotionView
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                style={s.hero}
            >
                <MotionView
                    animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
                    transition={{ duration: 0.7, delay: 0.3 }}
                    style={s.emojiWrapper}
                >
                    <EmojiIcon size={56} color={colors.textPrimary} />
                </MotionView>
                <Text style={s.heroTitle}>Quiz Tamamlandı!</Text>
                <Text style={s.heroMessage}>{message}</Text>
            </MotionView>

            {/* Accuracy circle */}
            <MotionView
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                style={{
                    backgroundColor: colors.surface,
                    borderRadius: radius.xl,
                    padding: spacing.xl,
                    alignItems: 'center',
                    marginBottom: spacing.lg,
                    border: `1.5px solid ${rateColor}40`,
                    boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
                }}
            >
                <Text style={s.accuracyLabel}>BAŞARI ORANI</Text>
                <MotionView
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.35 }}
                >
                    <Text style={[s.accuracyValue, { color: rateColor }]}>
                        %{accuracy.toFixed(1)}
                    </Text>
                </MotionView>
                {/* Mini bar */}
                <View style={s.miniTrack}>
                    <MotionView
                        initial={{ width: '0%' }}
                        animate={{ width: `${Math.min(accuracy, 100)}%` }}
                        transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
                        style={{
                            height: 8,
                            borderRadius: radius.full,
                            backgroundColor: rateColor,
                        }}
                    />
                </View>
            </MotionView>

            {/* Stats row */}
            <MotionView
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.35 }}
                style={s.statsRow}
            >
                {[
                    { label: 'Toplam', value: result.total_cards, color: colors.textSecondary, Icon: Library },
                    { label: 'Doğru', value: result.correct_answers, color: colors.success, Icon: CheckCircle },
                    { label: 'Yanlış', value: result.wrong_answers, color: colors.danger, Icon: XCircle },
                ].map((s2, i) => (
                    <MotionView
                        key={s2.label}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.08 }}
                        style={{
                            display: 'flex',
                            flex: 1,
                            alignItems: 'center',
                            backgroundColor: colors.surface,
                            borderRadius: radius.lg,
                            padding: 16,
                            border: `1.5px solid ${s2.color}25`,
                        }}
                    >
                        <s2.Icon size={24} color={s2.color} style={{ marginBottom: 4 }} />
                        <Text style={[statCard.value, { color: s2.color }]}>{s2.value}</Text>
                        <Text style={statCard.label}>{s2.label}</Text>
                    </MotionView>
                ))}
            </MotionView>

            {/* Hardest cards */}
            {result.hardest_cards?.length > 0 && (
                <MotionView
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    style={s.section}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <AlertCircle size={20} color={colors.danger} />
                        <Text style={[s.sectionTitle, { marginBottom: 0 }]}>En Zor Kartlar</Text>
                    </View>
                    {result.hardest_cards.map((c: any, i: number) => (
                        <MotionView
                            key={c.id}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 + i * 0.07 }}
                            style={{
                                display: 'flex',
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

            {/* Easiest cards */}
            {result.easiest_cards?.length > 0 && (
                <MotionView
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    style={s.section}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <CheckCircle size={20} color={colors.success} />
                        <Text style={[s.sectionTitle, { marginBottom: 0 }]}>En Kolay Kartlar</Text>
                    </View>
                    {result.easiest_cards.map((c: any, i: number) => (
                        <MotionView
                            key={c.id}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 + i * 0.07 }}
                            style={{
                                display: 'flex',
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

            {/* CTA */}
            <MotionView
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                style={{ marginTop: spacing.lg }}
            >
                <TouchableOpacity style={[s.btn, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]} onPress={() => navigation.navigate('Decks')}>
                    <Library size={20} color={colors.bg} />
                    <Text style={s.btnText}>Destelerime Dön</Text>
                </TouchableOpacity>
            </MotionView>
        </ScrollView>
    );
}

const statCard = StyleSheet.create({
    box: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: 16,
        border: '1.5px solid transparent',
    } as any,
    value: { fontSize: 26, fontWeight: '800', marginBottom: 2 } as any,
    label: { ...typography.caption },
});

const s = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: colors.bg,
        padding: spacing.lg,
        paddingBottom: 48,
    } as any,
    hero: {
        alignItems: 'center',
        marginBottom: spacing.lg,
        paddingTop: spacing.sm,
    } as any,
    emojiWrapper: { marginBottom: 12 } as any,
    heroEmoji: { fontSize: 56 },
    heroTitle: { ...typography.h1, textAlign: 'center', marginBottom: 8 } as any,
    heroMessage: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    } as any,
    accuracyCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.xl,
        alignItems: 'center',
        marginBottom: spacing.lg,
        border: '1.5px solid transparent',
        boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
    } as any,
    accuracyLabel: { ...typography.label, marginBottom: 8 },
    accuracyValue: {
        fontSize: IS_MOBILE ? 48 : 64,
        fontWeight: '800',
        marginBottom: 16,
    } as any,
    miniTrack: {
        width: '80%',
        height: 8,
        backgroundColor: colors.surfaceHigh,
        borderRadius: radius.full,
        overflow: 'hidden',
    },
    miniFill: {
        height: 8,
        borderRadius: radius.full,
    } as any,
    statsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: spacing.lg,
    } as any,
    section: { marginBottom: spacing.md } as any,
    sectionTitle: {
        ...typography.h3,
        marginBottom: 10,
    },
    wordRow: {
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: 14,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderLeftWidth: 3,
    } as any,
    wordFront: { ...typography.bodyBold, flex: 1 },
    wordBack: {
        ...typography.body,
        flex: 1,
        textAlign: 'right',
    } as any,
    btn: {
        backgroundColor: colors.primary,
        borderRadius: radius.lg,
        paddingVertical: 16,
        alignItems: 'center',
        boxShadow: `0 4px 20px ${colors.primary}40`,
    } as any,
    btnText: { color: colors.bg, fontWeight: '700', fontSize: 16 } as any,
});
