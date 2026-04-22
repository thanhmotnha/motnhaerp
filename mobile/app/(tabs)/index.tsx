import React, { useMemo, useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet,
    TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/lib/auth';
import { apiFetch, apiFetchAllPages, flushOfflineQueue } from '@/lib/api';
import { useToast } from '@/components/Toast';
import Colors, { cardShadow, radius, fontWeight } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProjectRoleLabel, isAssignedProjectRole } from '@/lib/projectRoles';

const c = Colors.light;

const DAILY_QUOTES = [
    'M\u1ed7i c\u00f4ng tr\u00ecnh l\u1edbn \u0111\u1ec1u b\u1eaft \u0111\u1ea7u t\u1eeb m\u1ed9t vi\u00ean g\u1ea1ch \u{1F9F1}',
    'An to\u00e0n l\u00e0 s\u1ed1 1, ch\u1ea5t l\u01b0\u1ee3ng l\u00e0 danh d\u1ef1 \u{1F3D7}',
    'H\u00f4m nay l\u00e0 ng\u00e0y tuy\u1ec7t v\u1eddi \u0111\u1ec3 x\u00e2y d\u1ef1ng \u2728',
    'Th\u00e0nh c\u00f4ng n\u1eb1m \u1edf s\u1ef1 chu\u1ea9n b\u1ecb k\u1ef9 l\u01b0\u1ee1ng \u{1F4CB}',
    'M\u1ed9t \u0111\u1ed9i thi c\u00f4ng m\u1ea1nh l\u00e0 n\u1ec1n m\u00f3ng c\u1ee7a m\u1ecd th\u1ee9 \u{1F4AA}',
    'Ki\u00ean nh\u1eabn v\u00e0 t\u1ec9 m\u1ec9 t\u1ea1o n\u00ean ki\u1ec7t t\u00e1c \u{1F3A8}',
    'Kh\u00f4ng c\u00f3 g\u00ec l\u00e0 kh\u00f4ng th\u1ec3, ch\u1ec9 c\u00f3 ch\u01b0a t\u00ecm ra c\u00e1ch \u{1F4A1}',
    'H\u00e3y t\u1ef1 h\u00e0o v\u1ec1 nh\u1eefng g\u00ec b\u1ea1n x\u00e2y d\u1ef1ng \u{1F3E0}',
    'Ch\u1ea5t l\u01b0\u1ee3ng kh\u00f4ng bao gi\u1edd l\u00e0 ng\u1eabu nhi\u00ean \u{1F3AF}',
    'M\u1ed7i ng\u00e0y m\u1edbi l\u00e0 c\u01a1 h\u1ed9i \u0111\u1ec3 ho\u00e0n thi\u1ec7n \u{1F31F}',
    '\u0110o l\u01b0\u1eddng hai l\u1ea7n, c\u1eaft m\u1ed9t l\u1ea7n \u{1F4CF}',
    'S\u1ef1 ch\u00ednh x\u00e1c l\u00e0 ngh\u1ec7 thu\u1eadt c\u1ee7a k\u1ef9 s\u01b0 \u{1F52C}',
    'C\u00f4ng tr\u01b0\u1eddng s\u1ea1ch l\u00e0 c\u00f4ng tr\u01b0\u1eddng an to\u00e0n \u{1F9F9}',
    'Teamwork l\u00e0m n\u00ean \u0111i\u1ec1u tuy\u1ec7t v\u1eddi \u{1F91D}',
    'H\u00e3y l\u00e0m vi\u1ec7c nh\u01b0 kh\u00f4ng ai nh\u00ecn, ch\u1ea5t l\u01b0\u1ee3ng nh\u01b0 ai c\u0169ng xem \u{1F440}',
    'M\u1ed9t ng\u00e0y n\u1eef l\u1ef1c, m\u1ed9t ng\u00e0y g\u1ea7n h\u01a1n m\u1ee5c ti\u00eau \u{1F680}',
    'N\u1ec1n m\u00f3ng v\u1eefng ch\u1eafc, ng\u00f4i nh\u00e0 b\u1ec1n v\u1eefng \u{1F3D8}',
    'K\u1ef7 lu\u1eadt t\u1ea1o n\u00ean s\u1ee9c m\u1ea1nh \u26A1',
    'S\u00e1ng t\u1ea1o trong gi\u1ea3i ph\u00e1p, ch\u00ednh x\u00e1c trong thi c\u00f4ng \u{1F9E0}',
    'H\u00e3y bi\u1ebfn b\u1ea3n v\u1ebd th\u00e0nh hi\u1ec7n th\u1ef1c \u{1F4D0}',
    'M\u1ed7i vi\u00ean g\u1ea1ch \u0111\u1eb7t \u0111\u00fang ch\u1ed7 l\u00e0 m\u1ed9t b\u01b0\u1edbc ti\u1ebfn \u{1F9F1}',
    'Ng\u01b0\u1eddi k\u1ef9 s\u01b0 gi\u1ecfi l\u00e0 ng\u01b0\u1eddi kh\u00f4ng ng\u1eebng h\u1ecdc \u{1F4DA}',
    'An to\u00e0n cho m\u00ecnh, an to\u00e0n cho \u0111\u1ed3ng \u0111\u1ed9i \u{1F6E1}',
    'C\u00f4ng tr\u00ecnh \u0111\u1eb9p nh\u1ea5t l\u00e0 c\u00f4ng tr\u00ecnh b\u1ea1n x\u00e2y b\u1eb1ng \u0111am m\u00ea \u2764\uFE0F',
    'Ti\u1ebfn \u0111\u1ed9 l\u00e0 quan tr\u1ecdng, nh\u01b0ng ch\u1ea5t l\u01b0\u1ee3ng l\u00e0 t\u1ea5t c\u1ea3 \u{1F3C6}',
    'L\u00e0m v\u1ec7c c\u00f3 k\u1ebf ho\u1ea1ch, th\u00e0nh c\u00f4ng c\u00f3 h\u1ec7 th\u1ed1ng \u{1F5C2}',
    'H\u01b0\u1edbng \u0111\u1ebfn s\u1ef1 ho\u00e0n h\u1ea3o trong t\u1eebng chi ti\u1ebft \u{1F48E}',
    'Th\u1eedi ti\u1ebft x\u1ea5u kh\u00f4ng l\u00e0m ch\u1eadm k\u1ef9 s\u01b0 gi\u1ecfi \u26C8\uFE0F',
    'Ng\u00e0y m\u1edbi, c\u00f4ng tr\u00ecnh m\u1edbi, c\u1ea3m h\u1ee9ng m\u1edbi \u{1F308}',
    'B\u1ea1n l\u00e0 nh\u1eefng ng\u01b0\u1eddi ki\u1ebfn t\u1ea1o kh\u00f4ng gian s\u1ed1ng \u{1F3E1}',
];
const getDailyQuote = () => DAILY_QUOTES[Math.floor((Date.now() / 86400000)) % DAILY_QUOTES.length];
const isSameLocalDate = (value?: string | null) => {
    if (!value) return false;
    const date = new Date(value);
    const now = new Date();
    return (
        date.getFullYear() === now.getFullYear()
        && date.getMonth() === now.getMonth()
        && date.getDate() === now.getDate()
    );
};

