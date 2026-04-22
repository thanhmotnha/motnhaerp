import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
    ActivityIndicator, RefreshControl, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors, { cardShadow, radius, fontWeight } from '@/constants/Colors';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';

const c = Colors.light;
const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n || 0) + 'đ';
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
    'Nháp': { bg: '#f1f5f9', color: '#64748b' },
    'Đã ký': { bg: '#dcfce7', color: '#15803d' },
    'Đang thực hiện': { bg: '#dbeafe', color: '#1d4ed8' },
    'Hoàn thành': { bg: '#d1fae5', color: '#047857' },
    'Hủy': { bg: '#fee2e2', color: '#b91c1c' },
};

export default function ContractsScreen() {
    const router = useRouter();
    const toast = useToast();
    const [contracts, setContracts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const load = useCallback(async () => {
        try {
            const qs = new URLSearchParams({ limit: '100' });
            if (search) qs.set('search', search);
            if (statusFilter) qs.set('status', statusFilter);
            const res = await apiFetch(`/api/contracts?${qs}`);
            setContracts(res?.data || []);
        } catch (e: any) {
            toast.show(e.message || 'Lỗi tải HĐ', 'error');
        } finally { setLoading(false); setRefreshing(false); }
    }, [search, statusFilter]);

    useEffect(() => { load(); }, [load]);

    const totalValue = contracts.reduce((s, c) => s + (c.contractValue || 0), 0);
    const totalPaid = contracts.reduce((s, c) => s + (c.paidAmount || 0), 0);

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={c.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={s.headerTitle}>Hợp đồng</Text>
                    <Text style={s.headerSub}>{contracts.length} HĐ · {fmt(totalValue)}</Text>
                </View>
            </View>

            {/* Summary bar */}
            <View style={s.summaryCard}>
                <SummaryItem label="Giá trị" value={fmt(totalValue)} color={c.text} />
                <SummaryItem label="Đã thu" value={fmt(totalPaid)} color={c.success} />
                <SummaryItem label="Còn thu" value={fmt(totalValue - totalPaid)} color={c.danger} />
            </View>

            {/* Search */}
            <View style={s.searchBar}>
                <Ionicons name="search" size={18} color={c.textMuted} />
                <TextInput
                    style={s.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Tìm mã / tên / khách..."
                    placeholderTextColor={c.textMuted}
                />
            </View>

            {/* Status chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }} style={s.chipScroll}>
                <Chip label="Tất cả" active={!statusFilter} onPress={() => setStatusFilter('')} />
                {['Đã ký', 'Đang thực hiện', 'Hoàn thành', 'Nháp'].map(st => (
                    <Chip key={st} label={st} active={statusFilter === st} onPress={() => setStatusFilter(st === statusFilter ? '' : st)} />
                ))}
            </ScrollView>

            {loading ? (
                <ActivityIndicator size="large" color={c.primary} style={{ marginTop: 40 }} />
            ) : (
                <ScrollView
                    contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}
                >
                    {contracts.length === 0 ? (
                        <View style={s.empty}>
                            <Ionicons name="document-text-outline" size={48} color={c.textMuted} />
                            <Text style={{ color: c.textMuted, marginTop: 8 }}>Không có hợp đồng</Text>
                        </View>
                    ) : (
                        contracts.map(cr => {
                            const st = STATUS_COLORS[cr.status] || { bg: '#f1f5f9', color: '#64748b' };
                            const remaining = (cr.contractValue || 0) - (cr.paidAmount || 0);
                            const progress = cr.contractValue > 0 ? Math.round((cr.paidAmount / cr.contractValue) * 100) : 0;
                            return (
                                <Pressable key={cr.id} style={s.card}>
                                    <View style={s.cardTop}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.code}>{cr.code}</Text>
                                            <Text style={s.name} numberOfLines={2}>{cr.name || '(không tên)'}</Text>
                                            <Text style={s.customer}>👤 {cr.customer?.name || '—'}</Text>
                                            {cr.project?.name && <Text style={s.project}>📁 {cr.project.name}</Text>}
                                        </View>
                                        <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                                            <Text style={[s.statusText, { color: st.color }]}>{cr.status}</Text>
                                        </View>
                                    </View>

                                    {/* Progress bar */}
                                    {cr.contractValue > 0 && (
                                        <View style={s.progressWrap}>
                                            <View style={s.progressBg}>
                                                <View style={[s.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
                                            </View>
                                            <Text style={s.progressText}>{progress}% thu</Text>
                                        </View>
                                    )}

                                    <View style={s.cardBottom}>
                                        <View>
                                            <Text style={s.valueLabel}>Giá trị</Text>
                                            <Text style={s.value}>{fmt(cr.contractValue)}</Text>
                                        </View>
                                        <View>
                                            <Text style={s.valueLabel}>Đã thu</Text>
                                            <Text style={[s.value, { color: c.success }]}>{fmt(cr.paidAmount)}</Text>
                                        </View>
                                        <View>
                                            <Text style={s.valueLabel}>Còn lại</Text>
                                            <Text style={[s.value, { color: remaining > 0 ? c.danger : c.success }]}>{fmt(remaining)}</Text>
                                        </View>
                                    </View>

                                    {cr.signDate && (
                                        <Text style={s.signDate}>📅 Ngày ký: {fmtDate(cr.signDate)}</Text>
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
        <TouchableOpacity onPress={onPress} style={[s.chip, active && s.chipActive]}>
            <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
        </TouchableOpacity>
    );
}

function SummaryItem({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={s.summaryLabel}>{label}</Text>
            <Text style={[s.summaryValue, color ? { color } : {}]} numberOfLines={1}>{value}</Text>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: fontWeight.title, color: c.text },
    headerSub: { fontSize: 13, color: c.textMuted, marginTop: 2 },

    summaryCard: { flexDirection: 'row', backgroundColor: c.card, marginHorizontal: 16, padding: 14, borderRadius: radius.card, ...cardShadow },
    summaryLabel: { fontSize: 11, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryValue: { fontSize: 13, fontWeight: fontWeight.title, marginTop: 4 },

    searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 10, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: c.card, borderRadius: radius.button, borderWidth: 1, borderColor: c.borderP10 },
    searchInput: { flex: 1, fontSize: 14, color: c.text },

    chipScroll: { paddingBottom: 12, flexGrow: 0 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: c.card, borderWidth: 1, borderColor: c.borderP10 },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { fontSize: 12, color: c.text, fontWeight: fontWeight.label },
    chipTextActive: { color: '#fff', fontWeight: fontWeight.title },

    card: { backgroundColor: c.card, borderRadius: radius.card, padding: 14, marginBottom: 12, ...cardShadow },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    code: { fontSize: 12, color: c.primary, fontFamily: 'monospace', fontWeight: fontWeight.title, letterSpacing: 0.5 },
    name: { fontSize: 15, fontWeight: fontWeight.title, color: c.text, marginTop: 4 },
    customer: { fontSize: 13, color: c.textSecondary, marginTop: 4 },
    project: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
    statusText: { fontSize: 11, fontWeight: fontWeight.title, textTransform: 'uppercase', letterSpacing: 0.5 },

    progressWrap: { marginTop: 12, gap: 4 },
    progressBg: { height: 6, borderRadius: 3, backgroundColor: c.bg, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: c.success, borderRadius: 3 },
    progressText: { fontSize: 11, color: c.textMuted, textAlign: 'right' },

    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.borderP5 },
    valueLabel: { fontSize: 10, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
    value: { fontSize: 13, fontWeight: fontWeight.title, color: c.text, marginTop: 2 },

    signDate: { fontSize: 11, color: c.textMuted, marginTop: 10 },

    empty: { alignItems: 'center', padding: 40 },
});
