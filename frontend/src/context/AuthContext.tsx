import React, { createContext, ReactNode, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiClient } from '../api/client';

const AUTH_STORAGE_KEY = 'auth_user';

export interface User {
    id: number;
    username: string;
    token: string;
}

interface AuthContextType {
    user: User | null;
    login: (user: User) => Promise<void>;
    logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    login: async () => {},
    logout: async () => {},
});

async function persistUser(user: User) {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

async function clearStoredUser() {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    delete apiClient.defaults.headers.common.Authorization;
}

function applyAuthHeader(token: string) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const storedUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
                if (!storedUser) {
                    return;
                }

                const parsedUser = JSON.parse(storedUser) as User;
                setUser(parsedUser);
                applyAuthHeader(parsedUser.token);
            } catch (error) {
                console.error('Failed to load user', error);
                await clearStoredUser();
            }
        };

        void loadUser();
    }, []);

    const login = async (userData: User) => {
        setUser(userData);
        applyAuthHeader(userData.token);
        await persistUser(userData);
    };

    const logout = async () => {
        try {
            if (user?.token) {
                applyAuthHeader(user.token);
                await apiClient.post('/auth/logout');
            }
        } catch (error) {
            console.warn('Logout request failed, clearing local session anyway.', error);
        } finally {
            setUser(null);
            await clearStoredUser();
        }
    };

    return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}
