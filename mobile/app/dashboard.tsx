import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors, { cardShadow, fontWeight } from '@/constants/Colors';
import { useAuth } from '@/lib/auth';
import { apiFetch, apiFetchAllPages } from '@/lib/api';
import { getProjectRoleLabel, isAssignedProjectRole } from '@/lib/projectRoles';

const c = Colors.light;

type DashboardData = {
    stats?: {
        projects?: number;
        activeProjects?: number;
        pendingWorkOrders?: number;
        openWarranty?: number;
    };
    projectsByStatus?: Array<{ status?: string; _count?: number | { _all?: number } }>;
    recentProjects?: any[];
    lowStockProducts?: any[];
    todayTasks?: {
        overdueWOs?: any[];
        pendingPOs?: any[];
        urgentCommitments?: any[];
    };
};

type Snapshot = {
    projectCount: number;
    activeProjects: number;
    unreadNotifications: number;
    sourceLabel: string;
};

type StatCard = {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: number;
    tone: string;
};

type ActionItem = {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    detail: string;
    route: string;
    tone: string;
};

type StatusItem = {
    label: string;
    count: number;
    color: string;
};

type FocusProject = {
    id: string;
    code: string;
    name: string;
    subtitle: string;
    progress: number;
    status: string;
};

type WorkItem = {
    id: string;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    detail: string;
    meta?: string;
    route: string;
    tone: string;
    badge?: string;
};

type TechNoteItem = {
    id: string;
    projectId: string;
    code: string;
    projectName: string;
    note: string;
    status?: string;
    phase?: string;
};

const stripVietnamese = (value?: string | null) =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

const getProjectStatusKey = (status?: string | null) => {
    const normalized = stripVietnamese(status);

    if (normalized.includes('dang thi cong') || normalized === 'thi cong') return 'active';
    if (normalized.includes('hoan thanh')) return 'done';
    if (normalized.includes('khao sat')) return 'survey';
    if (normalized.includes('thiet ke')) return 'design';
    return 'other';
};

const getProjectStatusColor = (status?: string | null) => {
    switch (getProjectStatusKey(status)) {
        case 'active':
            return '#f59e0b';
        case 'done':
            return '#16a34a';
        case 'survey':
            return '#64748b';
        case 'design':
            return '#3b82f6';
        default:
            return c.primary;
    }
};

const countGroupValue = (value: number | { _all?: number } | undefined) =>
    typeof value === 'number' ? value : Number(value?._all || 0);

const getLocalDateKey = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

const getTodayKey = () => getLocalDateKey(new Date().toISOString());

const getTaskSortTime = (task: any) => {
    const raw = task?.endDate || task?.startDate || task?.updatedAt || task?.createdAt;
    const ts = raw ? new Date(raw).getTime() : Number.MAX_SAFE_INTEGER;
    return Number.isFinite(ts) ? ts : Number.MAX_SAFE_INTEGER;
};

const isTaskOpen = (task: any) =>
    Number(task?.progress || 0) < 100 && stripVietnamese(task?.status) !== 'hoan thanh';

const isTaskForToday = (task: any) => {
    const todayKey = getTodayKey();
    const startKey = getLocalDateKey(task?.startDate);
    const endKey = getLocalDateKey(task?.endDate);

    if (startKey && endKey) return startKey <= todayKey && todayKey <= endKey;
    if (endKey) return endKey <= todayKey;
    if (startKey) return startKey <= todayKey;
    return false;
};

const formatTaskWindow = (task: any) => {
    if (task?.endDate) return `Hạn ${new Date(task.endDate).toLocaleDateString('vi-VN')}`;
    if (task?.startDate) return `Bắt đầu ${new Date(task.startDate).toLocaleDateString('vi-VN')}`;
    return 'Chưa gắn mốc';
};

const buildRoute = (base: string, params: Record<string, string | null | undefined>) => {
    const search = Object.entries(params)
        .filter(([, value]) => value)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&');

    return search ? `${base}?${search}` : base;
};

const getEntityTitle = (item: any, fallback: string) =>
    item?.title
    || item?.name
    || item?.code
    || item?.number
    || item?.poNumber
    || item?.purchaseOrderNo
    || item?.project?.name
    || item?.customer?.name
    || fallback;

