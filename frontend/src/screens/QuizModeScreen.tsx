import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { apiClient } from '../api/client';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'QuizMode'>;
type RoutePropType = RouteProp<RootStackParamList, 'QuizMode'>;

export default function QuizModeScreen() {
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RoutePropType>();
    const { deckId, deckName } = route.params;

    const startQuiz = async (quizType: 'recall' | 'multiple_choice') => {
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
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>{deckName}</Text>
            <Text style={styles.subtitle}>Quiz modunu seç</Text>

            <TouchableOpacity style={styles.card} onPress={() => startQuiz('recall')}>
                <Text style={styles.cardEmoji}>🧠</Text>
                <Text style={styles.cardTitle}>Recall Quiz</Text>
                <Text style={styles.cardDesc}>
                    Türkçe anlamı görürsün, İngilizce karşılığını hatırlamaya çalışırsın.
                    Cevabı kendin açar ve değerlendirirsin.
                </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.card} onPress={() => startQuiz('multiple_choice')}>
                <Text style={styles.cardEmoji}>🎯</Text>
                <Text style={styles.cardTitle}>Çoktan Seçmeli</Text>
                <Text style={styles.cardDesc}>
                    İngilizce kelimeyi görürsün, 4 Türkçe seçenek arasından doğrusunu seçersin.
                </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dashboardBtn} onPress={() => navigation.navigate('Dashboard')}>
                <Text style={styles.dashboardBtnText}>📊 İlerleme Paneli</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: '#121212', padding: 24, alignItems: 'center' },
    title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4, marginTop: 16 },
    subtitle: { fontSize: 14, color: '#b3b3b3', marginBottom: 32 },

    card: {
        backgroundColor: '#1e1e1e',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        alignItems: 'center',
    },
    cardEmoji: { fontSize: 42, marginBottom: 12 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
    cardDesc: { fontSize: 13, color: '#b3b3b3', textAlign: 'center', lineHeight: 20 },

    dashboardBtn: {
        marginTop: 12,
        paddingVertical: 12,
        paddingHorizontal: 28,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#1DB954',
    },
    dashboardBtnText: { color: '#1DB954', fontWeight: 'bold', fontSize: 15 },
});
