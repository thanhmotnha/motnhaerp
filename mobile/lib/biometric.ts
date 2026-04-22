import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ENABLED_KEY = 'bio_enabled';
const EMAIL_KEY = 'bio_email';
const PASS_KEY = 'bio_pass';

async function get(k: string): Promise<string | null> {
    if (Platform.OS === 'web') {
        try { return (globalThis as any).localStorage?.getItem(k) ?? null; } catch { return null; }
    }
    try { return await SecureStore.getItemAsync(k); } catch { return null; }
}
async function set(k: string, v: string) {
    if (Platform.OS === 'web') {
        try { (globalThis as any).localStorage?.setItem(k, v); } catch { }
        return;
    }
    try { await SecureStore.setItemAsync(k, v); } catch { }
}
async function del(k: string) {
    if (Platform.OS === 'web') {
        try { (globalThis as any).localStorage?.removeItem(k); } catch { }
        return;
    }
    try { await SecureStore.deleteItemAsync(k); } catch { }
}

export async function isBiometricAvailable(): Promise<{ available: boolean; types: string[] }> {
    if (Platform.OS === 'web') return { available: false, types: [] };
    const has = await LocalAuthentication.hasHardwareAsync();
    if (!has) return { available: false, types: [] };
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) return { available: false, types: [] };
    const supported = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const types = supported.map(t => ({
        [LocalAuthentication.AuthenticationType.FINGERPRINT]: 'Vân tay',
        [LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION]: 'Khuôn mặt',
        [LocalAuthentication.AuthenticationType.IRIS]: 'Mống mắt',
    }[t] || 'Sinh trắc học'));
    return { available: true, types };
}

export async function isBiometricEnabled(): Promise<boolean> {
    return (await get(ENABLED_KEY)) === '1';
}

export async function hasStoredCredentials(): Promise<boolean> {
    const e = await get(EMAIL_KEY); const p = await get(PASS_KEY);
    return !!e && !!p;
}

export async function enableBiometric(email: string, password: string) {
    await set(EMAIL_KEY, email);
    await set(PASS_KEY, password);
    await set(ENABLED_KEY, '1');
}

export async function disableBiometric() {
    await del(EMAIL_KEY); await del(PASS_KEY); await del(ENABLED_KEY);
}

export async function authenticateBiometric(): Promise<{ email: string; password: string } | null> {
    if (!(await isBiometricEnabled())) return null;
    const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Đăng nhập bằng sinh trắc học',
        fallbackLabel: 'Dùng mật khẩu',
        cancelLabel: 'Hủy',
    });
    if (!result.success) return null;
    const email = await get(EMAIL_KEY); const password = await get(PASS_KEY);
    if (!email || !password) return null;
    return { email, password };
}
