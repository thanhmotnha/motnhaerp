import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors, { cardShadow, radius, fontWeight } from '@/constants/Colors';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';

const c = Colors.light;
type Mode = 'in' | 'out';

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n || 0) + 'đ';
const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN');

export default function InventoryScreen() {
    const router = useRouter();
    const toast = useToast();
    const [mode, setMode] = useState<Mode>('in');
    const [pendingPOs, setPendingPOs] = useState<any[]>([]);
    const [receipts, setReceipts] = useState<any[]>([]);
    const [issues, setIssues] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const [pos, rc, iss] = await Promise.all([
                apiFetch('/api/purchase-orders?limit=100'),
                apiFetch('/api/inventory/receipts?limit=30'),
                apiFetch('/api/inventory/issues?limit=30'),
            ]);
            setPendingPOs((pos?.data || []).filter((p: any) => p.status === 'Đã duyệt' || p.status === 'Nhận một phần'));
            setReceipts(rc?.data || []);
            setIssues(iss?.data || []);
        } catch (e: any) {
            toast.show(e.message || 'Lỗi tải kho', 'error');
        } finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={c.text} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Kho</Text>
            </View>

            {/* Mode tabs */}
            <View style={s.modeTabs}>
                <TouchableOpacity style={[s.modeTab, mode === 'in' && s.modeTabActive]} onPress={() => setMode('in')}>
                    <Ionicons name="arrow-down-circle" size={18} color={mode === 'in' ? '#fff' : c.text} />
                    <Text style={[s.modeTabText, mode === 'in' && s.modeTabTextActive]}>Nhập kho</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.modeTab, mode === 'out' && s.modeTabActive]} onPress={() => setMode('out')}>
                    <Ionicons name="arrow-up-circle" size={18} color={mode === 'out' ? '#fff' : c.text} />
                    <Text style={[s.modeTabText, mode === 'out' && s.modeTabTextActive]}>Xuất kho</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={c.primary} style={{ marginTop: 40 }} />
            ) : (
                <ScrollView
                    contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}
                >
                    {mode === 'in' && (
                        <>
                            <Text style={s.sectionTitle}>📦 PO CHỜ NHẬP ({pendingPOs.length})</Text>
                            {pendingPOs.length === 0 ? (
                                <Empty icon="cube-outline" text="Không có PO chờ nhập" />
                            ) : (
                                pendingPOs.map(po => (
                                    <Pressable key={po.id} style={s.card} onPress={() => router.push(`/inventory/receive/${po.id}` as any)}>
                                        <View style={s.cardTop}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={s.code}>{po.code}</Text>
                                                <Text style={s.cardName}>🏭 {po.supplier || '—'}</Text>
                                                {po.project?.name && <Text style={s.cardSub}>📁 {po.project.name}</Text>}
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <View style={[s.statusBadge, { backgroundColor: po.status === 'Nhận một phần' ? c.warning + '22' : c.success + '22' }]}>
                                                    <Text style={[s.statusBadgeText, { color: po.status === 'Nhận một phần' ? c.warning : c.success }]}>{po.status}</Text>
                                                </View>
                                                <Text style={s.amount}>{fmt(po.totalAmount)}</Text>
                                            </View>
                                        </View>
                                    </Pressable>
                                ))
                            )}

                            <Text style={[s.sectionTitle, { marginTop: 24 }]}>📋 PHIẾU NHẬP GẦN ĐÂY</Text>
                            {receipts.length === 0 ? (
                                <Empty icon="document-outline" text="Chưa có phiếu nhập" />
                            ) : (
                                receipts.slice(0, 20).map(r => (
                                    <View key={r.id} style={s.card}>
                                        <View style={s.cardTop}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={s.code}>{r.code}</Text>
                                                <Text style={s.cardName}>🏭 {r.purchaseOrder?.supplier} · PO {r.purchaseOrder?.code}</Text>
                                                <Text style={s.cardSub}>🏬 {r.warehouse?.name}</Text>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={s.cardDate}>{fmtDate(r.receivedDate)}</Text>
                                                <Text style={s.cardCount}>{r.items?.length || 0} mặt hàng</Text>
                                            </View>
                                        </View>
                                    </View>
                                ))
                            )}
                        </>
                    )}

                    {mode === 'out' && (
                        <>
                            <Text style={s.sectionTitle}>📤 PHIẾU XUẤT GẦN ĐÂY</Text>
                            {issues.length === 0 ? (
                                <Empty icon="document-outline" text="Chưa có phiếu xuất" />
                            ) : (
                                issues.map(i => (
                                    <View key={i.id} style={s.card}>
                                        <View style={s.cardTop}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={s.code}>{i.code}</Text>
                                                <Text style={s.cardName}>{i.project?.name ? `📁 ${i.project.name}` : '🏬 Nội bộ'}</Text>
                                                <Text style={s.cardSub}>🏬 {i.warehouse?.name}</Text>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={s.cardDate}>{fmtDate(i.issuedDate)}</Text>
                                                <Text style={s.cardCount}>{i.items?.length || 0} vật tư</Text>
                                            </View>
                                        </View>
                                    </View>
                                ))
                            )}
                        </>
                    )}
                </ScrollView>
            )}

            {mode === 'out' && (
                <TouchableOpacity style={s.fab} onPress={() => router.push('/inventory/issue' as any)}>
                    <Ionicons name="add" size={28} color="#fff" />
                </TouchableOpacity>
            )}
        </SafeAreaView>
    );
}

function Empty({ icon, text }: { icon: any; text: string }) {
    return (
        <View style={s.empty}>
            <Ionicons name={icon} size={42} color={c.textMuted} />
            <Text style={s.emptyText}>{text}</Text>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: fontWeight.title, color: c.text, flex: 1 },

    modeTabs: { flexDirection: 'row', gap: 6, marginHorizontal: 16, marginBottom: 12 },
    modeTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: radius.button, backgroundColor: c.card, borderWidth: 1, borderColor: c.borderP10 },
    modeTabActive: { backgroundColor: c.primary, borderColor: c.primary },
    modeTabText: { fontSize: 14, fontWeight: fontWeight.title, color: c.text },
    modeTabTextActive: { color: '#fff' },

    sectionTitle: { fontSize: 11, fontWeight: fontWeight.title, color: c.textMuted, letterSpacing: 1, marginBottom: 10, marginLeft: 4 },

    card: { backgroundColor: c.card, borderRadius: radius.card, padding: 14, marginBottom: 10, ...cardShadow },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    code: { fontSize: 13, fontWeight: fontWeight.title, color: c.primary, fontFamily: 'monospace' },
    cardName: { fontSize: 14, color: c.text, marginTop: 4 },
    cardSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    cardDate: { fontSize: 12, color: c.textMuted },
    cardCount: { fontSize: 11, color: c.textMuted, marginTop: 2 },
    amount: { fontSize: 13, fontWeight: fontWeight.title, color: c.text, marginTop: 4 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
    statusBadgeText: { fontSize: 11, fontWeight: fontWeight.title },

    empty: { alignItems: 'center', padding: 32 },
    emptyText: { color: c.textMuted, marginTop: 8 },

    fab: {
        position: 'absolute', right: 20, bottom: 24,
        width: 56, height: 56, borderRadius: 28, backgroundColor: c.primary,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#1a2f6e', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8,
    },
});
