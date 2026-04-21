import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { router, Stack } from 'expo-router';
import { PackagePlus, PackageMinus, Plus } from 'lucide-react-native';
import { usePOsPendingReceive, useGoodsReceipts, useStockIssues } from '@/hooks/useApi';
import { COLORS } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/format';

type Mode = 'in' | 'out';

export default function InventoryScreen() {
    const [mode, setMode] = useState<Mode>('in');
    const { data: pos, isLoading: posLoading, refetch: refetchPOs, isRefetching: refetchingPOs } = usePOsPendingReceive();
    const { data: receipts, isLoading: rcLoading, refetch: refetchReceipts } = useGoodsReceipts();
    const { data: issues, isLoading: issuesLoading, refetch: refetchIssues } = useStockIssues();

    const pendingPOs = pos?.data || [];
    const recentReceipts = receipts?.data || [];
    const recentIssues = issues?.data || [];

    return (
        <>
            <Stack.Screen options={{
                title: 'Kho',
                headerStyle: { backgroundColor: COLORS.primary },
                headerTintColor: '#fff',
            }} />
            <View style={styles.container}>
                {/* Segmented control */}
                <View style={styles.tabBar}>
                    <Pressable
                        style={[styles.tabBtn, mode === 'in' && styles.tabBtnActive]}
                        onPress={() => setMode('in')}
                    >
                        <PackagePlus size={16} color={mode === 'in' ? '#fff' : COLORS.text} />
                        <Text style={[styles.tabBtnText, mode === 'in' && styles.tabBtnTextActive]}>Nhập kho</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.tabBtn, mode === 'out' && styles.tabBtnActive]}
                        onPress={() => setMode('out')}
                    >
                        <PackageMinus size={16} color={mode === 'out' ? '#fff' : COLORS.text} />
                        <Text style={[styles.tabBtnText, mode === 'out' && styles.tabBtnTextActive]}>Xuất kho</Text>
                    </Pressable>
                </View>

                {mode === 'in' && (
                    <ScrollView
                        refreshControl={<RefreshControl refreshing={refetchingPOs} onRefresh={() => { refetchPOs(); refetchReceipts(); }} />}
                    >
                        <View style={{ padding: 12 }}>
                            <Text style={styles.sectionTitle}>📦 PO chờ nhập ({pendingPOs.length})</Text>
                            <Text style={styles.hint}>Bấm vào PO để tạo phiếu nhập</Text>
                        </View>
                        {posLoading ? (
                            <ActivityIndicator style={{ marginTop: 20 }} color={COLORS.primary} />
                        ) : pendingPOs.length === 0 ? (
                            <Text style={styles.emptyInline}>Không có PO chờ nhập</Text>
                        ) : (
                            pendingPOs.map(po => (
                                <Pressable
                                    key={po.id}
                                    style={styles.card}
                                    onPress={() => router.push(`/inventory/receive/${po.id}`)}
                                >
                                    <View style={styles.cardRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.code}>{po.code}</Text>
                                            <Text style={styles.supplier}>🏭 {po.supplier || '—'}</Text>
                                            {po.project?.name && <Text style={styles.project}>📁 {po.project.name}</Text>}
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={[styles.status, { color: po.status === 'Nhận một phần' ? COLORS.warning : COLORS.success }]}>{po.status}</Text>
                                            <Text style={styles.amount}>{formatCurrency(po.totalAmount)}</Text>
                                        </View>
                                    </View>
                                </Pressable>
                            ))
                        )}

                        <View style={{ padding: 12, marginTop: 16 }}>
                            <Text style={styles.sectionTitle}>📋 Phiếu nhập gần đây</Text>
                        </View>
                        {rcLoading ? (
                            <ActivityIndicator style={{ marginTop: 12 }} color={COLORS.primary} />
                        ) : recentReceipts.length === 0 ? (
                            <Text style={styles.emptyInline}>Chưa có phiếu nhập</Text>
                        ) : (
                            recentReceipts.slice(0, 20).map(rc => (
                                <View key={rc.id} style={styles.card}>
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
                        <View style={{ height: 80 }} />
                    </ScrollView>
                )}

                {mode === 'out' && (
                    <ScrollView
                        refreshControl={<RefreshControl refreshing={issuesLoading} onRefresh={refetchIssues} />}
                    >
                        <View style={{ padding: 12 }}>
                            <Text style={styles.sectionTitle}>📤 Phiếu xuất gần đây</Text>
                            <Text style={styles.hint}>Bấm nút + bên dưới để xuất vật tư</Text>
                        </View>
                        {issuesLoading ? (
                            <ActivityIndicator style={{ marginTop: 12 }} color={COLORS.primary} />
                        ) : recentIssues.length === 0 ? (
                            <Text style={styles.emptyInline}>Chưa có phiếu xuất</Text>
                        ) : (
                            recentIssues.map(si => (
                                <View key={si.id} style={styles.card}>
                                    <View style={styles.cardRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.code}>{si.code}</Text>
                                            <Text style={styles.project}>
                                                {si.project?.name ? `📁 ${si.project.name}` : '🏬 Nội bộ'}
                                            </Text>
                                            <Text style={styles.supplier}>🏬 {si.warehouse?.name || '—'}</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={styles.date}>{formatDate(si.issuedDate)}</Text>
                                            <Text style={styles.itemCount}>{si.items?.length || 0} vật tư</Text>
                                        </View>
                                    </View>
                                </View>
                            ))
                        )}
                        <View style={{ height: 80 }} />
                    </ScrollView>
                )}

                {mode === 'out' && (
                    <Pressable style={styles.fab} onPress={() => router.push('/inventory/issue')}>
                        <Plus size={24} color="#fff" />
                    </Pressable>
                )}
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    tabBar: { flexDirection: 'row', gap: 6, padding: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.borderLight },
    tabBtnActive: { backgroundColor: COLORS.primary },
    tabBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
    tabBtnTextActive: { color: '#fff' },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
    hint: { fontSize: 12, color: COLORS.textLight, marginBottom: 8 },
    card: { marginHorizontal: 12, marginVertical: 4, padding: 12, backgroundColor: COLORS.white, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
    cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    code: { fontSize: 15, fontWeight: '700', color: COLORS.text, fontFamily: 'monospace' },
    supplier: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
    project: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    status: { fontSize: 11, fontWeight: '600' },
    amount: { fontSize: 13, color: COLORS.text, marginTop: 2, fontWeight: '600' },
    date: { fontSize: 12, color: COLORS.textSecondary },
    itemCount: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
    emptyInline: { textAlign: 'center', padding: 20, color: COLORS.textLight },
    fab: {
        position: 'absolute', bottom: 20, right: 20,
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6,
    },
});
