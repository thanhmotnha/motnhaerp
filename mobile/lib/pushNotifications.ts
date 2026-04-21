import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiFetch } from './api';

// Configure foreground behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/**
 * Register device for push notifications and save token to backend.
 * Call after login or on app start if authenticated.
 */
export async function registerForPushAsync(): Promise<string | null> {
    if (!Device.isDevice) {
        console.log('Push notifications require physical device');
        return null;
    }

    // Permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    if (finalStatus !== 'granted') {
        console.log('Push permission not granted');
        return null;
    }

    // Android channel
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Mặc định',
            importance: Notifications.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#1e3a5f',
        });
    }

    try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        const token = tokenData.data;

        // Save to backend
        try {
            await apiFetch('/api/users/push-token', {
                method: 'POST',
                body: JSON.stringify({ pushToken: token }),
            });
        } catch (e) {
            console.log('Failed to save push token:', e);
        }

        return token;
    } catch (e) {
        console.log('Failed to get push token:', e);
        return null;
    }
}

/**
 * Attach listener for notification taps — typically navigates to target screen.
 */
export function addNotificationResponseListener(
    handler: (data: Record<string, any>) => void,
) {
    return Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data || {};
        handler(data);
    });
}

export async function clearPushToken(): Promise<void> {
    try {
        await apiFetch('/api/users/push-token', {
            method: 'POST',
            body: JSON.stringify({ pushToken: '' }),
        });
    } catch { /* ignore */ }
}
