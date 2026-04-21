import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';

const c = Colors.light;

let ExpoSpeechRecognition: any = null;
try {
    ExpoSpeechRecognition = require('expo-speech-recognition');
} catch { }

type Props = {
    onResult: (text: string) => void;
    size?: number;
    color?: string;
    style?: any;
};

export default function VoiceButton({ onResult, size = 24, color = c.primary, style }: Props) {
    const [listening, setListening] = useState(false);
    const pulseAnim = useState(() => new Animated.Value(1))[0];
    const webRecognitionRef = useRef<any>(null);
    const nativeResultSubRef = useRef<any>(null);
    const nativeEndSubRef = useRef<any>(null);

    const cleanupNativeListeners = useCallback(() => {
        nativeResultSubRef.current?.remove?.();
        nativeEndSubRef.current?.remove?.();
        nativeResultSubRef.current = null;
        nativeEndSubRef.current = null;
    }, []);

    useEffect(() => {
        if (listening) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.3, duration: 500, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                ]),
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [listening, pulseAnim]);

    useEffect(() => {
        return () => {
            webRecognitionRef.current?.stop?.();
            webRecognitionRef.current = null;
            cleanupNativeListeners();
            ExpoSpeechRecognition?.stop?.();
        };
    }, [cleanupNativeListeners]);

    const startListening = useCallback(async () => {
        if (Platform.OS === 'web') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) {
                alert('Trinh duyet khong ho tro nhan giong noi');
                return;
            }

            const recognition = new SpeechRecognition();
            webRecognitionRef.current = recognition;
            recognition.lang = 'vi-VN';
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.onresult = (e: any) => {
                const text = e.results?.[0]?.[0]?.transcript;
                if (text) onResult(text);
            };
            recognition.onerror = () => setListening(false);
            recognition.onend = () => {
                webRecognitionRef.current = null;
                setListening(false);
            };
            recognition.start();
            setListening(true);
            return;
        }

        if (!ExpoSpeechRecognition) return;

        try {
            const { granted } = await ExpoSpeechRecognition.requestPermissionsAsync();
            if (!granted) return;

            cleanupNativeListeners();
            setListening(true);
            ExpoSpeechRecognition.start({
                lang: 'vi-VN',
                interimResults: false,
            });

            nativeResultSubRef.current = ExpoSpeechRecognition.addOnResultListener?.((event: any) => {
                if (event.results?.[0]?.transcript) {
                    onResult(event.results[0].transcript);
                }
            });
            nativeEndSubRef.current = ExpoSpeechRecognition.addOnEndListener?.(() => {
                cleanupNativeListeners();
                setListening(false);
            });
        } catch {
            cleanupNativeListeners();
            setListening(false);
        }
    }, [cleanupNativeListeners, onResult]);

    const stopListening = useCallback(() => {
        if (Platform.OS === 'web') {
            webRecognitionRef.current?.stop?.();
            webRecognitionRef.current = null;
        } else if (ExpoSpeechRecognition) {
            ExpoSpeechRecognition.stop();
            cleanupNativeListeners();
        }
        setListening(false);
    }, [cleanupNativeListeners]);

    return (
        <TouchableOpacity
            onPress={listening ? stopListening : startListening}
            activeOpacity={0.7}
            style={[s.btn, style]}
        >
            <Animated.View
                style={[
                    s.iconWrap,
                    listening && s.iconWrapActive,
                    { transform: [{ scale: pulseAnim }] },
                ]}
            >
                <Ionicons
                    name={listening ? 'mic' : 'mic-outline'}
                    size={size}
                    color={listening ? '#fff' : color}
                />
            </Animated.View>
        </TouchableOpacity>
    );
}

const s = StyleSheet.create({
    btn: { padding: 4 },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.borderP10,
    },
    iconWrapActive: {
        backgroundColor: '#ef4444',
    },
});
