import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BIOMETRIC_ENABLED_KEY = 'motnha_biometric_enabled';
const BIOMETRIC_EMAIL_KEY = 'motnha_biometric_email';
const BIOMETRIC_PASSWORD_KEY = 'motnha_biometric_password';

// Web-safe wrappers (SecureStore throws on web)
async function getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return null;
    try { return await getItem(key); } catch { return null; }
}
async function setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') return;
    try { await setItem(key, value); } catch { }
}
async function delItem(key: string): Promise<void> {
    if (Platform.OS === 'web') return;
    try { await delItem(key); } catch { }
}

/**
 * Check if device supports biometric auth (Face ID, Touch ID, Fingerprint).
 */
export async function isBiometricAvailable(): Promise<{ available: boolean; types: string[] }> {
    if (Platform.OS === 'web') return { available: false, types: [] };
    const has = await LocalAuthentication.hasHardwareAsync();
    if (!has) return { available: false, types: [] };
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) return { available: false, types: [] };
    const supported = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const typeNames = supported.map((t) => ({
        [LocalAuthentication.AuthenticationType.FINGERPRINT]: 'Vân tay',
        [LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION]: 'Khuôn mặt',
        [LocalAuthentication.AuthenticationType.IRIS]: 'Mống mắt',
    }[t] || 'Sinh trắc học'));
    return { available: true, types: typeNames };
}

export async function isBiometricEnabled(): Promise<boolean> {
    const v = await getItem(BIOMETRIC_ENABLED_KEY);
    return v === '1';
}

export async function hasStoredCredentials(): Promise<boolean> {
    const email = await getItem(BIOMETRIC_EMAIL_KEY);
    const password = await getItem(BIOMETRIC_PASSWORD_KEY);
    return !!email && !!password;
}

export async function enableBiometric(email: string, password: string): Promise<void> {
    await setItem(BIOMETRIC_EMAIL_KEY, email);
    await setItem(BIOMETRIC_PASSWORD_KEY, password);
    await setItem(BIOMETRIC_ENABLED_KEY, '1');
}

export async function disableBiometric(): Promise<void> {
    await delItem(BIOMETRIC_EMAIL_KEY);
    await delItem(BIOMETRIC_PASSWORD_KEY);
    await delItem(BIOMETRIC_ENABLED_KEY);
}

/**
 * Prompt biometric auth. If success, return stored credentials.
 */
export async function authenticateBiometric(): Promise<{ email: string; password: string } | null> {
    const enabled = await isBiometricEnabled();
    if (!enabled) return null;

    const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Đăng nhập bằng sinh trắc học',
        fallbackLabel: 'Dùng mật khẩu',
        cancelLabel: 'Hủy',
    });
    if (!result.success) return null;

    const email = await getItem(BIOMETRIC_EMAIL_KEY);
    const password = await getItem(BIOMETRIC_PASSWORD_KEY);
    if (!email || !password) return null;

    return { email, password };
}
