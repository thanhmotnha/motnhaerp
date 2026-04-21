import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View, Text, FlatList, StyleSheet, TouchableOpacity,
    RefreshControl, ActivityIndicator, Modal, ScrollView, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apiFetch, apiFetchAllPages } from '@/lib/api';
import { useToast } from '@/components/Toast';
import Colors, { cardShadow, radius, fontWeight } from '@/constants/Colors';

const c = Colors.light;

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
    'Chờ duyệt': { color: '#f59e0b', bg: '#fef3c7' },
    'Chờ duyệt vượt định mức': { color: '#8b5cf6', bg: '#ede9fe' },
    'Nhận một phần': { color: '#2563eb', bg: '#dbeafe' },
    'Hoàn thành': { color: '#16a34a', bg: '#dcfce7' },
    'Nháp': { color: c.textMuted, bg: '#f1f5f9' },
};

const FILTERS = ['Tất cả', 'Chờ duyệt', 'Nhận một phần', 'Hoàn thành'] as const;

const fmtNum = (n: number) => new Intl.NumberFormat('vi-VN').format(n || 0);
const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('vi-VN') : '--';

type PoReceiveItem = {
    id: string;
    materialPlanId?: string | null;
    productName: string;
    unit: string;
    quantity: number;
    receivedQty: number;
    toReceive: string;
};

