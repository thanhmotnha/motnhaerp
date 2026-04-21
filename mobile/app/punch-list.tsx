import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, StyleSheet,
    TouchableOpacity, Alert, RefreshControl, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiFetch, apiFetchAllPages } from '@/lib/api';
import Colors, { cardShadow, radius, fontWeight } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from '@/components/Toast';

const c = Colors.light;
const TABS = ['M\u1edbi', '\u0110ang s\u1eeda', '\u0110\u00e3 xong'];
const tabMap: Record<string, string> = {
    'M\u1edbi': 'open',
    '\u0110ang s\u1eeda': 'in_progress',
    '\u0110\u00e3 xong': 'resolved',
};
const priorityColor: Record<string, string> = {
    high: '#dc2626',
    medium: '#f59e0b',
    low: '#6b7280',
};
const priorityLabel: Record<string, string> = {
    high: 'Cao',
    medium: 'TB',
    low: 'Th\u1ea5p',
};

function Skeleton({ width, height, style }: any) {
    return (
        <View
            style={[
                { width, height, backgroundColor: c.skeletonBase, borderRadius: 8 },
                style,
            ]}
        />
    );
}

export default function PunchListScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ projectId?: string }>();
    const requestedProjectId = typeof params.projectId === 'string' ? params.projectId : '';
    const [tab, setTab] = useState(TABS[0]);
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const toast = useToast();

    const loadProjects = useCallback(async () => {
        try {
            const data = await apiFetchAllPages('/api/projects');
            setProjects(data);
            if (!data.length) return;
            if (requestedProjectId && data.some((project: any) => project.id === requestedProjectId)) {
                setSelectedProject((current) => current || requestedProjectId);
                return;
            }
            setSelectedProject((current) => current || data[0].id);
        } catch {
            setProjects([]);
        }
    }, [requestedProjectId]);

    const load = useCallback(async () => {
        if (!selectedProject) {
            setItems([]);
            setLoading(false);
            return;
        }
        try {
            const res = await apiFetch(
                `/api/punch-list?projectId=${selectedProject}&status=${tabMap[tab]}&limit=50`,
            );
            setItems(res?.data || res || []);
        } catch {
            setItems([]);
        }
        setLoading(false);
    }, [selectedProject, tab]);

    useEffect(() => { loadProjects(); }, [loadProjects]);
    useEffect(() => { load(); }, [load]);

    const onRefresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    const handleAction = async (id: string, action: string) => {
        try {
            const body: any = {};
            if (action === 'start') body.status = 'in_progress';
            if (action === 'resolve') body.status = 'resolved';
            await apiFetch(`/api/punch-list/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(body),
            });
            toast.show('C\u1eadp nh\u1eadt th\u00e0nh c\u00f4ng', 'success');
            load();
        } catch (e: any) {
            toast.show(e.message || 'L\u1ed7i', 'error');
        }
    };

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={c.primary} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Punch List</Text>
                <View style={s.countBadge}>
                    <Text style={s.countText}>{items.length}</Text>
                </View>
            </View>

            {/* Tab bar */}
            <View style={s.tabRow}>
                {TABS.map(t => (
                    <TouchableOpacity
                        key={t}
                        style={[s.tab, tab === t && s.tabActive]}
                        onPress={() => { setLoading(true); setTab(t); }}>
                        <Text style={[s.tabText, tab === t && s.tabTextActive]}>
                            {t}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {projects.length > 0 && (
                <FlatList
                    horizontal
                    data={projects}
                    keyExtractor={(item) => item.id}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.projectRow}
                    renderItem={({ item }) => {
                        const active = item.id === selectedProject;
                        return (
                            <TouchableOpacity
                                style={[s.projectChip, active && s.projectChipActive]}
                                onPress={() => {
                                    setLoading(true);
                                    setSelectedProject(item.id);
                                }}>
                                <Text style={[s.projectChipText, active && s.projectChipTextActive]}>
                                    {item.code || item.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    }}
                />
            )}

            {loading ? (
                <View style={{ padding: 16, gap: 12 }}>
                    {[1, 2, 3].map(i => (
                        <View key={i} style={s.skeletonCard}>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <Skeleton width={60} height={18} />
                                <Skeleton width="50%" height={14} />
                            </View>
                            <Skeleton width="80%" height={12} />
                            <Skeleton width="40%" height={12} />
                        </View>
                    ))}
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={item => item.id || item._id || String(Math.random())}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[c.primary]}
                            tintColor={c.primary}
                        />
                    }
                    contentContainerStyle={{
                        paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100,
                    }}
                    renderItem={({ item }) => {
                        const pColor = priorityColor[item.priority] || '#6b7280';
                        return (
                            <View
                                style={[
                                    s.card,
                                    { borderLeftColor: pColor },
                                ]}>
                                <View style={s.cardTop}>
                                    {item.priority && (
                                        <View
                                            style={[
                                                s.priorityBadge,
                                                { backgroundColor: pColor + '15' },
                                            ]}>
                                            <Text style={[s.priorityText, { color: pColor }]}>
                                                {priorityLabel[item.priority] || item.priority}
                                            </Text>
                                        </View>
                                    )}
                                    <Text style={s.cardCode} numberOfLines={1}>
                                        #{item.code || item.id?.slice(-6)}
                                    </Text>
                                </View>
                                <Text style={s.cardTitle} numberOfLines={2}>
                                    {item.title || item.description}
                                </Text>
                                {item.location && (
                                    <View style={s.infoChip}>
                                        <Ionicons name="location-outline" size={13} color={c.textMuted} />
                                        <Text style={s.infoChipText}>{item.location}</Text>
                                    </View>
                                )}
                                {item.assignee && (
                                    <View style={s.infoChip}>
                                        <Ionicons name="person-outline" size={13} color={c.textMuted} />
                                        <Text style={s.infoChipText}>{item.assignee?.name || item.assignee}</Text>
                                    </View>
                                )}
                                {/* Actions */}
                                {tab === TABS[0] && (
                                    <TouchableOpacity
                                        style={s.actionBtn}
                                        onPress={() => handleAction(item.id, 'start')}>
                                        <Ionicons name="play" size={16} color="#fff" />
                                        <Text style={s.actionText}>B\u1eaft \u0111\u1ea7u s\u1eeda</Text>
                                    </TouchableOpacity>
                                )}
                                {tab === TABS[1] && (
                                    <TouchableOpacity
                                        style={[s.actionBtn, { backgroundColor: '#16a34a' }]}
                                        onPress={() => handleAction(item.id, 'resolve')}>
                                        <Ionicons name="checkmark-done" size={16} color="#fff" />
                                        <Text style={s.actionText}>\u0110\u00e1nh d\u1ea5u xong</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={s.emptyBox}>
                            <View style={s.emptyIcon}>
                                <Ionicons name="checkmark-circle" size={32} color={c.primary} />
                            </View>
                            <Text style={s.emptyTitle}>
                                {tab === TABS[2]
                                    ? 'Ch\u01b0a c\u00f3 item ho\u00e0n th\u00e0nh'
                                    : 'Kh\u00f4ng c\u00f3 l\u1ed7i c\u1ea7n s\u1eeda'}
                            </Text>
                            <Text style={s.emptyDesc}>
                                {tab === TABS[0]
                                    ? 'T\u1ea5t c\u1ea3 \u0111\u1ec1u \u0111\u1ea1t ch\u1ea5t l\u01b0\u1ee3ng!'
                                    : ''}
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bgGradientStart },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: c.borderP5,
        gap: 12,
    },
    headerTitle: {
        flex: 1, fontSize: 18, fontWeight: fontWeight.title, color: c.text,
    },
    countBadge: {
        backgroundColor: c.primary, borderRadius: 10,
        minWidth: 24, height: 24, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 8,
    },
    countText: { fontSize: 12, fontWeight: fontWeight.title, color: '#fff' },

    tabRow: {
        flexDirection: 'row', paddingHorizontal: 16,
        paddingVertical: 12, gap: 8,
    },
    tab: {
        flex: 1, paddingVertical: 10, borderRadius: radius.card,
        backgroundColor: c.card, alignItems: 'center',
        borderWidth: 1, borderColor: c.borderP5,
    },
    tabActive: { backgroundColor: c.primary, borderColor: c.primary },
    tabText: { fontSize: 12, fontWeight: fontWeight.secondary, color: c.textMuted },
    tabTextActive: { color: '#fff' },
    projectRow: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
    projectChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: radius.pill,
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.borderP5,
        marginRight: 8,
    },
    projectChipActive: {
        backgroundColor: c.primary,
        borderColor: c.primary,
    },
    projectChipText: { fontSize: 12, fontWeight: fontWeight.secondary, color: c.textMuted },
    projectChipTextActive: { color: '#fff' },

    skeletonCard: {
        backgroundColor: c.card, borderRadius: radius.card,
        padding: 16, gap: 10, ...cardShadow,
    },

    card: {
        backgroundColor: c.card, borderRadius: radius.card,
        padding: 16, marginBottom: 10,
        borderLeftWidth: 4, borderWidth: 1, borderColor: c.borderP5,
        ...cardShadow,
    },
    cardTop: {
        flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6,
    },
    priorityBadge: {
        borderRadius: radius.pill,
        paddingHorizontal: 8, paddingVertical: 3,
    },
    priorityText: { fontSize: 10, fontWeight: fontWeight.title, letterSpacing: 0.5 },
    cardCode: { fontSize: 12, color: c.textMuted, fontFamily: 'monospace' },
    cardTitle: {
        fontSize: 15, fontWeight: fontWeight.title, color: c.text, marginBottom: 8,
    },
    infoChip: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
    infoChipText: { fontSize: 12, color: c.textMuted },

    actionBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, backgroundColor: c.primary, borderRadius: radius.card,
        paddingVertical: 10, marginTop: 10,
    },
    actionText: { fontSize: 13, fontWeight: fontWeight.title, color: '#fff' },

    emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 6 },
    emptyIcon: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: c.borderP10,
        alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    },
    emptyTitle: { fontSize: 16, fontWeight: fontWeight.secondary, color: c.text },
    emptyDesc: { fontSize: 13, color: c.textMuted },
});
