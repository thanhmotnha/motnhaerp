import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
    View, Text, FlatList, StyleSheet,
    TouchableOpacity, RefreshControl, Animated, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiFetch, apiFetchAllPages } from '@/lib/api';
import Colors, { cardShadow, radius, fontWeight } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';

const c = Colors.light;

const STATUS_FILTERS = [
    { label: 'T\u1ea5t c\u1ea3', color: c.primary },
    { label: '\u0110ang l\u00e0m', color: '#f59e0b' },
    { label: 'Ch\u1edd', color: '#ef4444' },
    { label: 'Xong', color: '#22c55e' },
];

const statusMap: Record<string, { color: string; bg: string; label: string }> = {
    doing: { color: '#f59e0b', bg: '#f59e0b18', label: '\u0110ANG TH\u1ef0C HI\u1ec6N' },
    waiting: { color: '#ef4444', bg: '#ef444418', label: '\u0110ANG CH\u1ede' },
    done: { color: '#22c55e', bg: '#22c55e18', label: 'HO\u00c0N TH\u00c0NH' },
};

function Skeleton({ width, height, style }: any) {
    const anim = useRef(new Animated.Value(0.3)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: false }),
                Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: false }),
            ]),
        ).start();
    }, []);
    return <Animated.View style={[{ width, height, borderRadius: 8, backgroundColor: c.skeletonBase, opacity: anim }, style]} />;
}

function getDateRange() {
    const days = [];
    const now = new Date();
    for (let i = -3; i <= 7; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        days.push({
            full: d.toISOString().split('T')[0],
            day: d.getDate(),
            weekday: d.toLocaleDateString('vi-VN', { weekday: 'short' }).replace('.', ''),
            isToday: i === 0,
        });
    }
    return days;
}

