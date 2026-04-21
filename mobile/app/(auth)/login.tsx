import React, { useState, useEffect } from 'react';
import {
    View, Text, KeyboardAvoidingView, Platform, ScrollView,
    StyleSheet, Alert, Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Fingerprint, Building2 } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
    isBiometricAvailable, isBiometricEnabled, authenticateBiometric,
    enableBiometric, hasStoredCredentials,
} from '@/lib/biometric';

export default function LoginScreen() {
    const { login } = useAuth();
    const { theme } = useTheme();
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
            setError(err.message || 'Đăng nhập thất bại');
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
        <LinearGradient
            colors={theme.primaryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
        >
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.header}>
                        <View style={styles.logoCircle}>
                            <Building2 size={36} color="#fff" />
                        </View>
                        <Text style={styles.logo}>MOTNHA</Text>
                        <Text style={styles.subtitle}>Nội thất & Xây dựng</Text>
                    </View>

                    <View style={[styles.form, { backgroundColor: theme.surface, ...theme.shadow.lg }]}>
                        <Text style={[styles.formTitle, { color: theme.text }]}>Đăng nhập</Text>
                        <Text style={[styles.formSub, { color: theme.textMuted }]}>Chào mừng bạn quay lại</Text>

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

                        {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}

                        <Button
                            title="Đăng nhập"
                            onPress={handleLogin}
                            loading={loading}
                            size="lg"
                            gradient
                            style={{ marginTop: 12 }}
                        />

                        {bioAvailable && bioEnabled && (
                            <Pressable style={[styles.bioBtn, { borderColor: theme.primary }]} onPress={handleBiometricLogin}>
                                <Fingerprint size={20} color={theme.primary} />
                                <Text style={[styles.bioBtnText, { color: theme.primary }]}>
                                    Dùng {bioTypes[0] || 'sinh trắc học'}
                                </Text>
                            </Pressable>
                        )}
                    </View>

                    <Text style={styles.footerText}>v1.0 · erp.motnha.vn</Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    header: { alignItems: 'center', marginBottom: 32 },
    logoCircle: {
        width: 72, height: 72, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    },
    logo: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: 3 },
    subtitle: { fontSize: 14, color: '#fff', opacity: 0.85, marginTop: 4 },
    form: { borderRadius: 20, padding: 24 },
    formTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
    formSub: { fontSize: 14, marginBottom: 20 },
    error: { fontSize: 14, textAlign: 'center', marginTop: 10 },
    bioBtn: {
        marginTop: 14, paddingVertical: 12, borderRadius: 10,
        borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    },
    bioBtnText: { fontSize: 15, fontWeight: '600' },
    footerText: { color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 24, fontSize: 12 },
});
