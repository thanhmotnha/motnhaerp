import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, StyleSheet,
    TouchableOpacity, Alert, RefreshControl, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiFetch, apiFetchAllPages } from '@/lib/api';
import Colors, { cardShadow, radius, fontWeight } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';

const c = Colors.light;

const TAB_ITEMS = [
    'C\u1ea7n s\u1eeda ch\u1eefa',
    '\u0110ang th\u1ef1c hi\u1ec7n',
    'Ho\u00e0n th\u00e0nh',
] as const;

const tabStatusMap: Record<string, string> = {
    'C\u1ea7n s\u1eeda ch\u1eefa': 'M\u1edbi',
    '\u0110ang th\u1ef1c hi\u1ec7n': '\u0110ang x\u1eed l\u00fd',
    'Ho\u00e0n th\u00e0nh': '\u0110\u00e3 xong',
};

const priorityConfig: Record<string, { color: string; bg: string; label: string }> = {
    'Kh\u1ea9n c\u1ea5p': { color: '#dc2626', bg: '#dc262620', label: 'KH\u1ea8N C\u1ea4P' },
    'Cao': { color: '#f59e0b', bg: '#f59e0b20', label: 'CAO' },
    'Trung b\u00ecnh': { color: '#3b82f6', bg: '#3b82f620', label: 'TRUNG B\u00ccNH' },
    'Th\u1ea5p': { color: '#6b7280', bg: '#6b728020', label: 'TH\u1ea4P' },
};

