import React, { useState, useRef } from 'react';
import {
    View, Text, Button, StyleSheet, ActivityIndicator,
    Modal, TouchableOpacity, Platform, FlatList, ScrollView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import ImageOCRViewer, { OCRResult } from '../components/ImageOCRViewer';
import { apiClient } from '../api/client';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Upload'>;

// ── Highlighted sentence ─────────────────────────────────────────
function HighlightedSentence({ sentence, highlight }: { sentence: string; highlight: string }) {
    const tokens = sentence.split(' ');
    const needle = highlight.toLowerCase().replace(/[^a-z]/g, '');
    return (
        <Text style={exampleSentenceStyle}>
            {tokens.map((token, i) => {
                const clean = token.toLowerCase().replace(/[^a-z]/g, '');
                const isMatch = !!needle && clean === needle;
                return (
                    <Text key={i} style={isMatch ? highlightStyle : plainTokenStyle}>
                        {token}{i < tokens.length - 1 ? ' ' : ''}
                    </Text>
                );
            })}
        </Text>
    );
}
const exampleSentenceStyle = { fontSize: 14, color: '#e0e0e0', lineHeight: 22, flexWrap: 'wrap' as const };
const highlightStyle = { color: '#1DB954', fontWeight: 'bold' as const };
const plainTokenStyle = { color: '#e0e0e0' };

interface Deck { id: number; name: string; }

// Simple inline toast state
interface Toast { message: string; success: boolean; }

// Cover colors mirrored from DecksScreen
const COVER_COLORS = [
    '#1DB954', '#E91429', '#2D46B9', '#BC5900',
    '#7B5EA7', '#0D73EC', '#E8115B', '#148A08',
];

export default function UploadScreen() {
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [ocrData, setOcrData] = useState<OCRResult[]>([]);
    const [loading, setLoading] = useState(false);

    // Translation card state
    const [selectedText, setSelectedText] = useState('');
    const [translation, setTranslation] = useState({ t: '', m: '', example: '', provider: '', loading: false });
    const [translationVisible, setTranslationVisible] = useState(false);
    const [sentenceTranslationVisible, setSentenceTranslationVisible] = useState(false);

    // Deck picker state
    const [deckPickerVisible, setDeckPickerVisible] = useState(false);
    const [sentenceDeckPickerVisible, setSentenceDeckPickerVisible] = useState(false);
    const [decks, setDecks] = useState<Deck[]>([]);
    const [sentenceDecks, setSentenceDecks] = useState<Deck[]>([]);
    const [fetchingDecks, setFetchingDecks] = useState(false);
    const [addingCard, setAddingCard] = useState(false);

    // Toast
    const [toast, setToast] = useState<Toast | null>(null);

    const navigation = useNavigation<NavigationProp>();
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // ── Toast helper ─────────────────────────────────────────────
    const showToast = (message: string, success: boolean) => {
        setToast({ message, success });
        setTimeout(() => setToast(null), 3000);
    };

    // ── Web file picker ────────────────────────────────────────────
    const pickImageWeb = () => fileInputRef.current?.click();

    const onWebFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const uri = URL.createObjectURL(file);
        setImageUri(uri);
        processImageWeb(file);
        event.target.value = '';
    };

    const processImageWeb = async (file: File) => {
        setLoading(true);
        setOcrData([]);
        try {
            const formData = new FormData();
            formData.append('file', file, file.name);
            const response = await apiClient.post('/process-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setOcrData(response.data);
        } catch {
            showToast('Görüntü işlenemedi. Backend loglarını kontrol et.', false);
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        if (Platform.OS === 'web') { pickImageWeb(); return; }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
        });
        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
            processImageMobile(result.assets[0]);
        }
    };

    const processImageMobile = async (asset: ImagePicker.ImagePickerAsset) => {
        setLoading(true);
        setOcrData([]);
        try {
            const formData = new FormData();
            formData.append('file', { uri: asset.uri, name: 'upload.jpg', type: 'image/jpeg' } as any);
            const response = await apiClient.post('/process-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setOcrData(response.data);
        } catch {
            showToast('Görüntü işlenemedi.', false);
        } finally {
            setLoading(false);
        }
    };

    // ── OCR text press → translate ─────────────────────────────────
    const handleTextPress = async (text: string) => {
        setSelectedText(text);
        setTranslation({ t: '', m: '', example: '', provider: '', loading: true });
        setTranslationVisible(true);
        try {
            const isWord = !text.includes(' ');
            const response = await apiClient.post('/translate', { text, is_word: isWord });
            setTranslation({
                t: response.data.translation,
                m: response.data.meaning,
                example: response.data.example ?? '',
                provider: response.data.provider_used ?? '',
                loading: false,
            });
        } catch {
            setTranslation({ t: 'Çeviri başarısız', m: 'Sunucuya ulaşılamadı', example: '', provider: '', loading: false });
        }
    };

    const handleSentencePress = async (text: string) => {
        setSelectedText(text);
        setTranslation({ t: '', m: '', example: '', provider: '', loading: true });
        setSentenceTranslationVisible(true);
        try {
            const response = await apiClient.post('/translate', { text, is_word: false });
            setTranslation({
                t: response.data.translation,
                m: response.data.meaning,
                example: response.data.example ?? '',
                provider: response.data.provider_used ?? '',
                loading: false,
            });
        } catch {
            setTranslation({ t: 'Çeviri başarısız', m: 'Sunucuya ulaşılamadı', example: '', provider: '', loading: false });
        }
    };

    // ── Add to Deck ────────────────────────────────────────────────
    const openDeckPicker = async (isSentence: boolean = false) => {
        setFetchingDecks(true);
        if (isSentence) {
            setSentenceDeckPickerVisible(true);
        } else {
            setDeckPickerVisible(true);
        }
        try {
            const endpoint = isSentence ? '/sentences/decks/' : '/decks/';
            const resp = await apiClient.get(endpoint);
            if (isSentence) {
                setSentenceDecks(resp.data);
            } else {
                setDecks(resp.data);
            }
        } catch {
            showToast('Desteler yüklenemedi.', false);
            setDeckPickerVisible(false);
            setSentenceDeckPickerVisible(false);
        } finally {
            setFetchingDecks(false);
        }
    };

    const addToSelectedDeck = async (deck: Deck, isSentence: boolean = false) => {
        setAddingCard(true);
        try {
            if (isSentence) {
                await apiClient.post(`/sentences/decks/${deck.id}/cards`, {
                    front: selectedText,
                    back: translation.t,
                });
                setSentenceDeckPickerVisible(false);
                setSentenceTranslationVisible(false);
            } else {
                await apiClient.post(`/decks/${deck.id}/cards`, {
                    front: selectedText,
                    back: translation.t,
                    context: translation.m,
                });
                setDeckPickerVisible(false);
                setTranslationVisible(false);
            }
            showToast(`✅ "${selectedText}" → "${deck.name}" destesine eklendi!`, true);
        } catch {
            showToast('❌ Kart eklenemedi. Lütfen tekrar dene.', false);
        } finally {
            setAddingCard(false);
        }
    };

    // ── Render ─────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            {/* Hidden file input (web only) */}
            {Platform.OS === 'web' && (
                <input
                    ref={fileInputRef} type="file" accept="image/*"
                    style={{ display: 'none' }}
                    onChange={onWebFileChange as any}
                />
            )}

            <View style={styles.header}>
                <TouchableOpacity style={styles.headerBtn} onPress={pickImage}>
                    <Text style={styles.headerBtnText}>📷 Görsel Seç</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.headerBtn, styles.decksBtn]} onPress={() => navigation.navigate('Decks')}>
                    <Text style={styles.headerBtnText}>📚 Destelerim</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.headerBtn, styles.sentenceDecksBtn]} onPress={() => navigation.navigate('SentenceDecks')}>
                    <Text style={styles.headerBtnText}>📚 Cümlelerim</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.headerBtn, styles.settingsBtn]} onPress={() => navigation.navigate('Settings')}>
                    <Text style={styles.headerBtnText}>⚙️ Ayarlar</Text>
                </TouchableOpacity>
            </View>

            {loading && <ActivityIndicator size="large" color="#1DB954" style={styles.loader} />}

            {imageUri && !loading && (
                <ImageOCRViewer
                    imageUri={imageUri}
                    ocrData={ocrData}
                    onWordPress={handleTextPress}
                    onSentencePress={handleSentencePress}
                />
            )}

            {!imageUri && !loading && (
                <View style={styles.placeholder}>
                    <Text style={styles.placeholderEmoji}>🖼️</Text>
                    <Text style={styles.placeholderText}>Kelime öğrenmek için bir görsel seç</Text>
                </View>
            )}

            {/* ── Toast notification ──────────────────── */}
            {toast && (
                <View style={[styles.toast, toast.success ? styles.toastSuccess : styles.toastError]}>
                    <Text style={styles.toastText}>{toast.message}</Text>
                </View>
            )}

            {/* ── Translation Card Modal ──────────────── */}
            <Modal visible={translationVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {!!translation.provider && !translation.loading && (
                            <Text style={styles.providerBadge}>{translation.provider}</Text>
                        )}
                        <Text style={styles.originalText}>{selectedText}</Text>

                        {translation.loading ? (
                            <ActivityIndicator color="#1DB954" style={{ marginVertical: 24 }} />
                        ) : (
                            <View style={styles.translationBox}>
                                <Text style={styles.translationText}>{translation.t}</Text>
                                {!!translation.m && <Text style={styles.meaningText}>{translation.m}</Text>}
                                {!!translation.example && (
                                    <View style={styles.exampleContainer}>
                                        <Text style={styles.exampleLabel}>📖 Örnek cümle</Text>
                                        <HighlightedSentence sentence={translation.example} highlight={selectedText} />
                                    </View>
                                )}
                            </View>
                        )}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.btn, styles.addBtn]}
                                onPress={() => openDeckPicker(false)}
                                disabled={translation.loading}
                            >
                                <Text style={styles.btnText}>+ Desteye Ekle</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.btn, styles.closeBtn]}
                                onPress={() => setTranslationVisible(false)}
                            >
                                <Text style={styles.btnText}>Kapat</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── Sentence Translation Card Modal ──────────────── */}
            <Modal visible={sentenceTranslationVisible} transparent animationType="slide">
                <View style={styles.sentenceModalOverlay}>
                    <View style={styles.sentenceModalContent}>
                        {!!translation.provider && !translation.loading && (
                            <Text style={styles.providerBadge}>{translation.provider}</Text>
                        )}

                        <View style={styles.sentenceTextContainer}>
                            <ScrollView style={styles.sentenceOriginalScroll}>
                                <Text style={styles.sentenceOriginalText}>{selectedText}</Text>
                            </ScrollView>

                            {translation.loading ? (
                                <View style={{ flex: 1, justifyContent: 'center' }}>
                                    <ActivityIndicator color="#1DB954" size="large" />
                                </View>
                            ) : (
                                <ScrollView style={styles.sentenceTranslationScroll}>
                                    <View style={styles.sentenceTranslationBox}>
                                        <Text style={styles.sentenceTranslationText}>{translation.t}</Text>
                                    </View>
                                </ScrollView>
                            )}
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.btn, styles.addBtn]}
                                onPress={() => openDeckPicker(true)}
                                disabled={translation.loading}
                            >
                                <Text style={styles.btnText}>+ Desteye Ekle</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.btn, styles.closeBtn]}
                                onPress={() => setSentenceTranslationVisible(false)}
                            >
                                <Text style={styles.btnText}>Kapat</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── Deck Picker Modal ───────────────────── */}
            <Modal visible={deckPickerVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Hangi desteye ekleyelim?</Text>

                        {fetchingDecks ? (
                            <ActivityIndicator color="#1DB954" style={{ marginVertical: 24 }} />
                        ) : decks.length === 0 ? (
                            <View style={styles.noDeckContainer}>
                                <Text style={styles.noDeckText}>
                                    Henüz desten yok.{'\n'}
                                    Önce "Destelerim" ekranından bir deste oluştur.
                                </Text>
                                <TouchableOpacity
                                    style={[styles.btn, styles.addBtn, { marginTop: 16 }]}
                                    onPress={() => { setDeckPickerVisible(false); navigation.navigate('Decks'); }}
                                >
                                    <Text style={styles.btnText}>📚 Destelerime Git</Text>
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
                                        onPress={() => addToSelectedDeck(item, false)}
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
                            style={[styles.btn, styles.closeBtn, { marginTop: 16 }]}
                            onPress={() => setDeckPickerVisible(false)}
                        >
                            <Text style={styles.btnText}>İptal</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── Sentence Deck Picker Modal ───────────────────── */}
            <Modal visible={sentenceDeckPickerVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Hangi cümle destesine ekleyelim?</Text>

                        {fetchingDecks ? (
                            <ActivityIndicator color="#1DB954" style={{ marginVertical: 24 }} />
                        ) : sentenceDecks.length === 0 ? (
                            <View style={styles.noDeckContainer}>
                                <Text style={styles.noDeckText}>
                                    Henüz cümle destesi yok.{'\n'}
                                    Önce "Cümlelerim" ekranından bir deste oluştur.
                                </Text>
                                <TouchableOpacity
                                    style={[styles.btn, styles.addBtn, { marginTop: 16 }]}
                                    onPress={() => { setSentenceDeckPickerVisible(false); navigation.navigate('SentenceDecks'); }}
                                >
                                    <Text style={styles.btnText}>📚 Cümlelerime Git</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <FlatList
                                data={sentenceDecks}
                                keyExtractor={(d) => d.id.toString()}
                                style={{ maxHeight: 300 }}
                                renderItem={({ item, index }) => (
                                    <TouchableOpacity
                                        style={styles.deckOption}
                                        onPress={() => addToSelectedDeck(item, true)}
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
                            style={[styles.btn, styles.closeBtn, { marginTop: 16 }]}
                            onPress={() => setSentenceDeckPickerVisible(false)}
                        >
                            <Text style={styles.btnText}>İptal</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    header: { flexDirection: 'row', justifyContent: 'center', gap: 10, padding: 12, backgroundColor: '#1a1a1a', flexWrap: 'wrap' },
    headerBtn: { backgroundColor: '#1DB954', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 },
    decksBtn: { backgroundColor: '#2D46B9' },
    sentenceDecksBtn: { backgroundColor: '#7B5EA7' },
    settingsBtn: { backgroundColor: '#535353' },
    headerBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
    loader: { marginTop: 60 },
    placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    placeholderEmoji: { fontSize: 64, marginBottom: 16 },
    placeholderText: { fontSize: 16, color: '#b3b3b3', textAlign: 'center' },

    toast: {
        position: 'absolute', bottom: 40, left: 20, right: 20,
        padding: 16, borderRadius: 12, zIndex: 9999,
        shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8,
    },
    toastSuccess: { backgroundColor: '#1DB954' },
    toastError: { backgroundColor: '#E91429' },
    toastText: { color: '#fff', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#282828', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, position: 'relative' as const },
    providerBadge: {
        position: 'absolute' as const, top: 12, right: 16,
        fontSize: 10, color: '#666', fontWeight: '500' as const,
        letterSpacing: 0.5, textTransform: 'uppercase' as const,
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
    originalText: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#fff' },
    translationBox: { backgroundColor: '#1a1a1a', padding: 16, borderRadius: 12, marginBottom: 20 },
    translationText: { fontSize: 20, color: '#1DB954', fontWeight: 'bold' },
    meaningText: { fontSize: 13, color: '#b3b3b3', marginTop: 10, fontStyle: 'italic' },
    exampleContainer: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#2e2e2e' },
    exampleLabel: { fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    btn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
    addBtn: { backgroundColor: '#1DB954' },
    closeBtn: { backgroundColor: '#535353' },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

    sentenceModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', flexDirection: 'row', justifyContent: 'flex-end' },
    sentenceModalContent: {
        backgroundColor: '#1a1a1a',
        width: Platform.OS === 'web' ? 450 : '85%',
        height: '100%',
        paddingHorizontal: 28,
        paddingTop: 60,
        paddingBottom: 40,
        justifyContent: 'center',
        position: 'relative' as const
    },
    sentenceTextContainer: { flex: 1, marginVertical: 10 },
    sentenceOriginalScroll: { flex: 1, marginBottom: 10 },
    sentenceTranslationScroll: { flex: 1 },
    sentenceOriginalText: { fontSize: 24, fontWeight: 'bold', color: '#fff', lineHeight: 34 },
    sentenceTranslationBox: { backgroundColor: '#282828', padding: 24, borderRadius: 16, marginBottom: 10 },
    sentenceTranslationText: { fontSize: 22, color: '#1DB954', fontWeight: 'bold', lineHeight: 32 },

    noDeckContainer: { alignItems: 'center', paddingVertical: 16 },
    noDeckText: { color: '#b3b3b3', textAlign: 'center', fontSize: 15, lineHeight: 24 },
    deckOption: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#404040'
    },
    deckDot: { width: 14, height: 14, borderRadius: 7, marginRight: 14 },
    deckOptionText: { flex: 1, fontSize: 16, color: '#fff', fontWeight: '500' },
});
