import React from 'react';
import {
    View, Text, ScrollView, RefreshControl, StyleSheet, Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
    TrendingUp, TrendingDown, FolderKanban, ClipboardList,
    AlertTriangle, Camera, ClipboardEdit, ChevronRight,
} from 'lucide-react-native';
import { useDashboard } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ErrorState } from '@/components/ErrorState';
import { Card } from '@/components/ui/Card';
import { Badge, getStatusVariant } from '@/components/ui/Badge';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { formatCurrencyShort } from '@/lib/format';

const fmt = formatCurrencyShort;

function KPITile({ label, value, icon, color, bg }: { label: string; value: string | number; icon: React.ReactNode; color: string; bg: string }) {
    const { theme } = useTheme();
    return (
        <View style={[styles.kpiTile, { backgroundColor: theme.surface, ...theme.shadow.sm }]}>
            <View style={[styles.kpiIcon, { backgroundColor: bg }]}>{icon}</View>
            <Text style={[styles.kpiValue, { color: theme.text }]}>{value}</Text>
            <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>{label}</Text>
        </View>
    );
}

export default function DashboardScreen() {
    const { user, role, canViewFinance, canApprove } = useAuth();
    const { theme, mode } = useTheme();
    const { data, isLoading, isError, refetch, isRefetching } = useDashboard();
    const stats = data?.stats;

    if (isError) return <ErrorState message="Không thể tải dashboard" onRetry={refetch} />;

    const isFieldWorker = role === 'ky_thuat' || role === 'kho';
    const greeting = new Date().getHours() < 12 ? 'Chào buổi sáng' : new Date().getHours() < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: theme.bg }}
            refreshControl={<RefreshControl tintColor={theme.primary} refreshing={isRefetching} onRefresh={refetch} />}
        >
            {/* Hero gradient header */}
            <LinearGradient
                colors={theme.primaryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}
            >
                <Text style={styles.heroGreeting}>{greeting},</Text>
                <Text style={styles.heroName}>{user?.name || 'Bạn'}</Text>
                <Text style={styles.heroSub}>
                    {data?.recentProjects?.length ?? 0} dự án đang thực hiện
                </Text>
            </LinearGradient>

            <View style={styles.body}>
                {/* Quick Actions */}
                {isFieldWorker && (
                    <View style={styles.quickActions}>
                        <Pressable
                            onPress={() => router.push('/progress/report')}
                            style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.8 : 1 }]}
                        >
                            <LinearGradient
                                colors={theme.primaryGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={[styles.quickBtn, theme.shadow.sm]}
                            >
                                <Camera size={18} color="#fff" />
                                <Text style={styles.quickBtnText}>Báo cáo tiến độ</Text>
                            </LinearGradient>
                        </Pressable>
                        <Pressable
                            onPress={() => router.push('/daily-logs/create')}
                            style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.8 : 1 }]}
                        >
                            <LinearGradient
                                colors={[theme.success, '#059669']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={[styles.quickBtn, theme.shadow.sm]}
                            >
                                <ClipboardEdit size={18} color="#fff" />
                                <Text style={styles.quickBtnText}>Nhật ký</Text>
                            </LinearGradient>
                        </Pressable>
                    </View>
                )}

                {/* KPI Grid */}
                <View style={styles.kpiRow}>
                    {isLoading ? (
                        <>
                            <SkeletonKPI /><SkeletonKPI />
                        </>
                    ) : (
                        <>
                            <KPITile
                                label="Dự án"
                                value={stats?.activeProjects ?? '-'}
                                icon={<FolderKanban size={18} color={theme.primary} />}
                                color={theme.primary}
                                bg={theme.primaryGradientSoft[0]}
                            />
                            <KPITile
                                label="WO chờ"
                                value={stats?.pendingWorkOrders ?? '-'}
                                icon={<ClipboardList size={18} color={theme.warning} />}
                                color={theme.warning}
                                bg={theme.warningBg}
                            />
                        </>
                    )}
                </View>

                {canViewFinance && (
                    <View style={styles.kpiRow}>
                        {isLoading ? (
                            <>
                                <SkeletonKPI /><SkeletonKPI />
                            </>
                        ) : (
                            <>
                                <KPITile
                                    label="Doanh thu"
                                    value={stats ? fmt(stats.totalRevenue) : '-'}
                                    icon={<TrendingUp size={18} color={theme.success} />}
                                    color={theme.success}
                                    bg={theme.successBg}
                                />
                                <KPITile
                                    label="Chi phí"
                                    value={stats ? fmt(stats.totalExpense) : '-'}
                                    icon={<TrendingDown size={18} color={theme.danger} />}
                                    color={theme.danger}
                                    bg={theme.dangerBg}
                                />
                            </>
                        )}
                    </View>
                )}

                {/* Pending POs */}
                {canApprove && data?.pendingPOs && data.pendingPOs.length > 0 && (
                    <Section title="PO chờ duyệt" count={data.pendingPOs.length}>
                        {data.pendingPOs.slice(0, 5).map((po: any) => (
                            <Pressable key={po.id} onPress={() => router.push(`/purchase-orders/${po.id}`)}>
                                <Card style={styles.listCard} elevation="sm">
                                    <View style={styles.listRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.listCode, { color: theme.primary }]}>{po.code}</Text>
                                            <Text style={[styles.listName, { color: theme.text }]} numberOfLines={1}>{po.supplier}</Text>
                                        </View>
                                        <Text style={[styles.listAmount, { color: theme.accent }]}>
                                            {(po.totalAmount || 0).toLocaleString('vi-VN')}đ
                                        </Text>
                                        <ChevronRight size={16} color={theme.textMuted} />
                                    </View>
                                </Card>
                            </Pressable>
                        ))}
                    </Section>
                )}

                {/* Overdue */}
                {data?.overdueWorkOrders && data.overdueWorkOrders.length > 0 && (
                    <Section
                        title="Work Order quá hạn"
                        count={data.overdueWorkOrders.length}
                        icon={<AlertTriangle size={16} color={theme.danger} />}
                        danger
                    >
                        {data.overdueWorkOrders.slice(0, 5).map((wo: any) => (
                            <Card key={wo.id} style={styles.listCard} elevation="sm">
                                <Text style={[styles.listCode, { color: theme.danger }]}>{wo.code}</Text>
                                <Text style={[styles.listName, { color: theme.text }]} numberOfLines={1}>{wo.title}</Text>
                            </Card>
                        ))}
                    </Section>
                )}

                {/* Recent Projects */}
                {data?.recentProjects && data.recentProjects.length > 0 && (
                    <Section title="Dự án gần đây" count={data.recentProjects.length}>
                        {data.recentProjects.map((p: any) => (
                            <Pressable key={p.id} onPress={() => router.push(`/projects/${p.id}`)}>
                                <Card style={styles.listCard} elevation="sm">
                                    <View style={styles.listRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.listCode, { color: theme.primary }]}>{p.code}</Text>
                                            <Text style={[styles.listName, { color: theme.text }]} numberOfLines={1}>{p.name}</Text>
                                        </View>
                                        <Badge label={p.status} variant={getStatusVariant(p.status)} size="sm" />
                                    </View>
                                </Card>
                            </Pressable>
                        ))}
                    </Section>
                )}

                <View style={{ height: 32 }} />
            </View>
        </ScrollView>
    );
}