const getEntityMeta = (item: any) => {
    const parts = [
        item?.project?.code || item?.projectCode,
        item?.project?.name,
        item?.status,
    ].filter(Boolean);

    return parts.join(' • ');
};

const compactText = (value?: string | null) =>
    String(value || '')
        .replace(/\s+/g, ' ')
        .trim();

const buildTechNotes = (projects: any[]): TechNoteItem[] =>
    projects
        .map((project: any) => ({
            id: String(project.id),
            projectId: String(project.id),
            code: project.code || 'DA',
            projectName: project.name || 'Dự án',
            note: compactText(project.notes) || compactText(project.description),
            status: project.status || '',
            phase: project.phase || '',
        }))
        .filter((item) => item.note)
        .slice(0, 5);

const buildStatusBreakdown = (projects: any[]) => {
    const grouped = projects.reduce((acc: Record<string, number>, project: any) => {
        const label = String(project?.status || 'Khác');
        acc[label] = (acc[label] || 0) + 1;
        return acc;
    }, {});

    return Object.entries(grouped)
        .map(([label, count]) => ({
            label,
            count,
            color: getProjectStatusColor(label),
        }))
        .sort((a, b) => b.count - a.count);
};

export default function DashboardScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const isFieldUser = isAssignedProjectRole(user?.role);
    const roleLabel = getProjectRoleLabel(user?.role);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [snapshot, setSnapshot] = useState<Snapshot>({
        projectCount: 0,
        activeProjects: 0,
        unreadNotifications: 0,
        sourceLabel: '',
    });
    const [heroValue, setHeroValue] = useState(0);
    const [heroTitle, setHeroTitle] = useState('Điều hành đồng bộ');
    const [heroSub, setHeroSub] = useState('Dữ liệu đang được đồng bộ từ ERP');
    const [statCards, setStatCards] = useState<StatCard[]>([]);
    const [actionItems, setActionItems] = useState<ActionItem[]>([]);
    const [workItems, setWorkItems] = useState<WorkItem[]>([]);
    const [techNotes, setTechNotes] = useState<TechNoteItem[]>([]);
    const [statusBreakdown, setStatusBreakdown] = useState<StatusItem[]>([]);
    const [focusProjects, setFocusProjects] = useState<FocusProject[]>([]);
    const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);

    const load = async () => {
        try {
            const [projects, notificationRes] = await Promise.all([
                apiFetchAllPages('/api/projects'),
                apiFetch('/api/notifications?limit=20').catch(() => ({ data: [], unreadCount: 0 })),
            ]);

            const notifications = notificationRes?.data || notificationRes?.items || [];
            const unreadNotifications = Number(notificationRes?.unreadCount || notifications.length || 0);
            const activeProjects = projects.filter((project: any) => getProjectStatusKey(project?.status) === 'active');

            if (isFieldUser) {
                const [taskResponses, logResponses, punchResponses] = await Promise.all([
                    Promise.all(
                        activeProjects.map((project: any) =>
                            apiFetch(`/api/schedule-tasks?projectId=${project.id}`).catch(() => ({ flat: [] })),
                        ),
                    ),
                    Promise.all(
                        activeProjects.map((project: any) =>
                            apiFetch(`/api/daily-logs?projectId=${project.id}&limit=500`).catch(() => ({ data: [] })),
                        ),
                    ),
                    Promise.all(
                        activeProjects.map((project: any) =>
                            apiFetch(`/api/punch-list?projectId=${project.id}`).catch(() => ({ data: [] })),
                        ),
                    ),
                ]);

                const mergedTasks = taskResponses.flatMap((response: any, index: number) => {
                    const project = activeProjects[index];
                    const items = response?.flat || response?.data || [];
                    return items.map((task: any) => ({
                        ...task,
                        projectId: task.projectId || project.id,
                        project: task.project || {
                            id: project.id,
                            code: project.code,
                            name: project.name,
                        },
                    }));
                });

                const openTasks = mergedTasks.filter((task: any) => isTaskOpen(task));
                const tasksToday = openTasks.filter((task: any) => isTaskForToday(task));
                const prioritizedTasks = [...(tasksToday.length > 0 ? tasksToday : openTasks)]
                    .sort((a: any, b: any) => getTaskSortTime(a) - getTaskSortTime(b))
                    .slice(0, 5);
                const logsToday = logResponses.reduce((sum: number, response: any) => {
                    const items = response?.data || response || [];
                    return sum + items.filter((item: any) => getLocalDateKey(item.date) === getTodayKey()).length;
                }, 0);
                const punchOpen = punchResponses.reduce((sum: number, response: any) => {
                    const items = Array.isArray(response) ? response : (response?.data || []);
                    return sum + items.filter((item: any) => !['đã xong', 'hoàn thành', 'đã đóng'].includes(stripVietnamese(item.status))).length;
                }, 0);

                setSnapshot({
                    projectCount: projects.length,
                    activeProjects: activeProjects.length,
                    unreadNotifications,
                    sourceLabel: `${roleLabel} • theo dự án được phân`,
                });
                setHeroValue(tasksToday.length > 0 ? tasksToday.length : openTasks.length);
                setHeroTitle(tasksToday.length > 0 ? 'việc cần bám trong ngày' : 'việc đang mở trên dự án');
                setHeroSub(`${activeProjects.length} dự án đang thi công • ${unreadNotifications} thông báo chưa xem`);
                setStatCards([
                    { icon: 'business-outline', label: 'Dự án phụ trách', value: projects.length, tone: c.primary },
                    { icon: 'calendar-outline', label: 'Việc hôm nay', value: tasksToday.length, tone: c.accent },
                    { icon: 'construct-outline', label: 'Việc đang mở', value: openTasks.length, tone: '#f59e0b' },
                    { icon: 'alert-circle-outline', label: 'Punch tồn', value: punchOpen, tone: '#ef4444' },
                ]);
                setActionItems([
                    {
                        icon: 'calendar-outline',
                        title: 'Lịch công việc',
                        detail: `${tasksToday.length} việc đến hạn hoặc nằm trong ngày hôm nay`,
                        route: '/schedule',
                        tone: c.accent,
                    },
                    {
                        icon: 'book-outline',
                        title: 'Nhật ký thi công',
                        detail: `${logsToday} nhật ký đã ghi hôm nay`,
                        route: '/daily-log',
                        tone: c.primary,
                    },
                    {
                        icon: 'shield-checkmark-outline',
                        title: 'Punch & nghiệm thu',
                        detail: `${punchOpen} đầu việc chất lượng còn mở`,
                        route: '/punch-list',
                        tone: '#ef4444',
                    },
                ]);
                setWorkItems(
                    prioritizedTasks.map((task: any) => ({
                        id: String(task.id || `${task.projectId}-${task.name || task.title || 'task'}`),
                        icon: isTaskForToday(task) ? 'flash-outline' : 'hammer-outline',
                        title: task.name || task.title || 'Đầu việc cần theo dõi',
                        detail: task.project?.name || task.project?.code || 'Dự án đang cập nhật',
                        meta: `${formatTaskWindow(task)} • ${Number(task.progress || 0)}%`,
                        route: buildRoute('/schedule', { projectId: task.projectId || task.project?.id }),
                        tone: isTaskForToday(task) ? c.accent : '#f59e0b',
                        badge: task.status || (isTaskForToday(task) ? 'Hôm nay' : 'Đang mở'),
                    })),
                );
                setTechNotes(buildTechNotes(activeProjects.length > 0 ? activeProjects : projects));
                setFocusProjects(
                    activeProjects
                        .map((project: any) => {
                            const projectTasks = openTasks.filter((task: any) => task.projectId === project.id);
                            const todayCount = projectTasks.filter((task: any) => isTaskForToday(task)).length;

                            return {
                                id: project.id,
                                code: project.code || 'DA',
                                name: project.name || 'Dự án',
                                subtitle: `${todayCount} việc hôm nay • ${projectTasks.length} việc mở`,
                                progress: Number(project.progress || 0),
                                status: project.status || '',
                            };
                        })
                        .sort((a, b) => b.progress - a.progress)
                        .slice(0, 5),
                );
                setStatusBreakdown(buildStatusBreakdown(projects));
                setLowStockProducts([]);
                return;
            }

            const dashboard = await apiFetch('/api/dashboard').catch(() => null) as DashboardData | null;
            const pendingPOs = dashboard?.todayTasks?.pendingPOs || [];
            const overdueWOs = dashboard?.todayTasks?.overdueWOs || [];
            const urgentCommitments = dashboard?.todayTasks?.urgentCommitments || [];
            const lowStock = dashboard?.lowStockProducts || [];
            const stats = dashboard?.stats || {};
            const actionCount = overdueWOs.length + pendingPOs.length + urgentCommitments.length;

            setSnapshot({
                projectCount: Number(stats.projects || projects.length),
                activeProjects: Number(stats.activeProjects || activeProjects.length),
                unreadNotifications,
                sourceLabel: 'Đồng bộ trực tiếp từ web ERP',
            });
            setHeroValue(actionCount);
            setHeroTitle('đầu việc cần xử lý ngay');
            setHeroSub(`${Number(stats.activeProjects || activeProjects.length)} dự án đang chạy • ${unreadNotifications} thông báo chưa xem`);
            setStatCards([
                { icon: 'business-outline', label: 'Dự án đang thi công', value: Number(stats.activeProjects || activeProjects.length), tone: c.primary },
                { icon: 'clipboard-outline', label: 'Phiếu công việc chờ', value: Number(stats.pendingWorkOrders || 0), tone: '#f59e0b' },
                { icon: 'receipt-outline', label: 'PO chờ duyệt', value: pendingPOs.length, tone: c.accent },
                { icon: 'construct-outline', label: 'Bảo hành mở', value: Number(stats.openWarranty || 0), tone: '#ef4444' },
            ]);
            setActionItems([
                {
                    icon: 'warning-outline',
                    title: 'Phiếu công việc quá hạn',
                    detail: `${overdueWOs.length} phiếu đang trễ hoặc chậm tiến độ`,
                    route: '/schedule',
                    tone: '#ef4444',
                },
                {
                    icon: 'receipt-outline',
                    title: 'PO chờ duyệt',
                    detail: `${pendingPOs.length} đơn mua hàng đang chờ xử lý`,
                    route: '/purchasing',
                    tone: c.accent,
                },
                {
                    icon: 'git-branch-outline',
                    title: 'Cam kết sắp tới hạn',
                    detail: `${urgentCommitments.length} cam kết cần theo dõi trong 7 ngày`,
                    route: '/dashboard',
                    tone: c.primary,
                },
            ]);
            setWorkItems([
                ...overdueWOs.slice(0, 2).map((item: any, index: number) => ({
                    id: `wo-${item?.id || index}`,
                    icon: 'warning-outline' as const,
                    title: getEntityTitle(item, 'Phiếu công việc quá hạn'),
                    detail: getEntityMeta(item) || 'Ưu tiên xử lý ngay trong hôm nay',
                    meta: 'Hàng chờ phiếu công việc',
                    route: '/schedule',
                    tone: '#ef4444',
                    badge: item?.status || 'Quá hạn',
                })),
                ...pendingPOs.slice(0, 2).map((item: any, index: number) => ({
                    id: `po-${item?.id || index}`,
                    icon: 'receipt-outline' as const,
                    title: getEntityTitle(item, 'PO chờ duyệt'),
                    detail: getEntityMeta(item) || 'Đơn mua hàng đang cần xác nhận',
                    meta: 'Luồng mua hàng',
                    route: '/purchasing',
                    tone: c.accent,
                    badge: item?.status || 'Chờ duyệt',
                })),
                ...urgentCommitments.slice(0, 2).map((item: any, index: number) => ({
                    id: `commit-${item?.id || index}`,
                    icon: 'git-branch-outline' as const,
                    title: getEntityTitle(item, 'Cam kết sắp tới hạn'),
                    detail: getEntityMeta(item) || 'Theo dõi cam kết trong 7 ngày tới',
                    meta: 'Điều hành dự án',
                    route: '/dashboard',
                    tone: c.primary,
                    badge: item?.status || 'Theo dõi',
                })),
            ]);
            setTechNotes(buildTechNotes(activeProjects.length > 0 ? activeProjects : projects));
            setStatusBreakdown(
                Array.isArray(dashboard?.projectsByStatus) && dashboard?.projectsByStatus.length
                    ? dashboard.projectsByStatus
                        .map((item) => ({
                            label: String(item.status || 'Khác'),
                            count: countGroupValue(item._count),
                            color: getProjectStatusColor(item.status),
                        }))
                        .sort((a, b) => b.count - a.count)
                    : buildStatusBreakdown(projects),
            );
            setFocusProjects(
                (dashboard?.recentProjects?.length ? dashboard.recentProjects : projects)
                    .map((project: any) => ({
                        id: project.id,
                        code: project.code || 'DA',
                        name: project.name || 'Dự án',
                        subtitle: project.customer?.name || project.type || project.status || 'Cập nhật gần đây',
                        progress: Number(project.progress || 0),
                        status: project.status || '',
                    }))
                    .slice(0, 5),
            );
            setLowStockProducts(lowStock.slice(0, 6));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            load();
            return undefined;
        }, [isFieldUser, roleLabel]),
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            <ScrollView
                style={s.container}
                showsVerticalScrollIndicator={false}
                refreshControl={(
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={c.primary}
                        colors={[c.primary]}
                    />
                )}>
                <View style={s.headerBlock}>
                    <Text style={s.eyebrow}>Điều hành vận hành</Text>
                    <Text style={s.title}>Điều hành</Text>
                    <Text style={s.subtitle}>
                        {isFieldUser
                            ? 'Giữ góc nhìn hiện trường, chỉ bám các dự án được phân và các việc cần xử lý trong ngày.'
                            : 'Dùng cùng nguồn dữ liệu với web ERP, chỉ giữ lại các chỉ số vận hành quan trọng trên mobile.'}
                    </Text>
                </View>

                <View style={s.heroPanel}>
                    <View style={s.heroGlowPrimary} />
                    <View style={s.heroGlowAccent} />
                    <Text style={s.heroLabel}>{snapshot.sourceLabel || 'Đồng bộ ERP'}</Text>
                    {loading ? (
                        <ActivityIndicator color="#fff" style={{ marginTop: 18 }} />
                    ) : (
                        <>
                            <Text style={s.heroValue}>{heroValue}</Text>
                            <Text style={s.heroTitle}>{heroTitle}</Text>
                            <Text style={s.heroSub}>{heroSub}</Text>
                        </>
                    )}
                    <View style={s.heroMetaRow}>
                        <View style={s.heroMetaPill}>
                            <Ionicons name="business-outline" size={14} color="#fff" />
                            <Text style={s.heroMetaText}>{snapshot.activeProjects} dự án hoạt động</Text>
                        </View>
                        <View style={s.heroMetaPill}>
                            <Ionicons name="notifications-outline" size={14} color="#fff" />
                            <Text style={s.heroMetaText}>{snapshot.unreadNotifications} thông báo chưa xem</Text>
                        </View>
                    </View>
                </View>

                <View style={s.sectionHeader}>
                    <Text style={s.sectionTitle}>Tổng quan vận hành</Text>
                    <Text style={s.sectionHint}>{snapshot.projectCount} dự án đang đồng bộ</Text>
                </View>
                <View style={s.metricsBoard}>
                    {statCards.map((item, index) => (
                        <View
                            key={item.label}
                            style={[s.metricRow, index === statCards.length - 1 && s.metricRowLast]}>
                            <View style={s.metricLead}>
                                <View style={[s.statIconWrap, { backgroundColor: `${item.tone}18` }]}>
                                    <Ionicons name={item.icon} size={20} color={item.tone} />
                                </View>
                                <Text style={s.statLabel}>{item.label}</Text>
                            </View>
                            <Text style={s.statValue}>{item.value}</Text>
                        </View>
                    ))}
                </View>

                <View style={s.sectionHeader}>
                    <Text style={s.sectionTitle}>Cần xử lý</Text>
                    <Text style={s.sectionHint}>Đi tắt vào luồng chính</Text>
                </View>
                <View style={s.sectionPanel}>
                    {actionItems.map((item, index) => (
                        <TouchableOpacity
                            key={item.title}
                            style={[s.actionRow, index === actionItems.length - 1 && s.actionRowLast]}
                            activeOpacity={0.86}
                            onPress={() => router.push(item.route as any)}>
                            <View style={[s.actionIcon, { backgroundColor: `${item.tone}16` }]}>
                                <Ionicons name={item.icon} size={18} color={item.tone} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.actionTitle}>{item.title}</Text>
                                <Text style={s.actionDetail}>{item.detail}</Text>
                            </View>
                            <Ionicons name="arrow-forward" size={18} color={c.textMuted} />
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={s.sectionHeader}>
                    <Text style={s.sectionTitle}>Công việc của tôi</Text>
                    <Text style={s.sectionHint}>
                        {isFieldUser ? 'Các đầu việc gần nhất theo dự án đang phụ trách' : 'Các hàng chờ ưu tiên của bạn'}
                    </Text>
                </View>
                <View style={s.sectionPanel}>
                    {loading ? (
                        <View style={s.loaderWrap}>
                            <ActivityIndicator color={c.primary} />
                        </View>
                    ) : workItems.length === 0 ? (
                        <View style={s.emptyState}>
                            <Ionicons name="checkmark-done-outline" size={26} color={c.textMuted} />
                            <Text style={s.emptyTitle}>Chưa có đầu việc nổi bật</Text>
                            <Text style={s.emptySub}>Khi có việc cần bám, danh sách sẽ hiện ở đây để mở nhanh đúng luồng.</Text>
                        </View>
                    ) : (
                        workItems.map((item, index) => (
                            <TouchableOpacity
                                key={item.id}
                                style={[s.workRow, index === workItems.length - 1 && s.workRowLast]}
                                activeOpacity={0.86}
                                onPress={() => router.push(item.route as any)}>
                                <View style={[s.workIcon, { backgroundColor: `${item.tone}16` }]}>
                                    <Ionicons name={item.icon} size={18} color={item.tone} />
                                </View>
                                <View style={s.workBody}>
                                    <View style={s.workTop}>
                                        <Text style={s.workTitle} numberOfLines={1}>{item.title}</Text>
                                        {item.badge ? (
                                            <View style={[s.workBadge, { backgroundColor: `${item.tone}14` }]}>
                                                <Text style={[s.workBadgeText, { color: item.tone }]} numberOfLines={1}>{item.badge}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    <Text style={s.workDetail} numberOfLines={1}>{item.detail}</Text>
                                    {item.meta ? (
                                        <Text style={s.workMeta} numberOfLines={1}>{item.meta}</Text>
                                    ) : null}
                                </View>
                                <Ionicons name="arrow-forward" size={18} color={c.textMuted} />
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {lowStockProducts.length > 0 && (
                    <>
                        <View style={s.sectionHeader}>
                            <Text style={s.sectionTitle}>Cảnh báo tồn kho</Text>
                            <Text style={s.sectionHint}>Đồng bộ từ web ERP</Text>
                        </View>
                        <View style={s.stockWrap}>
                            {lowStockProducts.map((item) => (
                                <View key={String(item.id)} style={s.stockChip}>
                                    <View style={s.stockBadge}>
                                        <Ionicons name="cube-outline" size={12} color="#ef4444" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.stockTitle} numberOfLines={1}>{item.name}</Text>
                                        <Text style={s.stockMeta}>
                                            Tồn {item.stock ?? 0}
                                            {Number(item.minStock || 0) > 0 ? ` / min ${item.minStock}` : ''}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </>
                )}

                <View style={s.sectionHeader}>
                    <Text style={s.sectionTitle}>Kỹ thuật thi công</Text>
                    <Text style={s.sectionHint}>
                        {techNotes.length > 0 ? `${techNotes.length} lưu ý công trình cần nhớ` : 'Lưu ý hiện trường theo công trình'}
                    </Text>
                </View>
                <View style={s.sectionPanel}>
                    {loading ? (
                        <View style={s.loaderWrap}>
                            <ActivityIndicator color={c.primary} />
                        </View>
                    ) : techNotes.length === 0 ? (
                        <View style={s.emptyState}>
                            <Ionicons name="construct-outline" size={26} color={c.textMuted} />
                            <Text style={s.emptyTitle}>Chưa có lưu ý thi công</Text>
                            <Text style={s.emptySub}>Khi dự án có ghi chú hoặc mô tả kỹ thuật, phần này sẽ hiện để kỹ thuật bám theo.</Text>
                        </View>
                    ) : (
                        techNotes.map((item, index) => (
                            <TouchableOpacity
                                key={item.id}
                                style={[s.techRow, index === techNotes.length - 1 && s.techRowLast]}
                                activeOpacity={0.86}
                                onPress={() => router.push(`/projects/${item.projectId}` as any)}>
                                <View style={s.techCodeBadge}>
                                    <Text style={s.techCodeText}>{item.code}</Text>
                                </View>
                                <View style={s.techBody}>
                                    <View style={s.techTop}>
                                        <Text style={s.techProjectName} numberOfLines={1}>{item.projectName}</Text>
                                        {item.status ? (
                                            <View style={[s.techStatusPill, { backgroundColor: `${getProjectStatusColor(item.status)}16` }]}>
                                                <Text style={[s.techStatusText, { color: getProjectStatusColor(item.status) }]} numberOfLines={1}>
                                                    {item.status}
                                                </Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    <Text style={s.techNoteText}>{item.note}</Text>
                                    <Text style={s.techMetaText}>
                                        {item.phase ? `${item.phase} • ` : ''}Mở chi tiết công trình để xem thêm
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                <View style={{ height: 104 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bgGradientStart },
    container: { flex: 1 },
    headerBlock: {
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 4,
    },
    eyebrow: {
        fontSize: 12,
        color: c.primary,
        fontWeight: fontWeight.title,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    title: {
        marginTop: 8,
        fontSize: 30,
        color: c.text,
        fontWeight: fontWeight.title,
    },
    subtitle: {
        marginTop: 8,
        fontSize: 14,
        lineHeight: 22,
        color: c.textSecondary,
    },
    heroPanel: {
        marginHorizontal: 16,
        marginTop: 18,
        padding: 22,
        borderRadius: 28,
        backgroundColor: c.primaryDark,
        overflow: 'hidden',
    },
    heroGlowPrimary: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.08)',
        right: -54,
        top: -38,
    },
    heroGlowAccent: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(197,160,89,0.3)',
        right: 48,
        bottom: -34,
    },
    heroLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.68)',
        fontWeight: fontWeight.title,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    heroValue: {
        marginTop: 14,
        fontSize: 54,
        lineHeight: 58,
        color: '#fff',
        fontWeight: '800',
    },
    heroTitle: {
        marginTop: 2,
        fontSize: 20,
        color: '#fff',
        fontWeight: fontWeight.secondary,
    },
    heroSub: {
        marginTop: 8,
        fontSize: 14,
        lineHeight: 22,
        color: 'rgba(255,255,255,0.78)',
    },
    heroMetaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 18,
    },
    heroMetaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    heroMetaText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: fontWeight.label,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: 20,
        marginTop: 26,
        marginBottom: 12,
        gap: 16,
    },
    sectionTitle: {
        fontSize: 16,
        color: c.text,
        fontWeight: fontWeight.title,
    },
    sectionHint: {
        fontSize: 12,
        color: c.textMuted,
    },
    metricsBoard: {
        marginHorizontal: 16,
        backgroundColor: c.card,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: c.borderP5,
        overflow: 'hidden',
        ...cardShadow,
    },
    metricRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: c.borderP5,
    },
    metricRowLast: {
        borderBottomWidth: 0,
    },
    metricLead: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    statIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statValue: {
        fontSize: 30,
        color: c.text,
        fontWeight: '800',
    },
    statLabel: {
        fontSize: 13,
        color: c.textSecondary,
        fontWeight: fontWeight.label,
    },
    sectionPanel: {
        marginHorizontal: 16,
        backgroundColor: c.card,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: c.borderP5,
        overflow: 'hidden',
        ...cardShadow,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: c.borderP5,
    },
    actionRowLast: {
        borderBottomWidth: 0,
    },
    actionIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionTitle: {
        fontSize: 14,
        color: c.text,
        fontWeight: fontWeight.secondary,
    },
    actionDetail: {
        marginTop: 2,
        fontSize: 12,
        color: c.textSecondary,
        lineHeight: 18,
    },
    workRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: c.borderP5,
    },
    workRowLast: {
        borderBottomWidth: 0,
    },
    workIcon: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    workBody: {
        flex: 1,
    },
    workTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    workTitle: {
        flex: 1,
        fontSize: 14,
        color: c.text,
        fontWeight: fontWeight.secondary,
    },
    workBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        maxWidth: 120,
    },
    workBadgeText: {
        fontSize: 10,
        fontWeight: fontWeight.title,
    },
    workDetail: {
        marginTop: 4,
        fontSize: 12,
        color: c.textSecondary,
    },
    workMeta: {
        marginTop: 4,
        fontSize: 11,
        color: c.textMuted,
    },
    techRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: c.borderP5,
    },
    techRowLast: {
        borderBottomWidth: 0,
    },
    techCodeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: c.primary + '10',
    },
    techCodeText: {
        fontSize: 11,
        color: c.primary,
        fontWeight: fontWeight.title,
        letterSpacing: 0.5,
    },
    techBody: {
        flex: 1,
    },
    techTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    techProjectName: {
        flex: 1,
        fontSize: 14,
        color: c.text,
        fontWeight: fontWeight.secondary,
    },
    techStatusPill: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        maxWidth: 120,
    },
    techStatusText: {
        fontSize: 10,
        fontWeight: fontWeight.title,
    },
    techNoteText: {
        marginTop: 8,
        fontSize: 12,
        lineHeight: 20,
        color: c.textSecondary,
    },
    techMetaText: {
        marginTop: 8,
        fontSize: 11,
        color: c.textMuted,
    },
    stockWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        paddingHorizontal: 16,
    },
    stockChip: {
        width: '47.5%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 14,
        borderRadius: 20,
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.borderP5,
        ...cardShadow,
    },
    stockBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(239,68,68,0.12)',
    },
    stockTitle: {
        fontSize: 13,
        color: c.text,
        fontWeight: fontWeight.secondary,
    },
    stockMeta: {
        marginTop: 2,
        fontSize: 11,
        color: c.textMuted,
    },
    statusBar: {
        flexDirection: 'row',
        gap: 4,
        height: 16,
        margin: 18,
        marginBottom: 0,
    },
    statusSegment: {
        borderRadius: 999,
    },
    statusLegend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        paddingHorizontal: 18,
        paddingTop: 16,
        paddingBottom: 18,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingRight: 8,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 12,
        color: c.textSecondary,
    },
    loaderWrap: {
        paddingVertical: 28,
    },
    projectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: c.borderP5,
    },
    projectRowLast: {
        borderBottomWidth: 0,
    },
    projectCodeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: c.primary + '10',
    },
    projectCodeText: {
        fontSize: 11,
        color: c.primary,
        fontWeight: fontWeight.title,
        letterSpacing: 0.5,
    },
    projectTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    },
    projectName: {
        flex: 1,
        fontSize: 14,
        color: c.text,
        fontWeight: fontWeight.secondary,
    },
    projectStatusPill: {
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 999,
    },
    projectStatusText: {
        fontSize: 10,
        fontWeight: fontWeight.title,
    },
    projectMeta: {
        marginTop: 6,
        fontSize: 12,
        color: c.textSecondary,
    },
    projectProgressTrack: {
        marginTop: 10,
        height: 6,
        borderRadius: 999,
        backgroundColor: '#e7ebf4',
        overflow: 'hidden',
    },
    projectProgressFill: {
        height: '100%',
        borderRadius: 999,
        backgroundColor: c.accent,
    },
    projectProgressText: {
        fontSize: 12,
        color: c.primary,
        fontWeight: fontWeight.title,
    },
    emptyState: {
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 28,
    },
    emptyTitle: {
        marginTop: 10,
        fontSize: 15,
        color: c.text,
        fontWeight: fontWeight.secondary,
    },
    emptySub: {
        marginTop: 6,
        fontSize: 12,
        lineHeight: 18,
        color: c.textMuted,
        textAlign: 'center',
    },
});


