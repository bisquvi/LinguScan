import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { apiClient } from '../api/client';

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

    if (loading) return <ActivityIndicator size="large" color="#1DB954" style={{ marginTop: 60 }} />;
    if (!data) return <View style={s.container}><Text style={s.noData}>Veri yüklenemedi.</Text></View>;

    return (
        <ScrollView contentContainerStyle={s.container}>
            <Text style={s.title}>📊 İlerleme Paneli</Text>

            {/* Card level breakdown */}
            <Text style={s.sectionTitle}>Kart Durumları</Text>
            <View style={s.row}>
                <LevelBox label="Yeni" value={data.new_cards} color="#888" />
                <LevelBox label="Öğreniliyor" value={data.learning_cards} color="#fd7e14" />
                <LevelBox label="Tekrar" value={data.review_cards} color="#007bff" />
                <LevelBox label="Ustası" value={data.mastered_cards} color="#1DB954" />
            </View>

            {/* Summary stats */}
            <Text style={s.sectionTitle}>Genel İstatistikler</Text>
            <View style={s.statsCard}>
                <StatRow label="Toplam Kart" value={data.total_cards.toString()} />
                <StatRow label="Toplam Quiz" value={data.total_quizzes.toString()} />
                <StatRow
                    label="Genel Başarı"
                    value={`%${data.overall_success_rate.toFixed(1)}`}
                    valueColor={data.overall_success_rate >= 70 ? '#1DB954' : '#fd7e14'}
                />
            </View>

            {/* Difficult cards */}
            {data.most_difficult_cards.length > 0 && (
                <>
                    <Text style={s.sectionTitle}>🔴 En Zor Kelimeler</Text>
                    {data.most_difficult_cards.map(c => (
                        <View key={c.id} style={s.cardRow}>
                            <Text style={s.cardFront}>{c.front}</Text>
                            <Text style={s.cardBack}>{c.back}</Text>
                        </View>
                    ))}
                </>
            )}

            {/* Best known cards */}
            {data.best_known_cards.length > 0 && (
                <>
                    <Text style={s.sectionTitle}>🟢 En İyi Bilinen Kelimeler</Text>
                    {data.best_known_cards.map(c => (
                        <View key={c.id} style={s.cardRow}>
                            <Text style={s.cardFront}>{c.front}</Text>
                            <Text style={s.cardBack}>{c.back}</Text>
                        </View>
                    ))}
                </>
            )}

            {data.total_cards === 0 && (
                <View style={s.emptyBox}>
                    <Text style={s.emptyText}>Henüz kart eklenmemiş.</Text>
                    <Text style={s.emptySubText}>Quiz yaptıkça istatistikler burada görünür.</Text>
                </View>
            )}
        </ScrollView>
    );
}

function LevelBox({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <View style={lb.box}>
            <Text style={[lb.value, { color }]}>{value}</Text>
            <Text style={lb.label}>{label}</Text>
        </View>
    );
}

function StatRow({ label, value, valueColor = '#fff' }: { label: string; value: string; valueColor?: string }) {
    return (
        <View style={sr.row}>
            <Text style={sr.label}>{label}</Text>
            <Text style={[sr.value, { color: valueColor }]}>{value}</Text>
        </View>
    );
}

const lb = StyleSheet.create({
    box: { flex: 1, alignItems: 'center', backgroundColor: '#1e1e1e', borderRadius: 12, padding: 12, marginHorizontal: 3 },
    value: { fontSize: 22, fontWeight: 'bold' },
    label: { fontSize: 11, color: '#b3b3b3', marginTop: 4, textAlign: 'center' },
});

const sr = StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
    label: { fontSize: 15, color: '#b3b3b3' },
    value: { fontSize: 15, fontWeight: 'bold' },
});

const s = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: '#121212', padding: 20 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 24, textAlign: 'center' },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#b3b3b3', marginTop: 20, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
    row: { flexDirection: 'row' },
    statsCard: { backgroundColor: '#1e1e1e', borderRadius: 12, padding: 16 },
    cardRow: { backgroundColor: '#1e1e1e', borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' },
    cardFront: { color: '#fff', fontWeight: 'bold', flex: 1 },
    cardBack: { color: '#1DB954', flex: 1, textAlign: 'right' },
    noData: { color: '#888', textAlign: 'center', marginTop: 60 },
    emptyBox: { alignItems: 'center', marginTop: 40 },
    emptyText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    emptySubText: { color: '#b3b3b3', marginTop: 8, textAlign: 'center' },
});
