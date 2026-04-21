import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, StyleSheet,
    TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiFetch, apiFetchAllPages } from '@/lib/api';
import Colors, { cardShadow, radius, fontWeight } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';

const c = Colors.light;
const TABS = ['Ch\u1edd nghi\u1ec7m thu', '\u0110\u1ea1t', 'Kh\u00f4ng \u0111\u1ea1t'];
const tabMap: Record<string, string> = {
    'Ch\u1edd nghi\u1ec7m thu': 'pending',
    '\u0110\u1ea1t': 'accepted',
    'Kh\u00f4ng \u0111\u1ea1t': 'rejected',
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

export default function AcceptanceCheckScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ projectId?: string }>();
    const requestedProjectId = typeof params.projectId === 'string' ? params.projectId : '';
    const [tab, setTab] = useState(TABS[0]);
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

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
                `/api/acceptance?projectId=${selectedProject}&status=${tabMap[tab]}&limit=50`,
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

    const handleAccept = async (id: string) => {
        Alert.alert(
            'X\u00e1c nh\u1eadn nghi\u1ec7m thu',
            'D\u1ea1ng nghi\u1ec7m thu \u0111\u1ea1t cho h\u1ea1ng m\u1ee5c n\u00e0y?',
            [
                { text: 'H\u1ee7y', style: 'cancel' },
                {
                    text: '\u0110\u1ea1t',
                    style: 'default',
                    onPress: async () => {
                        try {
                            await apiFetch(`/api/acceptance/${id}`, {
                                method: 'PATCH',
                                body: JSON.stringify({ status: 'accepted' }),
                            });
                            Alert.alert('\u2705 Nghi\u1ec7m thu \u0111\u1ea1t');
                            load();
                        } catch (e: any) {
                            Alert.alert('L\u1ed7i', e.message);
                        }
                    },
                },
            ],
        );
    };

    const handleReject = async (id: string) => {
        Alert.alert(
            'T\u1eeb ch\u1ed1i nghi\u1ec7m thu',
            'X\u00e1c nh\u1eadn kh\u00f4ng \u0111\u1ea1t?',
            [
                { text: 'H\u1ee7y', style: 'cancel' },
                {
                    text: 'Kh\u00f4ng \u0111\u1ea1t',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiFetch(`/api/acceptance/${id}`, {
                                method: 'PATCH',
                                body: JSON.stringify({ status: 'rejected' }),
                            });
                            Alert.alert('\u274c \u0110\u00e3 t\u1eeb ch\u1ed1i');
                            load();
                        } catch (e: any) {
                            Alert.alert('L\u1ed7i', e.message);
                        }
                    },
                },
            ],
        );
    };

    const statusIcon = (status: string) => {
        if (status === 'accepted') return { icon: 'checkmark-circle', color: '#16a34a' };
        if (status === 'rejected') return { icon: 'close-circle', color: '#dc2626' };
        return { icon: 'time', color: '#f59e0b' };
    };

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={c.primary} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Nghi\u1ec7m thu</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Tabs */}
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
                            <Skeleton width="60%" height={16} />
                            <Skeleton width="80%" height={13} />
                            <Skeleton width="40%" height={13} />
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
                        const si = statusIcon(item.status);
                        return (
                            <View style={s.card}>
                                <View style={s.cardHeader}>
                                    <View style={[s.statusDot, { backgroundColor: si.color + '15' }]}>
                                        <Ionicons name={si.icon as any} size={18} color={si.color} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.cardTitle} numberOfLines={2}>
                                            {item.title || item.name}
                                        </Text>
                                        <Text style={s.cardProject}>
                                            {item.project?.name || item.projectName || ''}
                                        </Text>
                                    </View>
                                </View>

                                {/* Info rows */}
                                {item.location && (
                                    <View style={s.infoRow}>
                                        <Ionicons name="location-outline" size={14} color={c.textMuted} />
                                        <Text style={s.infoText}>{item.location}</Text>
                                    </View>
                                )}
                                {item.contractor && (
                                    <View style={s.infoRow}>
                                        <Ionicons name="people-outline" size={14} color={c.textMuted} />
                                        <Text style={s.infoText}>
                                            {item.contractor?.name || item.contractor}
                                        </Text>
                                    </View>
                                )}
                                {item.date && (
                                    <View style={s.infoRow}>
                                        <Ionicons name="calendar-outline" size={14} color={c.textMuted} />
                                        <Text style={s.infoText}>
                                            {new Date(item.date).toLocaleDateString('vi-VN')}
                                        </Text>
                                    </View>
                                )}

                                {/* Checklist summary */}
                                {item.checklistTotal > 0 && (
                                    <View style={s.checklistBar}>
                                        <Text style={s.checklistText}>
                                            {item.checklistPassed || 0}/{item.checklistTotal}{' '}
                                            h\u1ea1ng m\u1ee5c \u0111\u1ea1t
                                        </Text>
                                        <View style={s.checkProgress}>
                                            <View
                                                style={[
                                                    s.checkProgressFill,
                                                    {
                                                        width: `${Math.round(
                                                            ((item.checklistPassed || 0) /
                                                                item.checklistTotal) *
                                                            100,
                                                        )}%`,
                                                    },
                                                ]}
                                            />
                                        </View>
                                    </View>
                                )}

                                {/* Actions for pending */}
                                {tab === TABS[0] && (
                                    <View style={s.actionRow}>
                                        <TouchableOpacity
                                            style={[s.actionBtn, s.rejectBtn]}
                                            onPress={() => handleReject(item.id)}>
                                            <Ionicons name="close" size={16} color="#dc2626" />
                                            <Text style={[s.actionText, { color: '#dc2626' }]}>
                                                Kh\u00f4ng \u0111\u1ea1t
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[s.actionBtn, s.acceptBtn]}
                                            onPress={() => handleAccept(item.id)}>
                                            <Ionicons name="checkmark" size={16} color="#fff" />
                                            <Text style={[s.actionText, { color: '#fff' }]}>
                                                \u0110\u1ea1t
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={s.emptyBox}>
                            <View style={s.emptyIcon}>
                                <Ionicons
                                    name={tab === TABS[1] ? 'ribbon' : 'clipboard-outline'}
                                    size={32}
                                    color={c.primary}
                                />
                            </View>
                            <Text style={s.emptyTitle}>
                                {tab === TABS[1]
                                    ? 'Ch\u01b0a c\u00f3 nghi\u1ec7m thu \u0111\u1ea1t'
                                    : tab === TABS[2]
                                        ? 'Kh\u00f4ng c\u00f3 h\u1ea1ng m\u1ee5c b\u1ecb t\u1eeb ch\u1ed1i'
                                        : 'Kh\u00f4ng c\u00f3 h\u1ea1ng m\u1ee5c ch\u1edd nghi\u1ec7m thu'}
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
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: c.borderP5,
    },
    headerTitle: { fontSize: 18, fontWeight: fontWeight.title, color: c.text },

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
    tabText: { fontSize: 11, fontWeight: fontWeight.secondary, color: c.textMuted },
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
    projectChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    projectChipText: { fontSize: 12, fontWeight: fontWeight.secondary, color: c.textMuted },
    projectChipTextActive: { color: '#fff' },

    skeletonCard: {
        backgroundColor: c.card, borderRadius: radius.card,
        padding: 16, gap: 10, ...cardShadow,
    },

    card: {
        backgroundColor: c.card, borderRadius: radius.card,
        padding: 16, marginBottom: 10,
        borderWidth: 1, borderColor: c.borderP5,
        ...cardShadow,
    },
    cardHeader: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10,
    },
    statusDot: {
        width: 36, height: 36, borderRadius: radius.iconBox,
        alignItems: 'center', justifyContent: 'center',
    },
    cardTitle: { fontSize: 15, fontWeight: fontWeight.title, color: c.text },
    cardProject: { fontSize: 12, color: c.textMuted, marginTop: 2 },

    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    infoText: { fontSize: 12, color: c.textMuted },

    checklistBar: { marginTop: 8 },
    checklistText: { fontSize: 12, fontWeight: fontWeight.secondary, color: c.text, marginBottom: 4 },
    checkProgress: {
        height: 4, backgroundColor: c.borderP10, borderRadius: 2,
    },
    checkProgressFill: {
        height: 4, backgroundColor: '#16a34a', borderRadius: 2,
    },

    actionRow: {
        flexDirection: 'row', gap: 10, marginTop: 12,
    },
    actionBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, borderRadius: radius.card, paddingVertical: 10,
    },
    rejectBtn: {
        backgroundColor: '#dc262615', borderWidth: 1, borderColor: '#dc262630',
    },
    acceptBtn: { backgroundColor: '#16a34a' },
    actionText: { fontSize: 13, fontWeight: fontWeight.title },

    emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 6 },
    emptyIcon: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: c.borderP10,
        alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    },
    emptyTitle: { fontSize: 16, fontWeight: fontWeight.secondary, color: c.text },
});
