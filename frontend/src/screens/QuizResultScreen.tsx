import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'QuizResult'>;
type RoutePropType = RouteProp<RootStackParamList, 'QuizResult'>;

export default function QuizResultScreen() {
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RoutePropType>();
    const { result } = route.params;

    const accuracy: number = result.accuracy ?? 0;
    const accuracyColor = accuracy >= 75 ? '#1DB954' : accuracy >= 50 ? '#fd7e14' : '#dc3545';

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Quiz Tamamlandı! 🎉</Text>

            {/* Main stats */}
            <View style={styles.statsRow}>
                <StatBox label="Toplam" value={result.total_cards} color="#888" />
                <StatBox label="Doğru" value={result.correct_answers} color="#1DB954" />
                <StatBox label="Yanlış" value={result.wrong_answers} color="#dc3545" />
            </View>

            <View style={styles.accuracyBox}>
                <Text style={styles.accuracyLabel}>Başarı Oranı</Text>
                <Text style={[styles.accuracyValue, { color: accuracyColor }]}>
                    %{accuracy.toFixed(1)}
                </Text>
            </View>

            {/* Hardest cards */}
            {result.hardest_cards?.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🔴 En Zor Kartlar</Text>
                    {result.hardest_cards.map((c: any) => (
                        <CardRow key={c.id} front={c.front} back={c.back} />
                    ))}
                </View>
            )}

            {/* Easiest cards */}
            {result.easiest_cards?.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🟢 En Kolay Kartlar</Text>
                    {result.easiest_cards.map((c: any) => (
                        <CardRow key={c.id} front={c.front} back={c.back} />
                    ))}
                </View>
            )}

            <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Decks')}>
                <Text style={styles.btnText}>Destelerime Dön</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <View style={sbStyles.box}>
            <Text style={[sbStyles.value, { color }]}>{value}</Text>
            <Text style={sbStyles.label}>{label}</Text>
        </View>
    );
}

function CardRow({ front, back }: { front: string; back: string }) {
    return (
        <View style={crStyles.row}>
            <Text style={crStyles.front}>{front}</Text>
            <Text style={crStyles.back}>{back}</Text>
        </View>
    );
}

const sbStyles = StyleSheet.create({
    box: { flex: 1, alignItems: 'center', backgroundColor: '#1e1e1e', borderRadius: 12, padding: 16, marginHorizontal: 4 },
    value: { fontSize: 28, fontWeight: 'bold' },
    label: { fontSize: 12, color: '#b3b3b3', marginTop: 4 },
});

const crStyles = StyleSheet.create({
    row: { backgroundColor: '#1e1e1e', borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' },
    front: { color: '#fff', fontWeight: 'bold', flex: 1 },
    back: { color: '#1DB954', flex: 1, textAlign: 'right' },
});

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: '#121212', padding: 24 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 24 },
    statsRow: { flexDirection: 'row', marginBottom: 16 },
    accuracyBox: {
        backgroundColor: '#1e1e1e', borderRadius: 16, padding: 24,
        alignItems: 'center', marginBottom: 24,
    },
    accuracyLabel: { fontSize: 14, color: '#b3b3b3', marginBottom: 8 },
    accuracyValue: { fontSize: 48, fontWeight: 'bold' },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
    btn: {
        backgroundColor: '#1DB954', borderRadius: 12,
        paddingVertical: 14, alignItems: 'center', marginTop: 8,
    },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