const TXT = {
    brand: 'M\u1ed8T NH\u00c0',
    sub: 'S\u1eeda ch\u1eefa & B\u1ea3o tr\u00ec',
    listTitle: 'Danh s\u00e1ch c\u00f4ng vi\u1ec7c',
    yeuCau: ' y\u00eau c\u1ea7u',
    chuNha: 'Ch\u1ee7 nh\u00e0: ',
    khachHang: 'Kh\u00e1ch h\u00e0ng',
    tinhTrang: 'T\u00ccNH TR\u1ea0NG',
    nhanViec: 'Nh\u1eadn vi\u1ec7c',
    baoCao: 'B\u00e1o c\u00e1o ho\u00e0n th\u00e0nh',
    emptyTitle: 'Kh\u00f4ng c\u00f3 y\u00eau c\u1ea7u',
    emptyDone: 'Ch\u01b0a c\u00f3 c\u00f4ng vi\u1ec7c ho\u00e0n th\u00e0nh',
    emptyAll: 'T\u1ea5t c\u1ea3 \u0111\u00e3 \u0111\u01b0\u1ee3c x\u1eed l\u00fd',
    capNhat: '\u2705 C\u1eadp nh\u1eadt th\u00e0nh c\u00f4ng',
    loi: 'L\u1ed7i',
    batDau: 'B\u1eaft \u0111\u1ea7u: ',
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

export default function WarrantyScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ projectId?: string }>();
    const requestedProjectId = typeof params.projectId === 'string' ? params.projectId : '';
    const [tab, setTab] = useState<(typeof TAB_ITEMS)[number]>(TAB_ITEMS[0]);
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [tickets, setTickets] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

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
        try {
            const route = selectedProject
                ? `/api/warranty?projectId=${selectedProject}&status=${tabStatusMap[tab]}&limit=30`
                : `/api/warranty?status=${tabStatusMap[tab]}&limit=30`;
            const res = await apiFetch(route);
            setTickets(res?.data || res || []);
        } catch { setTickets([]); }
        setLoading(false);
    }, [selectedProject, tab]);

    useEffect(() => { loadProjects(); }, [loadProjects]);
    useEffect(() => { load(); }, [load]);

    const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

    const handleAction = async (id: string, action: string) => {
        try {
            const body: any = {};
            if (action === 'accept') body.status = '\u0110ang x\u1eed l\u00fd';
            if (action === 'complete') body.status = '\u0110\u00e3 xong';
            await apiFetch(`/api/warranty/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
            Alert.alert(TXT.capNhat);
            load();
        } catch (e: any) { Alert.alert(TXT.loi, e.message); }
    };

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="menu" size={24} color={c.text} />
                </TouchableOpacity>
                <View style={s.headerCenter}>
                    <Text style={s.headerBrand}>{TXT.brand}</Text>
                    <Text style={s.headerSub}>{TXT.sub}</Text>
                </View>
                <TouchableOpacity style={s.bellBtn}>
                    <Ionicons name="notifications-outline" size={22} color={c.primary} />
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={s.tabRow}>
                {TAB_ITEMS.map(t => (
                    <TouchableOpacity key={t}
                        style={[s.tab, tab === t && s.tabActive]}
                        onPress={() => { setLoading(true); setTab(t); }}>
                        <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t}</Text>
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

            {/* Count */}
            <View style={s.countRow}>
                <Text style={s.countTitle}>{TXT.listTitle}</Text>
                <View style={s.countBadge}>
                    <Text style={s.countText}>{tickets.length}{TXT.yeuCau}</Text>
                </View>
            </View>

            {loading ? (
                <View style={{ padding: 16, gap: 16 }}>
                    {[1, 2].map(i => (
                        <View key={i} style={s.skeletonCard}>
                            <Skeleton width="100%" height={140} style={{ borderRadius: radius.card }} />
                            <View style={{ padding: 14, gap: 8 }}>
                                <Skeleton width="70%" height={16} />
                                <Skeleton width="90%" height={13} />
                                <Skeleton width="50%" height={36} style={{ borderRadius: radius.card }} />
                            </View>
                        </View>
                    ))}
                </View>
            ) : (
                <FlatList
                    data={tickets}
                    keyExtractor={t => t.id || String(Math.random())}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
                            tintColor={c.primary} colors={[c.primary]} />
                    }
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, gap: 16 }}
                    renderItem={({ item: t }) => {
                        const pri = priorityConfig[t.priority] || priorityConfig['Trung b\u00ecnh'];
                        return (
                            <View style={s.card}>
                                {/* Photo area */}
                                <View style={s.photoArea}>
                                    {t.photos?.[0] ? (
                                        <Image source={{ uri: t.photos[0] }} style={s.photoImg} />
                                    ) : (
                                        <View style={[s.photoImg, { backgroundColor: pri.color + '15', alignItems: 'center', justifyContent: 'center' }]}>
                                            <Ionicons name="image-outline" size={32} color={pri.color} />
                                        </View>
                                    )}
                                    <View style={[s.priorityOverlay, { backgroundColor: pri.bg }]}>
                                        <Text style={[s.priorityText, { color: pri.color }]}>{pri.label}</Text>
                                    </View>
                                </View>

                                {/* Content */}
                                <View style={s.cardContent}>
                                    <Text style={s.customerName}>
                                        {TXT.chuNha}{t.customer?.name || t.customerName || TXT.khachHang}
                                    </Text>
                                    {(t.customer?.address || t.address) && (
                                        <View style={s.infoRow}>
                                            <Ionicons name="location" size={14} color={c.primary} />
                                            <Text style={s.infoText}>{t.customer?.address || t.address}</Text>
                                        </View>
                                    )}
                                    {t.description && (
                                        <View style={s.descBox}>
                                            <Text style={s.descLabel}>{TXT.tinhTrang}</Text>
                                            <Text style={s.descText} numberOfLines={3}>{t.description}</Text>
                                        </View>
                                    )}
                                    {tab === TAB_ITEMS[0] && (
                                        <TouchableOpacity style={s.actionBtn}
                                            onPress={() => handleAction(t.id, 'accept')}>
                                            <Ionicons name="checkmark-circle" size={18} color="#fff" />
                                            <Text style={s.actionText}>{TXT.nhanViec}</Text>
                                        </TouchableOpacity>
                                    )}
                                    {tab === TAB_ITEMS[1] && (
                                        <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#16a34a' }]}
                                            onPress={() => handleAction(t.id, 'complete')}>
                                            <Ionicons name="checkmark-done" size={18} color="#fff" />
                                            <Text style={s.actionText}>{TXT.baoCao}</Text>
                                        </TouchableOpacity>
                                    )}
                                    {tab === TAB_ITEMS[2] && t.completedAt && (
                                        <View style={s.completedRow}>
                                            <Ionicons name="time-outline" size={14} color={c.textMuted} />
                                            <Text style={s.completedText}>
                                                {TXT.batDau}{new Date(t.completedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={s.emptyBox}>
                            <View style={s.emptyIcon}>
                                <Ionicons name="build-outline" size={32} color={c.primary} />
                            </View>
                            <Text style={s.emptyTitle}>{TXT.emptyTitle}</Text>
                            <Text style={s.emptyDesc}>
                                {tab === TAB_ITEMS[2] ? TXT.emptyDone : TXT.emptyAll}
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f8f9fd' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 12,
    },
    headerCenter: { alignItems: 'center' },
    headerBrand: { fontSize: 18, fontWeight: fontWeight.title, color: c.primary, letterSpacing: 1 },
    headerSub: { fontSize: 11, color: c.textMuted, marginTop: 1 },
    bellBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: c.borderP5, alignItems: 'center', justifyContent: 'center',
    },

    tabRow: {
        flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 0,
        borderBottomWidth: 1, borderBottomColor: '#e8ecf4',
    },
    tab: {
        flex: 1, paddingVertical: 10, alignItems: 'center',
        borderBottomWidth: 2, borderBottomColor: 'transparent',
    },
    tabActive: { borderBottomColor: c.primary },
    tabText: { fontSize: 13, fontWeight: fontWeight.secondary, color: c.textMuted },
    tabTextActive: { color: c.primary },
    projectRow: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
    projectChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: radius.pill,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: c.borderP5,
        marginRight: 8,
    },
    projectChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    projectChipText: { fontSize: 12, fontWeight: fontWeight.secondary, color: c.textMuted },
    projectChipTextActive: { color: '#fff' },

    countRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 14,
    },
    countTitle: { fontSize: 16, fontWeight: fontWeight.title, color: c.text },
    countBadge: {
        backgroundColor: c.primary + '15', borderRadius: radius.pill,
        paddingHorizontal: 10, paddingVertical: 4,
    },
    countText: { fontSize: 12, fontWeight: fontWeight.secondary, color: c.primary },

    skeletonCard: {
        backgroundColor: '#fff', borderRadius: radius.card,
        overflow: 'hidden', ...cardShadow,
    },

    card: {
        backgroundColor: '#fff', borderRadius: radius.card,
        overflow: 'hidden', borderWidth: 1, borderColor: '#e8ecf4',
        ...cardShadow,
    },
    photoArea: { position: 'relative' },
    photoImg: {
        width: '100%', height: 160,
        borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card,
    },
    priorityOverlay: {
        position: 'absolute', top: 12, left: 12,
        borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4,
    },
    priorityText: { fontSize: 10, fontWeight: fontWeight.title, letterSpacing: 0.8 },

    cardContent: { padding: 16 },
    customerName: { fontSize: 16, fontWeight: fontWeight.title, color: c.text, marginBottom: 6 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    infoText: { fontSize: 13, color: c.textMuted, flex: 1 },

    descBox: {
        backgroundColor: '#f8f9fd', borderRadius: radius.iconBox,
        padding: 12, marginTop: 10, marginBottom: 4,
        borderLeftWidth: 3, borderLeftColor: c.accent,
    },
    descLabel: {
        fontSize: 10, fontWeight: fontWeight.title, color: c.textMuted,
        letterSpacing: 0.8, marginBottom: 4,
    },
    descText: { fontSize: 13, color: c.text, fontStyle: 'italic', lineHeight: 18 },

    actionBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, backgroundColor: c.primary, borderRadius: radius.card,
        paddingVertical: 12, marginTop: 12,
    },
    actionText: { fontSize: 14, fontWeight: fontWeight.title, color: '#fff' },

    completedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    completedText: { fontSize: 12, color: c.textMuted },

    emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 6 },
    emptyIcon: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: c.borderP10,
        alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    },
    emptyTitle: { fontSize: 16, fontWeight: fontWeight.secondary, color: c.text },
    emptyDesc: { fontSize: 13, color: c.textMuted },
});
