import React, { useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View, Animated } from 'react-native';
import { apiClient } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { showAlert } from '../utils/alert';
import { colors, radius, spacing, typography } from '../theme';

interface LoginModalProps { visible: boolean; onClose: () => void; }

export default function LoginModal({ visible, onClose }: LoginModalProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useContext(AuthContext);

    const scaleAnim = useRef(new Animated.Value(0.88)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true })
            ]).start();
        } else {
            scaleAnim.setValue(0.88);
            fadeAnim.setValue(0);
        }
    }, [visible]);

    const resetForm = () => { setUsername(''); setPassword(''); };

    const handleSubmit = async () => {
        if (!username.trim() || !password) { showAlert('Hata', 'Lütfen kullanıcı adı ve şifre giriniz.'); return; }
        setLoading(true);
        try {
            const endpoint = isLogin ? '/auth/login' : '/auth/register';
            const response = await apiClient.post(endpoint, { username: username.trim(), password });
            await login(response.data);
            resetForm();
            showAlert('Başarılı', isLogin ? 'Giriş yapıldı.' : 'Kayıt başarılı, giriş yapıldı.');
            onClose();
        } catch (error: any) {
            showAlert('Hata', error.response?.data?.detail || 'Bir hata oluştu.');
        } finally { setLoading(false); }
    };

    const handleClose = () => { resetForm(); setIsLogin(true); onClose(); };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
            <View style={s.overlay}>
                <Animated.View style={[s.card, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                    {/* Brand mark */}
                    <View style={s.brand}>
                        <Text style={s.brandIcon}>🌐</Text>
                        <Text style={s.brandName}>LinguScan</Text>
                    </View>

                    <Text style={s.title}>{isLogin ? 'Hoş Geldin! 👋' : 'Hesap Oluştur'}</Text>
                    <Text style={s.subtitle}>{isLogin ? 'Öğrenmeye devam etmek için giriş yap' : 'Ücretsiz başla, dil öğren'}</Text>

                    <TextInput
                        style={s.input}
                        placeholder="Kullanıcı Adı"
                        placeholderTextColor={colors.textMuted}
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    <TextInput
                        style={s.input}
                        placeholder="Şifre"
                        placeholderTextColor={colors.textMuted}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>{isLogin ? 'Giriş Yap' : 'Kayıt Ol'}</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity style={s.switchBtn} onPress={() => setIsLogin(prev => !prev)}>
                        <Text style={s.switchBtnText}>
                            {isLogin ? 'Hesabın yok mu? ' : 'Zaten hesabın var mı? '}
                            <Text style={s.switchBtnHighlight}>{isLogin ? 'Kayıt Ol' : 'Giriş Yap'}</Text>
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={s.closeBtn} onPress={handleClose}>
                        <Text style={s.closeBtnText}>Vazgeç</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
    card: {
        width: '100%', maxWidth: 380,
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.xl,
        alignItems: 'center',
        borderWidth: 1, borderColor: colors.border,
    },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.lg } as any,
    brandIcon: { fontSize: 24 },
    brandName: { fontSize: 18, fontWeight: '800', color: colors.textPrimary } as any,
    title: { ...typography.h2, textAlign: 'center', marginBottom: 6 },
    subtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg } as any,
    input: {
        width: '100%',
        backgroundColor: colors.surfaceHigh,
        color: colors.textPrimary,
        padding: 14,
        borderRadius: radius.md,
        marginBottom: 12,
        fontSize: 15,
        borderWidth: 1, borderColor: colors.border,
    },
    submitBtn: {
        width: '100%',
        backgroundColor: colors.primary,
        padding: 14,
        borderRadius: radius.md,
        alignItems: 'center',
        marginTop: 4,
    },
    submitBtnText: { color: colors.bg, fontWeight: '700', fontSize: 16 } as any,
    switchBtn: { marginTop: 20 },
    switchBtnText: { color: colors.textMuted, fontSize: 14 } as any,
    switchBtnHighlight: { color: colors.primary, fontWeight: '700' } as any,
    closeBtn: { marginTop: 16 },
    closeBtnText: { color: colors.textMuted, fontSize: 13 } as any,
});