const normalizeMaterialStatus = (status?: string | null) => {
    if (!status) return '';
    if (status !== 'Chờ duyệt' && status.includes('Chờ duyệt')) return 'Chờ duyệt';
    return status;
};

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

const isTaskOpen = (task: any) => Number(task?.progress || 0) < 100 && task?.status !== 'Hoàn thành';

const isTaskForToday = (task: any) => {
    const todayKey = getTodayKey();
    const startKey = getLocalDateKey(task?.startDate);
    const endKey = getLocalDateKey(task?.endDate);

    if (startKey && endKey) return startKey <= todayKey && todayKey <= endKey;
    if (endKey) return endKey <= todayKey;
    if (startKey) return startKey <= todayKey;
    return false;
};

const buildRoute = (base: string, params: Record<string, string | null | undefined>) => {
    const search = Object.entries(params)
        .filter(([, value]) => value)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&');

    return search ? `${base}?${search}` : base;
};

const formatTaskWindow = (task: any) => {
    if (task?.endDate) return `Hạn ${new Date(task.endDate).toLocaleDateString('vi-VN')}`;
    if (task?.startDate) return `Bắt đầu ${new Date(task.startDate).toLocaleDateString('vi-VN')}`;
    return 'Chưa gắn mốc thời gian';
};

