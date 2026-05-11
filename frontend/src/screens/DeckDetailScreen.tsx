import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Animated, Pressable } from 'react-native';
import { apiClient } from '../api/client';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { confirmAction, showAlert } from '../utils/alert';
import { colors, radius, spacing, typography } from '../theme';
import { motion } from 'framer-motion';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'DeckDetail'>;
type RoutePropType = RouteProp<RootStackParamList, 'DeckDetail'>;
interface Card { id: number; front: string; back: string; context?: string; }
const Mv = motion.div as any;

const AnimatedCard = ({ item, onDelete }: { item: Card; onDelete: (card: Card) => void }) => {
    const anim = React.useRef(new Animated.Value(0)).current;
    const handleHoverIn = () => Animated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: false }).start();
    const handleHoverOut = () => Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: false }).start();

    return (
        <Mv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2, boxShadow: '0 6px 24px rgba(0,0,0,0.4)' }}
            transition={{ duration: 0.25 }}
            style={cs.card}>
            <Animated.View style={[StyleSheet.absoluteFill, {
                backgroundColor: 'rgba(255,90,95,0.12)',
                width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                right: 0, left: 'auto' as any,
            }]} />
            <View style={cs.cardContent}>
                <Text style={cs.front}>{item.front}</Text>
                <Text style={cs.back}>{item.back}</Text>
                {!!item.context && <Text style={cs.context}>{item.context}</Text>}
            </View>
            <Pressable style={cs.del} onPress={() => onDelete(item)}
                // @ts-ignore
                onHoverIn={handleHoverIn} onHoverOut={handleHoverOut}>
                <Text style={cs.delTxt}>✕</Text>
            </Pressable>
        </Mv>
    );
};

export default function DeckDetailScreen() {
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RoutePropType>();
    const { deckId, deckName } = route.params;
    const [cards, setCards] = useState<Card[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(useCallback(() => { fetchCards(); }, [deckId]));

    const fetchCards = async () => {
        setLoading(true);
        try { const resp = await apiClient.get(`/decks/${deckId}`); setCards(resp.data.cards ?? []); }
        catch { Alert.alert('Hata', 'Kelimeler yüklenemedi.'); } finally { setLoading(false); }
    };

    const deleteCard = (card: Card) => confirmAction('Kelimeyi Kaldır', `"${card.front}" desteden kaldırılsın mı?`, async () => {
        try { await apiClient.delete(`/cards/${card.id}`); setCards(prev => prev.filter(c => c.id !== card.id)); }
        catch { showAlert('Hata', 'Kelime kaldırılamadı.'); }
    }, 'Kaldır');

    return (
        <View style={s.container}>
            {/* Header */}
            <Mv initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={s.header}>
                <View style={s.headerTop}>
                    <View>
                        <Text style={s.deckTitle}>{deckName}</Text>
                        <Text style={s.deckCount}>{cards.length} kelime</Text>
                    </View>
                    <Mv whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <TouchableOpacity style={s.quizBtn} onPress={() => navigation.navigate('QuizMode', { deckId, deckName })}>
                            <Text style={s.quizBtnTxt}>▶ Quiz'e Başla</Text>
                        </TouchableOpacity>
                    </Mv>
                </View>
            </Mv>

            {loading ? (
                <View style={s.center}>
                    <Mv animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={s.spinner} />
                </View>
            ) : cards.length === 0 ? (
                <View style={s.empty}>
                    <Text style={{ fontSize: 56, marginBottom: 16 }}>📭</Text>
                    <Text style={s.emptyTitle}>Bu destede kelime yok</Text>
                    <Text style={s.emptySub}>Görsel ekranından kelime ekleyebilirsin.</Text>
                </View>
            ) : (
                <FlatList data={cards} keyExtractor={i => i.id.toString()}
                    renderItem={({ item }) => <AnimatedCard item={item} onDelete={deleteCard} />}
                    contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false} />
            )}
        </View>
    );
}

const cs = StyleSheet.create({
    card: { display: 'flex', flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: 12, overflow: 'hidden', border: `1px solid ${colors.border}`, cursor: 'default' } as any,
    cardContent: { flex: 1, padding: 16 },
    front: { ...typography.bodyBold, marginBottom: 4, fontSize: 17 } as any,
    back: { fontSize: 15, color: colors.primary, marginBottom: 4, fontWeight: '600' } as any,
    context: { ...typography.caption, fontStyle: 'italic' } as any,
    del: { alignSelf: 'stretch', justifyContent: 'center', paddingHorizontal: 20, zIndex: 1, display: 'flex', alignItems: 'center' } as any,
    delTxt: { color: colors.danger, fontWeight: 'bold', fontSize: 20 } as any,
});

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    spinner: { width: 36, height: 36, borderRadius: 18, border: `3px solid ${colors.primaryDim}`, borderTopColor: colors.primary } as any,
    header: { backgroundColor: colors.surface, padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border } as any,
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    deckTitle: { ...typography.h2, marginBottom: 4 },
    deckCount: { ...typography.caption, color: colors.textMuted },
    quizBtn: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 22, borderRadius: radius.full, boxShadow: `0 4px 16px ${colors.primary}40` } as any,
    quizBtnTxt: { color: colors.bg, fontWeight: '700', fontSize: 14 } as any,
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyTitle: { ...typography.h3, marginBottom: 8 },
    emptySub: { ...typography.body, color: colors.textMuted, textAlign: 'center' } as any,
});
