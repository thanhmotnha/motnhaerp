import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, StyleSheet, Alert, Pressable, TextInput,
    ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Package, Check } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useWarehouses, useCreateGoodsReceipt } from '@/hooks/useApi';
import { COLORS } from '@/lib/constants';
import { formatCurrency } from '@/lib/format';
import type { Warehouse } from '@/lib/types';

interface POItem {
    id: string;
    productId: string | null;
    productName: string;
    unit: string;
    quantity: number;
    receivedQty: number;
    unitPrice: number;
    variantLabel?: string;
}

interface PO {
    id: string;
    code: string;
    supplier: string;
    status: string;
    items: POItem[];
    project?: { name: string };
}

export default function ReceiveFormScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [warehouseId, setWarehouseId] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [qtyMap, setQtyMap] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    const { data: warehouses, isLoading: whLoading } = useWarehouses() as { data: Warehouse[]; isLoading: boolean };
    const { data: po, isLoading: poLoading } = useQuery<PO>({
        queryKey: ['po', id],
        queryFn: () => apiFetch(`/api/purchase-orders/${id}`),
        enabled: !!id,
    });
    const createReceipt = useCreateGoodsReceipt();

    // Default qty = remaining (quantity - receivedQty)
    useEffect(() => {
        if (po?.items) {
            const init: Record<string, string> = {};
            for (const item of po.items) {
                const remaining = item.quantity - (item.receivedQty || 0);
                init[item.id] = remaining > 0 ? String(remaining) : '0';
            }
            setQtyMap(init);
        }
    }, [po?.id]);

    useEffect(() => {
        if (!warehouseId && warehouses && Array.isArray(warehouses) && warehouses.length > 0) {
            setWarehouseId(warehouses[0].id);
        }
    }, [warehouses]);

    if (poLoading || whLoading || !po) {
        return (
            <>
                <Stack.Screen options={{ title: 'Nhập kho', headerStyle: { backgroundColor: COLORS.primary }, headerTintColor: '#fff' }} />
                <View style={styles.loadingView}><ActivityIndicator color={COLORS.primary} /></View>
            </>
        );
    }

    const whList = Array.isArray(warehouses) ? warehouses : [];
    const totalReceive = Object.values(qtyMap).reduce((s, v) => s + (parseFloat(v) || 0), 0);

    async function handleSubmit() {
        if (!warehouseId) {
            Alert.alert('Thiếu thông tin', 'Chọn kho nhập');
            return;
        }
        if (!po) return;
        const items = po.items
            .map((it) => {
                const qtyReceived = parseFloat(qtyMap[it.id] || '0');
                return qtyReceived > 0 ? {
                    productId: it.productId,
                    productName: it.productName,
                    unit: it.unit,
                    qtyOrdered: it.quantity,
                    qtyReceived,
                    unitPrice: it.unitPrice,
                    variantLabel: it.variantLabel || '',
                    purchaseOrderItemId: it.id,
                } : null;
            })
            .filter((x): x is NonNullable<typeof x> => x !== null);

        if (items.length === 0) {
            Alert.alert('Thiếu thông tin', 'Nhập số lượng ≥ 1 cho ít nhất 1 mặt hàng');
            return;
        }

        Alert.alert(
            'Xác nhận nhập kho',
            `Nhập ${items.length} mặt hàng vào kho?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xác nhận', onPress: async () => {
                        setSubmitting(true);
                        try {
                            await createReceipt.mutateAsync({
                                purchaseOrderId: po.id,
                                warehouseId,
                                receivedDate: new Date().toISOString(),
                                notes,
                                items,
                            });
                            Alert.alert('✓', 'Đã tạo phiếu nhập', [
                                { text: 'OK', onPress: () => router.back() },
                            ]);
                        } catch (e: any) {
                            Alert.alert('Lỗi', e?.message || 'Không tạo được phiếu');
                        } finally {
                            setSubmitting(false);
                        }
                    },
                },
            ]
        );
    }

    return (
        <>
            <Stack.Screen options={{ title: `Nhập: ${po.code}`, headerStyle: { backgroundColor: COLORS.primary }, headerTintColor: '#fff' }} />
            <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Thông tin</Text>
                    <View style={{ gap: 6 }}>
                        <Text style={styles.info}>🏭 NCC: <Text style={{ fontWeight: '600' }}>{po.supplier || '—'}</Text></Text>
                        {po.project?.name && <Text style={styles.info}>📁 Dự án: <Text style={{ fontWeight: '600' }}>{po.project.name}</Text></Text>}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Kho nhập *</Text>
                    <View style={styles.chipRow}>
                        {whList.map((w) => (
                            <Pressable key={w.id} onPress={() => setWarehouseId(w.id)}
                                style={[styles.chip, warehouseId === w.id && styles.chipActive]}>
                                <Text style={[styles.chipText, warehouseId === w.id && styles.chipTextActive]}>{w.name}</Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Mặt hàng ({po.items.length})</Text>
                    {po.items.map((it) => {
                        const remaining = it.quantity - (it.receivedQty || 0);
                        return (
                            <View key={it.id} style={styles.itemRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.itemName} numberOfLines={2}>{it.productName}</Text>
                                    <Text style={styles.itemMeta}>
                                        Đặt: {it.quantity} {it.unit} · Đã nhận: {it.receivedQty || 0} · Còn: {remaining}
                                    </Text>
                                </View>
                                <TextInput
                                    style={styles.qtyInput}
                                    value={qtyMap[it.id] || ''}
                                    onChangeText={(v) => setQtyMap(prev => ({ ...prev, [it.id]: v }))}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor={COLORS.textLight}
                                />
                            </View>
                        );
                    })}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Ghi chú</Text>
                    <TextInput
                        style={styles.textArea}
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        placeholder="Ghi chú nhập kho..."
                        placeholderTextColor={COLORS.textLight}
                    />
                </View>

                <View style={styles.summary}>
                    <Text style={styles.summaryText}>
                        Tổng nhập: <Text style={styles.summaryAmount}>{totalReceive}</Text> đơn vị
                    </Text>
                </View>

                <Pressable
                    style={[styles.submitBtn, (submitting || !warehouseId) && { opacity: 0.5 }]}
                    onPress={handleSubmit}
                    disabled={submitting || !warehouseId}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Check size={18} color="#fff" />
                            <Text style={styles.submitBtnText}>Tạo phiếu nhập</Text>
                        </>
                    )}
                </Pressable>

                <View style={{ height: 40 }} />
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingView: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    section: { backgroundColor: COLORS.white, padding: 12, marginTop: 8 },
    sectionTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, textTransform: 'uppercase' },
    info: { fontSize: 14, color: COLORS.text },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: COLORS.borderLight, borderWidth: 1, borderColor: COLORS.border },
    chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipText: { fontSize: 13, color: COLORS.text },
    chipTextActive: { color: '#fff', fontWeight: '600' },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
    itemName: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
    itemMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    qtyInput: { width: 70, paddingVertical: 6, paddingHorizontal: 8, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 6, fontSize: 15, color: COLORS.text, textAlign: 'right', fontWeight: '600' },
    textArea: { minHeight: 80, padding: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, fontSize: 14, color: COLORS.text, textAlignVertical: 'top' },
    summary: { padding: 12, marginTop: 8, backgroundColor: COLORS.primaryDark + '11', marginHorizontal: 12, borderRadius: 8 },
    summaryText: { fontSize: 14, color: COLORS.text },
    summaryAmount: { fontWeight: '700', color: COLORS.primary },
    submitBtn: { marginHorizontal: 12, marginTop: 16, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
