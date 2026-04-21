import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Plus, ShieldCheck } from 'lucide-react-native';
import { useWarrantyTickets, useUpdateWarrantyTicket } from '@/hooks/useApi';
import { Card } from '@/components/ui/Card';
import { COLORS } from '@/lib/constants';
import { formatDate } from '@/lib/format';

const STATUS_COLOR: Record<string, string> = {
  'Mới': COLORS.info,
  'Đang xử lý': COLORS.warning,
  'Đã xử lý': COLORS.success,
  'Đóng': COLORS.disabled,
};

const PRIORITY_COLOR: Record<string, string> = {
  'Thấp': COLORS.textLight,
  'Trung bình': COLORS.info,
  'Cao': COLORS.warning,
  'Khẩn': COLORS.danger,
};

export default function WarrantyListScreen() {
  const { projectId, projectName } = useLocalSearchParams<{ projectId: string; projectName: string }>();
  const { data: tickets, isLoading, refetch, isRefetching } = useWarrantyTickets(projectId);
  const updateMutation = useUpdateWarrantyTicket();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const nextStatus: Record<string, string> = {
    'Mới': 'Đang xử lý',
    'Đang xử lý': 'Đã xử lý',
    'Đã xử lý': 'Đóng',
  };

  const handleUpdateStatus = async (ticket: any) => {
    const next = nextStatus[ticket.status];
    if (!next) return;
    setUpdatingId(ticket.id);
    await updateMutation.mutateAsync({ id: ticket.id, status: next });
    setUpdatingId(null);
  };

  const ticketList = Array.isArray(tickets) ? tickets : [];

  return (
    <>
      <Stack.Screen
        options={{
          title: projectName ? `Bảo hành — ${projectName}` : 'Quản lý Bảo hành',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/warranty/create', params: { projectId, projectName } })}
              style={{ marginRight: 8, padding: 4 }}
            >
              <Plus size={22} color={COLORS.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={ticketList}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <ShieldCheck size={40} color={COLORS.textLight} />
              <Text style={styles.emptyText}>Chưa có phiếu bảo hành nào</Text>
              <TouchableOpacity
                style={styles.createBtn}
                onPress={() => router.push({ pathname: '/warranty/create', params: { projectId, projectName } })}
              >
                <Text style={styles.createBtnText}>+ Tạo phiếu đầu tiên</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <Card style={styles.ticketCard}>
              <View style={styles.ticketHeader}>
                <Text style={styles.ticketCode}>{item.code}</Text>
                <View style={styles.badges}>
                  <Text style={[styles.badge, { color: PRIORITY_COLOR[item.priority] || COLORS.textSecondary, backgroundColor: `${PRIORITY_COLOR[item.priority]}18` }]}>
                    {item.priority}
                  </Text>
                  <Text style={[styles.badge, { color: STATUS_COLOR[item.status] || COLORS.textSecondary, backgroundColor: `${STATUS_COLOR[item.status]}18` }]}>
                    {item.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.ticketTitle}>{item.title}</Text>
              {item.description ? <Text style={styles.ticketDesc} numberOfLines={2}>{item.description}</Text> : null}

              <View style={styles.ticketMeta}>
                <Text style={styles.metaText}>Báo bởi: {item.reportedBy || '—'}</Text>
                <Text style={styles.metaText}>Xử lý: {item.assignee || 'Chưa assign'}</Text>
                <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
              </View>

              {nextStatus[item.status] && (
                <TouchableOpacity
                  style={[styles.nextStatusBtn, { borderColor: STATUS_COLOR[nextStatus[item.status]] }]}
                  onPress={() => handleUpdateStatus(item)}
                  disabled={updatingId === item.id}
                >
                  <Text style={[styles.nextStatusText, { color: STATUS_COLOR[nextStatus[item.status]] }]}>
                    {updatingId === item.id ? 'Đang cập nhật...' : `→ Chuyển sang: ${nextStatus[item.status]}`}
                  </Text>
                </TouchableOpacity>
              )}
            </Card>
          )}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 32 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },
  createBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: 8 },
  createBtnText: { color: COLORS.white, fontWeight: '600' },
  ticketCard: { marginBottom: 12 },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ticketCode: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  badges: { flexDirection: 'row', gap: 6 },
  badge: { fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  ticketTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  ticketDesc: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },
  ticketMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  metaText: { fontSize: 11, color: COLORS.textLight },
  nextStatusBtn: { borderWidth: 1, borderRadius: 6, paddingVertical: 7, alignItems: 'center' },
  nextStatusText: { fontSize: 13, fontWeight: '600' },
});
