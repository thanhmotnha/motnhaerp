import React from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import {
  TrendingUp,
  TrendingDown,
  FolderKanban,
  ClipboardList,
  AlertTriangle,
  Camera,
  ClipboardEdit,
} from 'lucide-react-native';
import { useDashboard } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { KPICard } from '@/components/KPICard';
import { ErrorState } from '@/components/ErrorState';
import { Card } from '@/components/ui/Card';
import { Badge, getStatusVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { COLORS } from '@/lib/constants';
import { formatCurrencyShort } from '@/lib/format';

const fmt = formatCurrencyShort;

export default function DashboardScreen() {
  const { user, role, canViewFinance, canApprove } = useAuth();
  const { data, isLoading, isError, refetch, isRefetching } = useDashboard();
  const stats = data?.stats;

  if (isError) {
    return <ErrorState message="Không thể tải dashboard" onRetry={refetch} />;
  }

  const isFieldWorker = role === 'ky_thuat' || role === 'kho';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <Text style={styles.greeting}>Xin chào, {user?.name}!</Text>

      {/* Quick Actions for field workers */}
      {isFieldWorker && (
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: COLORS.primary }]}
            onPress={() => router.push('/progress/report')}
          >
            <Camera size={20} color={COLORS.white} />
            <Text style={styles.quickBtnText}>Báo cáo tiến độ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: COLORS.success }]}
            onPress={() => router.push('/daily-logs/create')}
          >
            <ClipboardEdit size={20} color={COLORS.white} />
            <Text style={styles.quickBtnText}>Nhật ký hôm nay</Text>
          </TouchableOpacity>
        </View>
      )}

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

      {/* Pending POs — show for approvers */}
      {canApprove && data?.pendingPOs && data.pendingPOs.length > 0 && (
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
  quickActions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
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
