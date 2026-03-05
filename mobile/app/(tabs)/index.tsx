import React from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import {
  TrendingUp,
  TrendingDown,
  FolderKanban,
  ClipboardList,
  AlertTriangle,
  ShoppingCart,
} from 'lucide-react-native';
import { useDashboard } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { KPICard } from '@/components/KPICard';
import { Card } from '@/components/ui/Card';
import { Badge, getStatusVariant } from '@/components/ui/Badge';
import { COLORS } from '@/lib/constants';

function fmt(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + ' tỷ';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(0) + ' tr';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k';
  return String(n);
}

export default function DashboardScreen() {
  const { user, canViewFinance } = useAuth();
  const { data, isLoading, refetch, isRefetching } = useDashboard();
  const stats = data?.stats;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <Text style={styles.greeting}>Xin chào, {user?.name}!</Text>

      {/* KPI Grid */}
      <View style={styles.kpiRow}>
        <KPICard
          title="Dự án"
          value={stats?.activeProjects ?? '-'}
          icon={<FolderKanban size={20} color={COLORS.primary} />}
          color={COLORS.primary}
          subtitle="đang thực hiện"
        />
        <KPICard
          title="WO chờ"
          value={stats?.pendingWorkOrders ?? '-'}
          icon={<ClipboardList size={20} color={COLORS.warning} />}
          color={COLORS.warning}
        />
      </View>

      {canViewFinance && (
        <View style={styles.kpiRow}>
          <KPICard
            title="Doanh thu"
            value={stats ? fmt(stats.totalRevenue) : '-'}
            icon={<TrendingUp size={20} color={COLORS.success} />}
            color={COLORS.success}
          />
          <KPICard
            title="Chi phí"
            value={stats ? fmt(stats.totalExpense) : '-'}
            icon={<TrendingDown size={20} color={COLORS.danger} />}
            color={COLORS.danger}
          />
        </View>
      )}

      {/* Pending POs */}
      {data?.pendingPOs && data.pendingPOs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PO chờ duyệt</Text>
          {data.pendingPOs.slice(0, 5).map((po: any) => (
            <TouchableOpacity
              key={po.id}
              onPress={() => router.push(`/purchase-orders/${po.id}`)}
            >
              <Card style={styles.listItem}>
                <View style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listCode}>{po.code}</Text>
                    <Text style={styles.listName}>{po.supplier}</Text>
                  </View>
                  <Text style={styles.listAmount}>
                    {(po.totalAmount || 0).toLocaleString('vi-VN')}đ
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Overdue Work Orders */}
      {data?.overdueWorkOrders && data.overdueWorkOrders.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AlertTriangle size={16} color={COLORS.danger} />
            <Text style={[styles.sectionTitle, { color: COLORS.danger }]}>
              Work Order quá hạn
            </Text>
          </View>
          {data.overdueWorkOrders.slice(0, 5).map((wo: any) => (
            <Card key={wo.id} style={styles.listItem}>
              <Text style={styles.listCode}>{wo.code}</Text>
              <Text style={styles.listName} numberOfLines={1}>{wo.title}</Text>
            </Card>
          ))}
        </View>
      )}

      {/* Recent Projects */}
      {data?.recentProjects && data.recentProjects.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dự án gần đây</Text>
          {data.recentProjects.map((p: any) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => router.push(`/projects/${p.id}`)}
            >
              <Card style={styles.listItem}>
                <View style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listCode}>{p.code}</Text>
                    <Text style={styles.listName} numberOfLines={1}>{p.name}</Text>
                  </View>
                  <Badge label={p.status} variant={getStatusVariant(p.status)} size="sm" />
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  greeting: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  section: { marginTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  listItem: { marginBottom: 8 },
  listRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listCode: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  listName: { fontSize: 14, color: COLORS.text, marginTop: 2 },
  listAmount: { fontSize: 14, fontWeight: '700', color: COLORS.accent },
});
