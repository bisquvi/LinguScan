import React, { useContext, useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthContext } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProfileDetails'>;

export default function ProfileDetailsScreen() {
    const { user, login, logout } = useContext(AuthContext);
    const navigation = useNavigation<NavigationProp>();

    const [newUsername, setNewUsername] = useState(user?.username || '');
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState(false);

    if (!user) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>Lütfen önce giriş yapın.</Text>
            </View>
        );
    }

    const handleUpdateUsername = async () => {
        if (!newUsername.trim()) {
            Alert.alert('Hata', 'Kullanıcı adı boş olamaz.');
            return;
        }
        if (newUsername === user.username) {
            Alert.alert('Bilgi', 'Kullanıcı adı zaten aynı.');
            return;
        }

        setUpdating(true);
        try {
            await apiClient.put('/auth/me', { username: newUsername });
            await login({ ...user, username: newUsername });
            Alert.alert('Başarılı', 'Kullanıcı adı güncellendi.');
        } catch (error: any) {
            Alert.alert('Hata', error.response?.data?.detail || 'Kullanıcı adı güncellenemedi.');
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Hesabı Sil',
            'Hesabınızı ve tüm verilerinizi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Evet, Sil',
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            await apiClient.delete('/auth/me');
                            await logout();
                            Alert.alert('Başarılı', 'Hesabınız silindi.');
                        } catch (error) {
                            Alert.alert('Hata', 'Hesap silinirken bir sorun oluştu.');
                            setDeleting(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
                <Text style={styles.title}>Profil Ayrıntıları</Text>
                <Text style={styles.subtitle}>Hesap bilgilerinizi buradan yönetebilirsiniz.</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Kullanıcı Adı</Text>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={newUsername}
                        onChangeText={setNewUsername}
                        placeholder="Yeni kullanıcı adınızı girin"
                        placeholderTextColor="#888"
                    />
                    <TouchableOpacity
                        style={styles.updateButton}
                        onPress={handleUpdateUsername}
                        disabled={updating}
                    >
                        {updating ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.updateButtonText}>Güncelle</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>İçeriklerim</Text>
                <TouchableOpacity style={styles.navCard} onPress={() => navigation.navigate('Decks')}>
                    <View style={styles.navCardIcon}><Text style={styles.iconText}>📚</Text></View>
                    <View style={styles.navCardBody}>
                        <Text style={styles.navCardTitle}>Kelime Desteleri</Text>
                        <Text style={styles.navCardDesc}>Tüm kelime destelerini görüntüle</Text>
                    </View>
                    <Text style={styles.navCardArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navCard} onPress={() => navigation.navigate('SentenceDecks')}>
                    <View style={styles.navCardIcon}><Text style={styles.iconText}>📝</Text></View>
                    <View style={styles.navCardBody}>
                        <Text style={styles.navCardTitle}>Cümle Desteleri</Text>
                        <Text style={styles.navCardDesc}>Cümle destelerini görüntüle</Text>
                    </View>
                    <Text style={styles.navCardArrow}>›</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.dangerZone}>
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDeleteAccount}
                    disabled={deleting}
                >
                    {deleting ? (
                        <ActivityIndicator size="small" color="#ff4d4d" />
                    ) : (
                        <Text style={styles.deleteButtonText}>Hesabı Kalıcı Olarak Sil</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#121212',
    },
    errorText: {
        color: '#ff4d4d',
        fontSize: 16,
    },
    header: {
        marginBottom: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#b3b3b3',
    },
    section: {
        marginBottom: 30,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#e0e0e0',
        marginBottom: 10,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    input: {
        flex: 1,
        backgroundColor: '#1e1e1e',
        borderRadius: 10,
        padding: 14,
        color: '#fff',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#333',
    },
    updateButton: {
        backgroundColor: '#1DB954',
        borderRadius: 10,
        paddingVertical: 14,
        paddingHorizontal: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    updateButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    navCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e1e1e',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#333',
    },
    navCardIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#2a2a2a',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    iconText: {
        fontSize: 20,
    },
    navCardBody: {
        flex: 1,
    },
    navCardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
    },
    navCardDesc: {
        fontSize: 13,
        color: '#888',
    },
    navCardArrow: {
        fontSize: 24,
        color: '#666',
    },
    dangerZone: {
        marginTop: 40,
        alignItems: 'center',
    },
    deleteButton: {
        padding: 14,
    },
    deleteButtonText: {
        color: '#ff4d4d',
        fontSize: 15,
        textDecorationLine: 'underline',
    },
});
