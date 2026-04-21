import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const DEFAULT_API_BASE = 'https://erp.motnha.vn';
const API_BASE = (process.env.EXPO_PUBLIC_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, '');

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const QUEUE_KEY = 'offline_queue';
const authInvalidListeners = new Set<() => void>();

const storage = {
    async getItem(key: string): Promise<string | null> {
        if (Platform.OS === 'web') return localStorage.getItem(key);
        return SecureStore.getItemAsync(key);
    },
    async setItem(key: string, value: string) {
        if (Platform.OS === 'web') {
            localStorage.setItem(key, value);
            return;
        }
        await SecureStore.setItemAsync(key, value);
    },
    async deleteItem(key: string) {
        if (Platform.OS === 'web') {
            localStorage.removeItem(key);
            return;
        }
        await SecureStore.deleteItemAsync(key);
    },
};

export async function getToken(): Promise<string | null> {
    return storage.getItem(TOKEN_KEY);
}

export async function setToken(token: string) {
    await storage.setItem(TOKEN_KEY, token);
}

export async function clearToken() {
    await storage.deleteItem(TOKEN_KEY);
    await storage.deleteItem(USER_KEY);
}

export function subscribeAuthInvalid(listener: () => void) {
    authInvalidListeners.add(listener);
    return () => {
        authInvalidListeners.delete(listener);
    };
}

function notifyAuthInvalid() {
    authInvalidListeners.forEach((listener) => {
        try {
            listener();
        } catch { }
    });
}

export async function getUser(): Promise<any | null> {
    const raw = await storage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
}

export async function setUser(user: any) {
    await storage.setItem(USER_KEY, JSON.stringify(user));
}

export async function apiFetch(path: string, options: RequestInit = {}) {
    const token = await getToken();
    if (!token) return null;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> | undefined),
        Authorization: `Bearer ${token}`,
    };

    try {
        const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

        if (res.status === 401) {
            const refreshed = await refreshToken();
            if (refreshed) {
                headers.Authorization = `Bearer ${refreshed}`;
                const retry = await fetch(`${API_BASE}${path}`, { ...options, headers });
                if (!retry.ok) {
                    const retryError = await retry.json().catch(() => ({}));
                    throw new Error(retryError.error || 'Request failed');
                }
                return retry.json();
            }
            await clearToken();
            notifyAuthInvalid();
            return null;
        }

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || err.message || `HTTP ${res.status}`);
        }

        return res.json();
    } catch (e: any) {
        if (e.message === 'Network request failed') {
            console.warn('Network error:', path);
            return null;
        }
        throw e;
    }
}

export async function apiFetchAllPages<T = any>(
    path: string,
    options: RequestInit = {},
    pageSize = 500,
): Promise<T[]> {
    const allItems: T[] = [];
    let page = 1;

    while (true) {
        const url = new URL(path, API_BASE);
        url.searchParams.set('page', String(page));
        url.searchParams.set('limit', String(pageSize));

        const result = await apiFetch(url.pathname + url.search, options);
        if (!result) return allItems;

        if (Array.isArray(result)) {
            return page === 1 ? result : [...allItems, ...result];
        }

        const pageItems = Array.isArray(result.data) ? result.data : [];
        allItems.push(...pageItems);

        if (!result.pagination?.hasNext) {
            return allItems;
        }

        page += 1;
    }
}

async function refreshToken(): Promise<string | null> {
    try {
        const token = await getToken();
        if (!token) return null;

        const res = await fetch(`${API_BASE}/api/auth/mobile/refresh`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!res.ok) return null;

        const data = await res.json();
        await setToken(data.token);
        return data.token;
    } catch {
        return null;
    }
}

export async function login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/api/auth/mobile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: email, password }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Đăng nhập thất bại');
    }

    const data = await res.json();
    await setToken(data.token);
    await setUser(data.user);
    return data;
}

export async function logout() {
    await clearToken();
}

export async function apiUpload(
    path: string,
    fields: Record<string, any>,
    files: { key: string; uri: string; name: string; type?: string }[],
) {
    const token = await getToken();
    if (!token) return null;

    const formData = new FormData();
    Object.entries(fields).forEach(([k, v]) => {
        formData.append(k, typeof v === 'string' ? v : JSON.stringify(v));
    });
    files.forEach((f) => {
        formData.append(
            f.key,
            {
                uri: f.uri,
                name: f.name,
                type: f.type || 'image/jpeg',
            } as any,
        );
    });

    const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Upload failed: ${res.status}`);
    }

    return res.json();
}

async function getQueue(): Promise<any[]> {
    try {
        const raw = await storage.getItem(QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export async function queueOffline(action: { path: string; method: string; body: any }) {
    const queue = await getQueue();
    queue.push({ ...action, timestamp: Date.now() });
    await storage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function flushOfflineQueue(): Promise<number> {
    const queue = await getQueue();
    if (!queue.length) return 0;

    let flushed = 0;
    const remaining: any[] = [];

    for (const item of queue) {
        try {
            await apiFetch(item.path, {
                method: item.method,
                body: JSON.stringify(item.body),
            });
            flushed++;
        } catch {
            remaining.push(item);
        }
    }

    await storage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    return flushed;
}

export async function getOfflineQueueCount(): Promise<number> {
    return (await getQueue()).length;
}
