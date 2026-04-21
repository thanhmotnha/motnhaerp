import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { lightTheme, darkTheme, type Theme, type ThemeMode } from '@/lib/theme';

type ThemePref = 'light' | 'dark' | 'system';
const PREF_KEY = 'motnha_theme_pref';

interface ThemeContextType {
    theme: Theme;
    mode: ThemeMode;
    pref: ThemePref;
    setPref: (p: ThemePref) => void;
    toggle: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: lightTheme, mode: 'light', pref: 'system',
    setPref: () => { }, toggle: () => { },
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemScheme = useColorScheme();
    const [pref, setPrefState] = useState<ThemePref>('system');

    useEffect(() => {
        (async () => {
            const stored = await SecureStore.getItemAsync(PREF_KEY);
            if (stored === 'light' || stored === 'dark' || stored === 'system') {
                setPrefState(stored);
            }
        })();
    }, []);

    const mode: ThemeMode = pref === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : pref;
    const theme = mode === 'dark' ? darkTheme : lightTheme;

    const setPref = useCallback(async (p: ThemePref) => {
        setPrefState(p);
        await SecureStore.setItemAsync(PREF_KEY, p);
    }, []);

    const toggle = useCallback(() => {
        const next: ThemePref = mode === 'dark' ? 'light' : 'dark';
        setPref(next);
    }, [mode, setPref]);

    return (
        <ThemeContext.Provider value={{ theme, mode, pref, setPref, toggle }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
