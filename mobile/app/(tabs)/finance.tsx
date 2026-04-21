import React, { useState } from 'react';
import {
    View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator, RefreshControl,
    Modal, TextInput, Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { CircleDollarSign, Check, X } from 'lucide-react-native';
import { useReceivables, useCollectPayment } from '@/hooks/useApi';
import { COLORS } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/format';

interface Payment {
    id: string;
    phase: string;
    amount: number;
    paidAmount: number;
    status: string;
    dueDate: string | null;
    contract: {
        id: string;
        code: string;
        name: string;
        customer?: { name: string };
        project?: { name: string; code: string };
    };
}

export default function ReceivablesScreen() {
    const { data, isLoading, refetch, isRefetching } = useReceivables();
    const collectPayment = useCollectPayment();
    const [selected, setSelected] = useState<Payment | null>(null);
    const [collectAmount, setCollectAmount] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const payments = (data?.payments || []) as Payment[];
    const pending = payments.filter(p => p.paidAmount < p.amount);
    const summary = data?.summary;

    function openCollect(p: Payment) {
        setSelected(p);
        setCollectAmount(String(p.amount - p.paidAmount));
    }

    async function handleCollect() {
        if (!selected) return;
        const n = parseFloat(collectAmount);
        if (isNaN(n) || n <= 0) {
            Alert.alert('Lỗi', 'Số tiền phải > 0');
            return;
        }
        const newPaid = selected.paidAmount + n;
        if (newPaid > selected.amount + 1) {
            Alert.alert('Lỗi', `Vượt giá trị đợt (${formatCurrency(selected.amount)})`);
            return;
        }
        setSubmitting(true);
        try {
            await collectPayment.mutateAsync({
                contractId: selected.contract.id,
                paymentId: selected.id,
                paidAmount: newPaid,
                paidDate: new Date().toISOString(),
                status: newPaid >= selected.amount - 0.01 ? 'Đã thu' : 'Thu một phần',
            });
            Alert.alert('✓', `Đã ghi nhận ${formatCurrency(n)}`);
            setSelected(null);
            setCollectAmount('');
        } catch (e: any) {
            Alert.alert('Lỗi', e?.message || 'Không thu được tiền');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <>
            <Stack.Screen options={{
                title: 'Thu tiền',
                headerStyle: { backgroundColor: COLORS.primary },
                headerTintColor: '#fff',
            }} />
            <View style={styles.container}>
                {summary && (
                    <View style={styles.summaryBar}>
                        <SummaryCell label="Tổng phải thu" value={formatCurrency(summary.totalReceivable)} />
                        <SummaryCell label="Đã thu" value={formatCurrency(summary.totalReceived)} color={COLORS.success} />
                        <SummaryCell label="Còn lại" value={formatCurrency(summary.outstanding)} color={summary.outstanding > 0 ? COLORS.danger : COLORS.success} />
                    </View>
                )}

                <FlatList
                    data={pending}
                    keyExtractor={(p) => p.id}
                    refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
                    ListHeaderComponent={
                        <View style={{ padding: 12, paddingBottom: 0 }}>
                            <Text style={styles.sectionTitle}>💰 Đợt thu chờ ({pending.length})</Text>
                            <Text style={styles.hint}>Bấm vào đợt để thu tiền</Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const remaining = item.amount - item.paidAmount;
                        const overdue = item.dueDate && new Date(item.dueDate) < new Date();
                        return (
                            <Pressable style={styles.card} onPress={() => openCollect(item)}>
                                <View style={styles.cardRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.customer}>{item.contract.customer?.name || item.contract.name}</Text>
                                        <Text style={styles.phase}>{item.phase} · {item.contract.code}</Text>
                                        {item.contract.project?.name && (
                                            <Text style={styles.project}>📁 {item.contract.project.name}</Text>
                                        )}
                                        {item.dueDate && (
                                            <Text style={[styles.due, overdue && { color: COLORS.danger, fontWeight: '600' }]}>
                                                {overdue ? '⚠ Quá hạn ' : '📅 Hạn '}{formatDate(item.dueDate)}
                                            </Text>
                                        )}
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.amountTotal}>{formatCurrency(item.amount)}</Text>
                                        {item.paidAmount > 0 && (
                                            <Text style={styles.paidSoFar}>Đã thu: {formatCurrency(item.paidAmount)}</Text>
                                        )}
                                        <Text style={styles.remaining}>Còn: {formatCurrency(remaining)}</Text>
                                    </View>
                                </View>
                            </Pressable>
                        );
                    }}
                    ListEmptyComponent={
                        isLoading ? (
                            <ActivityIndicator style={{ marginTop: 20 }} color={COLORS.primary} />
                        ) : (
                            <View style={{ alignItems: 'center', padding: 40 }}>
                                <CircleDollarSign size={48} color={COLORS.textLight} />
                                <Text style={{ color: COLORS.textLight, marginTop: 8 }}>Không còn đợt nào chờ thu 🎉</Text>
                            </View>
                        )
                    }
                />

                {/* Collect modal */}
                <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalSheet}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Thu tiền</Text>
                                <Pressable onPress={() => setSelected(null)}><X size={22} color={COLORS.text} /></Pressable>
                            </View>
                            {selected && (
                                <>
                                    <Text style={styles.modalCustomer}>{selected.contract.customer?.name}</Text>
                                    <Text style={styles.modalPhase}>{selected.phase} · {selected.contract.code}</Text>
                                    <View style={styles.priceBox}>
                                        <Text style={styles.priceLabel}>Còn phải thu:</Text>
                                        <Text style={styles.priceValue}>{formatCurrency(selected.amount - selected.paidAmount)}</Text>
                                    </View>
                                    <Text style={styles.modalLabel}>Số tiền thu:</Text>
                                    <TextInput
                                        style={styles.amountInput}
                                        value={collectAmount}
                                        onChangeText={setCollectAmount}
                                        keyboardType="numeric"
                                        placeholder="0"
                                    />
                                    <Pressable
                                        style={[styles.submitBtn, submitting && { opacity: 0.5 }]}
                                        onPress={handleCollect}
                                        disabled={submitting}
                                    >
                                        {submitting ? <ActivityIndicator color="#fff" /> : (
                                            <>
                                                <Check size={18} color="#fff" />
                                                <Text style={styles.submitBtnText}>Xác nhận thu</Text>
                                            </>
                                        )}
                                    </Pressable>
                                </>
                            )}
                        </View>
                    </View>
                </Modal>
            </View>
        </>
    );
}

