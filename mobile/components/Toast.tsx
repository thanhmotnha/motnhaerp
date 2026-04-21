import React, { useEffect, useRef, useState, createContext, useContext, useCallback } from 'react';
import { View, Text, Animated, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastState {
    visible: boolean;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ show: () => { } });

export function useToast() {
    return useContext(ToastContext);
}

const ICONS: Record<ToastType, { name: string; color: string; bg: string }> = {
    success: { name: 'checkmark-circle', color: '#16a34a', bg: '#f0fdf4' },
    error: { name: 'alert-circle', color: '#dc2626', bg: '#fef2f2' },
    info: { name: 'information-circle', color: '#2563eb', bg: '#eff6ff' },
    warning: { name: 'warning', color: '#f59e0b', bg: '#fffbeb' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toast, setToast] = useState<ToastState>({ visible: false, message: '', type: 'info' });
    const translateY = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const timerRef = useRef<any>(null);

    const show = useCallback((message: string, type: ToastType = 'info') => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setToast({ visible: true, message, type });
        Animated.parallel([
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
            Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
        timerRef.current = setTimeout(() => {
            Animated.parallel([
                Animated.timing(translateY, { toValue: -100, duration: 300, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]).start(() => setToast(prev => ({ ...prev, visible: false })));
        }, 3000);
    }, []);

    const iconInfo = ICONS[toast.type];

    return (
        <ToastContext.Provider value={{ show }}>
            {children}
            {toast.visible && (
                <Animated.View
                    style={[
                        s.container,
                        { backgroundColor: iconInfo.bg, transform: [{ translateY }], opacity },
                    ]}
                    pointerEvents="none">
                    <Ionicons name={iconInfo.name as any} size={22} color={iconInfo.color} />
                    <Text style={[s.text, { color: iconInfo.color }]} numberOfLines={2}>
                        {toast.message}
                    </Text>
                </Animated.View>
            )}
        </ToastContext.Provider>
    );
}

const s = StyleSheet.create({
    container: {
        position: 'absolute',
        top: Platform.OS === 'web' ? 20 : 60,
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
        zIndex: 9999,
    },
    text: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
    },
});
