import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors, { cardShadow, radius, fontWeight } from '@/constants/Colors';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';

const c = Colors.light;
const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0)) + 'đ';
const fmtShort = (n: number) => {
    const v = Math.abs(n);
    if (v >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + ' tỷ';
    if (v >= 1_000_000) return Math.round(n / 1_000_000) + ' tr';
    if (v >= 1_000) return Math.round(n / 1_000) + 'k';
    return String(Math.round(n));
};
const pct = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(1) + '%';

export default function PnLScreen() {
    const router = useRouter();
    const toast = useToast();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await apiFetch('/api/reports/project-pnl');
            setData(res);
        } catch (e: any) { toast.show(e.message || 'Lỗi', 'error'); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const projects = data?.projects || [];
    const totals = projects.reduce(
        (acc: any, p: any) => ({
            revenue: acc.revenue + (p.revenue || 0),
            cost: acc.cost + (p.totalCost || 0),
            profit: acc.profit + (p.profit || 0),
        }),
        { revenue: 0, cost: 0, profit: 0 },
    );
    const marginPct = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={c.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={s.headerTitle}>Báo cáo lãi lỗ</Text>
                    <Text style={s.headerSub}>{projects.length} dự án</Text>
                </View>
            </View>

            {/* Hero summary card */}
            <View style={s.heroCard}>
                <Text style={s.heroLabel}>LỢI NHUẬN TỔNG</Text>
                <Text style={[s.heroValue, { color: totals.profit >= 0 ? '#fff' : '#fecaca' }]}>
                    {fmt(totals.profit)}
                </Text>
                <View style={s.marginRow}>
                    <Ionicons name={totals.profit >= 0 ? 'trending-up' : 'trending-down'} size={14} color={totals.profit >= 0 ? '#86efac' : '#fecaca'} />
                    <Text style={[s.marginText, { color: totals.profit >= 0 ? '#86efac' : '#fecaca' }]}>
                        {pct(marginPct)} margin
                    </Text>
                </View>

                <View style={s.heroGrid}>
                    <View style={s.heroCell}>
                        <Text style={s.heroCellLabel}>Doanh thu</Text>
                        <Text style={s.heroCellValue}>{fmtShort(totals.revenue)}</Text>
                    </View>
                    <View style={s.heroCell}>
                        <Text style={s.heroCellLabel}>Chi phí</Text>
                        <Text style={s.heroCellValue}>{fmtShort(totals.cost)}</Text>
                    </View>
                </View>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={c.primary} style={{ marginTop: 40 }} />
            ) : (
                <ScrollView
                    contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}
                >
                    <Text style={s.sectionTitle}>CHI TIẾT DỰ ÁN</Text>
                    {projects.length === 0 ? (
                        <View style={s.empty}>
                            <Ionicons name="stats-chart-outline" size={48} color={c.textMuted} />
                            <Text style={{ color: c.textMuted, marginTop: 8 }}>Chưa có dữ liệu</Text>
                        </View>
                    ) : (
                        projects
                            .sort((a: any, b: any) => (b.profit || 0) - (a.profit || 0))
                            .map((p: any) => {
                                const profit = p.profit || 0;
                                const margin = p.revenue > 0 ? (profit / p.revenue) * 100 : 0;
                                const isProfit = profit >= 0;
                                return (
                                    <View key={p.id} style={s.card}>
                                        <View style={s.cardTop}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={s.code}>{p.code}</Text>
                                                <Text style={s.name} numberOfLines={2}>{p.name}</Text>
                                                <Text style={s.cust}>👤 {p.customer?.name || '—'}</Text>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={[s.profit, { color: isProfit ? c.success : c.danger }]}>
                                                    {fmtShort(profit)}
                                                </Text>
                                                <View style={[s.marginBadge, { backgroundColor: (isProfit ? c.success : c.danger) + '15' }]}>
                                                    <Ionicons name={isProfit ? 'arrow-up' : 'arrow-down'} size={10} color={isProfit ? c.success : c.danger} />
                                                    <Text style={[s.marginBadgeText, { color: isProfit ? c.success : c.danger }]}>
                                                        {pct(margin)}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>

                                        <View style={s.bottomRow}>
                                            <Item label="Doanh thu" value={fmtShort(p.revenue || 0)} />
                                            <Item label="Chi phí" value={fmtShort(p.totalCost || 0)} />
                                            <Item label="Đã thu" value={fmtShort(p.paidAmount || 0)} color={c.success} />
                                        </View>
                                    </View>
                                );
                            })
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

function Item({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <View style={{ flex: 1 }}>
            <Text style={s.itemLabel}>{label}</Text>
            <Text style={[s.itemValue, color ? { color } : {}]}>{value}</Text>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: fontWeight.title, color: c.text },
    headerSub: { fontSize: 13, color: c.textMuted, marginTop: 2 },

    heroCard: {
        marginHorizontal: 16, marginBottom: 8, padding: 20,
        backgroundColor: c.primary, borderRadius: radius.card,
        ...cardShadow,
    },
    heroLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: 1, fontWeight: fontWeight.title },
    heroValue: { fontSize: 30, fontWeight: fontWeight.title, marginTop: 6 },
    marginRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    marginText: { fontSize: 13, fontWeight: fontWeight.title },
    heroGrid: { flexDirection: 'row', gap: 12, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' },
    heroCell: { flex: 1 },
    heroCellLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.5 },
    heroCellValue: { fontSize: 16, fontWeight: fontWeight.title, color: '#fff', marginTop: 4 },

    sectionTitle: { fontSize: 11, fontWeight: fontWeight.title, color: c.textMuted, letterSpacing: 1, marginBottom: 10, marginLeft: 4 },

    card: { backgroundColor: c.card, borderRadius: radius.card, padding: 14, marginBottom: 10, ...cardShadow },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    code: { fontSize: 11, color: c.primary, fontFamily: 'monospace', fontWeight: fontWeight.title },
    name: { fontSize: 14, fontWeight: fontWeight.title, color: c.text, marginTop: 2 },
    cust: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    profit: { fontSize: 18, fontWeight: fontWeight.title },
    marginBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.pill, marginTop: 4 },
    marginBadgeText: { fontSize: 11, fontWeight: fontWeight.title },

    bottomRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.borderP5 },
    itemLabel: { fontSize: 10, color: c.textMuted, textTransform: 'uppercase' },
    itemValue: { fontSize: 13, fontWeight: fontWeight.title, color: c.text, marginTop: 2 },

    empty: { alignItems: 'center', padding: 40 },
});