function Section({ title, count, icon, danger, children }: { title: string; count?: number; icon?: React.ReactNode; danger?: boolean; children: React.ReactNode }) {
    const { theme } = useTheme();
    return (
        <View style={{ marginTop: 24 }}>
            <View style={styles.sectionHeader}>
                {icon}
                <Text style={[styles.sectionTitle, { color: danger ? theme.danger : theme.text }]}>{title}</Text>
                {count !== undefined && (
                    <View style={[styles.countBadge, { backgroundColor: danger ? theme.dangerBg : theme.bgTertiary }]}>
                        <Text style={[styles.countBadgeText, { color: danger ? theme.danger : theme.textSecondary }]}>{count}</Text>
                    </View>
                )}
            </View>
            {children}
        </View>
    );
}

function SkeletonKPI() {
    const { theme } = useTheme();
    return (
        <View style={[styles.kpiTile, { backgroundColor: theme.surface, ...theme.shadow.sm }]}>
            <Skeleton width={36} height={36} radius={10} style={{ marginBottom: 8 }} />
            <Skeleton width={60} height={24} style={{ marginBottom: 4 }} />
            <Skeleton width={40} height={12} />
        </View>
    );
}

const styles = StyleSheet.create({
    hero: {
        paddingTop: 48, paddingBottom: 40, paddingHorizontal: 20,
        borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    },
    heroGreeting: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
    heroName: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
    heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 6 },

    body: { padding: 16, marginTop: -20 },

    quickActions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    quickBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
    quickBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

    kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    kpiTile: { flex: 1, padding: 14, borderRadius: 16 },
    kpiIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    kpiValue: { fontSize: 22, fontWeight: '800' },
    kpiLabel: { fontSize: 12, marginTop: 2 },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '700' },
    countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 'auto' },
    countBadgeText: { fontSize: 11, fontWeight: '700' },

    listCard: { marginBottom: 8 },
    listRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    listCode: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    listName: { fontSize: 14, marginTop: 2 },
    listAmount: { fontSize: 13, fontWeight: '700' },
});
