import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors, { cardShadow, fontWeight, radius } from '@/constants/Colors';
import { apiFetch, apiFetchAllPages } from '@/lib/api';

const c = Colors.light;
const TABS = ['Tổng quan', 'Công việc', 'Tài liệu'] as const;
type ProjectTab = typeof TABS[number];

const getStatusColor = (status = '') => {
    switch (status) {
        case 'Đang thi công':
            return '#f59e0b';
        case 'Hoàn thành':
            return '#16a34a';
        case 'Khảo sát':
            return '#64748b';
        case 'Thiết kế':
            return '#3b82f6';
        default:
            return c.primary;
    }
};

const getTaskState = (task: any) => {
    const progress = Number(task?.progress || 0);
    if (progress >= 100 || task?.status === 'Hoàn thành') return 'Hoàn thành';
    if (progress > 0) return 'Đang làm';
    return 'Chưa bắt đầu';
};

const isTaskOverdue = (task: any) => {
    if (!task?.endDate) return false;
    return Number(task?.progress || 0) < 100 && new Date(task.endDate).getTime() < Date.now();
};

const formatDate = (value?: string | null) => {
    if (!value) return '';
    return new Date(value).toLocaleDateString('vi-VN');
};

const formatTaskWindow = (task: any) => {
    if (task?.endDate) return `Hạn ${formatDate(task.endDate)}`;
    if (task?.startDate) return `Bắt đầu ${formatDate(task.startDate)}`;
    return 'Chưa gắn mốc thời gian';
};

