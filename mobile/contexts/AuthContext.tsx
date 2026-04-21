import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import {
  getToken,
  getStoredUser,
  saveAuthResponse,
  clearAuth,
  isTokenExpiringSoon,
} from '@/lib/auth';
import { APPROVAL_ROLES, CUSTOMER_ROLES, FINANCE_ROLES, type RoleKey } from '@/lib/constants';
import type { User, AuthResponse } from '@/lib/types';
import { registerForPushAsync, clearPushToken } from '@/lib/pushNotifications';
import { disableBiometric } from '@/lib/biometric';

interface AuthContextType {
  user: User | null;
  role: RoleKey | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  // Permission helpers
  canApprove: boolean;
  canViewFinance: boolean;
  isCustomer: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => { },
  logout: async () => { },
  canApprove: false,
  canViewFinance: false,
  isCustomer: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const [token, storedUser] = await Promise.all([
          getToken(),
          getStoredUser(),
        ]);

        if (token && storedUser) {
          // Refresh token if expiring soon
          // Always restore user first so app is usable immediately
          setUser(storedUser);

          // Try to refresh token in background if expiring soon
          if (isTokenExpiringSoon(token)) {
            try {
              const refreshed = await apiFetch<AuthResponse>(
                '/api/auth/mobile/refresh',
                { method: 'POST' }
              );
              await saveAuthResponse(refreshed);
              setUser(refreshed.user);
            } catch {
              // If refresh fails, keep using existing token until it truly expires
              // Server will return 401 when token is actually invalid
            }
          }
        }
      } catch {
        await clearAuth();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiFetch<AuthResponse>('/api/auth/mobile', {
      method: 'POST',
      body: JSON.stringify({ login: email, password }),
      skipAuth: true,
    });
    await saveAuthResponse(response);
    setUser(response.user);
    // Register push token in background (non-blocking)
    registerForPushAsync().catch(() => { });
  }, []);

  const logout = useCallback(async () => {
    await clearPushToken().catch(() => { });
    await disableBiometric().catch(() => { });
    await clearAuth();
    setUser(null);
  }, []);

  // Re-register push token on app start if authenticated (useful after reinstall)
  useEffect(() => {
    if (user && !isLoading) {
      registerForPushAsync().catch(() => { });
    }
  }, [user?.id, isLoading]);

  const role = user?.role ?? null;
  const canApprove = role ? APPROVAL_ROLES.includes(role) : false;
  const canViewFinance = role ? FINANCE_ROLES.includes(role) : false;
  const isCustomer = role ? CUSTOMER_ROLES.includes(role) : false;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        canApprove,
        canViewFinance,
        isCustomer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
