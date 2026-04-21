import React, { useState, useEffect } from 'react';
import {
    View, Text, KeyboardAvoidingView, Platform, ScrollView,
    StyleSheet, Alert, Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Fingerprint } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { COLORS } from '@/lib/constants';
import {
    isBiometricAvailable, isBiometricEnabled, authenticateBiometric,
    enableBiometric, hasStoredCredentials,
} from '@/lib/biometric';

export default function LoginScreen() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [bioAvailable, setBioAvailable] = useState(false);
    const [bioEnabled, setBioEnabled] = useState(false);
    const [bioTypes, setBioTypes] = useState<string[]>([]);

    useEffect(() => {
        (async () => {
            const { available, types } = await isBiometricAvailable();
            setBioAvailable(available);
            setBioTypes(types);
            const enabled = await isBiometricEnabled();
            const hasCreds = await hasStoredCredentials();
            setBioEnabled(enabled && hasCreds);
            // Auto-prompt on mount if enabled
            if (available && enabled && hasCreds) {
                setTimeout(() => handleBiometricLogin(), 300);
            }
        })();
    }, []);

    async function handleBiometricLogin() {
        try {
            const creds = await authenticateBiometric();
            if (!creds) return;
            setLoading(true); setError('');
            await login(creds.email, creds.password);
            router.replace('/(tabs)');
        } catch (err: any) {
            setError(err.message || 'Đăng nhập sinh trắc học thất bại');
        } finally {
            setLoading(false);
        }
    }

    async function handleLogin() {
        if (!email.trim() || !password.trim()) {
            setError('Vui lòng nhập email và mật khẩu');
            return;
        }
        setLoading(true); setError('');
        try {
            await login(email.trim(), password);
            // Offer biometric enrollment
            if (bioAvailable && !bioEnabled) {
                Alert.alert(
                    'Bật đăng nhập bằng ' + (bioTypes[0] || 'sinh trắc học'),
                    'Lần sau bạn có thể đăng nhập nhanh mà không cần gõ mật khẩu?',
                    [
                        { text: 'Không', style: 'cancel', onPress: () => router.replace('/(tabs)') },
                        {
                            text: 'Bật',
                            onPress: async () => {
                                await enableBiometric(email.trim(), password);
                                router.replace('/(tabs)');
                            },
                        },
                    ]
                );
            } else {
                router.replace('/(tabs)');
            }
        } catch (err: any) {
            setError(err.message || 'Đăng nhập thất bại');
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <Text style={styles.logo}>MOTNHA</Text>
                    <Text style={styles.subtitle}>Quản lý xây dựng</Text>
                </View>

                <View style={styles.form}>
                    <Input
                        label="Email"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        placeholder="email@congty.vn"
                    />

                    <Input
                        label="Mật khẩu"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        placeholder="Nhập mật khẩu"
                    />

                    {error ? <Text style={styles.error}>{error}</Text> : null}

                    <Button
                        title="Đăng nhập"
                        onPress={handleLogin}
                        loading={loading}
                        size="lg"
                        style={{ marginTop: 8 }}
                    />

                    {bioAvailable && bioEnabled && (
                        <Pressable style={styles.bioBtn} onPress={handleBiometricLogin}>
                            <Fingerprint size={18} color={COLORS.primary} />
                            <Text style={styles.bioBtnText}>
                                Đăng nhập bằng {bioTypes[0] || 'sinh trắc học'}
                            </Text>
                        </Pressable>
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.primary },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    header: { alignItems: 'center', marginBottom: 40 },
    logo: { fontSize: 36, fontWeight: '800', color: COLORS.white, letterSpacing: 2 },
    subtitle: { fontSize: 16, color: COLORS.white, opacity: 0.7, marginTop: 4 },
    form: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
    },
    error: { color: COLORS.danger, fontSize: 14, textAlign: 'center', marginBottom: 8 },
    bioBtn: {
        marginTop: 14, paddingVertical: 12, borderRadius: 8,
        borderWidth: 1, borderColor: COLORS.primary,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    bioBtnText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
});
