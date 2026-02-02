import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../lib/api';

interface User {
    id: string;
    email: string;
    full_name: string;
    role: 'shipper' | 'carrier' | 'escort' | 'admin' | 'driver';
    status?: 'active' | 'disabled';
    profile_completed?: boolean;
    email_verified?: boolean;
    email_notifications?: boolean;
    push_notifications?: boolean;
    phone_number?: string;
    contact_number?: string;
    avatar_url?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStoredData = async () => {
            try {
                const storedToken = await AsyncStorage.getItem('token');
                const storedUser = await AsyncStorage.getItem('user');

                if (storedToken) {
                    setToken(storedToken);
                    if (storedUser) {
                        setUser(JSON.parse(storedUser));
                    }

                    // Validate session
                    try {
                        const response = await api.get('/users/me');
                        if (response.data.success) {
                            const freshUser = response.data.data;
                            setUser(freshUser);
                            await AsyncStorage.setItem('user', JSON.stringify(freshUser));
                        }
                    } catch (error) {
                        console.error("Session validation failed", error);
                    }
                }
            } catch (e) {
                console.error("Failed to load auth data", e);
            } finally {
                setLoading(false);
            }
        };

        loadStoredData();
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const response = await api.post('/auth/login', { email, password });
            if (response.data.success) {
                const { token: newToken, user: newUser } = response.data.data;
                setToken(newToken);
                setUser(newUser);
                await AsyncStorage.setItem('token', newToken);
                await AsyncStorage.setItem('user', JSON.stringify(newUser));
            }
        } catch (error: any) {
            const message = error.response?.data?.message || 'Login failed';
            throw new Error(message);
        }
    };

    const logout = async () => {
        setUser(null);
        setToken(null);
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
    };

    const refreshUser = async () => {
        if (token) {
            try {
                const response = await api.get('/users/me');
                if (response.data.success) {
                    const freshUser = response.data.data;
                    setUser(freshUser);
                    await AsyncStorage.setItem('user', JSON.stringify(freshUser));
                }
            } catch (error) {
                console.error("Failed to refresh user", error);
            }
        }
    };

    const value = {
        user,
        token,
        loading,
        login,
        logout,
        refreshUser,
        isAuthenticated: !!user && !!token,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
