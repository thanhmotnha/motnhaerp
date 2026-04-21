import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import Colors, { fontWeight } from '@/constants/Colors';

const c = Colors.light;

export default function LoginScreen() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPass, setShowPass] = useState(false);

    const handleLogin = async () => {
        const resolvedEmail = email.trim();

        if (!resolvedEmail || !password) {
            setError('Vui lòng nhập đầy đủ thông tin');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await login(resolvedEmail, password);
        } catch (e: any) {
            setError(e.message || 'Đăng nhập thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={s.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={s.topSection}>
                <View style={s.logoBubble} />
                <View style={s.logoBubble2} />
                <View style={s.logoCircle}>
                    <Ionicons name="business" size={32} color="#fff" />
                </View>
                <Text style={s.brand}>MỘT NHÀ</Text>
                <Text style={s.subtitle}>Quản lý thi công nội thất</Text>
            </View>

            <View style={s.formCard}>
                <Text style={s.formTitle}>Đăng nhập</Text>
                <Text style={s.formDesc}>Nhập thông tin tài khoản của bạn</Text>

                <View style={s.inputGroup}>
                    <Ionicons
                        name="mail-outline"
                        size={20}
                        color={c.textMuted}
                        style={s.inputIcon}
                    />
                    <TextInput
                        style={s.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="Username hoặc email"
                        placeholderTextColor="#9ca3af"
                        autoCapitalize="none"
                    />
                </View>

                <View style={s.inputGroup}>
                    <Ionicons
                        name="lock-closed-outline"
                        size={20}
                        color={c.textMuted}
                        style={s.inputIcon}
                    />
                    <TextInput
                        style={s.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Mật khẩu"
                        placeholderTextColor="#9ca3af"
                        secureTextEntry={!showPass}
                    />
                    <TouchableOpacity onPress={() => setShowPass((v) => !v)} style={s.eyeButton}>
                        <Ionicons
                            name={showPass ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={c.textMuted}
                        />
                    </TouchableOpacity>
                </View>

                {error ? (
                    <View style={s.errorBox}>
                        <Ionicons name="warning-outline" size={16} color="#ef4444" />
                        <Text style={s.errorText}>{error}</Text>
                    </View>
                ) : null}

                <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <View style={s.btnRow}>
                            <Text style={s.btnText}>Đăng nhập</Text>
                            <Ionicons name="arrow-forward" size={20} color="#fff" />
                        </View>
                    )}
                </TouchableOpacity>

                <Text style={s.footer}>Một Nhà Interior © 2026</Text>
            </View>
        </KeyboardAvoidingView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: c.primary },
    topSection: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    logoBubble: {
        position: 'absolute',
        right: -30,
        top: -30,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(197,160,89,0.18)',
    },
    logoBubble2: {
        position: 'absolute',
        left: -20,
        bottom: 20,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    logoCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: c.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        shadowColor: c.accent,
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
    },
    brand: { fontSize: 30, fontWeight: '800' as any, color: '#fff', letterSpacing: 3 },
    subtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 4,
        fontWeight: fontWeight.label,
    },
    formCard: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 28,
        paddingTop: 28,
        paddingBottom: 40,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -4 },
        elevation: 8,
    },
    formTitle: { fontSize: 22, fontWeight: '700', color: c.text, marginBottom: 4 },
    formDesc: { fontSize: 14, color: c.textSecondary, marginBottom: 24 },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f6f6f8',
        borderRadius: 16,
        marginBottom: 14,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: c.border,
    },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, fontSize: 15, paddingVertical: 14, color: c.text },
    eyeButton: { padding: 4 },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#fef2f2',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    errorText: { color: '#ef4444', fontSize: 13, fontWeight: '500', flex: 1 },
    btn: {
        backgroundColor: c.primary,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        marginTop: 12,
        shadowColor: c.primary,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
    },
    btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    footer: { textAlign: 'center', fontSize: 12, color: c.textMuted, marginTop: 24 },
});
