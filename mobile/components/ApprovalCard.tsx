import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Card } from './ui/Card';
import { Badge, getStatusVariant } from './ui/Badge';
import { COLORS } from '@/lib/constants';

interface ApprovalCardProps {
  code: string;
  title: string;
  subtitle?: string;
  amount?: number;
  status: string;
  date: string;
  onPress: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}

function formatCurrency(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('vi-VN');
}

export function ApprovalCard({
  code,
  title,
  subtitle,
  amount,
  status,
  date,
  onPress,
  onApprove,
  onReject,
}: ApprovalCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.code}>{code}</Text>
          <Badge label={status} variant={getStatusVariant(status)} size="sm" />
        </View>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        <View style={styles.footer}>
          {amount != null && <Text style={styles.amount}>{formatCurrency(amount)}</Text>}
          <Text style={styles.date}>{formatDate(date)}</Text>
        </View>
        {(onApprove || onReject) && (
          <View style={styles.actions}>
            {onReject && (
              <TouchableOpacity style={styles.rejectBtn} onPress={onReject}>
                <Text style={styles.rejectText}>Từ chối</Text>
              </TouchableOpacity>
            )}
            {onApprove && (
              <TouchableOpacity style={styles.approveBtn} onPress={onApprove}>
                <Text style={styles.approveText}>Duyệt</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  code: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  title: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  amount: { fontSize: 15, fontWeight: '700', color: COLORS.accent },
  date: { fontSize: 12, color: COLORS.textLight },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12, justifyContent: 'flex-end' },
  rejectBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  rejectText: { color: COLORS.danger, fontWeight: '600', fontSize: 13 },
  approveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.success,
  },
  approveText: { color: COLORS.white, fontWeight: '600', fontSize: 13 },
});
