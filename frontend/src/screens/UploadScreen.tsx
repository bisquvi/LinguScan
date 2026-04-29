import React, { useContext, useEffect, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, ActivityIndicator,
    Modal, TouchableOpacity, Platform, FlatList, ScrollView, Image, Animated, Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';
import ImageOCRViewer from '../components/ImageOCRViewer';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthContext } from '../context/AuthContext';
import LoginModal from '../components/LoginModal';
import { RootStackParamList } from '../types/navigation';
import { OCRResult, ViewMode } from '../types/ocr';
import { showAlert } from '../utils/alert';

const GALLERY_KEY = 'gallery_history';
const MAX_GALLERY = 5;

interface GalleryItem {
    base64: string;
    ocrData: OCRResult[];
    timestamp: number;
}

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
    const [zoomScale, setZoomScale] = useState(1);
    const [toolsOpen, setToolsOpen] = useState(false);
    const [loginModalVisible, setLoginModalVisible] = useState(false);
    const { user, logout } = useContext(AuthContext);
    const animation = useRef(new Animated.Value(0)).current;

    const toggleTools = () => {
        const toValue = toolsOpen ? 0 : 1;
        Animated.spring(animation, {
            toValue,
            useNativeDriver: false,
            friction: 5,
            tension: 40
        }).start();
        setToolsOpen(!toolsOpen);
    };

    const sat1X = animation.interpolate({ inputRange: [0, 1], outputRange: [0, -45] });
    const sat1Y = animation.interpolate({ inputRange: [0, 1], outputRange: [0, -80] });
    
    const sat2X = animation.interpolate({ inputRange: [0, 1], outputRange: [0, -85] });
    const sat2Y = animation.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });

    // View mode state
    const [viewMode, setViewMode] = useState<ViewMode>('words');

    // Gallery state
    const [gallery, setGallery] = useState<GalleryItem[]>([]);
    const [galleryVisible, setGalleryVisible] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);

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
    const requestLogin = () => {
        showAlert('Giriş Gerekli', 'Bu işlem için lütfen giriş yapınız.');
        setLoginModalVisible(true);
    };

    // ── Gallery helpers ─────────────────────────────────────────────
    useEffect(() => {
        loadGallery();
    }, []);

    const loadGallery = async () => {
        try {
            const raw = await AsyncStorage.getItem(GALLERY_KEY);
            if (raw) setGallery(JSON.parse(raw));
        } catch { }
    };

    const blobToBase64 = (blobUrl: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            fetch(blobUrl)
                .then(r => r.blob())
                .then(blob => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                })
                .catch(reject);
        });
    };

    const saveToGallery = async (uri: string, ocr: OCRResult[]) => {
        try {
            let base64 = uri;
            if (uri.startsWith('blob:')) {
                base64 = await blobToBase64(uri);
            }
            const item: GalleryItem = { base64, ocrData: ocr, timestamp: Date.now() };
            const updated = [item, ...gallery.filter(g => g.base64 !== base64)].slice(0, MAX_GALLERY);
            setGallery(updated);
            await AsyncStorage.setItem(GALLERY_KEY, JSON.stringify(updated));
        } catch { }
    };

    const selectFromGallery = (item: GalleryItem) => {
        // Force re-mount of ImageOCRViewer even if same image is re-selected
        setImageUri(null);
        setOcrData([]);
        setTimeout(() => {
            setImageUri(item.base64);
            setOcrData(item.ocrData);
            setViewMode('words');
            setZoomScale(1);
        }, 0);
        setGalleryVisible(false);
    };

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
        processImageWeb(file, uri);
        event.target.value = '';
    };

    const processImageWeb = async (file: File, uri: string) => {
        setLoading(true);
        setOcrData([]);
        setViewMode('words');
        setZoomScale(1);
        try {
            const formData = new FormData();
            formData.append('file', file, file.name);
            const response = await apiClient.post('/process-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setOcrData(response.data);
            await saveToGallery(uri, response.data);
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
        setViewMode('words');
        setZoomScale(1);
        try {
            const formData = new FormData();
            formData.append('file', { uri: asset.uri, name: 'upload.jpg', type: 'image/jpeg' } as any);
            const response = await apiClient.post('/process-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setOcrData(response.data);
            saveToGallery(asset.uri, response.data);
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
        if (!user) {
            requestLogin();
            return;
        }

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
                {/* Hamburger Menu & Profile - Far Left */}
                <View style={{ zIndex: 999, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity style={styles.hamburgerBtn} onPress={() => setMenuOpen(!menuOpen)}>
                        <Text style={styles.hamburgerText}>☰</Text>
                    </TouchableOpacity>

                    {menuOpen && (
                        <View style={styles.dropdownMenu}>
                            <TouchableOpacity
                                style={styles.dropdownItem}
                                onPress={() => { setMenuOpen(false); setGalleryVisible(true); }}
                            >
                                <Text style={styles.dropdownItemText}>🖼️ Galeri</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Center Buttons */}
                <View style={styles.headerBtns}>
                    <TouchableOpacity style={styles.headerBtn} onPress={pickImage}>
                        <Text style={styles.headerBtnText}>📷 Görsel Seç</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.headerBtn, styles.decksBtn]} onPress={() => {
                        if (!user) { Alert.alert('Erişim Engellendi', 'Bu işlem için lütfen giriş yapınız.'); return; }
                        navigation.navigate('Decks');
                    }}>
                        <Text style={styles.headerBtnText}>📚 Destelerim</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.headerBtn, styles.sentenceDecksBtn]} onPress={() => {
                        if (!user) { Alert.alert('Erişim Engellendi', 'Bu işlem için lütfen giriş yapınız.'); return; }
                        navigation.navigate('SentenceDecks');
                    }}>
                        <Text style={styles.headerBtnText}>📚 Cümlelerim</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.headerBtn, styles.settingsBtn]} onPress={() => {
                        if (!user) { requestLogin(); return; }
                        navigation.navigate('Settings');
                    }}>
                        <Text style={styles.headerBtnText}>⚙️ Ayarlar</Text>
                    </TouchableOpacity>
                </View>
            
                {/* Profile Circle - Far Right */}
                <View style={{ zIndex: 999, flexDirection: 'row', alignItems: 'center', gap: 8, position: 'relative' }}>
                    <TouchableOpacity 
                        style={styles.profileBtn} 
                        onPress={() => {
                            if (user) {
                                setProfileMenuOpen(!profileMenuOpen);
                            } else {
                                setLoginModalVisible(true);
                            }
                        }}
                    >
                        <Text style={styles.profileText}>{user ? user.username.charAt(0).toUpperCase() : '?'}</Text>
                    </TouchableOpacity>

                    {profileMenuOpen && user && (
                        <View style={[styles.dropdownMenu, { right: 0, left: 'auto', minWidth: 180 }]}>
                            <TouchableOpacity
                                style={styles.dropdownItem}
                                onPress={() => { setProfileMenuOpen(false); navigation.navigate('ProfileDetails'); }}
                            >
                                <Text style={styles.dropdownItemText}>👤 Profil Ayrıntıları</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.dropdownItem}
                                onPress={() => { setProfileMenuOpen(false); logout(); }}
                            >
                                <Text style={[styles.dropdownItemText, { color: '#E91429' }]}>🚪 Çıkış Yap</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>

            {(!imageUri && loading) && <ActivityIndicator size="large" color="#1DB954" style={styles.loader} />}

            {imageUri && (
                <View style={{ flex: 1 }}>
                    <ImageOCRViewer
                        imageUri={imageUri}
                        ocrData={ocrData}
                        onWordPress={handleTextPress}
                        onSentencePress={handleSentencePress}
                        viewMode={viewMode}
                        onViewModeChange={setViewMode}
                        zoomScale={zoomScale}
                    />
                    {loading && (
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 10 }]}>
                            <ActivityIndicator size="large" color="#1DB954" />
                            <Text style={{ color: '#fff', marginTop: 12, fontWeight: 'bold', fontSize: 16 }}>Metinler taranıyor...</Text>
                        </View>
                    )}
                </View>
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

            {/* ── Gallery Modal ────────────────────────────── */}
            <Modal visible={galleryVisible} transparent animationType="slide">
                <View style={styles.galleryOverlay}>
                    <View style={styles.galleryContent}>
                        <Text style={styles.galleryTitle}>🖼️ Galeri</Text>
                        <Text style={styles.gallerySubtitle}>Son yüklenen görseller</Text>

                        {gallery.length === 0 ? (
                            <View style={styles.galleryEmpty}>
                                <Text style={styles.galleryEmptyText}>Henüz görsel yüklenmedi.</Text>
                            </View>
                        ) : (
                            <ScrollView contentContainerStyle={styles.galleryGrid}>
                                {gallery.map((item, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={styles.galleryItem}
                                        onPress={() => selectFromGallery(item)}
                                        activeOpacity={0.7}
                                    >
                                        <Image
                                            source={{ uri: item.base64 }}
                                            style={styles.galleryThumb}
                                            resizeMode="cover"
                                        />
                                        <Text style={styles.galleryDate}>
                                            {new Date(item.timestamp).toLocaleDateString('tr-TR')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}

                        <TouchableOpacity
                            style={[styles.btn, styles.closeBtn, { marginTop: 16 }]}
                            onPress={() => setGalleryVisible(false)}
                        >
                            <Text style={styles.btnText}>Kapat</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            {/* ── Zoom Controls ────────────────────────────── */}
            {/* ── Animated Floating Zoom Tools ──────────────────── */}
            <View style={styles.floatingToolsContainer}>
                {/* String 1 (+) */}
                <Animated.View style={[styles.stringLine, {
                    width: 92,
                    transformOrigin: 'left' as any,
                    transform: [{ rotate: '-119.3deg' }, { scaleX: animation }]
                }]} />
                
                {/* String 2 (-) */}
                <Animated.View style={[styles.stringLine, {
                    width: 90,
                    transformOrigin: 'left' as any,
                    transform: [{ rotate: '-160.5deg' }, { scaleX: animation }]
                }]} />

                {/* Sat 1 (+) */}
                <Animated.View style={[styles.satelliteBtnWrapper, { transform: [{ translateX: sat1X }, { translateY: sat1Y }, { scale: animation }] }]}>
                    <TouchableOpacity
                        style={[styles.zoomBtn, !imageUri && styles.zoomBtnDisabled]}
                        disabled={!imageUri}
                        onPress={() => setZoomScale(prev => prev + 0.25)}
                    >
                        <Text style={styles.zoomBtnText}>+</Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* Sat 2 (-) */}
                <Animated.View style={[styles.satelliteBtnWrapper, { transform: [{ translateX: sat2X }, { translateY: sat2Y }, { scale: animation }] }]}>
                    <TouchableOpacity
                        style={[styles.zoomBtn, (!imageUri || zoomScale <= 1) && styles.zoomBtnDisabled]}
                        disabled={!imageUri || zoomScale <= 1}
                        onPress={() => setZoomScale(prev => Math.max(1, prev - 0.25))}
                    >
                        <Text style={styles.zoomBtnText}>-</Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* Main Tool Button */}
                <TouchableOpacity style={styles.mainToolBtn} onPress={toggleTools} activeOpacity={0.8}>
                    <Animated.Text style={[styles.mainToolBtnIcon, {
                        transform: [{ rotate: animation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }]
                    }]}>
                        {toolsOpen ? '✖' : '🛠'}
                    </Animated.Text>
                </TouchableOpacity>
            </View>

            {/* Auth Modal */}
            <LoginModal 
                visible={loginModalVisible} 
                onClose={() => setLoginModalVisible(false)} 
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#1a1a1a', zIndex: 100 },
    headerBtns: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 10, flexWrap: 'wrap' },
    hamburgerBtn: {
        width: 40, height: 40, borderRadius: 10,
        backgroundColor: '#333', alignItems: 'center', justifyContent: 'center',
    },
    hamburgerText: { fontSize: 20, color: '#fff' },
    profileBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#1DB954', alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#fff'
    },
    profileText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    dropdownMenu: {
        position: 'absolute', top: 46, left: 0,
        backgroundColor: '#282828', borderRadius: 12,
        paddingVertical: 6, minWidth: 140,
        shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
        zIndex: 999, elevation: 10,
        borderWidth: 1, borderColor: '#3a3a3a',
    },
    dropdownItem: { paddingVertical: 12, paddingHorizontal: 16 },
    dropdownItemText: { color: '#fff', fontSize: 15, fontWeight: '500' },
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

    // Gallery styles
    galleryOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    galleryContent: {
        backgroundColor: '#1a1a1a', borderRadius: 20, padding: 28,
        width: Platform.OS === 'web' ? 500 : '90%',
        maxHeight: '80%',
    },
    galleryTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
    gallerySubtitle: { fontSize: 13, color: '#888', marginBottom: 20 },
    galleryEmpty: { paddingVertical: 40, alignItems: 'center' },
    galleryEmptyText: { color: '#666', fontSize: 15 },
    galleryGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center',
    },
    galleryItem: {
        width: 130, borderRadius: 12, overflow: 'hidden',
        backgroundColor: '#282828', borderWidth: 1, borderColor: '#333',
    },
    galleryThumb: { width: 130, height: 100, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
    galleryDate: { color: '#aaa', fontSize: 11, textAlign: 'center', paddingVertical: 8 },

    floatingToolsContainer: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        zIndex: 200,
    },
    mainToolBtn: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#1DB954',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 6,
        zIndex: 202,
    },
    mainToolBtnIcon: {
        fontSize: 22,
        color: '#fff',
    },
    satelliteBtnWrapper: {
        position: 'absolute',
        width: 48,
        height: 48,
        left: 4,
        top: 4,
        zIndex: 201,
    },
    zoomBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#282828',
        borderWidth: 1.5,
        borderColor: '#1DB954',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    zoomBtnDisabled: {
        borderColor: '#535353',
        backgroundColor: '#1a1a1a',
    },
    zoomBtnText: {
        fontSize: 24,
        color: '#fff',
        fontWeight: 'bold',
        lineHeight: 28,
    },
    stringLine: {
        position: 'absolute',
        height: 2,
        backgroundColor: '#1DB954',
        left: 28,
        top: 27,
        zIndex: 200,
    },
});
