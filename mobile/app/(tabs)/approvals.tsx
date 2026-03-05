import React, { useState } from 'react';
import {
  View,
  Text,
  SectionList,
  RefreshControl,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { usePurchaseOrders, useExpenses, useContractorPayments, useApprovePO } from '@/hooks/useApi';
import { ApprovalCard } from '@/components/ApprovalCard';
import { COLORS } from '@/lib/constants';

export default function ApprovalsScreen() {
  const poQuery = usePurchaseOrders({ status: 'Chờ duyệt' });
  const expenseQuery = useExpenses({ status: 'pending' });
  const paymentQuery = useContractorPayments({ status: 'pending_technical' });
  const approveMutation = useApprovePO();

  const isRefreshing = poQuery.isRefetching || expenseQuery.isRefetching || paymentQuery.isRefetching;
  const isLoading = poQuery.isLoading || expenseQuery.isLoading || paymentQuery.isLoading;

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
    Alert.alert('Xác nhận', `Từ chối ${code}?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Từ chối',
        style: 'destructive',
        onPress: () => approveMutation.mutate({ id, status: 'Từ chối' }),
      },
    ]);
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

  return (
    <SectionList
      style={styles.container}
      contentContainerStyle={styles.content}
      sections={sections}
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
              onPress={() => {}}
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
            onPress={() => {}}
          />
        );
      }}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.empty}>Không có mục nào chờ duyệt</Text>
        </View>
      }
    />
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
});
