import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/lib/constants';

const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  success: { bg: '#d4edda', text: '#155724' },
  warning: { bg: '#fff3cd', text: '#856404' },
  danger: { bg: '#f8d7da', text: '#721c24' },
  info: { bg: '#d1ecf1', text: '#0c5460' },
  default: { bg: COLORS.borderLight, text: COLORS.textSecondary },
};

interface BadgeProps {
  label: string;
  variant?: keyof typeof BADGE_COLORS;
  size?: 'sm' | 'md';
}

export function Badge({ label, variant = 'default', size = 'md' }: BadgeProps) {
  const colors = BADGE_COLORS[variant] || BADGE_COLORS.default;

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, size === 'sm' && styles.sm]}>
      <Text style={[styles.text, { color: colors.text }, size === 'sm' && styles.smText]}>
        {label}
      </Text>
    </View>
  );
}

/** Map Vietnamese PO statuses to badge variants */
export function getStatusVariant(status: string): keyof typeof BADGE_COLORS {
  const map: Record<string, keyof typeof BADGE_COLORS> = {
    'Đã duyệt': 'success',
    'Chờ duyệt': 'warning',
    'Từ chối': 'danger',
    'Hoàn thành': 'success',
    'Đang thực hiện': 'info',
    'active': 'success',
    'pending': 'warning',
    'completed': 'success',
    'cancelled': 'danger',
    'pending_technical': 'warning',
    'pending_accounting': 'info',
    'approved': 'success',
    'paid': 'success',
  };
  return map[status] || 'default';
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  sm: { paddingHorizontal: 8, paddingVertical: 2 },
  text: { fontSize: 12, fontWeight: '600' },
  smText: { fontSize: 10 },
});