export default function ProjectDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [project, setProject] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [docs, setDocs] = useState<any[]>([]);
    const [tab, setTab] = useState<ProjectTab>('Tổng quan');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const loadingRef = useRef(false);

    const load = async () => {
        if (!id || loadingRef.current) return;
        loadingRef.current = true;
        try {
            const projectRes = await apiFetch(`/api/projects/${id}`);
            const taskRes = await apiFetch(`/api/schedule-tasks?projectId=${id}`);
            const docsRes = await apiFetchAllPages(`/api/project-documents?projectId=${id}`).catch(() => []);
            setProject(projectRes);
            setTasks(taskRes?.flat || taskRes?.data || []);
            setDocs(docsRes || []);
        } catch (error) {
            console.error(error);
        } finally {
            loadingRef.current = false;
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [id]);

    const onRefresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    const completedTasks = useMemo(
        () => tasks.filter((task) => Number(task?.progress || 0) >= 100).length,
        [tasks],
    );
    const openTasks = useMemo(
        () => tasks.filter((task) => Number(task?.progress || 0) < 100).length,
        [tasks],
    );
    const overdueTasks = useMemo(
        () => tasks.filter((task) => isTaskOverdue(task)).length,
        [tasks],
    );

    if (loading) {
        return (
            <SafeAreaView style={s.safe} edges={['top']}>
                <View style={s.header}>
                    <TouchableOpacity style={s.iconButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color={c.primary} />
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Dự án</Text>
                    <View style={s.iconButtonGhost} />
                </View>
                <View style={s.loadingState}>
                    <Text style={s.loadingText}>Đang mở workspace dự án...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!project) {
        return (
            <SafeAreaView style={s.safe} edges={['top']}>
                <View style={s.header}>
                    <TouchableOpacity style={s.iconButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color={c.primary} />
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Dự án</Text>
                    <View style={s.iconButtonGhost} />
                </View>
                <View style={s.emptyState}>
                    <Ionicons name="business-outline" size={28} color={c.textMuted} />
                    <Text style={s.emptyTitle}>Không tìm thấy dự án</Text>
                    <Text style={s.emptySub}>Kiểm tra lại quyền truy cập hoặc dữ liệu từ web ERP.</Text>
                </View>
            </SafeAreaView>
        );
    }

    const tone = getStatusColor(project.status);
    const workspaceActions = [
        { icon: 'book-outline' as const, label: 'Nhật ký', route: `/daily-log?projectId=${id}` },
        { icon: 'calendar-outline' as const, label: 'Lịch việc', route: `/schedule?projectId=${id}` },
        { icon: 'cube-outline' as const, label: 'Vật tư', route: `/material-request?projectId=${id}` },
        { icon: 'receipt-outline' as const, label: 'Nhận PO', route: `/purchasing?projectId=${id}` },
        { icon: 'document-text-outline' as const, label: 'Bản vẽ', route: `/drawings?projectId=${id}` },
        { icon: 'alert-circle-outline' as const, label: 'Punch', route: `/punch-list?projectId=${id}` },
        { icon: 'shield-checkmark-outline' as const, label: 'Nghiệm thu', route: `/acceptance-check?projectId=${id}` },
    ];

    const infoRows = [
        { icon: 'person-outline' as const, label: 'Khách hàng', value: project.customer?.name },
        { icon: 'location-outline' as const, label: 'Địa chỉ', value: project.address },
        { icon: 'layers-outline' as const, label: 'Loại dự án', value: project.type },
        { icon: 'albums-outline' as const, label: 'Số tầng', value: project.floors ? String(project.floors) : '' },
        { icon: 'calendar-outline' as const, label: 'Bắt đầu', value: formatDate(project.startDate) },
        { icon: 'calendar-clear-outline' as const, label: 'Kết thúc', value: formatDate(project.endDate) },
    ].filter((item) => item.value);

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            <View style={s.header}>
                <TouchableOpacity style={s.iconButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color={c.primary} />
                </TouchableOpacity>
                <Text style={s.headerTitle} numberOfLines={1}>
                    {project.name}
                </Text>
                <TouchableOpacity
                    style={s.iconButton}
                    onPress={() => router.push('/(tabs)/projects' as any)}>
                    <Ionicons name="grid-outline" size={18} color={c.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={s.container}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={c.primary}
                        colors={[c.primary]}
                    />
                }>
                <View style={s.heroPanel}>
                    <View style={s.heroGlowOne} />
                    <View style={s.heroGlowTwo} />
                    <Text style={s.heroCode}>{project.code || 'DA'}</Text>
                    <Text style={s.heroName}>{project.name}</Text>
                    <View style={s.heroMetaRow}>
                        <View style={[s.statusChip, { backgroundColor: `${tone}20` }]}>
                            <View style={[s.statusDot, { backgroundColor: tone }]} />
                            <Text style={[s.statusText, { color: tone }]}>{project.status || 'Đang cập nhật'}</Text>
                        </View>
                        {project.customer?.name ? (
                            <Text style={s.heroCustomer}>{project.customer.name}</Text>
                        ) : null}
                    </View>
                    {project.address ? <Text style={s.heroAddress}>{project.address}</Text> : null}
                    <View style={s.progressRow}>
                        <Text style={s.progressLabel}>Tiến độ công trình</Text>
                        <Text style={s.progressValue}>{project.progress || 0}%</Text>
                    </View>
                    <View style={s.progressTrack}>
                        <View
                            style={[
                                s.progressFill,
                                { width: `${Math.min(project.progress || 0, 100)}%` },
                            ]}
                        />
                    </View>
                </View>

                <View style={s.tabRow}>
                    {TABS.map((item) => (
                        <TouchableOpacity
                            key={item}
                            style={[s.tabButton, tab === item && s.tabButtonActive]}
                            onPress={() => setTab(item)}>
                            <Text style={[s.tabText, tab === item && s.tabTextActive]}>{item}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {tab === 'Tổng quan' ? (
                    <>
                        <View style={s.sectionHeader}>
                            <Text style={s.sectionTitle}>Nhịp dự án</Text>
                            <Text style={s.sectionHint}>Chỉ giữ số liệu vận hành</Text>
                        </View>
                        <View style={s.metricGrid}>
                            {[
                                { label: 'Việc mở', value: openTasks, tone: c.primary },
                                { label: 'Hoàn thành', value: completedTasks, tone: '#16a34a' },
                                { label: 'Tài liệu', value: docs.length, tone: '#8b5cf6' },
                                { label: 'Quá hạn', value: overdueTasks, tone: '#ef4444' },
                            ].map((item) => (
                                <View key={item.label} style={s.metricCard}>
                                    <Text style={[s.metricValue, { color: item.tone }]}>{item.value}</Text>
                                    <Text style={s.metricLabel}>{item.label}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={s.sectionHeader}>
                            <Text style={s.sectionTitle}>Đi nhanh</Text>
                            <Text style={s.sectionHint}>Mở đúng luồng xử lý</Text>
                        </View>
                        <View style={s.actionGrid}>
                            {workspaceActions.map((action) => (
                                <TouchableOpacity
                                    key={action.label}
                                    style={s.actionCard}
                                    activeOpacity={0.88}
                                    onPress={() => router.push(action.route as any)}>
                                    <Ionicons name={action.icon} size={19} color={c.primary} />
                                    <Text style={s.actionLabel}>{action.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={s.sectionHeader}>
                            <Text style={s.sectionTitle}>Thông tin chính</Text>
                            <Text style={s.sectionHint}>Gọn để dễ scan</Text>
                        </View>
                        <View style={s.panel}>
                            {infoRows.map((row, index) => (
                                <View
                                    key={row.label}
                                    style={[s.infoRow, index === infoRows.length - 1 && s.infoRowLast]}>
                                    <View style={s.infoIcon}>
                                        <Ionicons name={row.icon} size={16} color={c.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.infoLabel}>{row.label}</Text>
                                        <Text style={s.infoValue}>{row.value}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </>
                ) : null}

                {tab === 'Công việc' ? (
                    <>
                        <View style={s.sectionHeader}>
                            <Text style={s.sectionTitle}>Danh sách công việc</Text>
                            <Text style={s.sectionHint}>{tasks.length} mục</Text>
                        </View>
                        <View style={s.metricRibbon}>
                            <View style={s.metricPill}>
                                <Text style={s.metricPillValue}>{openTasks}</Text>
                                <Text style={s.metricPillLabel}>Việc mở</Text>
                            </View>
                            <View style={s.metricPill}>
                                <Text style={s.metricPillValue}>{completedTasks}</Text>
                                <Text style={s.metricPillLabel}>Đã xong</Text>
                            </View>
                            <View style={s.metricPill}>
                                <Text style={[s.metricPillValue, { color: '#ef4444' }]}>{overdueTasks}</Text>
                                <Text style={s.metricPillLabel}>Quá hạn</Text>
                            </View>
                        </View>
                        <View style={s.panel}>
                            {tasks.length === 0 ? (
                                <View style={s.emptyState}>
                                    <Ionicons name="list-outline" size={28} color={c.textMuted} />
                                    <Text style={s.emptyTitle}>Chưa có công việc</Text>
                                    <Text style={s.emptySub}>Lịch công việc của dự án sẽ hiện tại đây.</Text>
                                </View>
                            ) : (
                                tasks.map((task, index) => {
                                    const state = getTaskState(task);
                                    const stateTone = state === 'Hoàn thành' ? '#16a34a' : state === 'Đang làm' ? c.accent : c.textMuted;
                                    return (
                                        <View
                                            key={task.id}
                                            style={[s.taskRow, index === tasks.length - 1 && s.taskRowLast]}>
                                            <View style={[s.taskDot, { backgroundColor: stateTone }]} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={s.taskName}>{task.name}</Text>
                                                <Text style={s.taskMeta}>
                                                    {formatTaskWindow(task)} · W{task.weight || 1}
                                                </Text>
                                                <View style={s.taskProgressTrack}>
                                                    <View
                                                        style={[
                                                            s.taskProgressFill,
                                                            {
                                                                width: `${Math.min(task.progress || 0, 100)}%`,
                                                                backgroundColor: stateTone,
                                                            },
                                                        ]}
                                                    />
                                                </View>
                                            </View>
                                            <View style={[s.taskStateChip, { backgroundColor: `${stateTone}18` }]}>
                                                <Text style={[s.taskStateText, { color: stateTone }]}>{state}</Text>
                                            </View>
                                        </View>
                                    );
                                })
                            )}
                        </View>
                    </>
                ) : null}

                {tab === 'Tài liệu' ? (
                    <>
                        <View style={s.sectionHeader}>
                            <Text style={s.sectionTitle}>Tài liệu dự án</Text>
                            <Text style={s.sectionHint}>{docs.length} tệp</Text>
                        </View>
                        <View style={s.panel}>
                            {docs.length === 0 ? (
                                <View style={s.emptyState}>
                                    <Ionicons name="folder-open-outline" size={28} color={c.textMuted} />
                                    <Text style={s.emptyTitle}>Chưa có tài liệu</Text>
                                    <Text style={s.emptySub}>Bản vẽ và file hiện trường sẽ xuất hiện ở đây.</Text>
                                </View>
                            ) : (
                                docs.map((doc, index) => (
                                    <View
                                        key={doc.id}
                                        style={[s.docRow, index === docs.length - 1 && s.docRowLast]}>
                                        <View style={s.docIcon}>
                                            <Ionicons name="document-text-outline" size={18} color={c.primary} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.docName} numberOfLines={1}>
                                                {doc.name || doc.fileName || 'Tài liệu'}
                                            </Text>
                                            <Text style={s.docMeta}>
                                                {doc.folder?.name || doc.fileType || 'Tài liệu dự án'}
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
                                    </View>
                                ))
                            )}
                        </View>
                    </>
                ) : null}

                <View style={{ height: 96 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bgGradientStart },
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerTitle: {
        flex: 1,
        marginHorizontal: 12,
        fontSize: 17,
        color: c.text,
        fontWeight: fontWeight.title,
        textAlign: 'center',
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.primary + '10',
    },
    iconButtonGhost: {
        width: 40,
        height: 40,
    },
    heroPanel: {
        marginHorizontal: 16,
        marginTop: 6,
        padding: 22,
        borderRadius: 28,
        backgroundColor: c.primary,
        overflow: 'hidden',
    },
    heroGlowOne: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(255,255,255,0.08)',
        right: -42,
        top: -46,
    },
    heroGlowTwo: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(197,160,89,0.26)',
        right: 56,
        bottom: -28,
    },
    heroCode: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.68)',
        fontWeight: fontWeight.title,
        letterSpacing: 1.1,
    },
    heroName: {
        marginTop: 10,
        fontSize: 28,
        lineHeight: 34,
        color: '#fff',
        fontWeight: '800',
    },
    heroMetaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 14,
        alignItems: 'center',
    },
    statusChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 999,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: fontWeight.secondary,
    },
    heroCustomer: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.78)',
    },
    heroAddress: {
        marginTop: 12,
        fontSize: 13,
        lineHeight: 20,
        color: 'rgba(255,255,255,0.72)',
    },
    progressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 8,
    },
    progressLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
    },
    progressValue: {
        fontSize: 13,
        color: '#fff',
        fontWeight: fontWeight.title,
    },
    progressTrack: {
        height: 8,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.18)',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 999,
        backgroundColor: c.accentLight,
    },
    tabRow: {
        flexDirection: 'row',
        gap: 8,
        marginHorizontal: 16,
        marginTop: 16,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 18,
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.borderP5,
        alignItems: 'center',
    },
    tabButtonActive: {
        backgroundColor: c.primary,
        borderColor: c.primary,
    },
    tabText: {
        fontSize: 12,
        color: c.textSecondary,
        fontWeight: fontWeight.secondary,
    },
    tabTextActive: {
        color: '#fff',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: 20,
        marginTop: 26,
        marginBottom: 12,
        gap: 12,
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
    metricGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        paddingHorizontal: 16,
    },
    metricCard: {
        width: '47.5%',
        padding: 18,
        borderRadius: 22,
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.borderP5,
        ...cardShadow,
    },
    metricValue: {
        fontSize: 28,
        fontWeight: '800',
    },
    metricLabel: {
        marginTop: 6,
        fontSize: 12,
        color: c.textSecondary,
    },
    actionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        paddingHorizontal: 16,
    },
    actionCard: {
        width: '31.5%',
        borderRadius: 18,
        paddingVertical: 16,
        paddingHorizontal: 12,
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.borderP5,
        alignItems: 'center',
        gap: 8,
        ...cardShadow,
    },
    actionLabel: {
        fontSize: 12,
        color: c.text,
        fontWeight: fontWeight.secondary,
    },
    panel: {
        marginHorizontal: 16,
        borderRadius: 24,
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.borderP5,
        overflow: 'hidden',
        ...cardShadow,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: c.borderP5,
    },
    infoRowLast: {
        borderBottomWidth: 0,
    },
    infoIcon: {
        width: 34,
        height: 34,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.primary + '12',
    },
    infoLabel: {
        fontSize: 12,
        color: c.textMuted,
    },
    infoValue: {
        marginTop: 2,
        fontSize: 14,
        color: c.text,
        fontWeight: fontWeight.secondary,
        lineHeight: 20,
    },
    metricRibbon: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 16,
    },
    metricPill: {
        flex: 1,
        borderRadius: 18,
        paddingVertical: 14,
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.borderP5,
        alignItems: 'center',
    },
    metricPillValue: {
        fontSize: 22,
        color: c.primary,
        fontWeight: '800',
    },
    metricPillLabel: {
        marginTop: 4,
        fontSize: 11,
        color: c.textSecondary,
    },
    taskRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: c.borderP5,
    },
    taskRowLast: {
        borderBottomWidth: 0,
    },
    taskDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginTop: 2,
    },
    taskName: {
        fontSize: 14,
        color: c.text,
        fontWeight: fontWeight.secondary,
    },
    taskMeta: {
        marginTop: 4,
        fontSize: 12,
        color: c.textSecondary,
    },
    taskProgressTrack: {
        marginTop: 10,
        height: 6,
        borderRadius: 999,
        backgroundColor: '#e9edf6',
        overflow: 'hidden',
    },
    taskProgressFill: {
        height: '100%',
        borderRadius: 999,
    },
    taskStateChip: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 999,
    },
    taskStateText: {
        fontSize: 11,
        fontWeight: fontWeight.secondary,
    },
    docRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: c.borderP5,
    },
    docRowLast: {
        borderBottomWidth: 0,
    },
    docIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.primary + '12',
    },
    docName: {
        fontSize: 14,
        color: c.text,
        fontWeight: fontWeight.secondary,
    },
    docMeta: {
        marginTop: 4,
        fontSize: 12,
        color: c.textSecondary,
    },
    loadingState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        fontSize: 14,
        color: c.textSecondary,
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