export default function HomeScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [projects, setProjects] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [badges, setBadges] = useState({ approvals: 0, logs: 0, punch: 0, activeProjects: 0 });
    const [erpPulse, setErpPulse] = useState({ workOrders: 0, pendingPOs: 0, openWarranty: 0 });
    const toast = useToast();
    const isFieldOwnedUser = isAssignedProjectRole(user?.role);
    const roleLabel = getProjectRoleLabel(user?.role);

    const load = async () => {
        // Flush offline queue
        try {
            const flushed = await flushOfflineQueue();
            if (flushed > 0) toast.show(`\u0110\u00e3 g\u1eedi ${flushed} b\u1ea3n ghi offline`, 'success');
        } catch { }
        try {
            const projectList = await apiFetchAllPages('/api/projects?status=\u0110ang thi c\u00f4ng');
            setProjects(projectList);
            if (projectList.length > 0) {
                const taskProjectPool = projectList;
                const taskResponses = await Promise.all(
                    taskProjectPool.map((project: any) =>
                        apiFetch(`/api/schedule-tasks?projectId=${project.id}`).catch(() => ({ flat: [] })),
                    ),
                );
                const mergedTasks = taskResponses.flatMap((response: any, index: number) => {
                    const project = taskProjectPool[index];
                    const items = response?.flat || response?.data || [];
                    return items.map((task: any) => ({
                        ...task,
                        project: task.project || {
                            id: project.id,
                            name: project.name,
                            code: project.code,
                        },
                    }));
                });
                setTasks(mergedTasks.sort((a: any, b: any) => getTaskSortTime(a) - getTaskSortTime(b)));
            } else {
                setTasks([]);
            }
            // Fetch badge counts
            try {
                const [dashboardRes, reqRes, poRes, logResList, punchLists] = await Promise.all([
                    !isFieldOwnedUser ? apiFetch('/api/dashboard').catch(() => null) : Promise.resolve(null),
                    apiFetch('/api/material-requisitions?limit=100').catch(() => []),
                    apiFetchAllPages('/api/purchase-orders').catch(() => []),
                    Promise.all(
                        projectList.map((project: any) => apiFetch(`/api/daily-logs?projectId=${project.id}&limit=500`).catch(() => ({ data: [] }))),
                    ),
                    Promise.all(
                        projectList.map((project: any) => apiFetch(`/api/punch-list?projectId=${project.id}`).catch(() => [])),
                    ),
                ]);
                const requisitionItems = Array.isArray(reqRes) ? reqRes : (reqRes?.data || []);
                const purchaseOrders = poRes || [];
                const pendingApprovals =
                    requisitionItems
                        .filter((item: any) => ['Chờ xử lý', 'Chờ duyệt'].includes(normalizeMaterialStatus(item.status)))
                        .length
                    + purchaseOrders
                        .filter((item: any) => String(item.status || '').includes('Chờ duyệt'))
                        .length;
                const logs = logResList.reduce((sum: number, res: any) => {
                    const items = res?.data || res || [];
                    return sum + items.filter((item: any) => isSameLocalDate(item.date)).length;
                }, 0);
                const punch = punchLists.reduce((sum: number, res: any) => {
                    const items = Array.isArray(res) ? res : (res?.data || []);
                    return sum + items.filter((item: any) => !['Đã xong', 'Hoàn thành', 'Đã đóng'].includes(item.status)).length;
                }, 0);
                setErpPulse({
                    workOrders: Number(dashboardRes?.stats?.pendingWorkOrders || 0),
                    pendingPOs: Array.isArray(dashboardRes?.todayTasks?.pendingPOs)
                        ? dashboardRes.todayTasks.pendingPOs.length
                        : 0,
                    openWarranty: Number(dashboardRes?.stats?.openWarranty || 0),
                });
                setBadges({
                    approvals: pendingApprovals,
                    logs,
                    punch,
                    activeProjects: projectList.length,
                });
            } catch { }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    useFocusEffect(
        React.useCallback(() => {
            if (user) load();
            return undefined;
        }, [user]),
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    const quickActions = [
        {
            icon: 'book-outline' as const,
            label: 'Nh\u1eadt k\u00fd thi c\u00f4ng',
            desc: '\u1ea2nh & b\u00e1o c\u00e1o h\u1eb1ng ng\u00e0y',
            color: c.primary,
            route: '/daily-log',
        },
        {
            icon: 'cube-outline' as const,
            label: 'Y\u00eau c\u1ea7u v\u1eadt t\u01b0',
            desc: '\u0110\u1eb7t h\u00e0ng & ki\u1ec3m kho',
            color: c.accent,
            route: '/material-request',
        },
        {
            icon: 'receipt-outline' as const,
            label: 'Mua h\u00e0ng & nh\u1eadn PO',
            desc: 'Nh\u1eadn h\u00e0ng \u0111\u00fang lu\u1ed3ng PO',
            color: c.primary,
            route: '/purchasing',
        },
        {
            icon: 'map-outline' as const,
            label: 'B\u1ea3n v\u1ebd k\u1ef9 thu\u1eadt',
            desc: 'CAD, b\u1ea3n v\u1ebd & 3D',
            color: c.primary,
            route: '/drawings',
        },
        {
            icon: 'checkmark-done-outline' as const,
            label: 'Ph\u00ea duy\u1ec7t',
            desc: 'Duy\u1ec7t \u0111\u1ec1 xu\u1ea5t & y\u00eau c\u1ea7u',
            color: c.accent,
            route: '/approvals',
        },
        {
            icon: 'calendar-outline' as const,
            label: 'L\u1ecbch l\u00e0m vi\u1ec7c',
            desc: 'Gantt & ti\u1ebfn \u0111\u1ed9',
            color: c.primary,
            route: '/schedule',
        },
        {
            icon: 'construct-outline' as const,
            label: 'L\u1ec7nh s\u1ea3n xu\u1ea5t',
            desc: 'Gia c\u00f4ng n\u1ed9i th\u1ea5t',
            color: c.accent,
            route: '/production',
        },
        {
            icon: 'alert-circle-outline' as const,
            label: 'Punch List',
            desc: 'QC c\u00f4ng tr\u01b0\u1eddng',
            color: c.primary,
            route: '/punch-list',
        },
        {
            icon: 'ribbon-outline' as const,
            label: 'Nghi\u1ec7m thu',
            desc: 'Ki\u1ec3m tra & nghi\u1ec7m thu',
            color: c.accent,
            route: '/acceptance-check',
        },
    ];

    // Extra admin/management actions — visible based on role
    const userRole = user?.role;
    const isAdmin = userRole === 'giam_doc' || userRole === 'ke_toan';
    const isNvkd = userRole === 'kinh_doanh';
    const managementActions = useMemo(() => {
        const list: Array<{ icon: any; label: string; desc: string; color: string; route: string }> = [];

        if (isAdmin || isNvkd) {
            list.push({
                icon: 'people-outline', label: 'Khách hàng',
                desc: 'CRM + Check-in tại chỗ', color: c.primary, route: '/customers',
            });
        }

        if (isAdmin || isNvkd) {
            list.push({
                icon: 'document-text-outline', label: 'Hợp đồng',
                desc: 'Xem + tiến độ thu', color: c.primary, route: '/contracts',
            });
            list.push({
                icon: 'document-outline', label: 'Báo giá',
                desc: 'Danh sách báo giá', color: c.accent, route: '/quotations',
            });
        }

        if (isAdmin) {
            list.push({
                icon: 'cash-outline', label: 'Thu tiền',
                desc: 'Các đợt thu chờ xử lý', color: c.success, route: '/finance',
            });
            list.push({
                icon: 'wallet-outline', label: 'Chi phí chung',
                desc: 'Duyệt CPG tháng', color: c.warning, route: '/overhead',
            });
            list.push({
                icon: 'trending-down-outline', label: 'Công nợ',
                desc: 'NCC + Thợ', color: c.danger, route: '/debts',
            });
            list.push({
                icon: 'stats-chart-outline', label: 'Báo cáo lãi lỗ',
                desc: 'P&L theo dự án', color: c.primary, route: '/pnl',
            });
            list.push({
                icon: 'people-circle-outline', label: 'Nhân sự',
                desc: 'Chấm công + nghỉ phép', color: c.accent, route: '/hr',
            });
        }

        if (userRole === 'kho' || userRole === 'ky_thuat' || isAdmin) {
            list.push({
                icon: 'archive-outline', label: 'Kho',
                desc: 'Nhập / Xuất vật tư', color: c.accent, route: '/inventory',
            });
        }

        // Workshop worker sees their task list
        if (userRole === 'kho') {
            list.unshift({
                icon: 'clipboard-outline', label: 'Việc của tôi',
                desc: 'Công việc xưởng hôm nay', color: c.primary, route: '/workshop-tasks',
            });
        }

        return list;
    }, [userRole, isAdmin, isNvkd]);

    const activeProject = projects[0];
    const scopedProjectId = activeProject?.id || '';
    const scopedRoutes = {
        dailyLog: buildRoute('/daily-log', { projectId: scopedProjectId }),
        schedule: buildRoute('/schedule', { projectId: scopedProjectId }),
        material: buildRoute('/material-request', { projectId: scopedProjectId }),
        purchasing: buildRoute('/purchasing', { projectId: scopedProjectId }),
        punch: buildRoute('/punch-list', { projectId: scopedProjectId }),
        acceptance: buildRoute('/acceptance-check', { projectId: scopedProjectId }),
        projects: '/(tabs)/projects',
        approvals: '/approvals',
        dashboard: '/dashboard',
    };

    const openTasks = useMemo(
        () => tasks.filter((task: any) => isTaskOpen(task)),
        [tasks],
    );
    const todaysTasks = useMemo(
        () => openTasks.filter((task: any) => isTaskForToday(task)),
        [openTasks],
    );
    const prioritizedTasks = useMemo(() => {
        const source = todaysTasks.length > 0 ? todaysTasks : openTasks;
        return [...source]
            .sort((a: any, b: any) => getTaskSortTime(a) - getTaskSortTime(b))
            .slice(0, 5);
    }, [openTasks, todaysTasks]);
    const myWorkCards = useMemo(() => ([
        {
            icon: 'briefcase-outline' as const,
            label: isFieldOwnedUser ? 'Dự án phụ trách' : 'Dự án hoạt động',
            value: projects.length,
            color: c.primary,
            route: scopedRoutes.projects,
        },
        {
            icon: 'calendar-outline' as const,
            label: todaysTasks.length > 0 ? 'Việc hôm nay' : 'Việc đang mở',
            value: todaysTasks.length > 0 ? todaysTasks.length : openTasks.length,
            color: c.accent,
            route: scopedRoutes.schedule,
        },
        isFieldOwnedUser
            ? {
                icon: 'alert-circle-outline' as const,
                label: 'Punch tồn',
                value: badges.punch,
                color: '#ef4444',
                route: scopedRoutes.punch,
            }
            : {
                icon: 'checkmark-done-outline' as const,
                label: 'Chờ duyệt',
                value: badges.approvals,
                color: '#f59e0b',
                route: scopedRoutes.approvals,
            },
    ]), [badges.approvals, badges.punch, isFieldOwnedUser, openTasks.length, projects.length, scopedRoutes.approvals, scopedRoutes.projects, scopedRoutes.punch, scopedRoutes.schedule, todaysTasks.length]);
    const roleActions = useMemo(() => {
        if (isFieldOwnedUser) {
            return [
                { icon: 'book-outline' as const, label: 'Nhật ký', route: scopedRoutes.dailyLog },
                { icon: 'cube-outline' as const, label: 'Vật tư', route: scopedRoutes.material },
                { icon: 'shield-checkmark-outline' as const, label: 'Nghiệm thu', route: scopedRoutes.acceptance },
            ];
        }

        return [
            { icon: 'checkmark-done-outline' as const, label: 'Phê duyệt', route: scopedRoutes.approvals },
            { icon: 'receipt-outline' as const, label: 'Mua hàng', route: scopedRoutes.purchasing },
            { icon: 'compass-outline' as const, label: 'Điều hành', route: scopedRoutes.dashboard },
        ];
    }, [isFieldOwnedUser, scopedRoutes.acceptance, scopedRoutes.approvals, scopedRoutes.dailyLog, scopedRoutes.dashboard, scopedRoutes.material, scopedRoutes.purchasing]);
    const focusProjects = useMemo(() => projects.slice(0, 3), [projects]);
    const taskSectionTitle = todaysTasks.length > 0 ? 'Công việc hôm nay' : 'Việc ưu tiên';

    const taskStatusColor = (status: string) => {
        if (status === 'Ho\u00e0n th\u00e0nh') return c.success;
        if (status === '\u0110ang l\u00e0m') return c.accent;
        return '#cbd5e1';
    };

    const taskStatusBg = (status: string) => {
        if (status === 'Ho\u00e0n th\u00e0nh') return c.success + '15';
        if (status === '\u0110ang l\u00e0m') return c.accent + '15';
        return '#f1f5f9';
    };

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            {/* Branded header */}
            <View style={s.brandHeader}>
                <View>
                    <Text style={s.brandName}>
                        M{'\u1ed9'}t Nh{'\u00e0'}
                    </Text>
                    <Text style={s.greeting}>
                        Xin ch{'\u00e0'}o, {user?.name?.split(' ').pop() || 'b\u1ea1n'}{' '}
                        {'\uD83D\uDC4B'}
                    </Text>
                    <Text style={s.dailyQuote}>{getDailyQuote()}</Text>
                </View>
                <TouchableOpacity
                    style={s.headerAction}
                    onPress={() => router.push('/dashboard' as any)}>
                    <Ionicons name="compass-outline" size={22} color={c.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={s.headerAction}
                    onPress={() => router.push('/(tabs)/notifications' as any)}>
                    <Ionicons name="notifications-outline" size={22} color={c.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={s.container}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[c.primary]}
                        tintColor={c.primary}
                    />
                }>
                {/* Hero card */}
                <View style={s.heroWrap}>
                    <View style={s.heroCard}>
                        <View style={s.heroBubble1} />
                        <View style={s.heroBubble2} />
                        <View style={{ zIndex: 1 }}>
                            <Text style={s.heroLabel}>
                                D{'\u1ef0'} {'\u00c1'}N {'\u0110'}ANG THI C{'\u00d4'}NG
                            </Text>
                            <Text style={s.heroTitle}>
                                {activeProject?.name || 'Ch\u01b0a c\u00f3 d\u1ef1 \u00e1n'}
                            </Text>
                        </View>
                        {activeProject && (
                            <View style={s.heroMeta}>
                                <View style={s.heroMetaItem}>
                                    <Ionicons
                                        name="business-outline"
                                        size={14}
                                        color="rgba(255,255,255,0.7)"
                                    />
                                    <Text style={s.heroMetaText}>{activeProject.code}</Text>
                                </View>
                                <View style={s.heroMetaItem}>
                                    <Ionicons
                                        name="trending-up"
                                        size={14}
                                        color={c.accentLight}
                                    />
                                    <Text style={[s.heroMetaText, { color: c.accentLight }]}>
                                        {activeProject.progress || 0}%
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {/* Summary Badges */}
                <View style={s.metricsRail}>
                    {[
                        { icon: 'checkmark-done' as const, label: 'Ch\u1edd duy\u1ec7t', count: badges.approvals, color: '#f59e0b', route: '/approvals' },
                        { icon: 'book' as const, label: 'Nh\u1eadt k\u00fd', count: badges.logs, color: c.primary, route: '/daily-log' },
                        { icon: 'alert-circle' as const, label: 'Punch', count: badges.punch, color: '#ef4444', route: '/punch-list' },
                        { icon: 'briefcase' as const, label: 'D\u1ef1 \u00e1n', count: badges.activeProjects, color: c.success, route: '/(tabs)/projects' },
                    ].map((b, i) => (
                        <TouchableOpacity
                            key={i}
                            style={[s.metricItem, i > 0 && s.metricDivider]}
                            activeOpacity={0.7}
                            onPress={() => router.push(b.route as any)}>
                            <View style={s.metricTop}>
                                <View style={[s.badgeIconCircle, { backgroundColor: b.color + '15' }]}>
                                    <Ionicons name={b.icon} size={18} color={b.color} />
                                </View>
                                <Text style={s.metricValue}>{b.count}</Text>
                            </View>
                            <Text style={s.metricLabel}>{b.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={s.workPanel}>
                    <View style={s.workPanelGlow} />
                    <View style={s.workPanelHeader}>
                        <View>
                            <Text style={s.workPanelEyebrow}>Workspace</Text>
                            <Text style={s.workPanelTitle}>Việc của tôi</Text>
                            <Text style={s.workPanelMeta}>
                                {isFieldOwnedUser
                                    ? `${roleLabel} đang theo ${projects.length} dự án`
                                    : `WO ${erpPulse.workOrders} • PO ${erpPulse.pendingPOs} • Bảo hành ${erpPulse.openWarranty}`}
                            </Text>
                        </View>
                        <View style={s.workPanelBadge}>
                            <Ionicons name="sparkles-outline" size={14} color={c.accentLight} />
                            <Text style={s.workPanelBadgeText}>Live</Text>
                        </View>
                    </View>

                    <View style={s.workStatsRow}>
                        {myWorkCards.map((item, index) => (
                            <TouchableOpacity
                                key={`${item.label}-${index}`}
                                style={[
                                    s.workStatCard,
                                    {
                                        backgroundColor: item.color + '10',
                                        borderColor: item.color + '25',
                                    },
                                ]}
                                activeOpacity={0.7}
                                onPress={() => router.push(item.route as any)}>
                                <View style={[s.workStatIcon, { backgroundColor: item.color + '18' }]}>
                                    <Ionicons name={item.icon} size={18} color={item.color} />
                                </View>
                                <Text style={s.workStatValue}>{item.value}</Text>
                                <Text style={s.workStatLabel}>{item.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={s.roleActionRow}>
                        {roleActions.map((item) => (
                            <TouchableOpacity
                                key={item.label}
                                style={s.roleActionChip}
                                activeOpacity={0.7}
                                onPress={() => router.push(item.route as any)}>
                                <Ionicons name={item.icon} size={16} color={c.primary} />
                                <Text style={s.roleActionText}>{item.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {isFieldOwnedUser && focusProjects.length > 0 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={s.focusProjectsRow}>
                            {focusProjects.map((project: any) => (
                                <TouchableOpacity
                                    key={project.id}
                                    style={s.focusProjectCard}
                                    activeOpacity={0.75}
                                    onPress={() => router.push(`/projects/${project.id}` as any)}>
                                    <View style={s.focusProjectTop}>
                                        <Text style={s.focusProjectCode}>{project.code || 'DA'}</Text>
                                        <View style={s.focusProjectProgressPill}>
                                            <Ionicons name="trending-up-outline" size={11} color={c.accentLight} />
                                            <Text style={s.focusProjectProgressText}>{project.progress || 0}%</Text>
                                        </View>
                                    </View>
                                    <Text style={s.focusProjectName} numberOfLines={2}>{project.name}</Text>
                                    <Text style={s.focusProjectHint}>Mở nhanh dự án để vào đúng luồng công việc</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>

                {/* Quick Actions */}
                <View style={s.sectionRow}>
                    <Text style={s.sectionTitle}>Thao t{'\u00e1'}c nhanh</Text>
                </View>
                <View style={s.actionsPanel}>
                    {quickActions.map((a, i) => (
                        <TouchableOpacity
                            key={i}
                            style={[s.actionRow, i === quickActions.length - 1 && s.actionRowLast]}
                            activeOpacity={0.7}
                            onPress={() => router.push(a.route as any)}>
                            <View
                                style={[
                                    s.actionIconBox,
                                    { backgroundColor: a.color + '12' },
                                ]}>
                                <Ionicons name={a.icon} size={24} color={a.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.actionLabel}>{a.label}</Text>
                                <Text style={s.actionDesc}>{a.desc}</Text>
                            </View>
                            <View style={s.actionChevron}>
                                <Ionicons
                                    name="chevron-forward"
                                    size={16}
                                    color={c.textMuted}
                                />
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Management actions — role-gated, grid style */}
                {managementActions.length > 0 && (
                    <>
                        <View style={s.sectionRow}>
                            <Text style={s.sectionTitle}>
                                {isAdmin ? 'Quản lý điều hành' : 'Khách hàng & Báo giá'}
                            </Text>
                        </View>
                        <View style={s.mgmtGrid}>
                            {managementActions.map((a, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={s.mgmtCard}
                                    activeOpacity={0.7}
                                    onPress={() => router.push(a.route as any)}
                                >
                                    <View style={[s.mgmtIcon, { backgroundColor: a.color + '15' }]}>
                                        <Ionicons name={a.icon} size={22} color={a.color} />
                                    </View>
                                    <Text style={s.mgmtLabel}>{a.label}</Text>
                                    <Text style={s.mgmtDesc} numberOfLines={1}>{a.desc}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                )}

                {/* Daily Tasks */}
                <View style={s.sectionRow}>
                    <Text style={s.sectionTitle}>{taskSectionTitle}</Text>
                    <TouchableOpacity onPress={() => router.push(scopedRoutes.schedule as any)}>
                        <Text style={s.viewAll}>
                            Xem t{'\u1ea5'}t c{'\u1ea3'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {prioritizedTasks.length === 0 ? (
                    <View style={s.emptyBox}>
                        <View style={s.emptyIcon}>
                            <Ionicons name="checkmark-circle" size={32} color={c.primary} />
                        </View>
                        <Text style={s.emptyTitle}>
                            Kh{'\u00f4'}ng c{'\u00f3'} c{'\u00f4'}ng vi{'\u1ec7'}c
                        </Text>
                        <Text style={s.emptyDesc}>
                            T{'\u1ea5'}t c{'\u1ea3'} {'\u0111\u00e3'} ho{'\u00e0'}n th
                            {'\u00e0'}nh!
                        </Text>
                    </View>
                ) : (
                    prioritizedTasks.map((t: any, i: number) => (
                        <View
                            key={t.id || i}
                            style={[
                                s.taskCard,
                                { borderLeftColor: taskStatusColor(t.status) },
                            ]}>
                            <View style={{ flex: 1 }}>
                                <Text
                                    style={[
                                        s.taskName,
                                        t.status === 'Ho\u00e0n th\u00e0nh' && s.taskDone,
                                    ]}>
                                    {t.name}
                                </Text>
                                <Text style={s.taskSub}>
                                    {t.project?.name || ''}
                                    {(t.time || t.endDate || t.startDate) ? ` \u2022 ${t.time || formatTaskWindow(t)}` : ''}
                                </Text>
                            </View>
                            <View
                                style={[
                                    s.taskBadge,
                                    { backgroundColor: taskStatusBg(t.status) },
                                ]}>
                                <Text
                                    style={[
                                        s.taskBadgeText,
                                        { color: taskStatusColor(t.status) },
                                    ]}>
                                    {t.status === 'Ho\u00e0n th\u00e0nh'
                                        ? 'XONG'
                                        : t.status === '\u0110ang l\u00e0m'
                                            ? '\u0110ANG L\u00c0M'
                                            : 'CH\u1edcE'}
                                </Text>
                            </View>
                        </View>
                    ))
                )}

                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bgGradientStart },
    container: { flex: 1 },
    brandHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: c.bgGradientStart,
        borderBottomWidth: 1,
        borderBottomColor: c.borderP5,
    },
    brandName: {
        fontSize: 22,
        fontWeight: fontWeight.title,
        color: c.primary,
        letterSpacing: -0.5,
    },
    greeting: { fontSize: 14, color: c.textSecondary, marginTop: 2 },
    dailyQuote: { fontSize: 11, color: c.textMuted, fontStyle: 'italic', marginTop: 2 },
    headerAction: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: c.borderP5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroWrap: { paddingHorizontal: 16, paddingTop: 10 },
    heroCard: {
        backgroundColor: c.primary,
        borderRadius: radius.card,
        padding: 18,
        position: 'relative',
        overflow: 'hidden',
    },
    heroBubble1: {
        position: 'absolute',
        right: -20,
        top: -20,
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(197,160,89,0.18)',
    },
    heroBubble2: {
        position: 'absolute',
        right: 40,
        bottom: -30,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    heroLabel: {
        fontSize: 11,
        fontWeight: fontWeight.secondary,
        color: 'rgba(255,255,255,0.65)',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    heroTitle: {
        fontSize: 20,
        fontWeight: fontWeight.title,
        color: '#fff',
        marginTop: 4,
    },
    heroMeta: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 12,
        zIndex: 1,
    },
    heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    heroMetaText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: fontWeight.label,
    },
    sectionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 14,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: fontWeight.title,
        color: c.text,
    },
    sectionMeta: {
        fontSize: 12,
        color: c.textMuted,
        marginTop: 4,
    },
    viewAll: {
        fontSize: 14,
        fontWeight: fontWeight.secondary,
        color: c.primary,
    },
    metricsRail: {
        marginHorizontal: 16,
        marginTop: 12,
        flexDirection: 'row',
        backgroundColor: c.card,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: c.borderP5,
        ...cardShadow,
    },
    metricItem: {
        flex: 1,
        paddingHorizontal: 10,
        paddingVertical: 14,
    },
    metricDivider: {
        borderLeftWidth: 1,
        borderLeftColor: c.borderP5,
    },
    metricTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    badgeIconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    metricValue: { fontSize: 20, fontWeight: fontWeight.title, color: c.text },
    metricLabel: { marginTop: 8, fontSize: 10, fontWeight: fontWeight.label, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
    workPanel: {
        marginHorizontal: 16,
        marginTop: 14,
        paddingVertical: 16,
        borderRadius: 24,
        backgroundColor: c.primaryDark,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
        shadowColor: c.primaryDark,
        shadowOpacity: 0.2,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
    },
    workPanelGlow: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        right: -60,
        top: -90,
        backgroundColor: 'rgba(197,160,89,0.16)',
    },
    workPanelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 16,
    },
    workPanelEyebrow: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.55)',
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        fontWeight: fontWeight.label,
    },
    workPanelTitle: {
        fontSize: 20,
        color: '#fff',
        fontWeight: fontWeight.title,
        marginTop: 3,
    },
    workPanelMeta: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.72)',
        marginTop: 5,
    },
    workPanelBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: radius.pill,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    workPanelBadgeText: {
        fontSize: 11,
        fontWeight: fontWeight.title,
        color: c.accentLight,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    workStatsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
    workStatCard: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
        borderRadius: 18,
        paddingVertical: 12,
        paddingHorizontal: 6,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
    },
    workStatIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    workStatValue: { fontSize: 18, fontWeight: fontWeight.title, color: c.text },
    workStatLabel: {
        fontSize: 10,
        fontWeight: fontWeight.label,
        color: c.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    roleActionRow: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
    roleActionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: radius.pill,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    roleActionText: { fontSize: 12, fontWeight: fontWeight.secondary, color: c.primary },
    focusProjectsRow: { paddingHorizontal: 16, paddingTop: 14, gap: 10 },
    focusProjectCard: {
        width: 170,
        padding: 14,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    focusProjectTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    focusProjectCode: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.72)',
        fontWeight: fontWeight.title,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    focusProjectProgressPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: radius.pill,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    focusProjectProgressText: {
        fontSize: 11,
        color: c.accentLight,
        fontWeight: fontWeight.title,
    },
    focusProjectName: {
        fontSize: 14,
        fontWeight: fontWeight.title,
        color: '#fff',
        marginTop: 6,
        minHeight: 36,
    },
    focusProjectHint: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.66)',
        marginTop: 10,
        lineHeight: 18,
    },
    actionsPanel: {
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
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: c.borderP5,
        backgroundColor: c.card,
    },
    actionRowLast: { borderBottomWidth: 0 },
    actionIconBox: {
        width: 48,
        height: 48,
        borderRadius: radius.iconBox,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionLabel: {
        fontSize: 15,
        fontWeight: fontWeight.title,
        color: c.text,
    },
    actionDesc: { fontSize: 12, color: c.textSecondary, marginTop: 1 },
    actionChevron: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: c.borderP5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mgmtGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        paddingHorizontal: 2,
    },
    mgmtCard: {
        width: '48%',
        backgroundColor: c.card,
        borderRadius: radius.card,
        padding: 14,
        ...cardShadow,
    },
    mgmtIcon: {
        width: 44,
        height: 44,
        borderRadius: radius.iconBox,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    mgmtLabel: {
        fontSize: 14,
        fontWeight: fontWeight.title,
        color: c.text,
    },
    mgmtDesc: {
        fontSize: 11,
        color: c.textMuted,
        marginTop: 2,
    },
    taskCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginHorizontal: 16,
        marginBottom: 8,
        padding: 14,
        borderRadius: radius.card,
        backgroundColor: c.card,
        borderLeftWidth: 4,
        ...cardShadow,
    },
    taskName: {
        fontSize: 14,
        fontWeight: fontWeight.secondary,
        color: c.text,
    },
    taskDone: { color: c.textMuted, textDecorationLine: 'line-through' },
    taskSub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    taskBadge: {
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    taskBadgeText: {
        fontSize: 9,
        fontWeight: fontWeight.title,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 6 },
    emptyIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: c.borderP10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: fontWeight.secondary,
        color: c.text,
    },
    emptyDesc: { fontSize: 13, color: c.textMuted },
});



