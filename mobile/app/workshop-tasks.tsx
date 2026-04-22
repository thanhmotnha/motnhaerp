import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl, Modal, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors, { cardShadow, radius, fontWeight } from '@/constants/Colors';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';

const c = Colors.light;

type TaskStatus = 'Chờ làm' | 'Đang làm' | 'Xong' | 'Tạm hoãn';
type TaskPriority = 'Thấp' | 'Trung bình' | 'Cao' | 'Gấp';
type FilterTab = 'all' | 'Chờ làm' | 'Đang làm' | 'Xong';

type TaskWorker = {
    id?: string;
    workerId: string;
    worker?: { id: string; name: string; skill?: string | null } | null;
};

type TaskMaterial = {
    id?: string;
    productId: string;
    quantity: number;
    product?: { id: string; name: string; unit?: string | null } | null;
};

type WorkshopTask = {
    id: string;
    title: string;
    description?: string | null;
    projectId?: string | null;
    project?: { id: string; code: string; name: string } | null;
    startDate?: string | null;
    deadline?: string | null;
    progress: number;
    status: TaskStatus;
    category?: string | null;
    priority: TaskPriority;
    isLocked?: boolean;
    notes?: string | null;
    workers: TaskWorker[];
    materials: TaskMaterial[];
};

const STATUS_META: Record<TaskStatus, { color: string; bg: string; icon: any }> = {
    'Chờ làm': { color: '#64748b', bg: '#e2e8f0', icon: 'time-outline' },
    'Đang làm': { color: '#2563eb', bg: '#dbeafe', icon: 'hammer-outline' },
    'Xong': { color: '#16a34a', bg: '#dcfce7', icon: 'checkmark-done' },
    'Tạm hoãn': { color: '#d97706', bg: '#fef3c7', icon: 'pause-circle-outline' },
};

const PRIORITY_META: Record<TaskPriority, { color: string; bg: string }> = {
    'Thấp': { color: '#475569', bg: '#f1f5f9' },
    'Trung bình': { color: '#0369a1', bg: '#e0f2fe' },
    'Cao': { color: '#c2410c', bg: '#ffedd5' },
    'Gấp': { color: '#b91c1c', bg: '#fee2e2' },
};

const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'Chờ làm', label: 'Chờ làm' },
    { key: 'Đang làm', label: 'Đang làm' },
    { key: 'Xong', label: 'Xong' },
];

const PROGRESS_STEPS = [0, 25, 50, 75, 100];

const fmtDate = (d?: string | null) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('vi-VN'); } catch { return '—'; }
};

