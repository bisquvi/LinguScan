import React, { useContext, useEffect, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    Alert, ActivityIndicator, ScrollView, Dimensions, Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthContext } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { RootStackParamList } from '../types/navigation';
import { colors, radius, spacing, typography } from '../theme';
import { Library, PenTool, ChevronRight } from 'lucide-react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProfileDetails'>;

const { width: SCREEN_W } = Dimensions.get('window');
const IS_MOBILE = SCREEN_W < 768;

export default function ProfileDetailsScreen() {
    const { user, login, logout } = useContext(AuthContext);
    const navigation = useNavigation<NavigationProp>();
    const [newUsername, setNewUsername] = useState(user?.username || '');
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Entrance animation
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
        ]).start();
    }, []);

    if (!user) return (
        <View style={s.center}>
            <Text style={{ color: colors.danger, fontSize: 16 }}>Lütfen önce giriş yapın.</Text>
        </View>
    );

    const handleUpdateUsername = async () => {
        if (!newUsername.trim()) { Alert.alert('Hata', 'Kullanıcı adı boş olamaz.'); return; }
        if (newUsername === user.username) { Alert.alert('Bilgi', 'Kullanıcı adı zaten aynı.'); return; }
        setUpdating(true);
        try {
            await apiClient.put('/auth/me', { username: newUsername });
            await login({ ...user, username: newUsername });
            Alert.alert('Başarılı', 'Kullanıcı adı güncellendi.');
        } catch (error: any) {
            Alert.alert('Hata', error.response?.data?.detail || 'Kullanıcı adı güncellenemedi.');
        } finally { setUpdating(false); }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Hesabı Sil',
            'Hesabınızı ve tüm verilerinizi silmek istediğinize emin misiniz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Evet, Sil', style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            await apiClient.delete('/auth/me');
                            await logout();
                            Alert.alert('Başarılı', 'Hesabınız silindi.');
                        } catch {
                            Alert.alert('Hata', 'Hesap silinirken bir sorun oluştu.');
                            setDeleting(false);
                        }
                    },
                },
            ],
        );
    };

    const NAV_ITEMS = [
        { icon: <Library size={20} color={colors.textPrimary} />, title: 'Kelime Desteleri', desc: 'Tüm kelime destelerini görüntüle', screen: 'Decks' as const },
        { icon: <PenTool size={20} color={colors.textPrimary} />, title: 'Cümle Desteleri', desc: 'Cümle destelerini görüntüle', screen: 'SentenceDecks' as const },
    ];

    return (
        <ScrollView
            style={s.container}
            contentContainerStyle={[s.content, IS_MOBILE && s.contentMobile]}
            showsVerticalScrollIndicator={false}
        >
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                {/* Avatar card */}
                <View style={s.avatarCard}>
                    <View style={s.avatar}>
                        <Text style={s.avatarText}>{user.username.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={s.avatarName}>{user.username}</Text>
                    <Text style={s.avatarSub}>Öğrenci hesabı</Text>
                </View>

                {/* Username section */}
                <View style={s.section}>
                    <Text style={s.sectionLabel}>KULLANICI ADI</Text>
                    <View style={s.inputRow}>
                        <TextInput
                            style={s.input}
                            value={newUsername}
                            onChangeText={setNewUsername}
                            placeholder="Yeni kullanıcı adı"
                            placeholderTextColor={colors.textMuted}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <TouchableOpacity style={s.updateBtn} onPress={handleUpdateUsername} disabled={updating}>
                            {updating
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <Text style={s.updateBtnTxt}>Güncelle</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Navigation cards */}
                <View style={s.section}>
                    <Text style={s.sectionLabel}>İÇERİKLERİM</Text>
                    {NAV_ITEMS.map((item) => (
                        <TouchableOpacity
                            key={item.screen}
                            style={s.navCard}
                            onPress={() => navigation.navigate(item.screen as any)}
                            activeOpacity={0.75}
                        >
                            <View style={s.navIcon}>
                                {item.icon}
                            </View>
                            <View style={s.navBody}>
                                <Text style={s.navTitle}>{item.title}</Text>
                                <Text style={s.navDesc}>{item.desc}</Text>
                            </View>
                            <ChevronRight size={22} color={colors.textMuted} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Danger zone */}
                <View style={s.danger}>
                    <TouchableOpacity style={s.deleteBtn} onPress={handleDeleteAccount} disabled={deleting}>
                        {deleting
                            ? <ActivityIndicator size="small" color={colors.danger} />
                            : <Text style={s.deleteBtnTxt}>Hesabı Kalıcı Olarak Sil</Text>
                        }
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </ScrollView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: spacing.lg, paddingBottom: 48 },
    contentMobile: { padding: spacing.md, paddingBottom: 32 },
    center: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
        backgroundColor: colors.bg,
    },
    avatarCard: {
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: IS_MOBILE ? spacing.lg : spacing.xl,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    avatar: {
        width: IS_MOBILE ? 68 : 80,
        height: IS_MOBILE ? 68 : 80,
        borderRadius: IS_MOBILE ? 34 : 40,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
    },
    avatarText: {
        fontSize: IS_MOBILE ? 28 : 34,
        fontWeight: '800',
        color: colors.bg,
    } as any,
    avatarName: { ...typography.h2, marginBottom: 4, fontSize: IS_MOBILE ? 18 : 22 } as any,
    avatarSub: { ...typography.caption, color: colors.textMuted },
    section: { marginBottom: spacing.lg },
    sectionLabel: { ...typography.label, marginBottom: 12 },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    } as any,
    input: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        paddingVertical: IS_MOBILE ? 12 : 14,
        paddingHorizontal: 14,
        color: colors.textPrimary,
        fontSize: IS_MOBILE ? 14 : 15,
        borderWidth: 1,
        borderColor: colors.border,
    },
    updateBtn: {
        backgroundColor: colors.primary,
        borderRadius: radius.md,
        paddingVertical: IS_MOBILE ? 12 : 14,
        paddingHorizontal: IS_MOBILE ? 14 : 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    updateBtnTxt: {
        color: colors.bg,
        fontWeight: '700',
        fontSize: IS_MOBILE ? 14 : 15,
    },
    navCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: IS_MOBILE ? 14 : 16,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 10,
    },
    navIcon: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: colors.surfaceHigh,
        justifyContent: 'center', alignItems: 'center', marginRight: 14,
    },
    navBody: { flex: 1 },
    navTitle: { ...typography.bodyBold, marginBottom: 3 },
    navDesc: { ...typography.caption },
    danger: { marginTop: spacing.xl, alignItems: 'center' },
    deleteBtn: { padding: 14 },
    deleteBtnTxt: {
        color: colors.danger,
        fontSize: 14,
        textDecorationLine: 'underline',
    } as any,
});
