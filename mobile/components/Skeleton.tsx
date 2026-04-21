import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';

export function SkeletonLine({ width = '100%', height = 14, style }: { width?: string | number; height?: number; style?: any }) {
    const opacity = React.useRef(new Animated.Value(0.3)).current;

    React.useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    return <Animated.View style={[s.line, { width, height, opacity }, style]} />;
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
    return (
        <View style={s.card}>
            <SkeletonLine width="40%" height={12} />
            {Array.from({ length: lines }).map((_, i) => (
                <SkeletonLine key={i} width={i === lines - 1 ? '60%' : '100%'} style={{ marginTop: 10 }} />
            ))}
        </View>
    );
}

const s = StyleSheet.create({
    line: { backgroundColor: '#e2e8f0', borderRadius: 6 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginHorizontal: 16, marginBottom: 10 },
});
