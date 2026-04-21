import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, ScrollView, StyleSheet, Alert, Pressable, TextInput,
    ActivityIndicator, FlatList,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Check, Search, X, Plus } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useWarehouses, useProjects, useCreateStockIssue, useProducts } from '@/hooks/useApi';
import { COLORS } from '@/lib/constants';
import type { Warehouse } from '@/lib/types';

interface Product {
    id: string;
    code: string;
    name: string;
    unit: string;
    stock: number;
    importPrice: number;
    warehouseId: string | null;
}

interface PickedItem {
    productId: string;
    productName: string;
    unit: string;
    qty: string;
    unitPrice: number;
    availableStock: number;
}

export default function StockIssueScreen() {
    const [warehouseId, setWarehouseId] = useState('');
    const [projectId, setProjectId] = useState('');
    const [notes, setNotes] = useState('');
    const [picked, setPicked] = useState<PickedItem[]>([]);
    const [showPicker, setShowPicker] = useState(false);
    const [search, setSearch] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const { data: warehouses } = useWarehouses() as { data: Warehouse[] };
    const { data: projectsRes } = useProjects(1, '', '');
    const { data: products } = useProducts() as { data: Product[] };
    const createIssue = useCreateStockIssue();

    useEffect(() => {
        if (!warehouseId && warehouses && Array.isArray(warehouses) && warehouses.length > 0) {
            setWarehouseId(warehouses[0].id);
        }
    }, [warehouses]);

    // Reset picked khi đổi kho
    useEffect(() => { setPicked([]); }, [warehouseId]);

    const availableProducts = useMemo(() => {
        if (!products) return [];
        return products.filter(p =>
            (!p.warehouseId || p.warehouseId === warehouseId) &&
            p.stock > 0 &&
            !picked.some(i => i.productId === p.id) &&
            (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()))
        );
    }, [products, warehouseId, picked, search]);

    const projects = projectsRes?.data || [];
    const whList = Array.isArray(warehouses) ? warehouses : [];

    function addProduct(p: Product) {
        setPicked(prev => [...prev, {
            productId: p.id, productName: p.name, unit: p.unit, qty: '1',
            unitPrice: p.importPrice, availableStock: p.stock,
        }]);
        setShowPicker(false);
        setSearch('');
    }

    function updateQty(id: string, qty: string) {
        setPicked(prev => prev.map(i => i.productId === id ? { ...i, qty } : i));
    }

    function removeItem(id: string) {
        setPicked(prev => prev.filter(i => i.productId !== id));
    }

    async function handleSubmit() {
        if (!warehouseId) { Alert.alert('Thiếu thông tin', 'Chọn kho xuất'); return; }
        if (picked.length === 0) { Alert.alert('Thiếu thông tin', 'Chọn ít nhất 1 vật tư'); return; }

        const items = picked.map(i => ({
            productId: i.productId,
            productName: i.productName,
            unit: i.unit,
            qty: parseFloat(i.qty) || 0,
            unitPrice: i.unitPrice,
        })).filter(i => i.qty > 0);

        if (items.length === 0) { Alert.alert('Thiếu thông tin', 'Nhập số lượng > 0'); return; }

        // Validate stock
        for (const i of items) {
            const p = picked.find(x => x.productId === i.productId);
            if (p && i.qty > p.availableStock) {
                Alert.alert('Vượt tồn kho', `${i.productName}: tồn ${p.availableStock}, xuất ${i.qty}`);
                return;
            }
        }

        Alert.alert(
            'Xác nhận xuất kho',
            `Xuất ${items.length} vật tư${projectId ? ' cho dự án' : ' (nội bộ)'}?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xác nhận', onPress: async () => {
                        setSubmitting(true);
                        try {
                            await createIssue.mutateAsync({
                                warehouseId,
                                projectId: projectId || null,
                                issuedDate: new Date().toISOString(),
                                notes,
                                items,
                            });
                            Alert.alert('✓', 'Đã tạo phiếu xuất', [
                                { text: 'OK', onPress: () => router.back() },
                            ]);
                        } catch (e: any) {
                            Alert.alert('Lỗi', e?.message || 'Không tạo được');
                        } finally { setSubmitting(false); }
                    },
                },
            ]
        );
    }

    return (
        <>
            <Stack.Screen options={{ title: 'Xuất kho', headerStyle: { backgroundColor: COLORS.primary }, headerTintColor: '#fff' }} />
            <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Kho xuất *</Text>
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
                    <Text style={styles.sectionTitle}>Xuất cho dự án (optional)</Text>
                    <View style={styles.chipRow}>
                        <Pressable onPress={() => setProjectId('')}
                            style={[styles.chip, !projectId && styles.chipActive]}>
                            <Text style={[styles.chipText, !projectId && styles.chipTextActive]}>Nội bộ</Text>
                        </Pressable>
                        {projects.slice(0, 10).map(p => (
                            <Pressable key={p.id} onPress={() => setProjectId(p.id)}
                                style={[styles.chip, projectId === p.id && styles.chipActive]}>
                                <Text style={[styles.chipText, projectId === p.id && styles.chipTextActive]}>{p.name}</Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Vật tư ({picked.length})</Text>
                        <Pressable style={styles.addBtn} onPress={() => setShowPicker(true)}>
                            <Plus size={16} color="#fff" />
                            <Text style={styles.addBtnText}>Thêm</Text>
                        </Pressable>
                    </View>
                    {picked.length === 0 ? (
                        <Text style={styles.emptyPicked}>Chưa chọn vật tư nào — bấm "Thêm"</Text>
                    ) : (
                        picked.map(i => (
                            <View key={i.productId} style={styles.itemRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.itemName} numberOfLines={2}>{i.productName}</Text>
                                    <Text style={styles.itemMeta}>Tồn: {i.availableStock} {i.unit}</Text>
                                </View>
                                <TextInput
                                    style={styles.qtyInput}
                                    value={i.qty}
                                    onChangeText={(v) => updateQty(i.productId, v)}
                                    keyboardType="numeric"
                                />
                                <Pressable onPress={() => removeItem(i.productId)} style={styles.removeBtn}>
                                    <X size={16} color={COLORS.danger} />
                                </Pressable>
                            </View>
                        ))
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Ghi chú</Text>
                    <TextInput
                        style={styles.textArea}
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        placeholder="Ghi chú xuất kho..."
                        placeholderTextColor={COLORS.textLight}
                    />
                </View>

                <Pressable
                    style={[styles.submitBtn, (submitting || !warehouseId || picked.length === 0) && { opacity: 0.5 }]}
                    onPress={handleSubmit}
                    disabled={submitting || !warehouseId || picked.length === 0}
                >
                    {submitting ? <ActivityIndicator color="#fff" /> : (
                        <>
                            <Check size={18} color="#fff" />
                            <Text style={styles.submitBtnText}>Tạo phiếu xuất</Text>
                        </>
                    )}
                </Pressable>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Product picker modal */}
            {showPicker && (
                <View style={styles.pickerOverlay}>
                    <View style={styles.pickerSheet}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Chọn vật tư</Text>
                            <Pressable onPress={() => setShowPicker(false)}><X size={20} color={COLORS.text} /></Pressable>
                        </View>
                        <View style={styles.searchBar}>
                            <Search size={16} color={COLORS.textLight} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Tìm theo tên / mã..."
                                placeholderTextColor={COLORS.textLight}
                                value={search}
                                onChangeText={setSearch}
                                autoFocus
                            />
                        </View>
                        <FlatList
                            data={availableProducts}
                            keyExtractor={(p) => p.id}
                            renderItem={({ item }) => (
                                <Pressable style={styles.productRow} onPress={() => addProduct(item)}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.productName}>{item.name}</Text>
                                        <Text style={styles.productMeta}>{item.code} · Tồn: {item.stock} {item.unit}</Text>
                                    </View>
                                    <Plus size={18} color={COLORS.primary} />
                                </Pressable>
                            )}
                            ListEmptyComponent={<Text style={styles.emptyPicked}>Không có vật tư tồn trong kho</Text>}
                        />
                    </View>
                </View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    section: { backgroundColor: COLORS.white, padding: 12, marginTop: 8 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    sectionTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: COLORS.borderLight, borderWidth: 1, borderColor: COLORS.border },
    chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipText: { fontSize: 13, color: COLORS.text },
    chipTextActive: { color: '#fff', fontWeight: '600' },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: COLORS.primary },
    addBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    emptyPicked: { textAlign: 'center', padding: 16, color: COLORS.textLight },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
    itemName: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
    itemMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    qtyInput: { width: 70, paddingVertical: 6, paddingHorizontal: 8, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 6, fontSize: 15, color: COLORS.text, textAlign: 'right', fontWeight: '600' },
    removeBtn: { padding: 8 },
    textArea: { minHeight: 80, padding: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, fontSize: 14, color: COLORS.text, textAlignVertical: 'top' },
    submitBtn: { marginHorizontal: 12, marginTop: 16, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    pickerOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    pickerSheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '80%', paddingBottom: 16 },
    pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
    pickerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
    searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.borderLight, borderRadius: 8 },
    searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
    productRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
    productName: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
    productMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});
