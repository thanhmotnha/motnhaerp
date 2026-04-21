import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'motnha_biometric_enabled';
const BIOMETRIC_EMAIL_KEY = 'motnha_biometric_email';
const BIOMETRIC_PASSWORD_KEY = 'motnha_biometric_password';

/**
 * Check if device supports biometric auth (Face ID, Touch ID, Fingerprint).
 */
export async function isBiometricAvailable(): Promise<{ available: boolean; types: string[] }> {
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
    const v = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return v === '1';
}

export async function hasStoredCredentials(): Promise<boolean> {
    const email = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
    const password = await SecureStore.getItemAsync(BIOMETRIC_PASSWORD_KEY);
    return !!email && !!password;
}

export async function enableBiometric(email: string, password: string): Promise<void> {
    await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email);
    await SecureStore.setItemAsync(BIOMETRIC_PASSWORD_KEY, password);
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, '1');
}

export async function disableBiometric(): Promise<void> {
    await SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_PASSWORD_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
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

    const email = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
    const password = await SecureStore.getItemAsync(BIOMETRIC_PASSWORD_KEY);
    if (!email || !password) return null;

    return { email, password };
}