export default function ScheduleScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ projectId?: string }>();
    const requestedProjectId = typeof params.projectId === 'string' ? params.projectId : '';
    const [projects, setProjects] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState<string>('');
    const [filter, setFilter] = useState(0);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const dateRange = useMemo(() => getDateRange(), []);

    const loadProjects = useCallback(async () => {
        try {
      const data = await apiFetchAllPages('/api/projects');
      setProjects(data);
            if (!data.length) return;
            if (requestedProjectId && data.some((project: any) => project.id === requestedProjectId)) {
                setSelectedProject((current) => current || requestedProjectId);
                return;
            }
            if (!selectedProject) setSelectedProject(data[0].id);
        } catch { setProjects([]); }
    }, [requestedProjectId, selectedProject]);

    const loadTasks = useCallback(async () => {
        if (!selectedProject) return;
        try {
            const res = await apiFetch(`/api/schedule-tasks?projectId=${selectedProject}`);
            setTasks(res?.flat || res?.data || []);
        } catch { setTasks([]); }
        setLoading(false);
    }, [selectedProject]);

    useEffect(() => { loadProjects(); }, [loadProjects]);
    useEffect(() => { if (selectedProject) { setLoading(true); loadTasks(); } }, [selectedProject, loadTasks]);

    const onRefresh = async () => { setRefreshing(true); await loadTasks(); setRefreshing(false); };

    const updateProgress = async (taskId: string, delta: number) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        const newProgress = Math.max(0, Math.min(100, (task.progress || 0) + delta));
        try {
            await apiFetch(`/api/schedule-tasks/${taskId}`, {
                method: 'PATCH',
                body: JSON.stringify({ progress: newProgress }),
            });
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, progress: newProgress } : t));
        } catch (e: any) { Alert.alert('L\u1ed7i', e.message); }
    };

    const getStatusKey = (t: any) => {
        if (t.progress >= 100) return 'done';
        if (t.progress > 0) return 'doing';
        return 'waiting';
    };

    const filteredTasks = tasks.filter(t => {
        if (filter === 0) return true;
        const s = getStatusKey(t);
        if (filter === 1) return s === 'doing';
        if (filter === 2) return s === 'waiting';
        return s === 'done';
    });

    const greetingText = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Ch\u00e0o bu\u1ed5i s\u00e1ng';
        if (h < 18) return 'Ch\u00e0o bu\u1ed5i chi\u1ec1u';
        return 'Ch\u00e0o bu\u1ed5i t\u1ed1i';
    };

    const HEADER_TITLE = 'L\u1ecbch L\u00e0m Vi\u1ec7c';
    const COMPANY = 'C\u00f4ng ty M\u1ed9t Nh\u00e0';
    const SECTION_TITLE = 'C\u00f4ng vi\u1ec7c h\u00f4m nay';
    const EMPTY_TITLE = 'Kh\u00f4ng c\u00f3 c\u00f4ng vi\u1ec7c';
    const EMPTY_DESC = 'Ng\u00e0y n\u00e0y ch\u01b0a c\u00f3 l\u1ecbch';

    if (loading && projects.length === 0) {
        return (
            <SafeAreaView style={s.safe} edges={['top']}>
                <View style={s.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="menu" size={24} color={c.text} />
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>{HEADER_TITLE}</Text>
                    <TouchableOpacity>
                        <View style={s.avatarSmall}><Ionicons name="person" size={16} color="#fff" /></View>
                    </TouchableOpacity>
                </View>
                <View style={{ padding: 16, gap: 16 }}>
                    <Skeleton width="60%" height={16} />
                    <Skeleton width="40%" height={14} />
                    <Skeleton width="100%" height={50} style={{ borderRadius: radius.card }} />
                    <Skeleton width="100%" height={120} style={{ borderRadius: radius.card }} />
                    <Skeleton width="100%" height={120} style={{ borderRadius: radius.card }} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="menu" size={24} color={c.text} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>{HEADER_TITLE}</Text>
                <TouchableOpacity>
                    <View style={s.avatarSmall}><Ionicons name="person" size={16} color="#fff" /></View>
                </TouchableOpacity>
            </View>

            <FlatList
                data={filteredTasks}
                keyExtractor={(item) => item.id || String(Math.random())}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
                        colors={[c.primary]} tintColor={c.primary} />
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                ListHeaderComponent={
                    <>
                        <View style={s.greetingBox}>
                            <Text style={s.greetingText}>{greetingText()}{', \u0110\u1ed9i tr\u01b0\u1edfng!'}</Text>
                            <Text style={s.companyText}>{COMPANY}</Text>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false}
                            contentContainerStyle={s.dateRow}>
                            {dateRange.map(d => (
                                <TouchableOpacity key={d.full}
                                    style={[s.dateItem, selectedDate === d.full && s.dateItemActive]}
                                    onPress={() => setSelectedDate(d.full)}>
                                    <Text style={[s.dateWeekday, selectedDate === d.full && s.dateTextActive]}>
                                        {d.weekday}
                                    </Text>
                                    <Text style={[s.dateDay, selectedDate === d.full && s.dateTextActive]}>
                                        {d.day}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false}
                            contentContainerStyle={s.filterRow}>
                            {STATUS_FILTERS.map((f, i) => (
                                <TouchableOpacity key={i}
                                    style={[s.filterChip, filter === i && { backgroundColor: f.color }]}
                                    onPress={() => setFilter(i)}>
                                    {i > 0 && (
                                        <View style={[s.filterDot, { backgroundColor: filter === i ? '#fff' : f.color }]} />
                                    )}
                                    <Text style={[s.filterText, filter === i && { color: '#fff' }]}>
                                        {f.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={s.sectionHeader}>
                            <Text style={s.sectionTitle}>{SECTION_TITLE}</Text>
                        </View>
                    </>
                }
                renderItem={({ item: t }) => {
                    const sk = getStatusKey(t);
                    const si = statusMap[sk];
                    const proj = projects.find(p => p.id === selectedProject);
                    const BTN_UPDATE = 'C\u1eadp nh\u1eadt ti\u1ebfn \u0111\u1ed9';
                    const BTN_START = 'B\u1eaft \u0111\u1ea7u c\u00f4ng vi\u1ec7c';
                    return (
                        <View style={s.taskCard}>
                            <View style={[s.taskStatusBadge, { backgroundColor: si.bg }]}>
                                <Text style={[s.taskStatusText, { color: si.color }]}>{si.label}</Text>
                            </View>
                            <View style={s.taskBody}>
                                <View style={[s.taskIconBox, { backgroundColor: si.color + '18' }]}>
                                    <Ionicons
                                        name={sk === 'done' ? 'checkmark-circle' : 'construct'}
                                        size={20} color={si.color}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.taskTitle} numberOfLines={2}>{t.name}</Text>
                                    {proj && (
                                        <View style={s.taskMeta}>
                                            <Ionicons name="business-outline" size={12} color={c.textMuted} />
                                            <Text style={s.taskMetaText}>{'D\u1ef1 \u00e1n: '}{proj.name}</Text>
                                        </View>
                                    )}
                                    {t.location && (
                                        <View style={s.taskMeta}>
                                            <Ionicons name="location-outline" size={12} color={c.textMuted} />
                                            <Text style={s.taskMetaText}>{t.location}</Text>
                                        </View>
                                    )}
                                    {t.assignee && (
                                        <View style={s.taskMeta}>
                                            <Ionicons name="people-outline" size={12} color={c.textMuted} />
                                            <Text style={s.taskMetaText}>
                                                {'Ph\u1ee5 tr\u00e1ch: '}{typeof t.assignee === 'string' ? t.assignee : t.assignee?.name}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Progress bar */}
                            <View style={s.progressSection}>
                                <View style={s.progressBarBg}>
                                    <View style={[s.progressBarFill, { width: `${t.progress || 0}%`, backgroundColor: si.color }]} />
                                </View>
                                <Text style={[s.progressText, { color: si.color }]}>{t.progress || 0}%</Text>
                            </View>

                            {sk !== 'done' && (
                                <View style={s.progressActions}>
                                    <TouchableOpacity style={s.progressBtn}
                                        onPress={() => updateProgress(t.id, -10)}>
                                        <Ionicons name="remove" size={18} color={c.primary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            s.taskAction,
                                            sk === 'doing'
                                                ? { backgroundColor: c.primary }
                                                : { backgroundColor: '#fff', borderWidth: 1.5, borderColor: c.primary },
                                        ]}
                                        onPress={() => updateProgress(t.id, 10)}>
                                        <Text style={[s.taskActionText, sk !== 'doing' && { color: c.primary }]}>
                                            {sk === 'doing' ? BTN_UPDATE : BTN_START}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={s.progressBtn}
                                        onPress={() => updateProgress(t.id, 10)}>
                                        <Ionicons name="add" size={18} color={c.primary} />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    );
                }}
                ListEmptyComponent={
                    <View style={s.emptyBox}>
                        <View style={s.emptyIcon}>
                            <Ionicons name="calendar-outline" size={32} color={c.primary} />
                        </View>
                        <Text style={s.emptyTitle}>{EMPTY_TITLE}</Text>
                        <Text style={s.emptyDesc}>{EMPTY_DESC}</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f8f9fd' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 14,
    },
    headerTitle: { fontSize: 20, fontWeight: fontWeight.title, color: c.text },
    avatarSmall: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center',
    },

    greetingBox: { paddingHorizontal: 20, paddingBottom: 16 },
    greetingText: { fontSize: 14, color: c.textSecondary },
    companyText: { fontSize: 17, fontWeight: fontWeight.title, color: c.text, marginTop: 2 },

    dateRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 16 },
    dateItem: {
        alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
        borderRadius: radius.card, backgroundColor: '#fff',
        borderWidth: 1, borderColor: '#e8ecf4', minWidth: 52,
    },
    dateItemActive: { backgroundColor: c.primary, borderColor: c.primary },
    dateWeekday: { fontSize: 11, fontWeight: fontWeight.label, color: c.textMuted, marginBottom: 4, textTransform: 'capitalize' },
    dateDay: { fontSize: 18, fontWeight: fontWeight.title, color: c.text },
    dateTextActive: { color: '#fff' },

    filterRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 16 },
    filterChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: radius.pill, backgroundColor: '#fff',
        borderWidth: 1, borderColor: '#e8ecf4',
    },
    filterDot: { width: 8, height: 8, borderRadius: 4 },
    filterText: { fontSize: 13, fontWeight: fontWeight.secondary, color: c.text },

    sectionHeader: { paddingHorizontal: 20, paddingBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: fontWeight.title, color: c.text },

    taskCard: {
        marginHorizontal: 16, marginBottom: 12,
        backgroundColor: '#fff', borderRadius: radius.card,
        padding: 16, borderWidth: 1, borderColor: '#e8ecf4',
        ...cardShadow,
    },
    taskStatusBadge: {
        alignSelf: 'flex-start', borderRadius: radius.pill,
        paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10,
    },
    taskStatusText: { fontSize: 10, fontWeight: fontWeight.title, letterSpacing: 0.8 },
    taskBody: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    taskIconBox: {
        width: 40, height: 40, borderRadius: radius.iconBox,
        alignItems: 'center', justifyContent: 'center', marginTop: 2,
    },
    taskTitle: { fontSize: 15, fontWeight: fontWeight.title, color: c.text, marginBottom: 6 },
    taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
    taskMetaText: { fontSize: 12, color: c.textMuted },
    taskAction: {
        flex: 1, alignItems: 'center', paddingVertical: 12,
        borderRadius: radius.card, backgroundColor: c.primary,
    },
    taskActionText: { fontSize: 14, fontWeight: fontWeight.title, color: '#fff' },

    progressSection: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    progressBarBg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#e8ecf4', overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 3 },
    progressText: { fontSize: 13, fontWeight: fontWeight.title, minWidth: 36, textAlign: 'right' },
    progressActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    progressBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: c.primary + '12', alignItems: 'center', justifyContent: 'center',
    },

    emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 6 },
    emptyIcon: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: c.borderP10,
        alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    },
    emptyTitle: { fontSize: 16, fontWeight: fontWeight.secondary, color: c.text },
    emptyDesc: { fontSize: 13, color: c.textMuted },
});
