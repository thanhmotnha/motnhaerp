import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiFetch, apiFetchAllPages } from '@/lib/api';
import Colors, { cardShadow, radius, fontWeight } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';

const c = Colors.light;

const COLUMNS = [
    { key: 'Chờ sản xuất', label: 'Chờ SX', color: '#64748b', icon: 'hourglass-outline' },
    { key: 'Đang sản xuất', label: 'Đang SX', color: c.accent, icon: 'construct-outline' },
    { key: 'Hoàn thành', label: 'Xong', color: c.success, icon: 'checkmark-circle-outline' },
];

// Skeleton
const Skeleton = ({ width, height, style }: any) => {
    const anim = useRef(new Animated.Value(0.3)).current;
    useEffect(() => { Animated.loop(Animated.sequence([Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }), Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true })])).start(); }, []);
    return <Animated.View style={[{ width, height, borderRadius: 8, backgroundColor: c.skeletonBase, opacity: anim }, style]} />;
};

export default function ProductionScreen() {
    const router = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [activeCol, setActiveCol] = useState(COLUMNS[0].key);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            const data = await apiFetchAllPages('/api/furniture-orders');
            setOrders(data);
        } catch { setOrders([]); }
        setLoading(false);
    };

    useEffect(() => { load(); }, []);
    const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

    const filtered = orders.filter(o => {
        if (activeCol === 'Chờ sản xuất') return !o.status || o.status === 'Chờ sản xuất' || o.status === 'Mới';
        if (activeCol === 'Đang sản xuất') return o.status === 'Đang sản xuất' || o.status === 'Đang gia công';
        return o.status === 'Hoàn thành' || o.status === 'Đã giao';
    });

    const getCount = (key: string) => orders.filter(o => {
        if (key === 'Chờ sản xuất') return !o.status || o.status === 'Chờ sản xuất' || o.status === 'Mới';
        if (key === 'Đang sản xuất') return o.status === 'Đang sản xuất' || o.status === 'Đang gia công';
        return o.status === 'Hoàn thành' || o.status === 'Đã giao';
    }).length;

    const updateStatus = async (id: string, status: string) => {
        try {
            await apiFetch(`/api/furniture-orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
            Alert.alert('✅ Cập nhật thành công');
            load();
        } catch (e: any) { Alert.alert('Lỗi', e.message); }
    };

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity style={s.headerCircle} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={c.primary} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Lệnh sản xuất</Text>
                <TouchableOpacity style={s.headerCircle}>
                    <Ionicons name="add" size={22} color={c.primary} />
                </TouchableOpacity>
            </View>

            {/* Kanban tabs */}
            <View style={s.tabRow}>
                {COLUMNS.map(col => {
                    const active = col.key === activeCol;
                    const count = getCount(col.key);
                    return (
                        <TouchableOpacity key={col.key} style={[s.tab, active && { backgroundColor: c.primary }]}
                            onPress={() => setActiveCol(col.key)} activeOpacity={0.7}>
                            <Ionicons name={col.icon as any} size={16} color={active ? '#fff' : col.color} />
                            <Text style={[s.tabLabel, active && { color: '#fff' }]}>{col.label}</Text>
                            <View style={[s.tabBadge, active && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                                <Text style={[s.tabBadgeText, active && { color: '#fff' }]}>{count}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Orders list */}
            {loading ? (
                <View style={{ paddingHorizontal: 16, gap: 10, paddingTop: 12 }}>
                    {[1, 2, 3].map(i => <Skeleton key={i} width="100%" height={90} style={{ borderRadius: radius.card }} />)}
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 8 }}
                    keyExtractor={o => o.id}
                    ListEmptyComponent={
                        <View style={s.emptyBox}>
                            <View style={s.emptyIcon}>
                                <Ionicons name="cube-outline" size={32} color={c.primary} />
                            </View>
                            <Text style={s.emptyTitle}>Không có đơn sản xuất</Text>
                            <Text style={s.emptyDesc}>Tạo lệnh gia công mới từ dự án</Text>
                            <TouchableOpacity style={s.emptyCTA}>
                                <Ionicons name="add-circle-outline" size={18} color={c.primary} />
                                <Text style={s.emptyCTAText}>Tạo mới</Text>
                            </TouchableOpacity>
                        </View>
                    }
                    renderItem={({ item: o }) => {
                        const col = COLUMNS.find(c => c.key === activeCol) || COLUMNS[0];
                        return (
                            <TouchableOpacity style={[s.orderCard, { borderLeftColor: col.color }]}
                                activeOpacity={0.7}
                                onPress={() => router.push(`/production-detail?id=${o.id}` as any)}>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.orderName} numberOfLines={1}>{o.name || o.productName || 'Đơn gia công'}</Text>
                                    <Text style={s.orderMeta}>{o.project?.name || ''}{o.quantity ? ` • SL: ${o.quantity}` : ''}</Text>
                                    {/* Progress */}
                                    {o.progress != null && (
                                        <View style={s.progressTrack}>
                                            <View style={[s.progressFill, { width: `${Math.min(o.progress, 100)}%`, backgroundColor: col.color }]} />
                                        </View>
                                    )}
                                </View>
                                <View style={[s.statusPill, { backgroundColor: col.color + '15' }]}>
                                    <Text style={[s.statusText, { color: col.color }]}>{col.label}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                />
            )}
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bgGradientStart },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: c.borderP5,
    },
    headerCircle: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: c.borderP10, alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: fontWeight.title, color: c.primary },

    // Kanban tabs
    tabRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    tab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 10, borderRadius: radius.pill,
        backgroundColor: c.card, borderWidth: 1, borderColor: c.borderP10,
    },
    tabLabel: { fontSize: 12, fontWeight: fontWeight.secondary, color: c.textSecondary },
    tabBadge: {
        minWidth: 20, height: 20, borderRadius: 10,
        backgroundColor: c.borderP10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    },
    tabBadgeText: { fontSize: 10, fontWeight: fontWeight.title, color: c.textSecondary },

    // Order cards
    orderCard: {
        padding: 14, borderRadius: radius.card, backgroundColor: c.card,
        borderLeftWidth: 4, marginBottom: 10,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        ...cardShadow,
    },
    orderName: { fontSize: 14, fontWeight: fontWeight.secondary, color: c.text, marginBottom: 3 },
    orderMeta: { fontSize: 12, color: c.textSecondary, marginBottom: 6 },
    progressTrack: { height: 4, borderRadius: 2, backgroundColor: '#f1f5f9', overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 2 },
    statusPill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
    statusText: { fontSize: 10, fontWeight: fontWeight.title, textTransform: 'uppercase', letterSpacing: 0.5 },

    // Empty state
    emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 6 },
    emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: c.borderP10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    emptyTitle: { fontSize: 16, fontWeight: fontWeight.secondary, color: c.text },
    emptyDesc: { fontSize: 13, color: c.textMuted },
    emptyCTA: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginTop: 12, paddingHorizontal: 18, paddingVertical: 10,
        borderRadius: radius.pill, borderWidth: 1.5, borderColor: c.primary,
    },
    emptyCTAText: { fontSize: 13, fontWeight: fontWeight.secondary, color: c.primary },
});
