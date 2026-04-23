import React, { useState, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    ActivityIndicator, Modal, TextInput
} from 'react-native';
import { apiClient } from '../api/client';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { confirmAction, showAlert } from '../utils/alert';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Decks'>;

interface Deck {
    id: number;
    name: string;
    cards: any[];
}

// Hardcoded palette of cover colors for each deck (Spotify-style)
const COVER_COLORS = [
    '#1DB954', '#E91429', '#2D46B9', '#BC5900',
    '#7B5EA7', '#0D73EC', '#E8115B', '#148A08',
];

export default function DecksScreen() {
    const [decks, setDecks] = useState<Deck[]>([]);
    const [loading, setLoading] = useState(true);
    const [createVisible, setCreateVisible] = useState(false);
    const [newDeckName, setNewDeckName] = useState('');
    const [creating, setCreating] = useState(false);
    const [manualVisible, setManualVisible] = useState(false);
    const [manualFront, setManualFront] = useState('');
    const [manualBack, setManualBack] = useState('');
    const [manualContext, setManualContext] = useState('');
    const [deckPickerVisible, setDeckPickerVisible] = useState(false);
    const [fetchingDecks, setFetchingDecks] = useState(false);
    const [addingCard, setAddingCard] = useState(false);
    const navigation = useNavigation<NavigationProp>();

    // Reload decks every time the screen comes into focus
    useFocusEffect(
        useCallback(() => {
            fetchDecks();
        }, [])
    );

    const fetchDecks = async () => {
        setLoading(true);
        try {
            const resp = await apiClient.get('/decks/');
            setDecks(resp.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const createDeck = async () => {
        if (!newDeckName.trim()) return;
        setCreating(true);
        try {
            await apiClient.post('/decks/', { name: newDeckName.trim() });
            setNewDeckName('');
            setCreateVisible(false);
            await fetchDecks();
        } catch {
            showAlert('Hata', 'Deste oluşturulamadı. Lütfen tekrar deneyin.');
        } finally {
            setCreating(false);
        }
    };

    const openManualAdd = () => {
        setManualVisible(true);
    };

    const closeManualAdd = () => {
        setManualVisible(false);
        setManualFront('');
        setManualBack('');
        setManualContext('');
    };

    const openDeckPicker = async () => {
        if (!manualFront.trim() || !manualBack.trim()) {
            showAlert('Eksik Bilgi', 'Kelime ve Turkce karsiligi gerekli.');
            return;
        }
        setDeckPickerVisible(true);
        setFetchingDecks(true);
        try {
            const resp = await apiClient.get('/decks/');
            setDecks(resp.data);
        } catch {
            showAlert('Hata', 'Desteler yuklenemedi.');
            setDeckPickerVisible(false);
        } finally {
            setFetchingDecks(false);
        }
    };

    const addManualCardToDeck = async (deck: Deck) => {
        setAddingCard(true);
        try {
            const payload = {
                front: manualFront.trim(),
                back: manualBack.trim(),
                context: manualContext.trim() || undefined,
            };
            await apiClient.post(`/decks/${deck.id}/cards`, payload);
            setDeckPickerVisible(false);
            closeManualAdd();
            await fetchDecks();
            showAlert('Basarili', `"${payload.front}" kelimesi "${deck.name}" destesine eklendi.`);
        } catch {
            showAlert('Hata', 'Kelime eklenemedi. Lutfen tekrar deneyin.');
        } finally {
            setAddingCard(false);
        }
    };

    const deleteDeck = (deck: Deck) => {
        confirmAction(
            'Desteyi Sil',
            `"${deck.name}" silinsin mi? Bu işlem geri alınamaz.`,
            async () => {
                try {
                    await apiClient.delete(`/decks/${deck.id}`);
                    setDecks(prev => prev.filter(d => d.id !== deck.id));
                } catch (err: any) {
                    showAlert('Hata', `Deste silinemedi: ${err?.message ?? 'Bilinmeyen hata'}`);
                }
            },
            'Sil'
        );
    };
    const renderItem = ({ item, index }: { item: Deck; index: number }) => {
        const color = COVER_COLORS[index % COVER_COLORS.length];
        return (
            // Outer View is NOT pressable — child Touchables handle presses independently
            <View style={styles.deckCard}>

                {/* Tapping the info area navigates to DeckDetail */}
                <TouchableOpacity
                    style={styles.deckCardInner}
                    onPress={() => navigation.navigate('DeckDetail', { deckId: item.id, deckName: item.name })}
                    activeOpacity={0.75}
                >
                    {/* Colored cover art */}
                    <View style={[styles.deckCover, { backgroundColor: color }]}>
                        <Text style={styles.deckInitial}>{item.name.charAt(0).toUpperCase()}</Text>
                    </View>

                    <View style={styles.deckInfo}>
                        <Text style={styles.deckName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.cardCount}>{item.cards?.length || 0} kelime</Text>
                    </View>
                </TouchableOpacity>

                {/* Delete button is a sibling, NOT inside the navigation touchable */}
                <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => deleteDeck(item)}
                >
                    <Text style={styles.actionBtnText}>🗑</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>📚 Destelerim</Text>
                <TouchableOpacity style={styles.createBtn} onPress={() => setCreateVisible(true)}>
                    <Text style={styles.createBtnText}>+ Yeni Deste</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#1DB954" style={{ marginTop: 60 }} />
            ) : decks.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyEmoji}>📭</Text>
                    <Text style={styles.emptyTitle}>Henüz deste yok</Text>
                    <Text style={styles.emptyText}>
                        Yukarıdaki "+ Yeni Deste" butonuna tıklayarak ilk desteni oluştur.
                    </Text>
                    <TouchableOpacity style={styles.emptyCreateBtn} onPress={() => setCreateVisible(true)}>
                        <Text style={styles.emptyCreateBtnText}>+ İlk Destemi Oluştur</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={decks}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
                />
            )}

            {/* Create Deck Modal */}
            <Modal visible={createVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Yeni Deste Oluştur</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Deste adı (örn. Kitap: 1984)"
                            value={newDeckName}
                            onChangeText={setNewDeckName}
                            autoFocus
                            onSubmitEditing={createDeck}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.cancelBtn]}
                                onPress={() => { setCreateVisible(false); setNewDeckName(''); }}
                            >
                                <Text style={styles.modalBtnText}>İptal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.confirmBtn, !newDeckName.trim() && styles.disabledBtn]}
                                onPress={createDeck}
                                disabled={!newDeckName.trim() || creating}
                            >
                                {creating
                                    ? <ActivityIndicator color="#fff" size="small" />
                                    : <Text style={styles.modalBtnText}>Oluştur</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <TouchableOpacity style={styles.fab} onPress={openManualAdd} activeOpacity={0.85}>
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>

            {/* Manual Add Modal */}
            <Modal visible={manualVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Manuel Kelime Ekle</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Kelime (Ingilizce)"
                            value={manualFront}
                            onChangeText={setManualFront}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Turkce karsiligi"
                            value={manualBack}
                            onChangeText={setManualBack}
                        />
                        <TextInput
                            style={[styles.input, styles.inputMultiline]}
                            placeholder="Aciklama (opsiyonel)"
                            value={manualContext}
                            onChangeText={setManualContext}
                            multiline
                            numberOfLines={3}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.cancelBtn]}
                                onPress={closeManualAdd}
                            >
                                <Text style={styles.modalBtnText}>Iptal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modalBtn,
                                    styles.confirmBtn,
                                    (!manualFront.trim() || !manualBack.trim()) && styles.disabledBtn,
                                ]}
                                onPress={openDeckPicker}
                                disabled={!manualFront.trim() || !manualBack.trim()}
                            >
                                <Text style={styles.modalBtnText}>Desteyi Sec</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Deck Picker for Manual Add */}
            <Modal visible={deckPickerVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Hangi desteye ekleyelim?</Text>
                        {fetchingDecks ? (
                            <ActivityIndicator color="#1DB954" style={{ marginVertical: 24 }} />
                        ) : decks.length === 0 ? (
                            <View style={styles.noDeckContainer}>
                                <Text style={styles.noDeckText}>
                                    Henuz desten yok.{'\n'}Once bir deste olustur.
                                </Text>
                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.confirmBtn, { marginTop: 16 }]}
                                    onPress={() => { setDeckPickerVisible(false); setCreateVisible(true); }}
                                >
                                    <Text style={styles.modalBtnText}>+ Yeni Deste</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <FlatList
                                data={decks}
                                keyExtractor={(d) => d.id.toString()}
                                style={{ maxHeight: 300 }}
                                renderItem={({ item, index }) => (
                                    <TouchableOpacity
                                        style={styles.deckOption}
                                        onPress={() => addManualCardToDeck(item)}
                                        disabled={addingCard}
                                    >
                                        <View style={[styles.deckDot, { backgroundColor: COVER_COLORS[index % COVER_COLORS.length] }]} />
                                        <Text style={styles.deckOptionText}>{item.name}</Text>
                                        {addingCard && <ActivityIndicator size="small" color="#fff" />}
                                    </TouchableOpacity>
                                )}
                            />
                        )}

                        <TouchableOpacity
                            style={[styles.modalBtn, styles.cancelBtn, { marginTop: 16 }]}
                            onPress={() => setDeckPickerVisible(false)}
                        >
                            <Text style={styles.modalBtnText}>Iptal</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 20, paddingTop: 30, backgroundColor: '#121212'
    },
    headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
    createBtn: { backgroundColor: '#1DB954', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },
    createBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

    deckCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#282828', borderRadius: 8,
        marginBottom: 12,
        overflow: 'hidden',
    },
    deckCardInner: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        padding: 12,
    },
    deckCover: {
        width: 56, height: 56, borderRadius: 6,
        justifyContent: 'center', alignItems: 'center', marginRight: 14
    },
    deckInitial: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
    deckInfo: { flex: 1 },
    deckName: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
    cardCount: { fontSize: 12, color: '#b3b3b3', marginTop: 3 },
    actionBtn: { paddingVertical: 14, paddingHorizontal: 16 },
    actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    deleteBtn: { backgroundColor: '#E91429' },

    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyEmoji: { fontSize: 60, marginBottom: 16 },
    emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
    emptyText: { fontSize: 14, color: '#b3b3b3', textAlign: 'center', lineHeight: 22 },
    emptyCreateBtn: {
        marginTop: 28, backgroundColor: '#1DB954',
        paddingVertical: 14, paddingHorizontal: 32, borderRadius: 30
    },
    emptyCreateBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: '#282828', borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 28
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 18 },
    input: {
        backgroundColor: '#404040', borderRadius: 8, padding: 14,
        fontSize: 16, color: '#fff', marginBottom: 20
    },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
    cancelBtn: { backgroundColor: '#535353' },
    confirmBtn: { backgroundColor: '#1DB954' },
    disabledBtn: { opacity: 0.4 },
    modalBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
    inputMultiline: { minHeight: 72, textAlignVertical: 'top' },

    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#1DB954',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    fabText: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginTop: -2 },

    noDeckContainer: { alignItems: 'center', paddingVertical: 16 },
    noDeckText: { color: '#b3b3b3', textAlign: 'center', fontSize: 15, lineHeight: 24 },
    deckOption: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#404040'
    },
    deckDot: { width: 14, height: 14, borderRadius: 7, marginRight: 14 },
    deckOptionText: { flex: 1, fontSize: 16, color: '#fff', fontWeight: '500' },
});
