import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthContext } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { RootStackParamList } from '../types/navigation';
import { colors, radius, spacing, typography } from '../theme';
import { motion } from 'framer-motion';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProfileDetails'>;
const Mv = motion.div as any;

export default function ProfileDetailsScreen() {
    const { user, login, logout } = useContext(AuthContext);
    const navigation = useNavigation<NavigationProp>();
    const [newUsername, setNewUsername] = useState(user?.username || '');
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState(false);

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
        Alert.alert('Hesabı Sil', 'Hesabınızı ve tüm verilerinizi silmek istediğinize emin misiniz?', [
            { text: 'İptal', style: 'cancel' },
            {
                text: 'Evet, Sil', style: 'destructive',
                onPress: async () => {
                    setDeleting(true);
                    try {
                        await apiClient.delete('/auth/me');
                        await logout();
                        Alert.alert('Başarılı', 'Hesabınız silindi.');
                    } catch { Alert.alert('Hata', 'Hesap silinirken bir sorun oluştu.'); setDeleting(false); }
                }
            }
        ]);
    };

    return (
        <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
            {/* Avatar card */}
            <Mv initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} style={s.avatarCard}>
                <View style={s.avatar}>
                    <Text style={s.avatarText}>{user.username.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={s.avatarName}>{user.username}</Text>
                <Text style={s.avatarSub}>Öğrenci hesabı</Text>
            </Mv>

            {/* Username section */}
            <Mv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={s.section}>
                <Text style={s.sectionLabel}>KULLANICI ADI</Text>
                <View style={s.inputRow}>
                    <TextInput
                        style={s.input}
                        value={newUsername}
                        onChangeText={setNewUsername}
                        placeholder="Yeni kullanıcı adı"
                        placeholderTextColor={colors.textMuted}
                    />
                    <Mv whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                        <TouchableOpacity style={s.updateBtn} onPress={handleUpdateUsername} disabled={updating}>
                            {updating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.updateBtnTxt}>Güncelle</Text>}
                        </TouchableOpacity>
                    </Mv>
                </View>
            </Mv>

            {/* Navigation cards */}
            <Mv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} style={s.section}>
                <Text style={s.sectionLabel}>İÇERİKLERİM</Text>
                {[
                    { icon: '📚', title: 'Kelime Desteleri', desc: 'Tüm kelime destelerini görüntüle', screen: 'Decks' as const },
                    { icon: '📝', title: 'Cümle Desteleri', desc: 'Cümle destelerini görüntüle', screen: 'SentenceDecks' as const },
                ].map((item, i) => (
                    <Mv key={item.screen}
                        whileHover={{ x: 4, boxShadow: '0 6px 24px rgba(0,0,0,0.4)' }}
                        whileTap={{ scale: 0.98 }}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.08 }}
                        style={{ marginBottom: 10 }}>
                        <TouchableOpacity style={s.navCard} onPress={() => navigation.navigate(item.screen as any)}>
                            <View style={s.navIcon}><Text style={{ fontSize: 20 }}>{item.icon}</Text></View>
                            <View style={s.navBody}>
                                <Text style={s.navTitle}>{item.title}</Text>
                                <Text style={s.navDesc}>{item.desc}</Text>
                            </View>
                            <Text style={{ fontSize: 20, color: colors.textMuted }}>›</Text>
                        </TouchableOpacity>
                    </Mv>
                ))}
            </Mv>

            {/* Danger zone */}
            <Mv initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} style={s.danger}>
                <TouchableOpacity style={s.deleteBtn} onPress={handleDeleteAccount} disabled={deleting}>
                    {deleting
                        ? <ActivityIndicator size="small" color={colors.danger} />
                        : <Text style={s.deleteBtnTxt}>Hesabı Kalıcı Olarak Sil</Text>
                    }
                </TouchableOpacity>
            </Mv>
        </ScrollView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: spacing.lg, paddingBottom: 48 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
    avatarCard: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.lg, border: `1px solid ${colors.border}` } as any,
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 14, boxShadow: `0 4px 20px ${colors.primary}50` } as any,
    avatarText: { fontSize: 34, fontWeight: '800', color: colors.bg } as any,
    avatarName: { ...typography.h2, marginBottom: 4 },
    avatarSub: { ...typography.caption, color: colors.textMuted },
    section: { marginBottom: spacing.lg } as any,
    sectionLabel: { ...typography.label, marginBottom: 12 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 } as any,
    input: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, color: colors.textPrimary, fontSize: 15, border: `1px solid ${colors.border}`, fontFamily: 'inherit' } as any,
    updateBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center', boxShadow: `0 4px 14px ${colors.primary}40` } as any,
    updateBtnTxt: { color: colors.bg, fontWeight: '700', fontSize: 15 } as any,
    navCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, border: `1px solid ${colors.border}`, cursor: 'pointer' } as any,
    navIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceHigh, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    navBody: { flex: 1 },
    navTitle: { ...typography.bodyBold, marginBottom: 3 },
    navDesc: { ...typography.caption },
    danger: { marginTop: spacing.xl, alignItems: 'center' } as any,
    deleteBtn: { padding: 14 },
    deleteBtnTxt: { color: colors.danger, fontSize: 14, textDecorationLine: 'underline' } as any,
});
