import React, { useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, Platform } from 'react-native';
import { apiClient } from '../api/client';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { confirmAction, showAlert } from '../utils/alert';
import { colors, radius, spacing, typography } from '../theme';
import { motion } from 'framer-motion';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Decks'>;
interface Deck { id: number; name: string; cards: any[]; }
const COVER_COLORS = colors.covers;
const Mv = motion.div as any;

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
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ imported: number } | null>(null);
    const excelInputRef = useRef<HTMLInputElement | null>(null);
    const navigation = useNavigation<NavigationProp>();

    useFocusEffect(useCallback(() => { fetchDecks(); }, []));

    const fetchDecks = async () => {
        setLoading(true);
        try { const resp = await apiClient.get('/decks/'); setDecks(resp.data); }
        catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const createDeck = async () => {
        if (!newDeckName.trim()) return;
        setCreating(true);
        try {
            const resp = await apiClient.post('/decks/', { name: newDeckName.trim() });
            if (excelFile) {
                setImporting(true);
                try {
                    const fd = new FormData();
                    fd.append('file', excelFile, excelFile.name);
                    const ir = await apiClient.post(`/decks/${resp.data.id}/import-excel`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                    setImportResult(ir.data);
                } catch { showAlert('Uyarı', 'Deste oluşturuldu ancak Excel aktarma başarısız.'); }
                finally { setImporting(false); }
            }
            setNewDeckName(''); setExcelFile(null);
            if (!excelFile) setCreateVisible(false);
            await fetchDecks();
        } catch { showAlert('Hata', 'Deste oluşturulamadı.'); } finally { setCreating(false); }
    };

    const closeCreate = () => { setCreateVisible(false); setNewDeckName(''); setExcelFile(null); setImportResult(null); };

    const openDeckPicker = async () => {
        if (!manualFront.trim() || !manualBack.trim()) { showAlert('Eksik Bilgi', 'Kelime ve Türkçe karşılığı gerekli.'); return; }
        setDeckPickerVisible(true); setFetchingDecks(true);
        try { const resp = await apiClient.get('/decks/'); setDecks(resp.data); }
        catch { showAlert('Hata', 'Desteler yüklenemedi.'); setDeckPickerVisible(false); }
        finally { setFetchingDecks(false); }
    };

    const addManualCard = async (deck: Deck) => {
        setAddingCard(true);
        try {
            await apiClient.post(`/decks/${deck.id}/cards`, { front: manualFront.trim(), back: manualBack.trim(), context: manualContext.trim() || undefined });
            setDeckPickerVisible(false);
            setManualVisible(false); setManualFront(''); setManualBack(''); setManualContext('');
            await fetchDecks();
            showAlert('Başarılı', `"${manualFront}" → "${deck.name}" destesine eklendi.`);
        } catch { showAlert('Hata', 'Kelime eklenemedi.'); } finally { setAddingCard(false); }
    };

    const deleteDeck = (deck: Deck) => confirmAction('Desteyi Sil', `"${deck.name}" silinsin mi?`, async () => {
        try { await apiClient.delete(`/decks/${deck.id}`); setDecks(prev => prev.filter(d => d.id !== deck.id)); }
        catch (err: any) { showAlert('Hata', `Silinemedi: ${err?.message ?? '?'}`); }
    }, 'Sil');

    const renderItem = ({ item, index }: { item: Deck; index: number }) => {
        const color = COVER_COLORS[index % COVER_COLORS.length];
        return (
            <Mv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: index * 0.05 }}
                whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(0,0,0,0.45)' }}
                style={s.card}>
                <TouchableOpacity style={s.cardInner} onPress={() => navigation.navigate('DeckDetail', { deckId: item.id, deckName: item.name })} activeOpacity={0.8}>
                    <View style={[s.cover, { backgroundColor: color }]}>
                        <Text style={s.initial}>{item.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={s.info}>
                        <Text style={s.deckName} numberOfLines={1}>{item.name}</Text>
                        <Text style={s.cardCount}>{item.cards?.length || 0} kelime</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity style={s.delBtn} onPress={() => deleteDeck(item)}>
                    <Text style={s.delBtnTxt}>✕</Text>
                </TouchableOpacity>
            </Mv>
        );
    };

    const ModalBox = ({ children }: { children: React.ReactNode }) => (
        <View style={s.overlay}>
            <Mv initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }} style={s.modal}>
                {children}
            </Mv>
        </View>
    );

    return (
        <View style={s.container}>
            {Platform.OS === 'web' && <input ref={excelInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={(e: any) => {
                const file = e.target.files?.[0]; if (!file) return;
                const ext = file.name.split('.').pop()?.toLowerCase();
                if (ext === 'xlsx' || ext === 'xls') { setExcelFile(file); if (!newDeckName.trim()) setNewDeckName(file.name.replace(/\.[^/.]+$/, '')); }
                else showAlert('Geçersiz Dosya', 'Sadece .xlsx veya .xls'); e.target.value = '';
            }} />}

            <View style={s.header}>
                <View>
                    <Text style={s.headerTitle}>Destelerim</Text>
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
                    <Text style={{ fontSize: 64, marginBottom: 16 }}>📚</Text>
                    <Text style={s.emptyTitle}>Henüz deste yok</Text>
                    <Text style={s.emptyText}>İlk desteni oluştur ve öğrenmeye başla!</Text>
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

            {/* Create Modal */}
            <Modal visible={createVisible} transparent animationType="fade">
                <ModalBox>
                    {importResult ? (
                        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                            <Text style={{ fontSize: 48, marginBottom: 12 }}>✅</Text>
                            <Text style={s.modalTitle}>İçe Aktarma Tamam!</Text>
                            <Text style={{ color: colors.success, fontSize: 15, marginBottom: 24 }}>{importResult.imported} kelime eklendi</Text>
                            <TouchableOpacity style={s.confirmBtn} onPress={closeCreate}><Text style={s.confirmTxt}>Tamam</Text></TouchableOpacity>
                        </View>
                    ) : importing ? (
                        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={{ color: colors.textSecondary, marginTop: 16 }}>Excel içe aktarılıyor...</Text>
                        </View>
                    ) : (
                        <>
                            <Text style={s.modalTitle}>Yeni Deste Oluştur</Text>
                            <TextInput style={s.input} placeholder="Deste adı" placeholderTextColor={colors.textMuted} value={newDeckName} onChangeText={setNewDeckName} autoFocus onSubmitEditing={createDeck} />
                            <View style={s.excelSec}>
                                <View style={s.divRow}><View style={s.divLine} /><Text style={s.divTxt}>Excel ile toplu ekle</Text><View style={s.divLine} /></View>
                                <TouchableOpacity style={[s.excelBtn, excelFile && s.excelBtnOn]} onPress={() => excelInputRef.current?.click()} activeOpacity={0.7}>
                                    <Text style={{ fontSize: 22, marginRight: 10 }}>📊</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.excelBtnTxt}>{excelFile ? excelFile.name : 'Excel Dosyası Seç (.xlsx)'}</Text>
                                        <Text style={s.excelHint}>{excelFile ? 'Değiştirmek için tıkla' : 'Kelime | Anlam | Açıklama'}</Text>
                                    </View>
                                    {excelFile && <TouchableOpacity style={s.excelRm} onPress={() => setExcelFile(null)}><Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>✕</Text></TouchableOpacity>}
                                </TouchableOpacity>
                            </View>
                            <View style={s.btnRow}>
                                <TouchableOpacity style={s.cancelBtn} onPress={closeCreate}><Text style={s.cancelTxt}>İptal</Text></TouchableOpacity>
                                <TouchableOpacity style={[s.confirmBtn, !newDeckName.trim() && s.disabled]} onPress={createDeck} disabled={!newDeckName.trim() || creating}>
                                    {creating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.confirmTxt}>{excelFile ? '📊 Oluştur & Aktar' : 'Oluştur'}</Text>}
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </ModalBox>
            </Modal>

            {/* FAB */}
            <Mv whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.93 }} style={s.fab}>
                <TouchableOpacity onPress={() => setManualVisible(true)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: colors.bg, fontSize: 28, fontWeight: '700' }}>+</Text>
                </TouchableOpacity>
            </Mv>

            {/* Manual Modal */}
            <Modal visible={manualVisible} transparent animationType="fade">
                <ModalBox>
                    <Text style={s.modalTitle}>Manuel Kelime Ekle</Text>
                    <TextInput style={s.input} placeholder="Kelime (İngilizce)" placeholderTextColor={colors.textMuted} value={manualFront} onChangeText={setManualFront} />
                    <TextInput style={s.input} placeholder="Türkçe karşılığı" placeholderTextColor={colors.textMuted} value={manualBack} onChangeText={setManualBack} />
                    <TextInput style={[s.input, { minHeight: 72 }]} placeholder="Açıklama (opsiyonel)" placeholderTextColor={colors.textMuted} value={manualContext} onChangeText={setManualContext} multiline numberOfLines={3} />
                    <View style={s.btnRow}>
                        <TouchableOpacity style={s.cancelBtn} onPress={() => { setManualVisible(false); setManualFront(''); setManualBack(''); setManualContext(''); }}><Text style={s.cancelTxt}>İptal</Text></TouchableOpacity>
                        <TouchableOpacity style={[s.confirmBtn, (!manualFront.trim() || !manualBack.trim()) && s.disabled]} onPress={openDeckPicker} disabled={!manualFront.trim() || !manualBack.trim()}>
                            <Text style={s.confirmTxt}>Desteyi Seç</Text>
                        </TouchableOpacity>
                    </View>
                </ModalBox>
            </Modal>

            {/* Deck Picker */}
            <Modal visible={deckPickerVisible} transparent animationType="fade">
                <ModalBox>
                    <Text style={s.modalTitle}>Hangi desteye ekleyelim?</Text>
                    {fetchingDecks ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} /> :
                        decks.length === 0 ? (
                            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                                <Text style={{ color: colors.textMuted, textAlign: 'center', marginBottom: 16 }}>Henüz desten yok.{'\n'}Önce bir deste oluştur.</Text>
                                <TouchableOpacity style={s.confirmBtn} onPress={() => { setDeckPickerVisible(false); setCreateVisible(true); }}><Text style={s.confirmTxt}>+ Yeni Deste</Text></TouchableOpacity>
                            </View>
                        ) : (
                            <FlatList data={decks} keyExtractor={d => d.id.toString()} style={{ maxHeight: 300 }}
                                renderItem={({ item, index }) => (
                                    <TouchableOpacity style={s.deckOpt} onPress={() => addManualCard(item)} disabled={addingCard}>
                                        <View style={[s.deckDot, { backgroundColor: COVER_COLORS[index % COVER_COLORS.length] }]} />
                                        <Text style={s.deckOptTxt}>{item.name}</Text>
                                        {addingCard && <ActivityIndicator size="small" color={colors.primary} />}
                                    </TouchableOpacity>
                                )} />
                        )}
                    <TouchableOpacity style={[s.cancelBtn, { marginTop: 16 }]} onPress={() => setDeckPickerVisible(false)}><Text style={s.cancelTxt}>İptal</Text></TouchableOpacity>
                </ModalBox>
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
    delBtnTxt: { fontSize: 18, color: colors.danger } as any,
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyTitle: { ...typography.h2, marginBottom: 8 },
    emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' } as any,
    emptyBtn: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: radius.full, boxShadow: `0 4px 16px ${colors.primary}40` } as any,
    emptyBtnTxt: { color: colors.bg, fontWeight: '700', fontSize: 15 } as any,
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
    modal: { display: 'flex', flexDirection: 'column', boxSizing: 'border-box', backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, width: '100%', maxWidth: 480, border: `1px solid ${colors.border}`, boxShadow: '0 24px 64px rgba(0,0,0,0.6)' } as any,
    modalTitle: { ...typography.h2, marginBottom: 20 },
    input: { backgroundColor: colors.surfaceHigh, borderRadius: radius.md, padding: 14, fontSize: 15, color: colors.textPrimary, marginBottom: 14, border: `1px solid ${colors.border}`, fontFamily: 'inherit' } as any,
    excelSec: { marginBottom: 16 },
    divRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    divLine: { flex: 1, height: 1, backgroundColor: colors.border },
    divTxt: { ...typography.label, marginHorizontal: 12 },
    excelBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: radius.md, padding: 14, border: `1.5px dashed ${colors.border}` } as any,
    excelBtnOn: { borderColor: colors.primary, borderStyle: 'solid', backgroundColor: colors.primaryDim } as any,
    excelBtnTxt: { ...typography.bodyBold, marginBottom: 2 },
    excelHint: { ...typography.caption },
    excelRm: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
    btnRow: { flexDirection: 'row', gap: 12, marginTop: 4 } as any,
    cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', backgroundColor: colors.surfaceHigh, border: `1px solid ${colors.border}` } as any,
    cancelTxt: { ...typography.bodyBold, color: colors.textSecondary },
    confirmBtn: { flex: 1, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', backgroundColor: colors.primary } as any,
    disabled: { opacity: 0.4 },
    confirmTxt: { color: colors.bg, fontWeight: '700', fontSize: 15 } as any,
    fab: { position: 'absolute', right: 20, bottom: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primary, boxShadow: `0 6px 24px ${colors.primary}60`, cursor: 'pointer' } as any,
    deckOpt: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    deckDot: { width: 12, height: 12, borderRadius: 6, marginRight: 14 },
    deckOptTxt: { flex: 1, ...typography.bodyBold },
});
