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
const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n || 0) + 'đ';

type Tab = 'ncc' | 'tho';

export default function DebtsScreen() {
    const router = useRouter();
    const toast = useToast();
    const [tab, setTab] = useState<Tab>('ncc');
    const [nccDebts, setNccDebts] = useState<any[]>([]);
    const [thoDebts, setThoDebts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const [ncc, tho] = await Promise.all([
                apiFetch('/api/debts/supplier'),
                apiFetch('/api/debts/contractor'),
            ]);
            setNccDebts(ncc || []);
            setThoDebts(tho || []);
        } catch (e: any) { toast.show(e.message || 'Lỗi', 'error'); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const current = tab === 'ncc' ? nccDebts : thoDebts;
    const totalOwed = current.reduce((s, d) => s + (d.remaining || 0), 0);
    const totalAmount = current.reduce((s, d) => s + (d.totalAmount || 0), 0);
    const totalPaid = current.reduce((s, d) => s + (d.paidAmount || 0), 0);

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={c.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={s.headerTitle}>Công nợ</Text>
                    <Text style={s.headerSub}>{current.length} bản ghi</Text>
                </View>
            </View>

            {/* Tab picker */}
            <View style={s.tabs}>
                <TouchableOpacity style={[s.tabBtn, tab === 'ncc' && s.tabBtnActive]} onPress={() => setTab('ncc')}>
                    <Ionicons name="business" size={16} color={tab === 'ncc' ? '#fff' : c.text} />
                    <Text style={[s.tabText, tab === 'ncc' && s.tabTextActive]}>NCC ({nccDebts.length})</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.tabBtn, tab === 'tho' && s.tabBtnActive]} onPress={() => setTab('tho')}>
                    <Ionicons name="hammer" size={16} color={tab === 'tho' ? '#fff' : c.text} />
                    <Text style={[s.tabText, tab === 'tho' && s.tabTextActive]}>Thợ ({thoDebts.length})</Text>
                </TouchableOpacity>
            </View>

            {/* Summary */}
            <View style={s.summary}>
                <SumCard icon="wallet-outline" label="Tổng nợ" value={fmt(totalAmount)} color={c.text} />
                <SumCard icon="checkmark-circle" label="Đã trả" value={fmt(totalPaid)} color={c.success} />
                <SumCard icon="alert-circle" label="Còn nợ" value={fmt(totalOwed)} color={c.danger} />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={c.primary} style={{ marginTop: 40 }} />
            ) : (
                <ScrollView
                    contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}
                >
                    {current.length === 0 ? (
                        <View style={s.empty}>
                            <Ionicons name="checkmark-done-circle-outline" size={48} color={c.success} />
                            <Text style={{ color: c.textMuted, marginTop: 8 }}>Không có công nợ 🎉</Text>
                        </View>
                    ) : (
                        current.map((d: any) => {
                            const remaining = d.remaining ?? (d.totalAmount - d.paidAmount);
                            const paidPct = d.totalAmount > 0 ? Math.round((d.paidAmount / d.totalAmount) * 100) : 0;
                            const partner = tab === 'ncc' ? d.supplier : d.contractor;
                            return (
                                <View key={d.id} style={s.card}>
                                    <View style={s.cardTop}>
                                        <View style={[s.partnerIcon, { backgroundColor: c.primary + '15' }]}>
                                            <Ionicons name={tab === 'ncc' ? 'business' : 'hammer'} size={18} color={c.primary} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.partnerName}>{partner?.name || '—'}</Text>
                                            <Text style={s.partnerCode}>{d.code} · {partner?.code}</Text>
                                            {d.project?.name && <Text style={s.project}>📁 {d.project.name}</Text>}
                                        </View>
                                        {remaining > 0 ? (
                                            <View style={[s.statusBadge, { backgroundColor: c.danger + '22' }]}>
                                                <Text style={[s.statusText, { color: c.danger }]}>Còn nợ</Text>
                                            </View>
                                        ) : (
                                            <View style={[s.statusBadge, { backgroundColor: c.success + '22' }]}>
                                                <Text style={[s.statusText, { color: c.success }]}>Đã trả</Text>
                                            </View>
                                        )}
                                    </View>

                                    <View style={s.progressWrap}>
                                        <View style={s.progressBg}>
                                            <View style={[s.progressFill, { width: `${Math.min(paidPct, 100)}%` }]} />
                                        </View>
                                        <Text style={s.progressText}>{paidPct}% đã trả</Text>
                                    </View>

                                    <View style={s.amounts}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.aLabel}>Tổng</Text>
                                            <Text style={s.aValue}>{fmt(d.totalAmount)}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.aLabel}>Đã trả</Text>
                                            <Text style={[s.aValue, { color: c.success }]}>{fmt(d.paidAmount)}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.aLabel}>Còn</Text>
                                            <Text style={[s.aValue, { color: remaining > 0 ? c.danger : c.success }]}>{fmt(remaining)}</Text>
                                        </View>
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

function SumCard({ icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
    return (
        <View style={s.sumCard}>
            <View style={[s.sumIcon, { backgroundColor: color + '15' }]}>
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

    tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginBottom: 10 },
    tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: radius.button, backgroundColor: c.card, borderWidth: 1, borderColor: c.borderP10 },
    tabBtnActive: { backgroundColor: c.primary, borderColor: c.primary },
    tabText: { fontSize: 13, fontWeight: fontWeight.title, color: c.text },
    tabTextActive: { color: '#fff' },

    summary: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
    sumCard: { flex: 1, backgroundColor: c.card, padding: 10, borderRadius: radius.card, alignItems: 'center', ...cardShadow },
    sumIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    sumLabel: { fontSize: 10, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
    sumValue: { fontSize: 12, fontWeight: fontWeight.title, marginTop: 2 },

    card: { backgroundColor: c.card, borderRadius: radius.card, padding: 14, marginBottom: 10, ...cardShadow },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    partnerIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    partnerName: { fontSize: 15, fontWeight: fontWeight.title, color: c.text },
    partnerCode: { fontSize: 12, color: c.textMuted, fontFamily: 'monospace', marginTop: 2 },
    project: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
    statusText: { fontSize: 11, fontWeight: fontWeight.title, textTransform: 'uppercase', letterSpacing: 0.5 },

    progressWrap: { marginTop: 12, gap: 4 },
    progressBg: { height: 6, borderRadius: 3, backgroundColor: c.bg, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: c.success, borderRadius: 3 },
    progressText: { fontSize: 11, color: c.textMuted, textAlign: 'right' },

    amounts: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.borderP5 },
    aLabel: { fontSize: 10, color: c.textMuted, textTransform: 'uppercase' },
    aValue: { fontSize: 13, fontWeight: fontWeight.title, color: c.text, marginTop: 2 },

    empty: { alignItems: 'center', padding: 40 },
});
