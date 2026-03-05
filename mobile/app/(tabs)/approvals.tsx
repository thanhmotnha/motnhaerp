import React, { useState } from 'react';
import {
  View,
  Text,
  SectionList,
  RefreshControl,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { usePurchaseOrders, useExpenses, useContractorPayments, useApprovePO } from '@/hooks/useApi';
import { ApprovalCard } from '@/components/ApprovalCard';
import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/ui/Button';
import { COLORS } from '@/lib/constants';

export default function ApprovalsScreen() {
  const poQuery = usePurchaseOrders({ status: 'Chờ duyệt' });
  const expenseQuery = useExpenses({ status: 'pending' });
  const paymentQuery = useContractorPayments({ status: 'pending_technical' });
  const approveMutation = useApprovePO();

  // Rejection reason modal
  const [rejectModal, setRejectModal] = useState<{ id: string; code: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const isRefreshing = poQuery.isRefetching || expenseQuery.isRefetching || paymentQuery.isRefetching;
  const isLoading = poQuery.isLoading || expenseQuery.isLoading || paymentQuery.isLoading;
  const isError = poQuery.isError || expenseQuery.isError || paymentQuery.isError;

  function refresh() {
    poQuery.refetch();
    expenseQuery.refetch();
    paymentQuery.refetch();
  }

  function handleApprove(id: string, code: string) {
    Alert.alert('Xác nhận', `Duyệt ${code}?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Duyệt',
        onPress: () => approveMutation.mutate({ id, status: 'Đã duyệt' }),
      },
    ]);
  }

  function handleReject(id: string, code: string) {
    setRejectReason('');
    setRejectModal({ id, code });
  }

  function submitReject() {
    if (!rejectReason.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập lý do từ chối');
      return;
    }
    if (rejectModal) {
      approveMutation.mutate(
        { id: rejectModal.id, status: 'Từ chối', reason: rejectReason.trim() } as any,
        {
          onSuccess: () => setRejectModal(null),
        }
      );
    }
  }

  const sections = [
    {
      title: `Đơn mua hàng (${poQuery.data?.data?.length || 0})`,
      data: poQuery.data?.data || [],
      type: 'po' as const,
    },
    {
      title: `Chi phí (${expenseQuery.data?.data?.length || 0})`,
      data: expenseQuery.data?.data || [],
      type: 'expense' as const,
    },
    {
      title: `Thanh toán thầu phụ (${paymentQuery.data?.data?.length || 0})`,
      data: paymentQuery.data?.data || [],
      type: 'payment' as const,
    },
  ].filter((s) => s.data.length > 0);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (isError) {
    return <ErrorState message="Không thể tải danh sách phê duyệt" onRetry={refresh} />;
  }

  return (
    <>
      <SectionList
        style={styles.container}
        contentContainerStyle={styles.content}
        sections={sections as any}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        renderItem={({ item, section }) => {
          if (section.type === 'po') {
            return (
              <ApprovalCard
                code={item.code}
                title={item.supplier}
                subtitle={item.project?.name}
                amount={item.totalAmount}
                status={item.status}
                date={item.createdAt}
                onPress={() => router.push(`/purchase-orders/${item.id}`)}
                onApprove={() => handleApprove(item.id, item.code)}
                onReject={() => handleReject(item.id, item.code)}
              />
            );
          }
          if (section.type === 'expense') {
            return (
              <ApprovalCard
                code={item.code}
                title={item.description}
                subtitle={item.project?.name}
                amount={item.amount}
                status={item.status}
                date={item.createdAt}
                onPress={() => { }}
              />
            );
          }
          return (
            <ApprovalCard
              code={item.code}
              title={item.contractor?.name || 'Thầu phụ'}
              amount={item.amount}
              status={item.status}
              date={item.createdAt}
              onPress={() => { }}
            />
          );
        }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.empty}>Không có mục nào chờ duyệt 🎉</Text>
          </View>
        }
      />

      {/* Rejection Reason Modal */}
      <Modal visible={!!rejectModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Từ chối {rejectModal?.code}</Text>
            <Text style={styles.modalLabel}>Lý do từ chối *</Text>
            <TextInput
              style={styles.modalInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Nhập lý do từ chối..."
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={3}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Button
                title="Hủy"
                onPress={() => setRejectModal(null)}
                variant="ghost"
                size="sm"
              />
              <Button
                title="Xác nhận từ chối"
                onPress={submitReject}
                variant="danger"
                size="sm"
                loading={approveMutation.isPending}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 10,
  },
  empty: { fontSize: 15, color: COLORS.textSecondary },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
});
