import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
    ActivityIndicator, RefreshControl, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors, { cardShadow, radius, fontWeight } from '@/constants/Colors';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';

const c = Colors.light;
const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n || 0) + 'đ';
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

type Tab = 'debt' | 'paid';

type RecipientType = 'NCC' | 'Thầu phụ';
type DebtStatus = 'open' | 'partial' | 'paid';

type Allocation = { projectId: string; ratio: number };

type Debt = {
    id: string;
    code: string;
    description?: string;
    totalAmount: number;
    paidAmount: number;
    status: DebtStatus;
    date?: string;
    recipientType: RecipientType;
    recipientName: string;
    serviceCategory?: string;
    allocationPlan?: Allocation[] | null;
    supplierId?: string;
    contractorId?: string;
};

type ExpenseAllocation = {
    id?: string;
    projectId: string;
    amount: number;
    ratio?: number;
    project?: { id: string; name: string; code: string } | null;
};

type Expense = {
    id: string;
    code?: string;
    description?: string;
    category?: string;
    amount: number;
    date?: string;
    recipientType?: string;
    recipientName?: string;
    allocations?: ExpenseAllocation[];
};

type DebtGroup = {
    recipientName: string;
    recipientType: RecipientType;
    totalRemaining: number;
    items: Debt[];
};

