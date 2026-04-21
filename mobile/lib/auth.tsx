import React, { createContext, useContext, useEffect, useState } from 'react';
import { getToken, getUser, login as apiLogin, logout as apiLogout, subscribeAuthInvalid } from '@/lib/api';

type User = { id: string; name: string; email: string; role: string } | null;

type AuthContextType = {
    user: User;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: async () => {},
    logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const [token, savedUser] = await Promise.all([getToken(), getUser()]);
            if (token && savedUser) {
                setUser(savedUser);
            } else {
                setUser(null);
            }
            setLoading(false);
        })();
    }, []);

    useEffect(() => {
        return subscribeAuthInvalid(() => {
            setUser(null);
            setLoading(false);
        });
    }, []);

    const login = async (email: string, password: string) => {
        const data = await apiLogin(email, password);
        setUser(data.user);
    };

    const logout = async () => {
        await apiLogout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
