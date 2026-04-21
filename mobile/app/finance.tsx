import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
    ActivityIndicator, RefreshControl, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors, { cardShadow, radius, fontWeight } from '@/constants/Colors';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';

const c = Colors.light;
const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n || 0) + 'đ';
const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN');

export default function FinanceScreen() {
    const router = useRouter();
    const toast = useToast();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selected, setSelected] = useState<any>(null);
    const [amount, setAmount] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await apiFetch('/api/finance/receivables');
            setData(res);
        } catch (e: any) { toast.show(e.message || 'Lỗi', 'error'); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    async function collect() {
        if (!selected) return;
        const n = parseFloat(amount);
        if (isNaN(n) || n <= 0) { Alert.alert('Lỗi', 'Số tiền không hợp lệ'); return; }
        const newPaid = (selected.paidAmount || 0) + n;
        if (newPaid > selected.amount + 1) { Alert.alert('Lỗi', `Vượt ${fmt(selected.amount)}`); return; }
        setSubmitting(true);
        try {
            await apiFetch(`/api/contracts/${selected.contract.id}/payments`, {
                method: 'PATCH',
                body: JSON.stringify({
                    paymentId: selected.id,
                    paidAmount: newPaid,
                    paidDate: new Date().toISOString(),
                    status: newPaid >= selected.amount - 0.01 ? 'Đã thu' : 'Thu một phần',
                }),
            });
            toast.show(`Đã thu ${fmt(n)}`, 'success');
            setSelected(null);
            setAmount('');
            load();
        } catch (e: any) { toast.show(e.message || 'Lỗi', 'error'); }
        finally { setSubmitting(false); }
    }

    const pending = (data?.payments || []).filter((p: any) => p.paidAmount < p.amount);
    const summary = data?.summary;

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={c.text} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Thu tiền</Text>
            </View>

            {summary && (
                <View style={s.summaryCard}>
                    <SummaryItem label="Phải thu" value={fmt(summary.totalReceivable)} />
                    <SummaryItem label="Đã thu" value={fmt(summary.totalReceived)} color={c.success} />
                    <SummaryItem label="Còn lại" value={fmt(summary.outstanding)} color={summary.outstanding > 0 ? c.danger : c.success} />
                </View>
            )}

            {loading ? (
                <ActivityIndicator size="large" color={c.primary} style={{ marginTop: 40 }} />
            ) : (
                <ScrollView
                    contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}
                >
                    <Text style={s.sectionTitle}>💰 ĐỢT THU CHỜ ({pending.length})</Text>
                    {pending.length === 0 ? (
                        <View style={s.empty}>
                            <Ionicons name="checkmark-done-circle-outline" size={48} color={c.success} />
                            <Text style={{ color: c.textMuted, marginTop: 8 }}>Không còn đợt nào chờ thu 🎉</Text>
                        </View>
                    ) : (
                        pending.map((p: any) => {
                            const remaining = p.amount - (p.paidAmount || 0);
                            const overdue = p.dueDate && new Date(p.dueDate) < new Date();
                            return (
                                <TouchableOpacity
                                    key={p.id}
                                    style={s.card}
                                    onPress={() => { setSelected(p); setAmount(String(remaining)); }}
                                >
                                    <View style={s.cardTop}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.customer}>{p.contract?.customer?.name || p.contract?.name}</Text>
                                            <Text style={s.phase}>{p.phase} · {p.contract?.code}</Text>
                                            {p.contract?.project?.name && <Text style={s.project}>📁 {p.contract.project.name}</Text>}
                                            {p.dueDate && (
                                                <Text style={[s.due, overdue && { color: c.danger, fontWeight: fontWeight.title }]}>
                                                    {overdue ? '⚠ Quá hạn ' : '📅 Hạn '}{fmtDate(p.dueDate)}
                                                </Text>
                                            )}
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={s.amountTotal}>{fmt(p.amount)}</Text>
                                            {p.paidAmount > 0 && <Text style={s.paid}>Đã thu: {fmt(p.paidAmount)}</Text>}
                                            <View style={s.remainingBadge}>
                                                <Text style={s.remainingText}>Còn {fmt(remaining)}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </ScrollView>
            )}

            {/* Collect modal */}
            <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
                <View style={s.modalOverlay}>
                    <View style={s.modalSheet}>
                        <View style={s.modalHeader}>
                            <Text style={s.modalTitle}>Thu tiền</Text>
                            <TouchableOpacity onPress={() => setSelected(null)}>
                                <Ionicons name="close" size={24} color={c.text} />
                            </TouchableOpacity>
                        </View>
                        {selected && (
                            <>
                                <Text style={s.modalCustomer}>{selected.contract?.customer?.name}</Text>
                                <Text style={s.modalPhase}>{selected.phase} · {selected.contract?.code}</Text>
                                <View style={s.priceBox}>
                                    <Text style={s.priceLabel}>Còn phải thu</Text>
                                    <Text style={s.priceValue}>{fmt(selected.amount - (selected.paidAmount || 0))}</Text>
                                </View>
                                <Text style={s.inputLabel}>Số tiền thu</Text>
                                <TextInput
                                    style={s.amountInput}
                                    value={amount}
                                    onChangeText={setAmount}
                                    keyboardType="numeric"
                                    placeholder="0"
                                />
                                <TouchableOpacity
                                    style={[s.submitBtn, submitting && { opacity: 0.6 }]}
                                    onPress={collect}
                                    disabled={submitting}
                                >
                                    {submitting ? <ActivityIndicator color="#fff" /> : (
                                        <>
                                            <Ionicons name="checkmark" size={20} color="#fff" />
                                            <Text style={s.submitBtnText}>Xác nhận thu</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

function SummaryItem({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>{label}</Text>
            <Text style={[s.summaryValue, color ? { color } : {}]}>{value}</Text>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: fontWeight.title, color: c.text, flex: 1 },

    summaryCard: { flexDirection: 'row', backgroundColor: c.card, marginHorizontal: 16, padding: 14, borderRadius: radius.card, marginBottom: 8, ...cardShadow },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryLabel: { fontSize: 11, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryValue: { fontSize: 14, fontWeight: fontWeight.title, color: c.text, marginTop: 4 },

    sectionTitle: { fontSize: 11, fontWeight: fontWeight.title, color: c.textMuted, letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
    card: { backgroundColor: c.card, borderRadius: radius.card, padding: 14, marginBottom: 10, ...cardShadow },
    cardTop: { flexDirection: 'row', gap: 8 },
    customer: { fontSize: 15, fontWeight: fontWeight.title, color: c.text },
    phase: { fontSize: 13, color: c.textSecondary, marginTop: 3 },
    project: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    due: { fontSize: 12, color: c.textMuted, marginTop: 4 },
    amountTotal: { fontSize: 14, fontWeight: fontWeight.title, color: c.text },
    paid: { fontSize: 11, color: c.success, marginTop: 2 },
    remainingBadge: { backgroundColor: c.danger + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, marginTop: 6 },
    remainingText: { fontSize: 11, color: c.danger, fontWeight: fontWeight.title },

    empty: { alignItems: 'center', padding: 40 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: c.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    modalTitle: { fontSize: 18, fontWeight: fontWeight.title, color: c.text },
    modalCustomer: { fontSize: 16, color: c.text, fontWeight: fontWeight.secondary },
    modalPhase: { fontSize: 13, color: c.textMuted, marginTop: 2 },
    priceBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, marginVertical: 12, backgroundColor: c.bg, borderRadius: radius.button },
    priceLabel: { fontSize: 13, color: c.textMuted },
    priceValue: { fontSize: 20, fontWeight: fontWeight.title, color: c.danger },
    inputLabel: { fontSize: 13, color: c.textMuted, marginBottom: 6 },
    amountInput: { fontSize: 22, fontWeight: fontWeight.title, padding: 14, borderWidth: 2, borderColor: c.primary, borderRadius: radius.button, textAlign: 'right', color: c.text },
    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, backgroundColor: c.success, paddingVertical: 14, borderRadius: radius.button },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: fontWeight.title },
});
