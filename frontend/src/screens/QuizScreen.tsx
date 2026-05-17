import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, Dimensions, ScrollView, Platform, Animated
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { apiClient } from '../api/client';
import { colors, radius, spacing, typography } from '../theme';
import { AnimatePresence } from 'framer-motion';

let motion: any = null;
let Mv: any = Animated.View;
if (Platform.OS === 'web') {
    motion = require('framer-motion').motion;
    Mv = motion.div;
}


const { width: SCREEN_W } = Dimensions.get('window');
const IS_MOBILE = SCREEN_W < 768;

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Quiz'>;
type RoutePropType = RouteProp<RootStackParamList, 'Quiz'>;

const MotionView = Mv as any;
const MotionButton = (Platform.OS==='web' ? motion.button : Animated.View) as any;

const RATINGS = [
    { label: 'Tekrar', value: 'again', color: colors.danger },
    { label: 'Zor', value: 'mid', color: colors.warning },
    { label: 'İyi', value: 'good', color: colors.success },
    { label: 'Kolay', value: 'easy', color: colors.secondary },
];

export default function QuizScreen() {
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RoutePropType>();
    const { sessionId, quizType, cards } = route.params;

    const [shuffledCards] = useState(() => {
        const arr = [...cards];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    });

    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [answered, setAnswered] = useState(false);
    const [loading, setLoading] = useState(false);
    const [cardKey, setCardKey] = useState(0);

    const currentCard = shuffledCards[currentIndex];
    const progress = (currentIndex + 1) / shuffledCards.length;

    const submitReview = async (rating: string, isCorrect: boolean) => {
        setLoading(true);
        try {
            await apiClient.post(`/quiz/session/${sessionId}/review/${currentCard.card_id}`, {
                rating,
                is_correct: isCorrect,
            });
            moveNext();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const moveNext = async () => {
        setShowAnswer(false);
        setSelectedOption(null);
        setAnswered(false);

        if (currentIndex + 1 < shuffledCards.length) {
            setCurrentIndex(currentIndex + 1);
            setCardKey(k => k + 1);
        } else {
            try {
                const resp = await apiClient.post(`/quiz/session/${sessionId}/finish`);
                navigation.replace('QuizResult', { result: resp.data });
            } catch (e) {
                Alert.alert('Hata', 'Oturum tamamlanamadı.');
                navigation.goBack();
            }
        }
    };

    const handleOptionSelect = async (index: number) => {
        if (answered) return;
        setSelectedOption(index);
        setAnswered(true);
        const isCorrect = index === currentCard.correct_index;
        const rating = isCorrect ? 'good' : 'again';
        await new Promise(resolve => setTimeout(resolve, 1500));
        await submitReview(rating, isCorrect);
    };

    if (!currentCard) return <ActivityIndicator size="large" style={{ marginTop: 50 }} color={colors.primary} />;

    // ── Recall mode ──────────────────────────────────────────────────────────
    if (quizType === 'recall') {
        return (
            <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
                {/* Progress */}
                <MotionView style={s.progressHeader}>
                    <View style={s.progressTrack}>
                        <MotionView
                            animate={{ width: `${progress * 100}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            style={s.progressFill}
                        />
                    </View>
                    <Text style={s.progressText}>{currentIndex + 1} / {shuffledCards.length}</Text>
                </MotionView>

                {/* Flashcard */}
                <AnimatePresence mode="wait">
                    <MotionView
                        key={cardKey}
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        transition={{ duration: 0.28 }}
                        style={s.flashcard}
                    >
                        <Text style={s.modeLabel}>İngilizce → Türkçe</Text>
                        <Text style={s.frontText}>{currentCard.prompt}</Text>

                        <AnimatePresence>
                            {showAnswer && (
                                <MotionView
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.25 }}
                                    style={s.answerBox}
                                >
                                    <View style={s.divider} />
                                    <Text style={s.answerText}>{currentCard.answer}</Text>
                                </MotionView>
                            )}
                        </AnimatePresence>
                    </MotionView>
                </AnimatePresence>

                {!showAnswer ? (
                    <MotionView
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        style={s.showBtnWrapper}
                    >
                        <TouchableOpacity style={s.showBtn} onPress={() => setShowAnswer(true)}>
                            <Text style={s.showBtnText}>👁 Cevabı Göster</Text>
                        </TouchableOpacity>
                    </MotionView>
                ) : (
                    <MotionView
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        style={s.ratingContainer}
                    >
                        <Text style={s.ratingLabel}>Ne kadar iyi bildin?</Text>
                        <View style={s.ratingButtons}>
                            {RATINGS.map(r => (
                                <MotionButton
                                    key={r.value}
                                    whileHover={{ y: -2, boxShadow: `0 6px 20px ${r.color}40` }}
                                    whileTap={{ scale: 0.95 }}
                                    style={{
                                        display: 'flex',
                                        flex: IS_MOBILE ? undefined : 1,
                                        width: IS_MOBILE ? '48%' : undefined,
                                        padding: IS_MOBILE ? '10px 0' : '14px 0',
                                        borderRadius: radius.md,
                                        border: `1.5px solid ${r.color}60`,
                                        backgroundColor: r.color + '20',
                                        color: r.color,
                                        fontWeight: '700',
                                        fontSize: IS_MOBILE ? 12 : 13,
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                    onClick={() => !loading && submitReview(r.value, r.value !== 'again')}
                                    disabled={loading}
                                >
                                    {r.label}
                                </MotionButton>
                            ))}
                        </View>
                    </MotionView>
                )}
                {loading && <ActivityIndicator style={{ marginTop: 12 }} color={colors.primary} />}
            </ScrollView>
        );
    }

    // ── Multiple choice mode ─────────────────────────────────────────────────
    return (
        <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
            {/* Progress */}
            <MotionView style={s.progressHeader}>
                <View style={s.progressTrack}>
                    <MotionView
                        animate={{ width: `${progress * 100}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        style={s.progressFill}
                    />
                </View>
                <Text style={s.progressText}>{currentIndex + 1} / {shuffledCards.length}</Text>
            </MotionView>

            {/* Question */}
            <AnimatePresence mode="wait">
                <MotionView
                    key={cardKey}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.28 }}
                    style={s.flashcard}
                >
                    <Text style={s.modeLabel}>İngilizce → Türkçe</Text>
                    <Text style={s.frontText}>{currentCard.question}</Text>
                </MotionView>
            </AnimatePresence>

            {/* Options */}
            <View style={s.optionsContainer}>
                {currentCard.options.map((option: string, index: number) => {
                    let bg = colors.surface;
                    let borderC = colors.border;
                    let textC = colors.textPrimary;

                    if (answered) {
                        if (index === currentCard.correct_index) {
                            bg = colors.successDim;
                            borderC = colors.success;
                            textC = colors.success;
                        } else if (index === selectedOption) {
                            bg = colors.dangerDim;
                            borderC = colors.danger;
                            textC = colors.danger;
                        }
                    }

                    return (
                        <MotionView
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + index * 0.06 }}
                            whileHover={!answered ? { scale: 1.01, x: 4 } : {}}
                            whileTap={!answered ? { scale: 0.98 } : {}}
                            style={{
                                borderRadius: radius.md,
                                padding: IS_MOBILE ? 14 : 16,
                                border: `1.5px solid ${borderC}`,
                                backgroundColor: bg,
                                cursor: answered ? 'default' : 'pointer',
                                marginBottom: 2,
                            }}
                            onClick={() => !answered && handleOptionSelect(index)}
                        >
                            <View style={s.optionContent}>
                                <View style={[s.optionLetter, { backgroundColor: borderC + '30', borderColor: borderC }]}>
                                    <Text style={[s.optionLetterText, { color: textC }]}>
                                        {String.fromCharCode(65 + index)}
                                    </Text>
                                </View>
                                <Text style={[s.optionText, { color: textC, fontSize: IS_MOBILE ? 14 : 15 }]}>{option}</Text>
                            </View>
                        </MotionView>
                    );
                })}
            </View>

            <AnimatePresence>
                {answered && (
                    <MotionView
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.25 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        style={{ marginTop: 16 }}
                    >
                        <TouchableOpacity style={s.nextBtn} onPress={moveNext} disabled={loading}>
                            <Text style={s.nextBtnText}>
                                {currentIndex + 1 < shuffledCards.length ? 'Sonraki →' : '🎉 Bitir'}
                            </Text>
                        </TouchableOpacity>
                    </MotionView>
                )}
            </AnimatePresence>

            {loading && <ActivityIndicator style={{ marginTop: 12 }} color={colors.primary} />}
        </ScrollView>
    );
}

const s = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: IS_MOBILE ? spacing.md : spacing.lg,
        backgroundColor: colors.bg,
        paddingBottom: 32,
    } as any,
    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: IS_MOBILE ? spacing.md : spacing.lg,
    } as any,
    progressTrack: {
        flex: 1,
        height: 8,
        backgroundColor: colors.surfaceHigh,
        borderRadius: radius.full,
        overflow: 'hidden',
    },
    progressFill: {
        height: 8,
        backgroundColor: colors.primary,
        borderRadius: radius.full,
        background: `linear-gradient(90deg, ${colors.primary}, ${colors.primaryHover})`,
    } as any,
    progressText: {
        ...typography.caption,
        color: colors.textMuted,
        minWidth: 48,
        textAlign: 'right',
    } as any,
    modeLabel: {
        ...typography.label,
        marginBottom: 20,
        textAlign: 'center',
    } as any,
    flashcard: {
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: IS_MOBILE ? spacing.lg : spacing.xl,
        alignItems: 'center',
        marginBottom: IS_MOBILE ? spacing.md : spacing.lg,
        border: `1.5px solid ${colors.border}`,
        boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
        minHeight: IS_MOBILE ? 140 : 180,
        justifyContent: 'center',
    } as any,
    frontText: {
        fontSize: IS_MOBILE ? 22 : 28,
        fontWeight: '800',
        color: colors.textPrimary,
        textAlign: 'center',
        lineHeight: IS_MOBILE ? 30 : 38,
    } as any,
    answerBox: { width: '100%', alignItems: 'center', marginTop: 16 } as any,
    divider: {
        width: '60%',
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 16,
    },
    answerText: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.success,
        textAlign: 'center',
    } as any,
    showBtnWrapper: { width: '100%' } as any,
    showBtn: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        width: '100%',
        borderRadius: radius.lg,
        alignItems: 'center',
        boxShadow: `0 4px 20px ${colors.primary}40`,
    } as any,
    showBtnText: { color: colors.bg, fontSize: 16, fontWeight: '700' } as any,
    ratingContainer: {
        width: '100%',
        alignItems: 'center',
    } as any,
    ratingLabel: {
        ...typography.caption,
        color: colors.textMuted,
        marginBottom: 12,
    },
    ratingButtons: {
        flexDirection: 'row',
        width: '100%',
        gap: IS_MOBILE ? 6 : 8,
        flexWrap: IS_MOBILE ? 'wrap' as const : 'nowrap' as const,
    } as any,
    rateBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: radius.md,
        border: '1.5px solid transparent',
        fontWeight: '700',
        fontSize: 13,
        cursor: 'pointer',
        fontFamily: 'inherit',
    } as any,
    optionsContainer: {
        width: '100%',
        gap: 10,
        marginBottom: spacing.sm,
    } as any,
    optionBtn: {
        borderRadius: radius.md,
        padding: 16,
        border: `1.5px solid ${colors.border}`,
        cursor: 'pointer',
    } as any,
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    } as any,
    optionLetter: {
        width: 32,
        height: 32,
        borderRadius: radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
        border: '1.5px solid transparent',
        flexShrink: 0,
    } as any,
    optionLetterText: {
        fontSize: 13,
        fontWeight: '700',
    } as any,
    optionText: {
        fontSize: 15,
        fontWeight: '500',
        flex: 1,
    } as any,
    nextBtn: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        width: '100%',
        borderRadius: radius.lg,
        alignItems: 'center',
        boxShadow: `0 4px 20px ${colors.primary}40`,
    } as any,
    nextBtnText: { color: colors.bg, fontSize: 16, fontWeight: '700' } as any,
});
