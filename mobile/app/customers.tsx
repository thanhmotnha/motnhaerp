import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
    ActivityIndicator, RefreshControl, Alert, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors, { cardShadow, radius, fontWeight } from '@/constants/Colors';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';

const c = Colors.light;

type Customer = {
    id: string;
    code: string;
    name: string;
    phone: string;
    pipelineStage: string;
    score: number;
    lastContactAt: string | null;
    salesPersonId: string | null;
    salesPerson: { id: string; name: string } | null;
};

type OwnerFilter = 'mine' | 'unassigned' | 'all';

const PIPELINE_COLORS: Record<string, string> = {
    'Lead': '#94a3b8',
    'Prospect': '#f59e0b',
    'Tư vấn': '#3b82f6',
    'Báo giá': '#8b5cf6',
    'Ký HĐ': '#10b981',
    'Thi công': '#f97316',
    'Cọc': '#10b981',
    'Dừng': '#ef4444',
    'VIP': '#ec4899',
};

const daysSince = (d: string | null) => d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : null;

export default function CustomersScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const toast = useToast();
    const isNvkd = user?.role === 'kinh_doanh';

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<OwnerFilter>(isNvkd ? 'mine' : 'all');

    const load = useCallback(async () => {
        try {
            const res = await apiFetch(`/api/customers?limit=200${search ? `&search=${encodeURIComponent(search)}` : ''}`);
            setCustomers(res?.data || []);
        } catch (e: any) {
            toast.show(e.message || 'Lỗi tải KH', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [search]);

    useEffect(() => { load(); }, [load]);

    async function claim(id: string, name: string) {
        Alert.alert('Nhận khách', `Nhận "${name}" làm khách của bạn?`, [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Nhận', onPress: async () => {
                    try {
                        await apiFetch(`/api/customers/${id}/claim`, { method: 'POST' });
                        toast.show('Đã nhận khách', 'success');
                        load();
                    } catch (e: any) { toast.show(e.message || 'Lỗi', 'error'); }
                },
            },
        ]);
    }

    const filtered = customers.filter(c => {
        if (filter === 'mine') return c.salesPersonId === user?.id;
        if (filter === 'unassigned') return !c.salesPersonId;
        return true;
    });

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={c.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={s.headerTitle}>Khách hàng</Text>
                    <Text style={s.headerSub}>{filtered.length} khách · {filter === 'mine' ? 'của tôi' : filter === 'unassigned' ? 'chưa chủ' : 'tất cả'}</Text>
                </View>
            </View>

            {/* Search */}
            <View style={s.searchBar}>
                <Ionicons name="search" size={18} color={c.textMuted} />
                <TextInput
                    style={s.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Tìm tên / SĐT / mã..."
                    placeholderTextColor={c.textMuted}
                />
            </View>

            {/* Filter chips */}
            <View style={s.chipRow}>
                {isNvkd ? (
                    <>
                        <Chip label="🙋 Của tôi" active={filter === 'mine'} onPress={() => setFilter('mine')} />
                        <Chip label="❓ Chưa chủ" active={filter === 'unassigned'} onPress={() => setFilter('unassigned')} />
                    </>
                ) : (
                    <>
                        <Chip label="Tất cả" active={filter === 'all'} onPress={() => setFilter('all')} />
                        <Chip label="Chưa chủ" active={filter === 'unassigned'} onPress={() => setFilter('unassigned')} />
                    </>
                )}
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={c.primary} style={{ marginTop: 40 }} />
            ) : (
                <ScrollView
                    contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}
                >
                    {filtered.length === 0 ? (
                        <View style={s.empty}>
                            <Ionicons name="people-outline" size={48} color={c.textMuted} />
                            <Text style={s.emptyText}>Không có khách hàng</Text>
                        </View>
                    ) : (
                        filtered.map(cust => {
                            const days = daysSince(cust.lastContactAt);
                            const owned = cust.salesPersonId === user?.id;
                            const unowned = !cust.salesPersonId;
                            return (
                                <Pressable
                                    key={cust.id}
                                    onPress={() => router.push(`/customers/${cust.id}` as any)}
                                    style={s.card}
                                >
                                    <View style={s.cardTop}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.cardName}>{cust.name}</Text>
                                            <View style={s.cardMeta}>
                                                <Ionicons name="call-outline" size={12} color={c.textMuted} />
                                                <Text style={s.cardPhone}>{cust.phone}</Text>
                                            </View>
                                        </View>
                                        <View style={[s.pipelineBadge, { backgroundColor: (PIPELINE_COLORS[cust.pipelineStage] || c.textMuted) + '20' }]}>
                                            <Text style={[s.pipelineBadgeText, { color: PIPELINE_COLORS[cust.pipelineStage] || c.textMuted }]}>
                                                {cust.pipelineStage}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={s.cardBottom}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                                            <Ionicons
                                                name={cust.salesPerson?.name ? 'person' : 'person-outline'}
                                                size={12}
                                                color={owned ? c.success : c.textMuted}
                                            />
                                            <Text style={[s.cardOwner, owned && { color: c.success, fontWeight: '600' }]}>
                                                {cust.salesPerson?.name || 'Chưa có chủ'}
                                            </Text>
                                        </View>
                                        {days !== null ? (
                                            <View style={[s.daysBadge, {
                                                backgroundColor: (days > 14 ? c.danger : days > 7 ? c.warning : c.success) + '15',
                                            }]}>
                                                <Ionicons name="time-outline" size={10} color={days > 14 ? c.danger : days > 7 ? c.warning : c.success} />
                                                <Text style={[s.daysText, { color: days > 14 ? c.danger : days > 7 ? c.warning : c.success }]}>
                                                    {days === 0 ? 'Hôm nay' : `${days}d`}
                                                </Text>
                                            </View>
                                        ) : (
                                            <Text style={[s.daysText, { color: c.textMuted }]}>Chưa LH</Text>
                                        )}
                                    </View>
                                    {isNvkd && unowned && (
                                        <TouchableOpacity
                                            onPress={(e) => { e.stopPropagation(); claim(cust.id, cust.name); }}
                                            style={s.claimBtn}
                                        >
                                            <Ionicons name="hand-left" size={14} color="#fff" />
                                            <Text style={s.claimBtnText}>Nhận khách</Text>
                                        </TouchableOpacity>
                                    )}
                                </Pressable>
                            );
                        })
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[s.chip, active && s.chipActive]}
        >
            <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
        </TouchableOpacity>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: fontWeight.title, color: c.text },
    headerSub: { fontSize: 13, color: c.textMuted, marginTop: 2 },

    searchBar: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 10,
        backgroundColor: c.card, borderRadius: radius.button, borderWidth: 1, borderColor: c.borderP10,
    },
    searchInput: { flex: 1, fontSize: 14, color: c.text },

    chipRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginBottom: 12 },
    chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: c.card, borderWidth: 1, borderColor: c.borderP10 },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { fontSize: 13, color: c.text, fontWeight: fontWeight.label },
    chipTextActive: { color: '#fff', fontWeight: fontWeight.title },

    card: {
        backgroundColor: c.card, borderRadius: radius.card, padding: 14, marginBottom: 10,
        ...cardShadow,
    },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
    cardName: { fontSize: 16, fontWeight: fontWeight.title, color: c.text },
    cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    cardPhone: { fontSize: 13, color: c.textMuted },
    pipelineBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
    pipelineBadgeText: { fontSize: 11, fontWeight: fontWeight.title, textTransform: 'uppercase' },

    cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.borderP5 },
    cardOwner: { fontSize: 12, color: c.textMuted },
    daysBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
    daysText: { fontSize: 11, fontWeight: fontWeight.title },

    claimBtn: {
        marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        backgroundColor: c.primary, paddingVertical: 10, borderRadius: radius.button,
    },
    claimBtnText: { color: '#fff', fontWeight: fontWeight.title, fontSize: 13 },

    empty: { alignItems: 'center', padding: 40 },
    emptyText: { color: c.textMuted, marginTop: 8 },
});
