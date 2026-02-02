import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

function RootLayoutNav() {
    const { user, loading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === '(tabs)';

        if (!user && inAuthGroup) {
            router.replace('/login');
        } else if (user && segments[0] === 'login') {
            router.replace('/(tabs)');
        }
    }, [user, loading, segments]);

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="login" />
        </Stack>
    );
}

import { SafeAreaView } from 'react-native-safe-area-context';

export default function RootLayout() {
    return (
        <AuthProvider>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
                <RootLayoutNav />
            </SafeAreaView>
        </AuthProvider>
    );
}
