import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { Lock, Mail, Eye, EyeOff, Package, ShieldCheck } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Please enter your email and password");
            return;
        }

        setLoading(true);
        try {
            await login(email, password);
            router.replace('/(tabs)');
        } catch (error: any) {
            Alert.alert("Login Failed", error.message || "An error occurred during login");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
                <View style={styles.topSection}>
                    <View style={styles.logoBox}>
                        <Package size={32} stroke="#44AEBC" />
                    </View>
                    <Text style={styles.welcomeTitle}>Welcome back</Text>
                    <Text style={styles.welcomeSubtitle}>
                        Enter your credentials to manage your oversized cargo shipments.
                    </Text>
                </View>

                <View style={styles.formSection}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Email Address</Text>
                        <View style={styles.inputWrapper}>
                            <Mail size={18} stroke="#94a3b8" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="name@example.com"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                placeholderTextColor="#94a3b8"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.labelRow}>
                            <Text style={styles.inputLabel}>Password</Text>
                            <TouchableOpacity>
                                <Text style={styles.forgotText}>Forgot password?</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.inputWrapper}>
                            <Lock size={18} stroke="#94a3b8" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Your password"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                placeholderTextColor="#94a3b8"
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                {showPassword ? (
                                    <EyeOff size={18} stroke="#94a3b8" />
                                ) : (
                                    <Eye size={18} stroke="#94a3b8" />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.loginButton, (!email || !password) && styles.loginButtonDisabled]}
                        onPress={handleLogin}
                        disabled={loading || !email || !password}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.loginButtonText}>Sign In</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footerInfo}>
                        <ShieldCheck size={16} stroke="#64748b" style={{ marginRight: 6 }} />
                        <Text style={styles.footerText}>SECURE CARGO PLATFORM</Text>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    topSection: { alignItems: 'center', marginBottom: 48 },
    logoBox: {
        width: 64,
        height: 64,
        backgroundColor: '#f1f5f9',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24
    },
    welcomeTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: '#0f172a',
        textAlign: 'center'
    },
    welcomeSubtitle: {
        fontSize: 15,
        color: '#64748b',
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 22,
        fontWeight: '500',
        paddingHorizontal: 20
    },
    formSection: { gap: 24 },
    inputGroup: {},
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    inputLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#475569',
        marginBottom: 8
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 56
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 16, color: '#1e293b', fontWeight: '600' },
    forgotText: { color: '#44AEBC', fontSize: 14, fontWeight: '700' },
    loginButton: {
        backgroundColor: '#44AEBC',
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
        shadowColor: '#44AEBC',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 8
    },
    loginButtonDisabled: {
        backgroundColor: '#94a3b8',
        shadowOpacity: 0,
        elevation: 0
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 0.5
    },
    footerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 32
    },
    footerText: {
        fontSize: 10,
        color: '#94a3b8',
        fontWeight: '900',
        letterSpacing: 1.5
    }
});
