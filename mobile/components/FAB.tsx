import React, { useState, useRef } from 'react';
import {
    View,
    TouchableOpacity,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Plus, X, Camera, ShoppingCart, ClipboardList } from 'lucide-react-native';
import { COLORS } from '@/lib/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FABAction {
    icon: React.ReactNode;
    label: string;
    onPress: () => void;
    color?: string;
}

export function FAB() {
    const [isOpen, setIsOpen] = useState(false);
    const animation = useRef(new Animated.Value(0)).current;

    function toggle() {
        const toValue = isOpen ? 0 : 1;
        Animated.spring(animation, {
            toValue,
            friction: 6,
            useNativeDriver: true,
        }).start();
        setIsOpen(!isOpen);
    }

    const actions: FABAction[] = [
        {
            icon: <Camera size={18} color={COLORS.white} />,
            label: 'Báo cáo tiến độ',
            onPress: () => {
                toggle();
                router.push('/progress/report');
            },
        },
        {
            icon: <ShoppingCart size={18} color={COLORS.white} />,
            label: 'Tạo đơn mua hàng',
            onPress: () => {
                toggle();
                router.push('/purchase-orders/create');
            },
        },
    ];

    const rotation = animation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '45deg'],
    });

    const overlayOpacity = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.4],
    });

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <Animated.View
                    style={[styles.overlay, { opacity: overlayOpacity }]}
                >
                    <TouchableOpacity style={StyleSheet.absoluteFill} onPress={toggle} />
                </Animated.View>
            )}

            <View style={styles.container} pointerEvents="box-none">
                {/* Action buttons */}
                {actions.map((action, index) => {
                    const translateY = animation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -(60 * (index + 1))],
                    });
                    const scale = animation.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0, 0, 1],
                    });

                    return (
                        <Animated.View
                            key={index}
                            style={[
                                styles.actionWrapper,
                                {
                                    transform: [{ translateY }, { scale }],
                                    opacity: animation,
                                },
                            ]}
                        >
                            <TouchableOpacity style={styles.actionLabel} onPress={action.onPress}>
                                <Text style={styles.actionText}>{action.label}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: action.color || COLORS.primaryLight }]}
                                onPress={action.onPress}
                            >
                                {action.icon}
                            </TouchableOpacity>
                        </Animated.View>
                    );
                })}

                {/* Main FAB */}
                <TouchableOpacity style={styles.fab} onPress={toggle} activeOpacity={0.8}>
                    <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                        {isOpen ? (
                            <X size={24} color={COLORS.white} />
                        ) : (
                            <Plus size={24} color={COLORS.white} />
                        )}
                    </Animated.View>
                </TouchableOpacity>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
        zIndex: 90,
    },
    container: {
        position: 'absolute',
        bottom: 80,
        right: 20,
        alignItems: 'flex-end',
        zIndex: 100,
    },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.accent,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
    actionWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'absolute',
        right: 4,
        bottom: 0,
    },
    actionBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    actionLabel: {
        backgroundColor: COLORS.white,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        marginRight: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 3,
    },
    actionText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.text,
    },
});
