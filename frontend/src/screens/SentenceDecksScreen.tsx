import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput } from 'react-native';
import { apiClient } from '../api/client';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { confirmAction, showAlert } from '../utils/alert';
import { colors, radius, spacing, typography } from '../theme';
import { motion } from 'framer-motion';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'SentenceDecks'>;
interface SentenceDeck { id: number; name: string; cards: any[]; }
const COVER_COLORS = colors.covers;
const Mv = motion.div as any;

export default function SentenceDecksScreen() {
    const [decks, setDecks] = useState<SentenceDeck[]>([]);
    const [loading, setLoading] = useState(true);
    const [createVisible, setCreateVisible] = useState(false);
    const [newDeckName, setNewDeckName] = useState('');
    const [creating, setCreating] = useState(false);
    const navigation = useNavigation<NavigationProp>();

    useFocusEffect(useCallback(() => { fetchDecks(); }, []));

    const fetchDecks = async () => {
        setLoading(true);
        try { const resp = await apiClient.get('/sentences/decks/'); setDecks(resp.data); }
        catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const createDeck = async () => {
        if (!newDeckName.trim()) return;
        setCreating(true);
        try {
            await apiClient.post('/sentences/decks/', { name: newDeckName.trim() });
            setNewDeckName(''); setCreateVisible(false); await fetchDecks();
        } catch { showAlert('Hata', 'Cümle destesi oluşturulamadı.'); } finally { setCreating(false); }
    };

    const deleteDeck = (deck: SentenceDeck) => confirmAction('Desteyi Sil', `"${deck.name}" silinsin mi?`, async () => {
        try { await apiClient.delete(`/sentences/decks/${deck.id}`); setDecks(prev => prev.filter(d => d.id !== deck.id)); }
        catch (err: any) { showAlert('Hata', `Silinemedi: ${err?.message ?? '?'}`); }
    }, 'Sil');

    const renderItem = ({ item, index }: { item: SentenceDeck; index: number }) => {
        const color = COVER_COLORS[index % COVER_COLORS.length];
        return (
            <Mv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: index * 0.05 }}
                whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(0,0,0,0.45)' }}
                style={s.card}>
                <TouchableOpacity style={s.cardInner} onPress={() => navigation.navigate('SentenceDeckDetail', { deckId: item.id, deckName: item.name })} activeOpacity={0.8}>
                    <View style={[s.cover, { backgroundColor: color }]}>
                        <Text style={s.initial}>{item.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={s.info}>
                        <Text style={s.deckName} numberOfLines={1}>{item.name}</Text>
                        <Text style={s.cardCount}>{item.cards?.length || 0} cümle</Text>
                    </View>
                </TouchableOpacity>
                                <TouchableOpacity style={s.delBtn} onPress={() => deleteDeck(item)}>
                    <Text style={{ fontSize: 18, color: colors.danger }}>✕</Text>
                </TouchableOpacity>
            </Mv>
        );
    };

    return (
        <View style={s.container}>
            <View style={s.header}>
                <View>
                    <Text style={s.headerTitle}>Cümlelerim</Text>
                    <Text style={s.headerSub}>{decks.length} deste</Text>
                </View>
                <Mv whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                    <TouchableOpacity style={s.newBtn} onPress={() => setCreateVisible(true)}>
                        <Text style={s.newBtnTxt}>+ Yeni Deste</Text>
                    </TouchableOpacity>
                </Mv>
            </View>

            {loading ? (
                <View style={s.center}>
                    <Mv animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={s.spinner} />
                </View>
            ) : decks.length === 0 ? (
                <View style={s.empty}>
                    <Text style={{ fontSize: 64, marginBottom: 16 }}>📝</Text>
                    <Text style={s.emptyTitle}>Henüz cümle destesi yok</Text>
                    <Text style={s.emptyText}>İlk cümle desteni oluştur!</Text>
                    <Mv whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} style={{ marginTop: 24 }}>
                        <TouchableOpacity style={s.emptyBtn} onPress={() => setCreateVisible(true)}>
                            <Text style={s.emptyBtnTxt}>+ İlk Destemi Oluştur</Text>
                        </TouchableOpacity>
                    </Mv>
                </View>
            ) : (
                <FlatList data={decks} keyExtractor={i => i.id.toString()} renderItem={renderItem}
                    contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false} />
            )}

            <Modal visible={createVisible} transparent animationType="fade">
                <View style={s.overlay}>
                    <Mv initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 26 }} style={s.modal}>
                        <Text style={s.modalTitle}>Yeni Cümle Destesi</Text>
                        <TextInput style={s.input} placeholder="Deste adı (örn. Roman Sözleri)" placeholderTextColor={colors.textMuted}
                            value={newDeckName} onChangeText={setNewDeckName} autoFocus onSubmitEditing={createDeck} />
                        <View style={s.btnRow}>
                            <TouchableOpacity style={s.cancelBtn} onPress={() => { setCreateVisible(false); setNewDeckName(''); }}>
                                <Text style={s.cancelTxt}>İptal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[s.confirmBtn, !newDeckName.trim() && s.disabled]} onPress={createDeck} disabled={!newDeckName.trim() || creating}>
                                {creating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.confirmTxt}>Oluştur</Text>}
                            </TouchableOpacity>
                        </View>
                    </Mv>
                </View>
            </Modal>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    spinner: { width: 36, height: 36, borderRadius: 18, border: `3px solid ${colors.primaryDim}`, borderTopColor: colors.primary } as any,
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, paddingTop: spacing.xl },
    headerTitle: { ...typography.h1 },
    headerSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
    newBtn: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 18, borderRadius: radius.full, boxShadow: `0 4px 16px ${colors.primary}40` } as any,
    newBtnTxt: { color: colors.bg, fontWeight: '700', fontSize: 13 } as any,
    card: { display: 'flex', flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: 12, overflow: 'hidden', cursor: 'pointer', border: `1px solid ${colors.border}` } as any,
    cardInner: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14 },
    cover: { width: 52, height: 52, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    initial: { fontSize: 24, fontWeight: '800', color: '#fff' } as any,
    info: { flex: 1 },
    deckName: { ...typography.bodyBold, marginBottom: 3 },
    cardCount: { ...typography.caption },
    delBtn: { paddingVertical: 16, paddingHorizontal: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' } as any,
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyTitle: { ...typography.h2, marginBottom: 8 },
    emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' } as any,
    emptyBtn: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: radius.full } as any,
    emptyBtnTxt: { color: colors.bg, fontWeight: '700', fontSize: 15 } as any,
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
    modal: { display: 'flex', flexDirection: 'column', boxSizing: 'border-box', backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, width: '100%', maxWidth: 480, border: `1px solid ${colors.border}`, boxShadow: '0 24px 64px rgba(0,0,0,0.6)' } as any,
    modalTitle: { ...typography.h2, marginBottom: 20 },
    input: { backgroundColor: colors.surfaceHigh, borderRadius: radius.md, padding: 14, fontSize: 15, color: colors.textPrimary, marginBottom: 20, border: `1px solid ${colors.border}`, fontFamily: 'inherit' } as any,
    btnRow: { flexDirection: 'row', gap: 12 } as any,
    cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', backgroundColor: colors.surfaceHigh, border: `1px solid ${colors.border}` } as any,
    cancelTxt: { ...typography.bodyBold, color: colors.textSecondary },
    confirmBtn: { flex: 1, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', backgroundColor: colors.primary } as any,
    disabled: { opacity: 0.4 },
    confirmTxt: { color: colors.bg, fontWeight: '700', fontSize: 15 } as any,
});
