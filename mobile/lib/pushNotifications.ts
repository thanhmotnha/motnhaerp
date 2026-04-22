import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiFetch } from './api';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false,
        shouldShowBanner: true, shouldShowList: true,
    }),
});

export async function registerForPushAsync(): Promise<string | null> {
    if (Platform.OS === 'web' || !Device.isDevice) return null;
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
        const r = await Notifications.requestPermissionsAsync();
        status = r.status;
    }
    if (status !== 'granted') return null;
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Mặc định',
            importance: Notifications.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#234195',
        });
    }
    try {
        const { data: token } = await Notifications.getExpoPushTokenAsync();
        try {
            await apiFetch('/api/users/push-token', { method: 'POST', body: JSON.stringify({ pushToken: token }) });
        } catch { }
        return token;
    } catch { return null; }
}

export function onNotificationTap(handler: (data: Record<string, any>) => void) {
    return Notifications.addNotificationResponseReceivedListener(r => {
        handler(r.notification.request.content.data || {});
    });
}

export async function clearPushToken(): Promise<void> {
    try { await apiFetch('/api/users/push-token', { method: 'POST', body: JSON.stringify({ pushToken: '' }) }); } catch { }
}
