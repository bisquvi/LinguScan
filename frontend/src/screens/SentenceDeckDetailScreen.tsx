import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Animated, Pressable, Platform } from 'react-native';
import { apiClient } from '../api/client';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { confirmAction, showAlert } from '../utils/alert';
import { colors, radius, spacing, typography } from '../theme';
import { Inbox, X } from 'lucide-react-native';
let motion: any = null;
let Mv: any = Animated.View;
if (Platform.OS === 'web') {
    motion = require('framer-motion').motion;
    Mv = motion.div;
}


type NavProp = NativeStackNavigationProp<RootStackParamList, 'SentenceDeckDetail'>;
type RoutePropType = RouteProp<RootStackParamList, 'SentenceDeckDetail'>;
interface SentenceCard { id: number; front: string; back: string; }


const AnimatedSentenceCard = ({ item, onDelete }: { item: SentenceCard; onDelete: (card: SentenceCard) => void }) => {
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
            <View style={cs.content}>
                <Text style={cs.front}>{item.front}</Text>
                <Text style={cs.back}>{item.back}</Text>
            </View>
            <Pressable style={cs.del} onPress={() => onDelete(item)}
                // @ts-ignore
                onHoverIn={handleHoverIn} onHoverOut={handleHoverOut}>
                <X size={20} color={colors.danger} />
            </Pressable>
        </Mv>
    );
};

export default function SentenceDeckDetailScreen() {
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RoutePropType>();
    const { deckId, deckName } = route.params;
    const [cards, setCards] = useState<SentenceCard[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(useCallback(() => { fetchCards(); }, [deckId]));

    const fetchCards = async () => {
        setLoading(true);
        try { const resp = await apiClient.get(`/sentences/decks/${deckId}`); setCards(resp.data.cards ?? []); }
        catch { Alert.alert('Hata', 'Cümleler yüklenemedi.'); } finally { setLoading(false); }
    };

    const deleteCard = (card: SentenceCard) => confirmAction('Cümleyi Kaldır', 'Bu cümle desteden kaldırılsın mı?', async () => {
        try { await apiClient.delete(`/sentences/cards/${card.id}`); setCards(prev => prev.filter(c => c.id !== card.id)); }
        catch { showAlert('Hata', 'Cümle kaldırılamadı.'); }
    }, 'Kaldır');

    return (
        <View style={s.container}>
            <Mv initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={s.header}>
                <Text style={s.title}>{deckName}</Text>
                <Text style={s.count}>{cards.length} cümle</Text>
            </Mv>

            {loading ? (
                <View style={s.center}>
                    <Mv animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={s.spinner} />
                </View>
            ) : cards.length === 0 ? (
                <View style={s.empty}>
                    <Text style={{ fontSize: 56, marginBottom: 16 }}>⚀</Text>
                    <Text style={s.emptyTitle}>Bu destede cümle yok</Text>
                    <Text style={s.emptySub}>Görsel ekranından cümle ekleyebilirsin.</Text>
                </View>
            ) : (
                <FlatList data={cards} keyExtractor={i => i.id.toString()}
                    renderItem={({ item }) => <AnimatedSentenceCard item={item} onDelete={deleteCard} />}
                    contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false} />
            )}
        </View>
    );
}

const cs = StyleSheet.create({
    card: { display: 'flex', flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: 12, overflow: 'hidden', border: `1px solid ${colors.border}`, cursor: 'default' } as any,
    content: { flex: 1, padding: 16 },
    front: { ...typography.bodyBold, marginBottom: 8, fontSize: 16, lineHeight: 23 } as any,
    back: { fontSize: 15, color: colors.primary, fontWeight: '600', lineHeight: 21 } as any,
    del: { alignSelf: 'stretch', justifyContent: 'center', paddingHorizontal: 20, zIndex: 1, display: 'flex', alignItems: 'center' } as any,
    delTxt: { color: colors.danger, fontWeight: 'bold', fontSize: 20 } as any,
});

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    spinner: { width: 36, height: 36, borderRadius: 18, border: `3px solid ${colors.primaryDim}`, borderTopColor: colors.primary } as any,
    header: { backgroundColor: colors.surface, padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center' } as any,
    title: { ...typography.h2, marginBottom: 4 },
    count: { ...typography.caption, color: colors.textMuted },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyTitle: { ...typography.h3, marginBottom: 8 },
    emptySub: { ...typography.body, color: colors.textMuted, textAlign: 'center' } as any,
});
