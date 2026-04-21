import React from 'react';
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { FileText } from 'lucide-react-native';
import { useContracts } from '@/hooks/useApi';
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

export default function ContractListScreen() {
  const { projectId, projectName } = useLocalSearchParams<{ projectId: string; projectName: string }>();
  const { data, isLoading, refetch, isRefetching } = useContracts(projectId);

  const contracts: any[] = Array.isArray(data) ? data : data?.data || [];

  return (
    <>
      <Stack.Screen
        options={{
          title: projectName ? `Hợp đồng — ${projectName}` : 'Danh sách hợp đồng',
        }}
      />
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={contracts}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <FileText size={40} color={COLORS.textLight} />
              <Text style={styles.emptyText}>Chưa có hợp đồng nào</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/contracts/[id]' as any, params: { id: item.id } })}
            >
              <Card style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.contractCode}>{item.code || item.id.slice(-6).toUpperCase()}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLOR[item.status] || COLORS.textSecondary}18` }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] || COLORS.textSecondary }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.contractName} numberOfLines={2}>{item.name}</Text>

                {item.customerName && (
                  <Text style={styles.meta}>KH: {item.customerName}</Text>
                )}

                <View style={styles.footer}>
                  {typeof item.value === 'number' && (
                    <Text style={styles.value}>{formatCurrency(item.value)}</Text>
                  )}
                  {item.signedDate && (
                    <Text style={styles.date}>Ký: {formatDate(item.signedDate)}</Text>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
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
  card: { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  contractCode: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  contractName: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  value: { fontSize: 15, fontWeight: '700', color: COLORS.accent },
  date: { fontSize: 12, color: COLORS.textLight },
});
