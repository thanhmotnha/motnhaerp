import React from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { router, Stack } from 'expo-router';
import { PackagePlus, ClipboardCheck } from 'lucide-react-native';
import { usePOsPendingReceive, useGoodsReceipts } from '@/hooks/useApi';
import { COLORS } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/format';

export default function InventoryReceiptsScreen() {
    const { data: pos, isLoading: posLoading, refetch: refetchPOs, isRefetching: refetchingPOs } = usePOsPendingReceive();
    const { data: receipts, isLoading: rcLoading, refetch: refetchReceipts } = useGoodsReceipts();

    const pendingPOs = pos?.data || [];
    const recentReceipts = receipts?.data || [];

    return (
        <>
            <Stack.Screen options={{
                title: 'Nhập kho',
                headerStyle: { backgroundColor: COLORS.primary },
                headerTintColor: '#fff',
            }} />
            <View style={styles.container}>
                <FlatList
                    data={pendingPOs}
                    keyExtractor={(po) => po.id}
                    refreshControl={
                        <RefreshControl
                            refreshing={refetchingPOs}
                            onRefresh={() => { refetchPOs(); refetchReceipts(); }}
                        />
                    }
                    ListHeaderComponent={
                        <View style={{ padding: 12 }}>
                            <Text style={styles.sectionTitle}>📦 PO chờ nhập ({pendingPOs.length})</Text>
                            <Text style={styles.hint}>Bấm vào PO để tạo phiếu nhập kho</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <Pressable
                            style={styles.card}
                            onPress={() => router.push(`/inventory/receive/${item.id}`)}
                        >
                            <View style={styles.cardRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.code}>{item.code}</Text>
                                    <Text style={styles.supplier}>🏭 {item.supplier || '—'}</Text>
                                    {item.project?.name && <Text style={styles.project}>📁 {item.project.name}</Text>}
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={[styles.status, { color: item.status === 'Nhận một phần' ? COLORS.warning : COLORS.success }]}>
                                        {item.status}
                                    </Text>
                                    <Text style={styles.amount}>{formatCurrency(item.totalAmount)}</Text>
                                </View>
                            </View>
                        </Pressable>
                    )}
                    ListEmptyComponent={
                        posLoading ? (
                            <ActivityIndicator style={{ marginTop: 20 }} color={COLORS.primary} />
                        ) : (
                            <View style={styles.empty}>
                                <PackagePlus size={48} color={COLORS.textLight} />
                                <Text style={styles.emptyText}>Không có PO nào chờ nhập</Text>
                            </View>
                        )
                    }
                    ListFooterComponent={
                        <View style={{ padding: 12, marginTop: 16 }}>
                            <Text style={styles.sectionTitle}>📋 Phiếu nhập gần đây</Text>
                            {rcLoading ? (
                                <ActivityIndicator style={{ marginTop: 12 }} color={COLORS.primary} />
                            ) : recentReceipts.length === 0 ? (
                                <Text style={styles.emptyText}>Chưa có phiếu nhập</Text>
                            ) : (
                                recentReceipts.slice(0, 10).map(rc => (
                                    <View key={rc.id} style={styles.receiptCard}>
                                        <View style={styles.cardRow}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.code}>{rc.code}</Text>
                                                <Text style={styles.supplier}>
                                                    🏭 {rc.purchaseOrder?.supplier || '—'} · PO {rc.purchaseOrder?.code}
                                                </Text>
                                                <Text style={styles.project}>🏬 {rc.warehouse?.name || '—'}</Text>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={styles.date}>{formatDate(rc.receivedDate)}</Text>
                                                <Text style={styles.itemCount}>{rc.items?.length || 0} mặt hàng</Text>
                                            </View>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    }
                />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
    hint: { fontSize: 12, color: COLORS.textLight, marginBottom: 8 },
    card: { marginHorizontal: 12, marginVertical: 4, padding: 12, backgroundColor: COLORS.white, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
    cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    code: { fontSize: 15, fontWeight: '700', color: COLORS.text, fontFamily: 'monospace' },
    supplier: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
    project: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    status: { fontSize: 11, fontWeight: '600' },
    amount: { fontSize: 13, color: COLORS.text, marginTop: 2, fontWeight: '600' },
    receiptCard: { marginVertical: 4, padding: 10, backgroundColor: COLORS.white, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
    date: { fontSize: 12, color: COLORS.textSecondary },
    itemCount: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
    empty: { alignItems: 'center', padding: 32 },
    emptyText: { fontSize: 14, color: COLORS.textLight, marginTop: 8 },
});
