import { Alert } from 'react-native';
import { API_BASE_URL } from './constants';
import { getToken, clearAuth } from './auth';
import { router } from 'expo-router';

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

// Prevent multiple 401 handlers firing at once
let isLoggingOut = false;

async function handleUnauthorized() {
  if (isLoggingOut) return;
  isLoggingOut = true;
  try {
    await clearAuth();
    router.replace('/(auth)/login');
  } finally {
    // Reset after a delay to prevent rapid re-triggers
    setTimeout(() => { isLoggingOut = false; }, 2000);
  }
}

/**
 * API fetch wrapper for mobile — auto-attaches Bearer token, handles errors
 */
export async function apiFetch<T = any>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (!skipAuth) {
    const token = await getToken();
    if (!token) {
      throw new Error('Chưa đăng nhập');
    }
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (response.status === 401 && !skipAuth) {
    await handleUnauthorized();
    throw new Error('Phiên đăng nhập hết hạn');
  }

  if (response.status === 429) {
    Alert.alert('Thông báo', 'Bạn đang thao tác quá nhanh, vui lòng chờ.');
    throw new Error('Too many requests');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Lỗi hệ thống');
  }

  return data as T;
}

/**
 * Upload file (multipart/form-data) — for photos
 */
export async function apiUpload(
  path: string,
  formData: FormData
): Promise<{ url: string; thumbnailUrl?: string }> {
  const token = await getToken();
  if (!token) throw new Error('Chưa đăng nhập');

  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (response.status === 401) {
    await handleUnauthorized();
    throw new Error('Phiên đăng nhập hết hạn');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Lỗi tải lên');
  }

  return data;
}
