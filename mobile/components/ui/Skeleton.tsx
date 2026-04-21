import React, { useEffect } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';

interface SkeletonProps {
    width?: number | string;
    height?: number;
    radius?: number;
    style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, radius, style }: SkeletonProps) {
    const { theme } = useTheme();
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(0.6, { duration: 700 }),
                withTiming(0.3, { duration: 700 }),
            ),
            -1,
            true,
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

    return (
        <Animated.View
            style={[
                {
                    width: width as any,
                    height,
                    backgroundColor: theme.bgTertiary,
                    borderRadius: radius ?? theme.radius.sm,
                },
                animatedStyle,
                style,
            ]}
        />
    );
}

export function SkeletonCard() {
    const { theme } = useTheme();
    return (
        <View style={[styles.card, { backgroundColor: theme.surface, borderRadius: theme.radius.lg, ...theme.shadow.sm }]}>
            <Skeleton width={120} height={14} style={{ marginBottom: 10 }} />
            <Skeleton width="80%" height={20} style={{ marginBottom: 8 }} />
            <Skeleton width="60%" height={14} />
        </View>
    );
}

const styles = StyleSheet.create({
    card: { padding: 16, marginBottom: 8 },
});