export default function PurchasingScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ poId?: string; projectId?: string; materialPlanId?: string }>();
    const toast = useToast();
    const autoOpenedPoIdRef = useRef<string | null>(null);
    const requestedProjectId = typeof params.projectId === 'string' ? params.projectId : '';
    const requestedMaterialPlanId = typeof params.materialPlanId === 'string' ? params.materialPlanId : '';

    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>('Tất cả');
    const [selectedPo, setSelectedPo] = useState<any>(null);
    const [receiveItems, setReceiveItems] = useState<PoReceiveItem[]>([]);
    const [receiveNote, setReceiveNote] = useState('');
    const [receiveScopeLabel, setReceiveScopeLabel] = useState('');
    const [openingPo, setOpeningPo] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const loadOrders = useCallback(async () => {
        try {
            const data = await apiFetchAllPages('/api/purchase-orders');
            setOrders(data);
        } catch {
            setOrders([]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    useEffect(() => {
        const poId = typeof params.poId === 'string' ? params.poId : '';
        if (!poId || !orders.length || autoOpenedPoIdRef.current === poId) return;
        autoOpenedPoIdRef.current = poId;
        openReceiveModal(poId, requestedMaterialPlanId || undefined);
    }, [orders, params.poId, requestedMaterialPlanId]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadOrders();
        setRefreshing(false);
    };

    const openReceiveModal = async (poId: string, materialPlanId?: string) => {
        setOpeningPo(true);
        try {
            const po = await apiFetch(`/api/purchase-orders/${poId}`);
            const items = (po?.items || []).map((item: any) => ({
                id: item.id,
                materialPlanId: item.materialPlanId || null,
                productName: item.productName || 'Sản phẩm',
                unit: item.unit || '',
                quantity: Number(item.quantity || 0),
                receivedQty: Number(item.receivedQty || 0),
                toReceive: '',
            }));
            const scopedItems = materialPlanId
                ? items.filter((item: PoReceiveItem) => item.materialPlanId === materialPlanId)
                : items;
            if (materialPlanId && !scopedItems.length) {
                toast.show('PO này không có dòng vật tư tương ứng với yêu cầu đã chọn', 'error');
                return;
            }
            setSelectedPo(po);
            setReceiveItems(scopedItems);
            setReceiveNote('');
            setReceiveScopeLabel(materialPlanId && scopedItems.length === 1 ? scopedItems[0].productName : '');
        } catch (e: any) {
            toast.show(e?.message || 'Không thể mở phiếu mua hàng', 'error');
        } finally {
            setOpeningPo(false);
        }
    };

    const closeReceiveModal = () => {
        setSelectedPo(null);
        setReceiveItems([]);
        setReceiveNote('');
        setReceiveScopeLabel('');
    };

    const updateReceiveQty = (id: string, value: string) => {
        setReceiveItems((prev) => prev.map((item) => {
            if (item.id !== id) return item;
            return { ...item, toReceive: value.replace(',', '.') };
        }));
    };

    const submitReceive = async () => {
        if (!selectedPo) return;
        const payloadItems = receiveItems
            .map((item) => ({
                id: item.id,
                remaining: Math.max(0, item.quantity - item.receivedQty),
                receivedQty: Number.parseFloat(item.toReceive || '0'),
            }))
            .filter((item) => item.receivedQty > 0);

        if (!payloadItems.length) {
            toast.show('Nhập số lượng nhận thêm cho ít nhất một dòng', 'error');
            return;
        }

        const invalidItem = payloadItems.find((item) => item.receivedQty > item.remaining);
        if (invalidItem) {
            toast.show('Số lượng nhận thêm không được vượt phần còn lại của PO', 'error');
            return;
        }

        setSubmitting(true);
        try {
            await apiFetch(`/api/purchase-orders/${selectedPo.id}/receive`, {
                method: 'POST',
                body: JSON.stringify({
                    items: payloadItems.map((item) => ({ id: item.id, receivedQty: item.receivedQty })),
                    note: receiveNote,
                }),
            });
            toast.show('Đã ghi nhận nhận hàng cho phiếu mua hàng', 'success');
            closeReceiveModal();
            await loadOrders();
        } catch (e: any) {
            toast.show(e?.message || 'Không thể ghi nhận nhận hàng', 'error');
        }
        setSubmitting(false);
    };

    const filteredOrders = useMemo(() => {
        const projectScoped = requestedProjectId
            ? orders.filter((order) => order.projectId === requestedProjectId)
            : orders;
        if (activeFilter === 'Tất cả') return projectScoped;
        return projectScoped.filter((order) => order.status === activeFilter);
    }, [activeFilter, orders, requestedProjectId]);

    const renderOrder = ({ item }: { item: any }) => {
        const status = STATUS_STYLE[item.status] || { color: c.textMuted, bg: '#f1f5f9' };
        const totalQty = (item.items || []).reduce((sum: number, line: any) => sum + Number(line.quantity || 0), 0);
        const totalReceived = (item.items || []).reduce((sum: number, line: any) => sum + Number(line.receivedQty || 0), 0);
        const canReceive = item.status !== 'Hoàn thành';
        const receiveRate = totalQty > 0 ? Math.round((totalReceived / totalQty) * 100) : 0;

        return (
            <View style={s.card}>
                <View style={s.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.cardTitle}>{item.code || 'Phiếu mua hàng'}</Text>
                        <Text style={s.cardSub}>{item.supplier || 'Chưa có nhà cung cấp'}</Text>
                    </View>
                    <View style={[s.badge, { backgroundColor: status.bg }]}>
                        <Text style={[s.badgeText, { color: status.color }]}>{item.status || 'Nháp'}</Text>
                    </View>
                </View>

                <View style={s.infoRow}>
                    <Ionicons name="business-outline" size={14} color={c.textMuted} />
                    <Text style={s.infoText}>{item.project?.name || 'PO công ty'}</Text>
                </View>
                <View style={s.infoRow}>
                    <Ionicons name="calendar-outline" size={14} color={c.textMuted} />
                    <Text style={s.infoText}>Ngày đặt: {fmtDate(item.orderDate)}</Text>
                </View>
                <View style={s.infoRow}>
                    <Ionicons name="cube-outline" size={14} color={c.textMuted} />
                    <Text style={s.infoText}>
                        Đã nhận {fmtNum(totalReceived)} / {fmtNum(totalQty)} đơn vị
                    </Text>
                </View>

                <View style={s.metrics}>
                    <View style={s.metric}>
                        <Text style={s.metricLabel}>Số dòng hàng</Text>
                        <Text style={s.metricValue}>{fmtNum((item.items || []).length)}</Text>
                    </View>
                    <View style={s.metric}>
                        <Text style={s.metricLabel}>Tiến độ nhận</Text>
                        <Text style={s.metricValue}>{fmtNum(receiveRate)}%</Text>
                    </View>
                </View>

                {canReceive ? (
                    <TouchableOpacity style={s.primaryBtn} onPress={() => openReceiveModal(item.id)}>
                        <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
                        <Text style={s.primaryBtnText}>Nhận hàng / GRN</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={s.doneBox}>
                        <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                        <Text style={s.doneText}>Phiếu mua hàng đã hoàn thành</Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            <View style={s.header}>
                <TouchableOpacity style={s.headerBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={c.primary} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Mua hàng / GRN</Text>
                <View style={{ width: 44 }} />
            </View>

            <View style={s.filterRow}>
                {FILTERS.map((filter) => (
                    <TouchableOpacity
                        key={filter}
                        style={[s.filterChip, activeFilter === filter && s.filterChipActive]}
                        onPress={() => setActiveFilter(filter)}
                    >
                        <Text style={[s.filterChipText, activeFilter === filter && s.filterChipTextActive]}>{filter}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {requestedProjectId ? (
                <View style={s.scopeBar}>
                    <Ionicons name="funnel-outline" size={14} color={c.primary} />
                    <Text style={s.scopeText}>Đang lọc theo dự án được chọn</Text>
                </View>
            ) : null}
            {requestedMaterialPlanId ? (
                <View style={s.scopeBar}>
                    <Ionicons name="layers-outline" size={14} color={c.primary} />
                    <Text style={s.scopeText}>Nếu mở từ yêu cầu vật tư, modal sẽ khóa đúng dòng PO tương ứng</Text>
                </View>
            ) : null}

            {loading ? (
                <View style={s.center}>
                    <ActivityIndicator color={c.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredOrders}
                    keyExtractor={(item) => item.id}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
                    contentContainerStyle={filteredOrders.length ? s.listContent : s.listEmptyContent}
                    ListEmptyComponent={
                        <View style={s.empty}>
                            <Ionicons name="receipt-outline" size={42} color={c.textMuted} />
                            <Text style={s.emptyTitle}>Chưa có phiếu mua hàng</Text>
                            <Text style={s.emptyDesc}>PO đã duyệt hoặc đang nhận hàng sẽ hiển thị ở đây để bạn test luồng GRN.</Text>
                        </View>
                    }
                    renderItem={renderOrder}
                />
            )}

            <Modal visible={!!selectedPo} transparent animationType="slide" onRequestClose={closeReceiveModal}>
                <View style={s.overlay}>
                    <View style={s.sheet}>
                        <View style={s.handle} />
                        {openingPo ? (
                            <View style={s.center}>
                                <ActivityIndicator color={c.primary} />
                            </View>
                        ) : (
                            <>
                                <Text style={s.sheetTitle}>{selectedPo?.code || 'Phiếu mua hàng'}</Text>
                                <Text style={s.sheetSub}>{selectedPo?.supplier || 'Chưa có nhà cung cấp'} • {selectedPo?.project?.name || 'PO công ty'}</Text>
                                <ScrollView showsVerticalScrollIndicator={false}>
                                    {receiveScopeLabel ? (
                                        <View style={s.scopeHint}>
                                            <Ionicons name="locate-outline" size={14} color={c.primary} />
                                            <Text style={s.scopeHintText}>Đang nhận theo yêu cầu vật tư cho dòng: {receiveScopeLabel}</Text>
                                        </View>
                                    ) : null}
                                    {receiveItems.map((item) => {
                                        const remaining = Math.max(0, item.quantity - item.receivedQty);
                                        return (
                                            <View key={item.id} style={s.lineCard}>
                                                <Text style={s.lineTitle}>{item.productName}</Text>
                                                <Text style={s.lineMeta}>
                                                    Đã nhận {fmtNum(item.receivedQty)} / {fmtNum(item.quantity)} {item.unit}
                                                </Text>
                                                <TextInput
                                                    style={s.input}
                                                    value={item.toReceive}
                                                    onChangeText={(value) => updateReceiveQty(item.id, value)}
                                                    keyboardType="numeric"
                                                    placeholder={`Nhận thêm tối đa ${fmtNum(remaining)}`}
                                                    placeholderTextColor={c.textMuted}
                                                />
                                            </View>
                                        );
                                    })}

                                    <Text style={s.label}>Ghi chú GRN</Text>
                                    <TextInput
                                        style={[s.input, s.textArea]}
                                        value={receiveNote}
                                        onChangeText={setReceiveNote}
                                        multiline
                                        placeholder="Ghi chú thêm cho lần nhận hàng này"
                                        placeholderTextColor={c.textMuted}
                                    />

                                    <TouchableOpacity style={s.primaryBtn} onPress={submitReceive} disabled={submitting}>
                                        {submitting ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <>
                                                <Ionicons name="archive-outline" size={18} color="#fff" />
                                                <Text style={s.primaryBtnText}>Ghi nhận nhận hàng</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity style={s.cancelBtn} onPress={closeReceiveModal}>
                                        <Text style={s.cancelText}>Đóng</Text>
                                    </TouchableOpacity>
                                </ScrollView>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bgGradientStart },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: c.borderP10 },
    headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.primary + '18', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: fontWeight.title, color: c.primary },
    filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: c.borderP5 },
    filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: c.primary + '25', backgroundColor: '#fff' },
    filterChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    filterChipText: { fontSize: 12, color: c.primary, fontWeight: fontWeight.secondary },
    filterChipTextActive: { color: '#fff' },
    scopeBar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
    scopeText: { fontSize: 12, color: c.primary, fontWeight: fontWeight.secondary },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    listContent: { padding: 16, paddingBottom: 120, gap: 12 },
    listEmptyContent: { flexGrow: 1, padding: 16, justifyContent: 'center' },
    empty: { alignItems: 'center', paddingHorizontal: 24 },
    emptyTitle: { fontSize: 16, fontWeight: fontWeight.title, color: c.text, marginTop: 12, textAlign: 'center' },
    emptyDesc: { fontSize: 13, color: c.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 20 },
    card: { backgroundColor: '#fff', borderRadius: radius.card, padding: 16, borderWidth: 1, borderColor: c.borderP5, ...cardShadow },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    cardTitle: { fontSize: 15, fontWeight: fontWeight.title, color: c.text },
    cardSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
    badgeText: { fontSize: 11, fontWeight: fontWeight.title },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    infoText: { flex: 1, fontSize: 12, color: c.textSecondary },
    metrics: { flexDirection: 'row', gap: 8, marginTop: 14 },
    metric: { flex: 1, backgroundColor: c.bgGradientStart, borderRadius: 12, padding: 12 },
    metricLabel: { fontSize: 11, color: c.textMuted, marginBottom: 4 },
    metricValue: { fontSize: 15, color: c.text, fontWeight: fontWeight.title },
    primaryBtn: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.primary, paddingVertical: 14, borderRadius: radius.button },
    primaryBtnText: { fontSize: 14, color: '#fff', fontWeight: fontWeight.title },
    doneBox: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#16a34a18', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 },
    doneText: { fontSize: 12, color: '#16a34a', fontWeight: fontWeight.secondary },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, maxHeight: '88%' },
    handle: { width: 40, height: 4, backgroundColor: '#d1d5db', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
    sheetTitle: { fontSize: 18, fontWeight: fontWeight.title, color: c.text, textAlign: 'center' },
    sheetSub: { fontSize: 13, color: c.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 12 },
    scopeHint: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: c.primary + '12', marginBottom: 2 },
    scopeHintText: { flex: 1, fontSize: 12, color: c.primary, fontWeight: fontWeight.secondary },
    lineCard: { borderWidth: 1, borderColor: c.borderP10, borderRadius: 12, padding: 14, marginTop: 10 },
    lineTitle: { fontSize: 14, color: c.text, fontWeight: fontWeight.title },
    lineMeta: { fontSize: 12, color: c.textMuted, marginTop: 4, marginBottom: 10 },
    label: { fontSize: 13, color: c.text, fontWeight: fontWeight.secondary, marginTop: 14, marginBottom: 6 },
    input: { borderWidth: 1.5, borderColor: c.borderP10, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.text },
    textArea: { minHeight: 90, textAlignVertical: 'top' },
    cancelBtn: { alignItems: 'center', paddingVertical: 14 },
    cancelText: { fontSize: 14, color: c.textMuted, fontWeight: fontWeight.secondary },
});
