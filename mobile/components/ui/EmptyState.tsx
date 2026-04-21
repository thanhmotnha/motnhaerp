import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
    const { theme } = useTheme();
    return (
        <View style={styles.container}>
            <View style={[styles.iconWrap, { backgroundColor: theme.bgTertiary }]}>
                {icon}
            </View>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            {subtitle && <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>}
            {action && <View style={{ marginTop: 16 }}>{action}</View>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { alignItems: 'center', padding: 40 },
    iconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    title: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
    subtitle: { fontSize: 14, textAlign: 'center', marginTop: 6, maxWidth: 260, lineHeight: 20 },
});
