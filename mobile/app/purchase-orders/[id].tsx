import React from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { usePurchaseOrder, useApprovePO } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge, getStatusVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { COLORS } from '@/lib/constants';

function formatCurrency(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('vi-VN');
}

export default function PODetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: po, isLoading, refetch, isRefetching } = usePurchaseOrder(id);
  const { canApprove } = useAuth();
  const approveMutation = useApprovePO();

  function handleApprove() {
    Alert.alert('Xác nhận', `Duyệt ${po?.code}?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Duyệt',
        onPress: () =>
          approveMutation.mutate(
            { id, status: 'Đã duyệt' },
            { onSuccess: () => refetch() }
          ),
      },
    ]);
  }

  function handleReject() {
    Alert.alert('Xác nhận', `Từ chối ${po?.code}?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Từ chối',
        style: 'destructive',
        onPress: () =>
          approveMutation.mutate(
            { id, status: 'Từ chối' },
            { onSuccess: () => refetch() }
          ),
      },
    ]);
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!po) {
    return (
      <View style={styles.center}>
        <Text>Không tìm thấy đơn mua hàng</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: po.code }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Header Info */}
        <Card>
          <View style={styles.headerRow}>
            <Text style={styles.code}>{po.code}</Text>
            <Badge label={po.status} variant={getStatusVariant(po.status)} />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Nhà cung cấp:</Text>
            <Text style={styles.value}>{po.supplier}</Text>
          </View>

          {po.project && (
            <View style={styles.row}>
              <Text style={styles.label}>Dự án:</Text>
              <Text style={styles.value}>{po.project.name}</Text>
            </View>
          )}

          <View style={styles.row}>
            <Text style={styles.label}>Ngày tạo:</Text>
            <Text style={styles.value}>{formatDate(po.createdAt)}</Text>
          </View>

          {po.note && (
            <View style={[styles.row, { flexDirection: 'column', alignItems: 'flex-start' }]}>
              <Text style={styles.label}>Ghi chú:</Text>
              <Text style={[styles.value, { marginTop: 4 }]}>{po.note}</Text>
            </View>
          )}
        </Card>

        {/* Items */}
        <Card style={{ marginTop: 12 }}>
          <Text style={styles.sectionTitle}>Danh sách vật tư</Text>
          {po.items?.map((item, i) => (
            <View key={item.id || i} style={[styles.itemRow, i > 0 && styles.itemBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.productName}</Text>
                <Text style={styles.itemDetail}>
                  {item.quantity} {item.unit} x {formatCurrency(item.unitPrice)}
                </Text>
              </View>
              <Text style={styles.itemTotal}>{formatCurrency(item.totalPrice)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng cộng:</Text>
            <Text style={styles.totalAmount}>{formatCurrency(po.totalAmount)}</Text>
          </View>
        </Card>

        {/* Approve/Reject Actions */}
        {canApprove && po.status === 'Chờ duyệt' && (
          <View style={styles.actions}>
            <Button
              title="Từ chối"
              onPress={handleReject}
              variant="danger"
              size="lg"
              style={{ flex: 1 }}
              loading={approveMutation.isPending}
            />
            <Button
              title="Duyệt"
              onPress={handleApprove}
              size="lg"
              style={{ flex: 1, backgroundColor: COLORS.success }}
              loading={approveMutation.isPending}
            />
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  code: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 14, color: COLORS.textSecondary },
  value: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  itemBorder: { borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  itemName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  itemDetail: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '600', color: COLORS.accent },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: COLORS.border,
  },
  totalLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  totalAmount: { fontSize: 18, fontWeight: '700', color: COLORS.accent },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
});