function SummaryCell({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>{label}</Text>
            <Text style={[styles.summaryValue, color ? { color } : {}]}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    summaryBar: { flexDirection: 'row', backgroundColor: COLORS.white, padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    summaryCell: { flex: 1, alignItems: 'center' },
    summaryLabel: { fontSize: 11, color: COLORS.textSecondary },
    summaryValue: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginTop: 2 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
    hint: { fontSize: 12, color: COLORS.textLight, marginTop: 2, marginBottom: 4 },
    card: { marginHorizontal: 12, marginVertical: 4, padding: 12, backgroundColor: COLORS.white, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
    cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    customer: { fontSize: 15, fontWeight: '700', color: COLORS.text },
    phase: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
    project: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    due: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    amountTotal: { fontSize: 14, fontWeight: '700', color: COLORS.text },
    paidSoFar: { fontSize: 11, color: COLORS.success, marginTop: 2 },
    remaining: { fontSize: 13, color: COLORS.danger, marginTop: 2, fontWeight: '600' },

    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalSheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
    modalCustomer: { fontSize: 16, color: COLORS.text, fontWeight: '600' },
    modalPhase: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
    priceBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, marginVertical: 12, backgroundColor: COLORS.background, borderRadius: 8 },
    priceLabel: { fontSize: 13, color: COLORS.textSecondary },
    priceValue: { fontSize: 18, fontWeight: '700', color: COLORS.danger },
    modalLabel: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 6 },
    amountInput: { fontSize: 22, fontWeight: '700', padding: 12, borderWidth: 2, borderColor: COLORS.primary, borderRadius: 8, textAlign: 'right', color: COLORS.text },
    submitBtn: { marginTop: 16, backgroundColor: COLORS.success, paddingVertical: 14, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