const daysUntil = (d?: string | null): number | null => {
    if (!d) return null;
    const t = new Date(d).getTime();
    if (Number.isNaN(t)) return null;
    const diff = t - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export default function WorkshopTasksScreen() {
    const router = useRouter();
    const toast = useToast();

    const [tab, setTab] = useState<FilterTab>('all');
    const [tasks, setTasks] = useState<WorkshopTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal state
    const [editTask, setEditTask] = useState<WorkshopTask | null>(null);
    const [editProgress, setEditProgress] = useState<number>(0);
    const [editStatus, setEditStatus] = useState<TaskStatus>('Chờ làm');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            const data = await apiFetch('/api/workshop/tasks');
            setTasks(Array.isArray(data) ? data : []);
        } catch (e: any) {
            toast.show(e?.message || 'Lỗi tải công việc xưởng', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [toast]);

    useEffect(() => { load(); }, [load]);

    const onRefresh = () => { setRefreshing(true); load(); };

    const filtered = useMemo(() => {
        if (tab === 'all') return tasks;
        return tasks.filter(t => t.status === tab);
    }, [tasks, tab]);

    const counts = useMemo(() => {
        const acc = { all: tasks.length, 'Chờ làm': 0, 'Đang làm': 0, 'Xong': 0 } as Record<FilterTab, number>;
        for (const t of tasks) {
            if (t.status === 'Chờ làm' || t.status === 'Đang làm' || t.status === 'Xong') {
                acc[t.status] += 1;
            }
        }
        return acc;
    }, [tasks]);

    const openEdit = (t: WorkshopTask) => {
        setEditTask(t);
        setEditProgress(Number(t.progress) || 0);
        setEditStatus(t.status);
    };

    const closeEdit = () => {
        if (saving) return;
        setEditTask(null);
    };

    const submitEdit = async () => {
        if (!editTask) return;
        setSaving(true);
        try {
            const body: Record<string, any> = {
                progress: editProgress,
                status: editStatus,
            };
            // auto-sync status khi đạt 100
            if (editProgress >= 100 && editStatus !== 'Xong') {
                body.status = 'Xong';
            }
            const updated = await apiFetch(`/api/workshop/tasks/${editTask.id}`, {
                method: 'PUT',
                body: JSON.stringify(body),
            });
            // patch local list
            setTasks(prev => prev.map(t => t.id === editTask.id ? { ...t, ...updated } : t));
            toast.show('Đã cập nhật tiến độ', 'success');
            setEditTask(null);
        } catch (e: any) {
            toast.show(e?.message || 'Lỗi cập nhật', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={c.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={s.headerTitle}>Công việc xưởng</Text>
                    <Text style={s.headerSub}>{filtered.length} công việc</Text>
                </View>
                <TouchableOpacity onPress={onRefresh} style={s.backBtn}>
                    <Ionicons name="refresh" size={22} color={c.primary} />
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.tabsRow}
            >
                {TABS.map(t => {
                    const active = tab === t.key;
                    const n = counts[t.key] ?? 0;
                    return (
                        <TouchableOpacity
                            key={t.key}
                            style={[s.tabBtn, active && s.tabBtnActive]}
                            onPress={() => setTab(t.key)}
                        >
                            <Text style={[s.tabText, active && s.tabTextActive]}>
                                {t.label}
                            </Text>
                            <View style={[s.tabBadge, active && s.tabBadgeActive]}>
                                <Text style={[s.tabBadgeText, active && s.tabBadgeTextActive]}>{n}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {loading ? (
                <ActivityIndicator size="large" color={c.primary} style={{ marginTop: 40 }} />
            ) : (
                <ScrollView
                    contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />
                    }
                >
                    {filtered.length === 0 ? (
                        <View style={s.empty}>
                            <Ionicons name="clipboard-outline" size={48} color={c.textMuted} />
                            <Text style={{ color: c.textMuted, marginTop: 8 }}>
                                Không có công việc nào
                            </Text>
                        </View>
                    ) : (
                        filtered.map(t => (
                            <TaskCard key={t.id} task={t} onPress={() => openEdit(t)} />
                        ))
                    )}
                </ScrollView>
            )}

            {/* Edit modal */}
            <Modal
                visible={!!editTask}
                transparent
                animationType="slide"
                onRequestClose={closeEdit}
            >
                <View style={s.modalOverlay}>
                    <Pressable style={{ flex: 1 }} onPress={closeEdit} />
                    <View style={s.modalSheet}>
                        <View style={s.modalHeader}>
                            <Text style={s.modalTitle}>Cập nhật tiến độ</Text>
                            <TouchableOpacity onPress={closeEdit} disabled={saving}>
                                <Ionicons name="close" size={24} color={c.text} />
                            </TouchableOpacity>
                        </View>
                        {editTask && (
                            <>
                                <Text style={s.modalTaskTitle} numberOfLines={2}>{editTask.title}</Text>
                                {!!editTask.project && (
                                    <Text style={s.modalSub}>{editTask.project.name}</Text>
                                )}

                                {/* Progress slider replacement: step buttons */}
                                <Text style={s.inputLabel}>Tiến độ</Text>
                                <View style={s.progressBigRow}>
                                    <Text style={s.progressBigValue}>{editProgress}%</Text>
                                </View>
                                <View style={s.progressBarTrack}>
                                    <View
                                        style={[
                                            s.progressBarFill,
                                            {
                                                width: `${Math.min(100, Math.max(0, editProgress))}%`,
                                                backgroundColor: editProgress >= 100 ? c.success : c.primary,
                                            },
                                        ]}
                                    />
                                </View>
                                <View style={s.stepRow}>
                                    {PROGRESS_STEPS.map(step => {
                                        const active = editProgress === step;
                                        return (
                                            <TouchableOpacity
                                                key={step}
                                                style={[s.stepBtn, active && s.stepBtnActive]}
                                                onPress={() => setEditProgress(step)}
                                            >
                                                <Text style={[s.stepText, active && s.stepTextActive]}>
                                                    {step}%
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                {/* Fine adjust +/- */}
                                <View style={s.adjustRow}>
                                    <TouchableOpacity
                                        style={s.adjustBtn}
                                        onPress={() => setEditProgress(p => Math.max(0, p - 5))}
                                    >
                                        <Ionicons name="remove" size={18} color={c.text} />
                                        <Text style={s.adjustText}>5%</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={s.adjustBtn}
                                        onPress={() => setEditProgress(p => Math.min(100, p + 5))}
                                    >
                                        <Ionicons name="add" size={18} color={c.text} />
                                        <Text style={s.adjustText}>5%</Text>
                                    </TouchableOpacity>
                                </View>

                                <Text style={s.inputLabel}>Trạng thái</Text>
                                <View style={s.statusRow}>
                                    {(Object.keys(STATUS_META) as TaskStatus[]).map(st => {
                                        const active = editStatus === st;
                                        const meta = STATUS_META[st];
                                        return (
                                            <TouchableOpacity
                                                key={st}
                                                style={[
                                                    s.statusBtn,
                                                    active && { backgroundColor: meta.bg, borderColor: meta.color },
                                                ]}
                                                onPress={() => setEditStatus(st)}
                                            >
                                                <Ionicons
                                                    name={meta.icon}
                                                    size={14}
                                                    color={active ? meta.color : c.textSecondary}
                                                />
                                                <Text
                                                    style={[
                                                        s.statusBtnText,
                                                        active && { color: meta.color, fontWeight: fontWeight.title },
                                                    ]}
                                                >
                                                    {st}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                <TouchableOpacity
                                    style={[s.submitBtn, saving && { opacity: 0.6 }]}
                                    onPress={submitEdit}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <>
                                            <Ionicons name="checkmark" size={20} color="#fff" />
                                            <Text style={s.submitBtnText}>Lưu</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

function TaskCard({ task, onPress }: { task: WorkshopTask; onPress: () => void }) {
    const statusMeta = STATUS_META[task.status] ?? STATUS_META['Chờ làm'];
    const priorityMeta = PRIORITY_META[task.priority] ?? PRIORITY_META['Trung bình'];
    const progress = Math.min(100, Math.max(0, Number(task.progress) || 0));
    const d = daysUntil(task.deadline);
    const overdue = d !== null && d < 0 && task.status !== 'Xong';
    const soon = d !== null && d >= 0 && d <= 2 && task.status !== 'Xong';

    const workers = task.workers || [];
    const shownWorkers = workers.slice(0, 3);
    const moreWorkers = Math.max(0, workers.length - shownWorkers.length);

    return (
        <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
            {/* Top: title + priority */}
            <View style={s.cardTop}>
                <Text style={s.title} numberOfLines={2}>{task.title}</Text>
                <View style={[s.priorityBadge, { backgroundColor: priorityMeta.bg }]}>
                    <Text style={[s.priorityText, { color: priorityMeta.color }]}>
                        {task.priority}
                    </Text>
                </View>
            </View>

            {/* Project */}
            {!!task.project && (
                <View style={s.metaRow}>
                    <Ionicons name="folder-outline" size={13} color={c.primary} />
                    <Text style={s.projectName} numberOfLines={1}>
                        {task.project.name}
                    </Text>
                </View>
            )}

            {/* Deadline + status */}
            <View style={s.metaRow}>
                <Ionicons
                    name="calendar-outline"
                    size={13}
                    color={overdue ? c.danger : soon ? c.warning : c.textSecondary}
                />
                <Text
                    style={[
                        s.metaText,
                        overdue && { color: c.danger, fontWeight: fontWeight.title },
                        soon && { color: c.warning, fontWeight: fontWeight.secondary },
                    ]}
                >
                    Hạn: {fmtDate(task.deadline)}
                    {d !== null && task.status !== 'Xong' && (
                        overdue
                            ? ` (quá ${Math.abs(d)} ngày)`
                            : d === 0
                                ? ' (hôm nay)'
                                : ` (còn ${d} ngày)`
                    )}
                </Text>
                <View style={{ flex: 1 }} />
                <View style={[s.statusBadge, { backgroundColor: statusMeta.bg }]}>
                    <Ionicons name={statusMeta.icon} size={12} color={statusMeta.color} />
                    <Text style={[s.statusBadgeText, { color: statusMeta.color }]}>
                        {task.status}
                    </Text>
                </View>
            </View>

            {/* Progress */}
            <View style={s.progressWrap}>
                <View style={s.progressTrack}>
                    <View
                        style={[
                            s.progressFill,
                            {
                                width: `${progress}%`,
                                backgroundColor: progress >= 100 ? c.success : c.primary,
                            },
                        ]}
                    />
                </View>
                <Text style={s.progressText}>{progress}%</Text>
            </View>

            {/* Workers */}
            {workers.length > 0 && (
                <View style={s.workersRow}>
                    <Ionicons name="people-outline" size={13} color={c.textSecondary} />
                    {shownWorkers.map((w, idx) => (
                        <View key={w.id || w.workerId || idx} style={s.workerChip}>
                            <Text style={s.workerText} numberOfLines={1}>
                                {w.worker?.name || 'Thợ'}
                            </Text>
                        </View>
                    ))}
                    {moreWorkers > 0 && (
                        <View style={[s.workerChip, { backgroundColor: c.borderP10 }]}>
                            <Text style={[s.workerText, { color: c.primary }]}>+{moreWorkers}</Text>
                        </View>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 8, gap: 4,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: fontWeight.title, color: c.text },
    headerSub: { fontSize: 13, color: c.textMuted, marginTop: 2 },

    tabsRow: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
    tabBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: radius.pill,
        backgroundColor: c.card,
        borderWidth: 1, borderColor: c.borderP10,
    },
    tabBtnActive: { backgroundColor: c.primary, borderColor: c.primary },
    tabText: { fontSize: 13, fontWeight: fontWeight.secondary, color: c.text },
    tabTextActive: { color: '#fff' },
    tabBadge: {
        paddingHorizontal: 6, paddingVertical: 2,
        borderRadius: radius.pill,
        backgroundColor: c.borderP10,
        minWidth: 22, alignItems: 'center',
    },
    tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
    tabBadgeText: { fontSize: 11, fontWeight: fontWeight.title, color: c.primary },
    tabBadgeTextActive: { color: '#fff' },

    // Card
    card: {
        backgroundColor: c.card,
        borderRadius: radius.card,
        padding: 14,
        marginBottom: 12,
        ...cardShadow,
    },
    cardTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    title: { flex: 1, fontSize: 15, fontWeight: fontWeight.title, color: c.text, lineHeight: 20 },
    priorityBadge: {
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: radius.pill,
    },
    priorityText: { fontSize: 11, fontWeight: fontWeight.title },

    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    projectName: { fontSize: 12, color: c.primary, fontWeight: fontWeight.secondary, flex: 1 },
    metaText: { fontSize: 12, color: c.textSecondary },

    statusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: radius.pill,
    },
    statusBadgeText: { fontSize: 11, fontWeight: fontWeight.title },

    progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
    progressTrack: {
        flex: 1, height: 8,
        borderRadius: radius.pill,
        backgroundColor: c.borderP5,
        overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: radius.pill },
    progressText: {
        fontSize: 12, fontWeight: fontWeight.title,
        color: c.text, minWidth: 38, textAlign: 'right',
    },

    workersRow: {
        flexDirection: 'row', alignItems: 'center',
        gap: 6, marginTop: 10, flexWrap: 'wrap',
    },
    workerChip: {
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: radius.pill,
        backgroundColor: c.accent + '20',
    },
    workerText: { fontSize: 11, color: '#7a5a1a', fontWeight: fontWeight.secondary, maxWidth: 110 },

    empty: { alignItems: 'center', padding: 40 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
    modalSheet: {
        backgroundColor: c.card,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 20, paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 4,
    },
    modalTitle: { fontSize: 18, fontWeight: fontWeight.title, color: c.text },
    modalTaskTitle: { fontSize: 15, fontWeight: fontWeight.title, color: c.text, marginTop: 10 },
    modalSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },

    inputLabel: { fontSize: 12, color: c.textSecondary, marginTop: 16, marginBottom: 8 },

    progressBigRow: { alignItems: 'center' },
    progressBigValue: { fontSize: 36, fontWeight: fontWeight.title, color: c.primary },
    progressBarTrack: {
        height: 12, borderRadius: radius.pill,
        backgroundColor: c.borderP10,
        overflow: 'hidden', marginTop: 8,
    },
    progressBarFill: { height: '100%', borderRadius: radius.pill },

    stepRow: { flexDirection: 'row', gap: 6, marginTop: 12, justifyContent: 'space-between' },
    stepBtn: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: radius.button,
        backgroundColor: c.bg,
        borderWidth: 1, borderColor: c.borderP10,
        alignItems: 'center',
    },
    stepBtnActive: { backgroundColor: c.primary, borderColor: c.primary },
    stepText: { fontSize: 12, fontWeight: fontWeight.secondary, color: c.text },
    stepTextActive: { color: '#fff' },

    adjustRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
    adjustBtn: {
        flex: 1, flexDirection: 'row',
        alignItems: 'center', justifyContent: 'center', gap: 4,
        paddingVertical: 10,
        borderRadius: radius.button,
        backgroundColor: c.bg,
        borderWidth: 1, borderColor: c.borderP10,
    },
    adjustText: { fontSize: 13, fontWeight: fontWeight.secondary, color: c.text },

    statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statusBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: radius.pill,
        backgroundColor: c.bg,
        borderWidth: 1, borderColor: c.border,
    },
    statusBtnText: { fontSize: 12, color: c.textSecondary },

    submitBtn: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 8,
        marginTop: 20,
        backgroundColor: c.primary,
        paddingVertical: 14,
        borderRadius: radius.button,
    },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: fontWeight.title },
});