export default function ExpensesServicesScreen() {
    const router = useRouter();
    const toast = useToast();

    const [tab, setTab] = useState<Tab>('debt');
    const [debts, setDebts] = useState<Debt[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Pay modal state
    const [payDebt, setPayDebt] = useState<Debt | null>(null);
    const [amountStr, setAmountStr] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await apiFetch('/api/service-debts');
            if (res) {
                setDebts(Array.isArray(res.debts) ? res.debts : []);
                setExpenses(Array.isArray(res.expenses) ? res.expenses : []);
            }
        } catch (e: any) {
            toast.show(e?.message || 'Lỗi tải dữ liệu', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [toast]);

    useEffect(() => { load(); }, [load]);

    const onRefresh = () => { setRefreshing(true); load(); };

    // Group debts by recipientName; only show debts with remaining > 0
    const groups: DebtGroup[] = useMemo(() => {
        const pending = debts.filter(d => (d.totalAmount - (d.paidAmount || 0)) > 0);
        const map = new Map<string, DebtGroup>();
        for (const d of pending) {
            const key = `${d.recipientType}::${d.recipientName || '—'}`;
            const remaining = d.totalAmount - (d.paidAmount || 0);
            const existing = map.get(key);
            if (existing) {
                existing.items.push(d);
                existing.totalRemaining += remaining;
            } else {
                map.set(key, {
                    recipientName: d.recipientName || '—',
                    recipientType: d.recipientType,
                    totalRemaining: remaining,
                    items: [d],
                });
            }
        }
        // Sort groups by totalRemaining DESC
        const arr = Array.from(map.values());
        arr.sort((a, b) => b.totalRemaining - a.totalRemaining);
        // Sort items inside each group by date DESC
        arr.forEach(g => g.items.sort((a, b) => {
            const da = a.date ? new Date(a.date).getTime() : 0;
            const db = b.date ? new Date(b.date).getTime() : 0;
            return db - da;
        }));
        return arr;
    }, [debts]);

    const sortedExpenses: Expense[] = useMemo(() => {
        const arr = [...expenses];
        arr.sort((a, b) => {
            const da = a.date ? new Date(a.date).getTime() : 0;
            const db = b.date ? new Date(b.date).getTime() : 0;
            return db - da;
        });
        return arr;
    }, [expenses]);

    // Summary
    const totalRemainingAll = useMemo(
        () => debts.reduce((s, d) => s + Math.max(0, d.totalAmount - (d.paidAmount || 0)), 0),
        [debts]
    );
    const totalPaidAll = useMemo(
        () => expenses.reduce((s, e) => s + (e.amount || 0), 0),
        [expenses]
    );

    const openPay = (d: Debt) => {
        const remaining = d.totalAmount - (d.paidAmount || 0);
        setPayDebt(d);
        setAmountStr(String(remaining));
        setNotes('');
    };

    const closePay = () => {
        if (submitting) return;
        setPayDebt(null);
        setAmountStr('');
        setNotes('');
    };

    const submitPay = async () => {
        if (!payDebt) return;
        const amount = Number(String(amountStr).replace(/[^\d.-]/g, ''));
        const remaining = payDebt.totalAmount - (payDebt.paidAmount || 0);
        if (!amount || amount <= 0) {
            toast.show('Nhập số tiền hợp lệ', 'warning');
            return;
        }
        if (amount > remaining) {
            toast.show(`Số tiền vượt quá còn nợ (${fmt(remaining)})`, 'warning');
            return;
        }
        const path = payDebt.recipientType === 'NCC'
            ? `/api/debts/supplier/${payDebt.id}/pay`
            : `/api/debts/contractor/${payDebt.id}/pay`;
        setSubmitting(true);
        try {
            await apiFetch(path, {
                method: 'POST',
                body: JSON.stringify({
                    amount,
                    date: new Date().toISOString(),
                    notes: notes || '',
                }),
            });
            toast.show('Đã trả thành công', 'success');
            setPayDebt(null);
            setAmountStr('');
            setNotes('');
            await load();
        } catch (e: any) {
            toast.show(e?.message || 'Lỗi thanh toán', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={c.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={s.headerTitle}>Chi phí dịch vụ</Text>
                    <Text style={s.headerSub}>
                        {tab === 'debt' ? `${groups.length} đối tác còn nợ` : `${sortedExpenses.length} khoản đã chi`}
                    </Text>
                </View>
            </View>

            {/* Tabs */}
            <View style={s.tabs}>
                <TouchableOpacity style={[s.tabBtn, tab === 'debt' && s.tabBtnActive]} onPress={() => setTab('debt')}>
                    <Ionicons name="alert-circle" size={16} color={tab === 'debt' ? '#fff' : c.text} />
                    <Text style={[s.tabText, tab === 'debt' && s.tabTextActive]}>Công nợ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.tabBtn, tab === 'paid' && s.tabBtnActive]} onPress={() => setTab('paid')}>
                    <Ionicons name="checkmark-done-circle" size={16} color={tab === 'paid' ? '#fff' : c.text} />
                    <Text style={[s.tabText, tab === 'paid' && s.tabTextActive]}>Đã chi</Text>
                </TouchableOpacity>
            </View>

            {/* Summary */}
            <View style={s.summary}>
                <SumCard icon="alert-circle" label="Còn nợ" value={fmt(totalRemainingAll)} color={c.danger} />
                <SumCard icon="checkmark-circle" label="Đã chi" value={fmt(totalPaidAll)} color={c.success} />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={c.primary} style={{ marginTop: 40 }} />
            ) : tab === 'debt' ? (
                <ScrollView
                    contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
                >
                    {groups.length === 0 ? (
                        <View style={s.empty}>
                            <Ionicons name="checkmark-done-circle-outline" size={48} color={c.success} />
                            <Text style={{ color: c.textMuted, marginTop: 8 }}>Không còn công nợ dịch vụ</Text>
                        </View>
                    ) : (
                        groups.map((g) => (
                            <View key={`${g.recipientType}-${g.recipientName}`} style={s.group}>
                                <View style={s.groupHeader}>
                                    <View style={[s.partnerIcon, { backgroundColor: c.primary + '15' }]}>
                                        <Ionicons
                                            name={g.recipientType === 'NCC' ? 'business' : 'hammer'}
                                            size={18}
                                            color={c.primary}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.groupName}>{g.recipientName}</Text>
                                        <Text style={s.groupMeta}>
                                            {g.recipientType} · {g.items.length} khoản
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={s.groupRemainingLabel}>Còn nợ</Text>
                                        <Text style={s.groupRemaining}>{fmt(g.totalRemaining)}</Text>
                                    </View>
                                </View>

                                {g.items.map(d => {
                                    const remaining = d.totalAmount - (d.paidAmount || 0);
                                    return (
                                        <View key={d.id} style={s.debtItem}>
                                            <View style={{ flex: 1 }}>
                                                <View style={s.debtTopRow}>
                                                    <Text style={s.debtCode}>{d.code}</Text>
                                                    <Text style={s.debtDate}>{fmtDate(d.date)}</Text>
                                                </View>
                                                {!!d.serviceCategory && (
                                                    <Text style={s.debtCategory} numberOfLines={1}>
                                                        📁 {d.serviceCategory}
                                                    </Text>
                                                )}
                                                {!!d.description && (
                                                    <Text style={s.debtDesc} numberOfLines={2}>
                                                        {d.description}
                                                    </Text>
                                                )}
                                                <View style={s.debtAmountRow}>
                                                    <Text style={s.debtAmountLabel}>Còn nợ</Text>
                                                    <Text style={s.debtAmount}>{fmt(remaining)}</Text>
                                                </View>
                                            </View>
                                            <TouchableOpacity
                                                style={s.payBtn}
                                                onPress={() => openPay(d)}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={s.payBtnText}>💸 Trả</Text>
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })}
                            </View>
                        ))
                    )}
                </ScrollView>
            ) : (
                <ScrollView
                    contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
                >
                    {sortedExpenses.length === 0 ? (
                        <View style={s.empty}>
                            <Ionicons name="wallet-outline" size={48} color={c.textMuted} />
                            <Text style={{ color: c.textMuted, marginTop: 8 }}>Chưa có khoản chi dịch vụ</Text>
                        </View>
                    ) : (
                        sortedExpenses.map(e => {
                            const projects = (e.allocations || []).slice(0, 2);
                            const more = Math.max(0, (e.allocations?.length || 0) - projects.length);
                            return (
                                <View key={e.id} style={s.expenseCard}>
                                    <View style={s.expenseTop}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.expenseDate}>{fmtDate(e.date)}</Text>
                                            {!!e.category && (
                                                <Text style={s.expenseCategory} numberOfLines={1}>
                                                    {e.category}
                                                </Text>
                                            )}
                                            {!!e.recipientName && (
                                                <Text style={s.expenseRecipient} numberOfLines={1}>
                                                    {e.recipientName}
                                                </Text>
                                            )}
                                        </View>
                                        <Text style={s.expenseAmount}>{fmt(e.amount)}</Text>
                                    </View>
                                    {projects.length > 0 && (
                                        <View style={s.expenseAllocRow}>
                                            {projects.map((a, idx) => (
                                                <View key={a.id || `${a.projectId}-${idx}`} style={s.allocChip}>
                                                    <Ionicons name="folder-outline" size={11} color={c.primary} />
                                                    <Text style={s.allocText} numberOfLines={1}>
                                                        {a.project?.name || a.projectId} · {fmt(a.amount)}
                                                    </Text>
                                                </View>
                                            ))}
                                            {more > 0 && (
                                                <View style={[s.allocChip, { backgroundColor: c.borderP10 }]}>
                                                    <Text style={[s.allocText, { color: c.textSecondary }]}>+{more}</Text>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </View>
                            );
                        })
                    )}
                </ScrollView>
            )}

            {/* Pay modal */}
            <Modal visible={!!payDebt} transparent animationType="slide" onRequestClose={closePay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
                >
                    <View style={s.modalOverlay}>
                        <View style={s.modalSheet}>
                            <View style={s.modalHeader}>
                                <Text style={s.modalTitle}>Trả công nợ</Text>
                                <TouchableOpacity onPress={closePay} disabled={submitting}>
                                    <Ionicons name="close" size={24} color={c.text} />
                                </TouchableOpacity>
                            </View>
                            {payDebt && (
                                <>
                                    <Text style={s.modalRecipient}>{payDebt.recipientName}</Text>
                                    <Text style={s.modalSub}>
                                        {payDebt.code}{payDebt.serviceCategory ? ` · ${payDebt.serviceCategory}` : ''}
                                    </Text>
                                    <View style={s.priceBox}>
                                        <Text style={s.priceLabel}>Còn phải trả</Text>
                                        <Text style={s.priceValue}>
                                            {fmt(payDebt.totalAmount - (payDebt.paidAmount || 0))}
                                        </Text>
                                    </View>
                                    <Text style={s.inputLabel}>Số tiền trả</Text>
                                    <TextInput
                                        style={s.amountInput}
                                        value={amountStr}
                                        onChangeText={setAmountStr}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        placeholderTextColor={c.textMuted}
                                    />
                                    <Text style={s.inputLabel}>Ghi chú (tuỳ chọn)</Text>
                                    <TextInput
                                        style={s.notesInput}
                                        value={notes}
                                        onChangeText={setNotes}
                                        placeholder="VD: Trả phần còn lại..."
                                        placeholderTextColor={c.textMuted}
                                        multiline
                                    />
                                    <TouchableOpacity
                                        style={[s.submitBtn, submitting && { opacity: 0.6 }]}
                                        onPress={submitPay}
                                        disabled={submitting}
                                    >
                                        {submitting ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <>
                                                <Ionicons name="checkmark" size={20} color="#fff" />
                                                <Text style={s.submitBtnText}>Xác nhận trả</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
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
    sumValue: { fontSize: 13, fontWeight: fontWeight.title, marginTop: 2 },

    // Debt group
    group: { backgroundColor: c.card, borderRadius: radius.card, padding: 12, marginBottom: 12, ...cardShadow },
    groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: c.borderP5 },
    partnerIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    groupName: { fontSize: 15, fontWeight: fontWeight.title, color: c.text },
    groupMeta: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    groupRemainingLabel: { fontSize: 10, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' },
    groupRemaining: { fontSize: 14, fontWeight: fontWeight.title, color: c.danger, marginTop: 2, textAlign: 'right' },

    debtItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.borderP5 },
    debtTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    debtCode: { fontSize: 12, fontFamily: 'monospace', color: c.primary, fontWeight: fontWeight.title },
    debtDate: { fontSize: 11, color: c.textMuted },
    debtCategory: { fontSize: 12, color: c.textSecondary, marginTop: 3 },
    debtDesc: { fontSize: 13, color: c.text, marginTop: 2 },
    debtAmountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
    debtAmountLabel: { fontSize: 11, color: c.textMuted, textTransform: 'uppercase' },
    debtAmount: { fontSize: 14, fontWeight: fontWeight.title, color: c.danger },

    payBtn: { backgroundColor: c.accent, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.button },
    payBtnText: { color: '#fff', fontWeight: fontWeight.title, fontSize: 13 },

    // Expense card
    expenseCard: { backgroundColor: c.card, borderRadius: radius.card, padding: 14, marginBottom: 10, ...cardShadow },
    expenseTop: { flexDirection: 'row', gap: 12 },
    expenseDate: { fontSize: 12, color: c.textMuted },
    expenseCategory: { fontSize: 14, color: c.text, fontWeight: fontWeight.secondary, marginTop: 2 },
    expenseRecipient: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    expenseAmount: { fontSize: 16, fontWeight: fontWeight.title, color: c.success, alignSelf: 'flex-start' },
    expenseAllocRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    allocChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.primary + '10', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, maxWidth: '100%' },
    allocText: { fontSize: 11, color: c.primary, fontWeight: fontWeight.label, flexShrink: 1 },

    empty: { alignItems: 'center', padding: 40 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: c.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    modalTitle: { fontSize: 18, fontWeight: fontWeight.title, color: c.text },
    modalRecipient: { fontSize: 16, fontWeight: fontWeight.title, color: c.text, marginTop: 4 },
    modalSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    priceBox: { backgroundColor: c.bg, borderRadius: radius.button, padding: 12, marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    priceLabel: { fontSize: 12, color: c.textSecondary },
    priceValue: { fontSize: 18, fontWeight: fontWeight.title, color: c.danger },
    inputLabel: { fontSize: 12, color: c.textSecondary, marginTop: 14, marginBottom: 6 },
    amountInput: { fontSize: 22, fontWeight: fontWeight.title, padding: 14, borderWidth: 2, borderColor: c.primary, borderRadius: radius.button, textAlign: 'right', color: c.text, backgroundColor: c.card },
    notesInput: { minHeight: 60, padding: 12, borderWidth: 1, borderColor: c.border, borderRadius: radius.button, color: c.text, backgroundColor: c.card, textAlignVertical: 'top' },
    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, backgroundColor: c.success, paddingVertical: 14, borderRadius: radius.button },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: fontWeight.title },
});
