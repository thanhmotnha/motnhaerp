import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors, { cardShadow, radius, fontWeight } from '@/constants/Colors';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/lib/auth';

const c = Colors.light;
const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n || 0) + 'đ';
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    draft: { label: 'Chờ duyệt', color: c.warning, bg: '#fef3c7', icon: 'time-outline' },
    approved: { label: 'Đã duyệt', color: c.success, bg: '#dcfce7', icon: 'checkmark-circle' },
    confirmed: { label: 'Đã vào batch', color: c.info, bg: '#dbeafe', icon: 'lock-closed' },
};

export default function OverheadScreen() {
    const router = useRouter();
    const toast = useToast();
    const { user } = useAuth();
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'draft' | 'approved'>('all');

    const canManage = user?.role === 'giam_doc' || user?.role === 'ke_toan';

    const load = useCallback(async () => {
        try {
            const month = new Date().toISOString().slice(0, 7);
            const res = await apiFetch(`/api/overhead/expenses?month=${month}&limit=200`);
            setExpenses(res?.data || []);
        } catch (e: any) { toast.show(e.message || 'Lỗi', 'error'); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = filter === 'all' ? expenses : expenses.filter(e => e.status === filter);
    const totals = {
        all: expenses.reduce((s, e) => s + e.amount, 0),
        approved: expenses.filter(e => e.status === 'approved').reduce((s, e) => s + e.amount, 0),
        pending: expenses.filter(e => e.status === 'draft').length,
    };

    async function approve(id: string) {
        try {
            await apiFetch(`/api/overhead/expenses/${id}/approve`, { method: 'PATCH' });
            toast.show('Đã duyệt', 'success');
            load();
        } catch (e: any) { toast.show(e.message || 'Lỗi', 'error'); }
    }

    async function unapprove(id: string) {
        Alert.alert('Hoàn duyệt', 'Chuyển lại "Chờ duyệt"?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Hoàn duyệt', onPress: async () => {
                    try {
                        await apiFetch(`/api/overhead/expenses/${id}/unapprove`, { method: 'PATCH' });
                        toast.show('Đã hoàn duyệt', 'success');
                        load();
                    } catch (e: any) { toast.show(e.message || 'Lỗi', 'error'); }
                },
            },
        ]);
    }

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={c.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={s.headerTitle}>Chi phí chung</Text>
                    <Text style={s.headerSub}>Tháng {new Date().toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })}</Text>
                </View>
            </View>

            {/* Stats */}
            <View style={s.summary}>
                <SummaryCard icon="cash" label="Tổng" value={fmt(totals.all)} color={c.primary} />
                <SummaryCard icon="checkmark-circle" label="Đã duyệt" value={fmt(totals.approved)} color={c.success} />
                <SummaryCard icon="time" label="Chờ" value={String(totals.pending)} color={c.warning} />
            </View>

            {/* Filter */}
            <View style={s.chipRow}>
                <Chip label="Tất cả" active={filter === 'all'} onPress={() => setFilter('all')} />
                <Chip label={`Chờ (${totals.pending})`} active={filter === 'draft'} onPress={() => setFilter('draft')} />
                <Chip label="Đã duyệt" active={filter === 'approved'} onPress={() => setFilter('approved')} />
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
                            <Ionicons name="wallet-outline" size={48} color={c.textMuted} />
                            <Text style={{ color: c.textMuted, marginTop: 8 }}>Không có khoản chi phí</Text>
                        </View>
                    ) : (
                        filtered.map(e => {
                            const st = STATUS_CONFIG[e.status] || STATUS_CONFIG.draft;
                            return (
                                <View key={e.id} style={s.card}>
                                    <View style={s.cardTop}>
                                        <View style={{ flex: 1 }}>
                                            <View style={[s.statusBadge, { backgroundColor: st.bg, alignSelf: 'flex-start' }]}>
                                                <Ionicons name={st.icon} size={12} color={st.color} />
                                                <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
                                            </View>
                                            <Text style={s.code}>{e.code}</Text>
                                            <Text style={s.desc} numberOfLines={2}>{e.description}</Text>
                                            {e.category?.name && <Text style={s.cat}>📁 {e.category.name}</Text>}
                                            <Text style={s.date}>📅 {fmtDate(e.date)}</Text>
                                        </View>
                                        <Text style={s.amount}>{fmt(e.amount)}</Text>
                                    </View>
                                    {canManage && e.status === 'draft' && (
                                        <TouchableOpacity style={s.approveBtn} onPress={() => approve(e.id)}>
                                            <Ionicons name="checkmark" size={16} color="#fff" />
                                            <Text style={s.approveBtnText}>Duyệt</Text>
                                        </TouchableOpacity>
                                    )}
                                    {canManage && e.status === 'approved' && (
                                        <TouchableOpacity style={s.unapproveBtn} onPress={() => unapprove(e.id)}>
                                            <Ionicons name="arrow-undo" size={16} color={c.warning} />
                                            <Text style={[s.approveBtnText, { color: c.warning }]}>Hoàn duyệt</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
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

function SummaryCard({ icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
    return (
        <View style={s.sumCard}>
            <View style={[s.sumIcon, { backgroundColor: color + '20' }]}>
                <Ionicons name={icon} size={16} color={color} />
            </View>
            <Text style={s.sumLabel}>{label}</Text>
            <Text style={[s.sumValue, { color }]} numberOfLines={1}>{value}</Text>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: fontWeight.title, color: c.text },
    headerSub: { fontSize: 13, color: c.textMuted, marginTop: 2 },

    summary: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
    sumCard: { flex: 1, backgroundColor: c.card, padding: 10, borderRadius: radius.card, alignItems: 'center', ...cardShadow },
    sumIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    sumLabel: { fontSize: 10, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
    sumValue: { fontSize: 13, fontWeight: fontWeight.title, marginTop: 2 },

    chipRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginBottom: 12 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: c.card, borderWidth: 1, borderColor: c.borderP10 },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { fontSize: 12, color: c.text, fontWeight: fontWeight.label },
    chipTextActive: { color: '#fff', fontWeight: fontWeight.title },

    card: { backgroundColor: c.card, borderRadius: radius.card, padding: 14, marginBottom: 10, ...cardShadow },
    cardTop: { flexDirection: 'row', gap: 12 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, marginBottom: 8 },
    statusText: { fontSize: 11, fontWeight: fontWeight.title, textTransform: 'uppercase', letterSpacing: 0.5 },
    code: { fontSize: 11, color: c.primary, fontFamily: 'monospace', fontWeight: fontWeight.title },
    desc: { fontSize: 14, color: c.text, fontWeight: fontWeight.secondary, marginTop: 2 },
    cat: { fontSize: 12, color: c.textSecondary, marginTop: 4 },
    date: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    amount: { fontSize: 16, fontWeight: fontWeight.title, color: c.text, alignSelf: 'flex-start' },

    approveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, backgroundColor: c.success, paddingVertical: 10, borderRadius: radius.button },
    unapproveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, backgroundColor: c.warning + '15', paddingVertical: 10, borderRadius: radius.button, borderWidth: 1, borderColor: c.warning },
    approveBtnText: { color: '#fff', fontWeight: fontWeight.title, fontSize: 13 },

    empty: { alignItems: 'center', padding: 40 },
});
