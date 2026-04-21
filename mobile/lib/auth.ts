import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { AuthResponse, User } from './types';

const TOKEN_KEY = 'motnha_token';
const USER_KEY = 'motnha_user';

// Web-safe storage (SecureStore throws on web; fall back to localStorage)
async function storeGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return (globalThis as any).localStorage?.getItem(key) ?? null; } catch { return null; }
  }
  try { return await SecureStore.getItemAsync(key); } catch { return null; }
}
async function storeSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { (globalThis as any).localStorage?.setItem(key, value); } catch { }
    return;
  }
  try { await SecureStore.setItemAsync(key, value); } catch { }
}
async function storeDel(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { (globalThis as any).localStorage?.removeItem(key); } catch { }
    return;
  }
  try { await SecureStore.deleteItemAsync(key); } catch { }
}

export async function getToken(): Promise<string | null> {
  return storeGet(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await storeSet(TOKEN_KEY, token);
}

export async function getStoredUser(): Promise<User | null> {
  const json = await storeGet(USER_KEY);
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function setStoredUser(user: User): Promise<void> {
  await storeSet(USER_KEY, JSON.stringify(user));
}

export async function clearAuth(): Promise<void> {
  await storeDel(TOKEN_KEY);
  await storeDel(USER_KEY);
}

export async function saveAuthResponse(response: AuthResponse): Promise<void> {
  await setToken(response.token);
  await setStoredUser(response.user);
}

/**
 * Base64 decode (RN does not have atob built-in)
 */
function base64Decode(input: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = input.replace(/=+$/, '');
  let output = '';
  for (let i = 0; i < str.length; i += 4) {
    const a = chars.indexOf(str[i]);
    const b = chars.indexOf(str[i + 1]);
    const c = chars.indexOf(str[i + 2]);
    const d = chars.indexOf(str[i + 3]);
    const bits = (a << 18) | (b << 12) | (c << 6) | d;
    output += String.fromCharCode((bits >> 16) & 0xff);
    if (str[i + 2] !== '=') output += String.fromCharCode((bits >> 8) & 0xff);
    if (str[i + 3] !== '=') output += String.fromCharCode(bits & 0xff);
  }
  return output;
}

/**
 * Parse JWT payload without verification (for checking expiry client-side)
 */
export function parseTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(base64Decode(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isTokenExpiringSoon(token: string, thresholdMs = 10 * 60 * 1000): boolean {
  const expiry = parseTokenExpiry(token);
  if (!expiry) return true;
  return Date.now() > expiry - thresholdMs;
}
