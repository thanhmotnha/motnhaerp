import React from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useContract } from '@/hooks/useApi';
import { Card } from '@/components/ui/Card';
import { COLORS } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/format';

const STATUS_COLOR: Record<string, string> = {
  'Nháp': COLORS.textLight,
  'Hiệu lực': COLORS.success,
  'Đã ký': COLORS.info,
  'Hoàn thành': COLORS.success,
  'Hủy': COLORS.danger,
};

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  'Chưa thu': COLORS.textLight,
  'Đã thu': COLORS.success,
  'Trễ hạn': COLORS.danger,
};

export default function ContractDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: contract, isLoading, refetch, isRefetching } = useContract(id);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!contract) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Không tìm thấy hợp đồng</Text>
      </View>
    );
  }

  const payments: any[] = contract.payments || contract.paymentPhases || [];
  const totalPaid = payments.filter((p) => p.status === 'Đã thu').reduce((s: number, p: any) => s + (p.amount || 0), 0);
  const totalValue = typeof contract.value === 'number' ? contract.value : 0;
  const paidPct = totalValue > 0 ? Math.round((totalPaid / totalValue) * 100) : 0;

  return (
    <>
      <Stack.Screen options={{ title: contract.code || 'Chi tiết hợp đồng' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Header card */}
        <Card>
          <View style={styles.headerRow}>
            <Text style={styles.contractCode}>{contract.code}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLOR[contract.status] || COLORS.textSecondary}18` }]}>
              <Text style={[styles.statusText, { color: STATUS_COLOR[contract.status] || COLORS.textSecondary }]}>
                {contract.status}
              </Text>
            </View>
          </View>

          <Text style={styles.contractName}>{contract.name}</Text>

          {contract.customerName && (
            <InfoRow label="Khách hàng" value={contract.customerName} />
          )}
          {contract.signedDate && (
            <InfoRow label="Ngày ký" value={formatDate(contract.signedDate)} />
          )}
          {contract.startDate && (
            <InfoRow label="Thời gian" value={`${formatDate(contract.startDate)} → ${formatDate(contract.endDate)}`} />
          )}

          {totalValue > 0 && (
            <View style={styles.valueSection}>
              <Text style={styles.valueLabel}>Giá trị hợp đồng</Text>
              <Text style={styles.valueAmount}>{formatCurrency(totalValue)}</Text>
            </View>
          )}
        </Card>

        {/* Payment progress */}
        {payments.length > 0 && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Tiến độ thu tiền</Text>

            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${paidPct}%` }]} />
              </View>
              <Text style={styles.progressText}>{paidPct}%</Text>
            </View>

            <View style={styles.progressSummary}>
              <Text style={styles.paidAmount}>Đã thu: {formatCurrency(totalPaid)}</Text>
              <Text style={styles.remainAmount}>Còn lại: {formatCurrency(totalValue - totalPaid)}</Text>
            </View>

            {/* Payment phases list */}
            <View style={styles.divider} />
            {payments.map((phase: any, idx: number) => (
              <View key={phase.id || idx} style={styles.phaseRow}>
                <View style={styles.phaseInfo}>
                  <Text style={styles.phaseName}>{phase.name || `Đợt ${idx + 1}`}</Text>
                  {phase.dueDate && (
                    <Text style={styles.phaseMeta}>Hạn: {formatDate(phase.dueDate)}</Text>
                  )}
                  {typeof phase.percentage === 'number' && (
                    <Text style={styles.phaseMeta}>{phase.percentage}% giá trị HĐ</Text>
                  )}
                </View>
                <View style={styles.phaseRight}>
                  <Text style={styles.phaseAmount}>{formatCurrency(phase.amount || 0)}</Text>
                  <View style={[
                    styles.phaseBadge,
                    { backgroundColor: `${PAYMENT_STATUS_COLOR[phase.status] || COLORS.textSecondary}18` },
                  ]}>
                    <Text style={[
                      styles.phaseStatus,
                      { color: PAYMENT_STATUS_COLOR[phase.status] || COLORS.textSecondary },
                    ]}>
                      {phase.status || 'Chưa thu'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Terms */}
        {contract.terms && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Điều khoản</Text>
            <Text style={styles.termsText}>{contract.terms}</Text>
          </Card>
        )}
      </ScrollView>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 15, color: COLORS.textSecondary },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  contractCode: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  contractName: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  infoRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  infoLabel: { fontSize: 13, color: COLORS.textSecondary, minWidth: 80 },
  infoValue: { fontSize: 13, color: COLORS.text, flex: 1 },
  valueSection: {
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: COLORS.borderLight,
  },
  valueLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  valueAmount: { fontSize: 22, fontWeight: '700', color: COLORS.accent },
  sectionCard: { marginTop: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  progressBar: { flex: 1, height: 10, backgroundColor: COLORS.borderLight, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.success, borderRadius: 5 },
  progressText: { fontSize: 14, fontWeight: '700', color: COLORS.text, width: 40, textAlign: 'right' },
  progressSummary: { flexDirection: 'row', justifyContent: 'space-between' },
  paidAmount: { fontSize: 13, fontWeight: '600', color: COLORS.success },
  remainAmount: { fontSize: 13, color: COLORS.textSecondary },
  divider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: 12 },
  phaseRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  phaseInfo: { flex: 1, marginRight: 12 },
  phaseName: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  phaseMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  phaseRight: { alignItems: 'flex-end' },
  phaseAmount: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  phaseBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  phaseStatus: { fontSize: 11, fontWeight: '600' },
  termsText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
});
