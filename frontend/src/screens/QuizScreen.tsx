import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { apiClient } from '../api/client';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Quiz'>;
type RoutePropType = RouteProp<RootStackParamList, 'Quiz'>;

const RATINGS = [
    { label: 'Tekrar', value: 'again', color: '#dc3545' },
    { label: 'Zor', value: 'mid', color: '#fd7e14' },
    { label: 'İyi', value: 'good', color: '#28a745' },
    { label: 'Kolay', value: 'easy', color: '#007bff' },
];

export default function QuizScreen() {
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RoutePropType>();
    const { sessionId, quizType, cards } = route.params;

    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [answered, setAnswered] = useState(false);
    const [loading, setLoading] = useState(false);

    const currentCard = cards[currentIndex];

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

        if (currentIndex + 1 < cards.length) {
            setCurrentIndex(currentIndex + 1);
        } else {
            // finish session
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
        // Wait 1.5s so the user can see the correct/wrong feedback colors
        await new Promise(resolve => setTimeout(resolve, 1500));
        await submitReview(rating, isCorrect);
    };

    if (!currentCard) return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;

    const progress = `${currentIndex + 1} / ${cards.length}`;

    // ── Recall mode ──────────────────────────────────────────────────────────
    if (quizType === 'recall') {
        return (
            <View style={styles.container}>
                <Text style={styles.progress}>{progress}</Text>
                <ProgressBar current={currentIndex + 1} total={cards.length} />

                <View style={styles.flashcard}>
                    <Text style={styles.modeLabel}>İngilizce → Türkçe</Text>
                    <Text style={styles.frontText}>{currentCard.prompt}</Text>

                    {showAnswer && (
                        <View style={styles.answerBox}>
                            <View style={styles.divider} />
                            <Text style={styles.answerText}>{currentCard.answer}</Text>
                        </View>
                    )}
                </View>

                {!showAnswer ? (
                    <TouchableOpacity style={styles.showBtn} onPress={() => setShowAnswer(true)}>
                        <Text style={styles.showBtnText}>Cevabı Göster</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.ratingContainer}>
                        <Text style={styles.ratingLabel}>Ne kadar iyi bildin?</Text>
                        <View style={styles.ratingButtons}>
                            {RATINGS.map(r => (
                                <TouchableOpacity
                                    key={r.value}
                                    style={[styles.rateBtn, { backgroundColor: r.color }]}
                                    onPress={() => submitReview(r.value, r.value !== 'again')}
                                    disabled={loading}
                                >
                                    <Text style={styles.rateBtnText}>{r.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
                {loading && <ActivityIndicator style={{ marginTop: 12 }} color="#1DB954" />}
            </View>
        );
    }

    // ── Multiple choice mode ─────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            <Text style={styles.progress}>{progress}</Text>
            <ProgressBar current={currentIndex + 1} total={cards.length} />

            <View style={styles.flashcard}>
                <Text style={styles.modeLabel}>İngilizce → Türkçe</Text>
                <Text style={styles.frontText}>{currentCard.question}</Text>
            </View>

            <View style={styles.optionsContainer}>
                {currentCard.options.map((option: string, index: number) => {
                    let btnStyle = styles.optionBtn;
                    if (answered) {
                        if (index === currentCard.correct_index) {
                            btnStyle = { ...styles.optionBtn, ...styles.optionCorrect } as any;
                        } else if (index === selectedOption) {
                            btnStyle = { ...styles.optionBtn, ...styles.optionWrong } as any;
                        }
                    }
                    return (
                        <TouchableOpacity
                            key={index}
                            style={btnStyle}
                            onPress={() => handleOptionSelect(index)}
                            disabled={answered}
                        >
                            <Text style={styles.optionText}>
                                {String.fromCharCode(65 + index)}. {option}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {answered && (
                <TouchableOpacity style={styles.nextBtn} onPress={moveNext} disabled={loading}>
                    <Text style={styles.nextBtnText}>
                        {currentIndex + 1 < cards.length ? 'Sonraki →' : 'Bitir'}
                    </Text>
                </TouchableOpacity>
            )}
            {loading && <ActivityIndicator style={{ marginTop: 12 }} color="#1DB954" />}
        </View>
    );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
    const pct = (current / total) * 100;
    return (
        <View style={pbStyles.container}>
            <View style={[pbStyles.fill, { width: `${pct}%` as any }]} />
        </View>
    );
}

const pbStyles = StyleSheet.create({
    container: { width: '100%', height: 6, backgroundColor: '#2a2a2a', borderRadius: 3, marginBottom: 20 },
    fill: { height: 6, backgroundColor: '#1DB954', borderRadius: 3 },
});

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#121212', alignItems: 'center' },
    progress: { fontSize: 14, color: '#b3b3b3', marginBottom: 8, alignSelf: 'flex-end' },
    modeLabel: { fontSize: 12, color: '#888', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },

    flashcard: {
        backgroundColor: '#1e1e1e',
        width: '100%',
        minHeight: 180,
        padding: 28,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    frontText: { fontSize: 26, fontWeight: 'bold', color: '#fff', textAlign: 'center' },

    answerBox: { width: '100%', alignItems: 'center', marginTop: 16 },
    divider: { width: '70%', height: 1, backgroundColor: '#333', marginVertical: 16 },
    answerText: { fontSize: 22, color: '#1DB954', fontWeight: 'bold', textAlign: 'center' },

    showBtn: {
        backgroundColor: '#1DB954',
        paddingVertical: 14,
        width: '100%',
        borderRadius: 12,
        marginTop: 24,
        alignItems: 'center',
    },
    showBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },

    ratingContainer: { width: '100%', marginTop: 20, alignItems: 'center' },
    ratingLabel: { fontSize: 14, color: '#b3b3b3', marginBottom: 12 },
    ratingButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 8 },
    rateBtn: { paddingVertical: 14, borderRadius: 10, flex: 1, alignItems: 'center' },
    rateBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

    optionsContainer: { width: '100%', marginTop: 16, gap: 10 },
    optionBtn: {
        backgroundColor: '#1e1e1e',
        borderWidth: 1,
        borderColor: '#2a2a2a',
        borderRadius: 12,
        padding: 16,
    },
    optionCorrect: { backgroundColor: '#1a3a24', borderColor: '#1DB954' },
    optionWrong: { backgroundColor: '#3a1a1a', borderColor: '#dc3545' },
    optionText: { color: '#fff', fontSize: 16 },

    nextBtn: {
        backgroundColor: '#1DB954',
        paddingVertical: 14,
        width: '100%',
        borderRadius: 12,
        marginTop: 16,
        alignItems: 'center',
    },
    nextBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
