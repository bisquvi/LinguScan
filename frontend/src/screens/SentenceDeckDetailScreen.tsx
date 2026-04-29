import React, { useState, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, Animated, Pressable
} from 'react-native';
import { apiClient } from '../api/client';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { confirmAction, showAlert } from '../utils/alert';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'SentenceDeckDetail'>;
type RoutePropType = RouteProp<RootStackParamList, 'SentenceDeckDetail'>;

interface SentenceCard {
    id: number;
    front: string;
    back: string;
}

const AnimatedSentenceCard = ({ item, onDelete }: { item: SentenceCard, onDelete: (card: SentenceCard) => void }) => {
    const anim = React.useRef(new Animated.Value(0)).current;

    const handleHoverIn = () => {
        Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
        }).start();
    };

    const handleHoverOut = () => {
        Animated.timing(anim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
        }).start();
    };

    return (
        <View style={styles.card}>
            <Animated.View style={[
                StyleSheet.absoluteFill,
                {
                    backgroundColor: 'rgba(233, 20, 41, 0.15)',
                    width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                    right: 0,
                    left: 'auto',
                }
            ]} />
            <View style={styles.cardContent}>
                <Text style={styles.frontText}>{item.front}</Text>
                <Text style={styles.backText}>{item.back}</Text>
            </View>
            <Pressable
                style={styles.deleteBtn}
                onPress={() => onDelete(item)}
                // @ts-ignore
                onHoverIn={handleHoverIn}
                onHoverOut={handleHoverOut}
            >
                <Text style={styles.deleteBtnText}>✕</Text>
            </Pressable>
        </View>
    );
};

export default function SentenceDeckDetailScreen() {
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RoutePropType>();
    const { deckId, deckName } = route.params;

    const [cards, setCards] = useState<SentenceCard[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            fetchCards();
        }, [deckId])
    );

    const fetchCards = async () => {
        setLoading(true);
        try {
            const resp = await apiClient.get(`/sentences/decks/${deckId}`);
            setCards(resp.data.cards ?? []);
        } catch {
            Alert.alert('Hata', 'Cümleler yüklenemedi.');
        } finally {
            setLoading(false);
        }
    };

    const deleteCard = (card: SentenceCard) => {
        confirmAction(
            'Cümleyi Kaldır',
            `Bu cümle desteden kaldırılsın mı?`,
            async () => {
                try {
                    await apiClient.delete(`/sentences/cards/${card.id}`);
                    setCards(prev => prev.filter(c => c.id !== card.id));
                } catch {
                    showAlert('Hata', 'Cümle kaldırılamadı.');
                }
            },
            'Kaldır'
        );
    };

    const renderCard = ({ item }: { item: SentenceCard }) => (
        <AnimatedSentenceCard item={item} onDelete={deleteCard} />
    );

    return (
        <View style={styles.container}>
            <View style={styles.deckHeader}>
                <Text style={styles.deckTitle}>{deckName}</Text>
                <Text style={styles.deckCount}>{cards.length} cümle</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#1DB954" style={{ marginTop: 40 }} />
            ) : cards.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyEmoji}>📭</Text>
                    <Text style={styles.emptyText}>Bu destede henüz cümle yok.</Text>
                    <Text style={styles.emptySubText}>Görsel ekranından cümle ekleyebilirsin.</Text>
                </View>
            ) : (
                <FlatList
                    data={cards}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderCard}
                    contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    deckHeader: {
        backgroundColor: '#1a1a1a',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#2a2a2a',
        alignItems: 'center',
    },
    deckTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
    deckCount: { fontSize: 13, color: '#b3b3b3', marginBottom: 14 },
    card: {
        backgroundColor: '#282828',
        borderRadius: 10,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
    },
    cardContent: { flex: 1, padding: 16 },
    frontText: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 8, lineHeight: 22 },
    backText: { fontSize: 15, color: '#1DB954', lineHeight: 20 },
    deleteBtn: {
        alignSelf: 'stretch',
        justifyContent: 'center',
        paddingHorizontal: 20,
        zIndex: 1,
    },
    deleteBtnText: { color: '#ff4d4d', fontWeight: 'bold', fontSize: 18 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyEmoji: { fontSize: 56, marginBottom: 16 },
    emptyText: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
    emptySubText: { fontSize: 14, color: '#b3b3b3', textAlign: 'center' },
});
