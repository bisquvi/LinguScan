import React, { useContext, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { apiClient } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { showAlert } from '../utils/alert';

interface LoginModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function LoginModal({ visible, onClose }: LoginModalProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useContext(AuthContext);

    const resetForm = () => {
        setUsername('');
        setPassword('');
    };

    const handleSubmit = async () => {
        if (!username.trim() || !password) {
            showAlert('Hata', 'Lütfen kullanıcı adı ve şifre giriniz.');
            return;
        }

        setLoading(true);
        try {
            const endpoint = isLogin ? '/auth/login' : '/auth/register';
            const response = await apiClient.post(endpoint, {
                username: username.trim(),
                password,
            });

            await login(response.data);
            resetForm();
            showAlert('Başarılı', isLogin ? 'Giriş yapıldı.' : 'Kayıt başarılı, giriş yapıldı.');
            onClose();
        } catch (error: any) {
            console.error(error);
            const message = error.response?.data?.detail || 'Bir hata oluştu.';
            showAlert('Hata', message);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        resetForm();
        setIsLogin(true);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <Text style={styles.title}>{isLogin ? 'Giriş Yap' : 'Kayıt Ol'}</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Kullanıcı Adı"
                        placeholderTextColor="#aaa"
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Şifre"
                        placeholderTextColor="#aaa"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitBtnText}>{isLogin ? 'Giriş' : 'Kayıt Ol'}</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.switchBtn} onPress={() => setIsLogin((prev) => !prev)}>
                        <Text style={styles.switchBtnText}>
                            {isLogin ? 'Hesabın yok mu? Kayıt Ol' : 'Zaten hesabın var mı? Giriş Yap'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
                        <Text style={styles.closeBtnText}>İptal</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    modalContainer: { width: 300, backgroundColor: '#282828', borderRadius: 12, padding: 24, alignItems: 'center' },
    title: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
    input: { width: '100%', backgroundColor: '#1a1a1a', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 12 },
    submitBtn: { width: '100%', backgroundColor: '#1DB954', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
    submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    switchBtn: { marginTop: 16 },
    switchBtnText: { color: '#aaa', fontSize: 13, textDecorationLine: 'underline' },
    closeBtn: { marginTop: 24 },
    closeBtnText: { color: '#ff4444', fontSize: 14, fontWeight: 'bold' },
})
