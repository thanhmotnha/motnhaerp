import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle, WifiOff } from 'lucide-react-native';
import { Button } from './ui/Button';
import { COLORS } from '@/lib/constants';

interface ErrorStateProps {
    message?: string;
    onRetry?: () => void;
    isOffline?: boolean;
}

export function ErrorState({
    message = 'Không thể tải dữ liệu',
    onRetry,
    isOffline,
}: ErrorStateProps) {
    return (
        <View style={styles.container}>
            {isOffline ? (
                <WifiOff size={40} color={COLORS.textLight} />
            ) : (
                <AlertTriangle size={40} color={COLORS.warning} />
            )}
            <Text style={styles.message}>
                {isOffline ? 'Không có kết nối mạng' : message}
            </Text>
            {onRetry && (
                <Button
                    title="Thử lại"
                    onPress={onRetry}
                    variant="secondary"
                    size="sm"
                    style={{ marginTop: 12 }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        paddingHorizontal: 24,
    },
    message: {
        fontSize: 15,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: 12,
    },
});
