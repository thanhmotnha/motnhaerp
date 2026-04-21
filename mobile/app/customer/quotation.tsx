import React from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { ErrorState } from '@/components/ErrorState';
import { Card } from '@/components/ui/Card';
import { COLORS } from '@/lib/constants';
import { formatCurrency } from '@/lib/format';

function useCustomerQuotation() {
    return useQuery({
        queryKey: ['customer-quotation'],
        queryFn: () => apiFetch('/api/customer/quotation'),
    });
}

export default function CustomerQuotationScreen() {
    const { data, isLoading, isError, refetch, isRefetching } = useCustomerQuotation();
    const quotation = data as any;

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (isError) {
        return <ErrorState message="Không thể tải báo giá" onRetry={refetch} />;
    }

    if (!quotation) {
        return (
            <View style={styles.center}>
                <Text style={styles.empty}>Chưa có báo giá</Text>
            </View>
        );
    }

    const categories = quotation.categories || quotation.items || [];
    const total = quotation.total || quotation.totalAmount || 0;
    const managementFee = quotation.managementFee || 0;
    const grandTotal = quotation.grandTotal || total + managementFee;

    return (
        <>
            <Stack.Screen options={{ title: 'Báo giá dự án' }} />
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            >
                {/* Header */}
                <Card style={styles.headerCard}>
                    <Text style={styles.quotationCode}>{quotation.code}</Text>
                    <Text style={styles.quotationTitle}>{quotation.title || quotation.name || 'Báo giá'}</Text>
                    <Text style={styles.quotationDate}>
                        {quotation.date || quotation.createdAt
                            ? `Ngày: ${new Date(quotation.date || quotation.createdAt).toLocaleDateString('vi-VN')}`
                            : ''}
                    </Text>
                </Card>

                {/* Categories & Items */}
                {categories.map((cat: any, ci: number) => (
                    <Card key={ci} style={styles.categoryCard}>
                        <Text style={styles.categoryName}>
                            {cat.name || `Hạng mục ${ci + 1}`}
                        </Text>
                        {(cat.items || cat.subItems || []).map((item: any, ii: number) => (
                            <View key={ii} style={styles.itemRow}>
                                <Text style={styles.itemName} numberOfLines={2}>{item.name || item.description}</Text>
                                <View style={styles.itemRight}>
                                    <Text style={styles.itemQty}>
                                        {item.quantity} {item.unit}
                                    </Text>
                                    <Text style={styles.itemAmount}>{formatCurrency(item.totalPrice || item.amount)}</Text>
                                </View>
                            </View>
                        ))}
                        {cat.subtotal && (
                            <View style={styles.subtotalRow}>
                                <Text style={styles.subtotalLabel}>Tạm tính</Text>
                                <Text style={styles.subtotalValue}>{formatCurrency(cat.subtotal)}</Text>
                            </View>
                        )}
                    </Card>
                ))}

                {/* Totals */}
                <Card style={styles.totalCard}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Tổng chi phí trực tiếp</Text>
                        <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
                    </View>
                    {managementFee > 0 && (
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Phí quản lý</Text>
                            <Text style={styles.totalValue}>{formatCurrency(managementFee)}</Text>
                        </View>
                    )}
                    <View style={[styles.totalRow, styles.grandTotalRow]}>
                        <Text style={styles.grandTotalLabel}>Tổng cộng</Text>
                        <Text style={styles.grandTotalValue}>{formatCurrency(grandTotal)}</Text>
                    </View>
                </Card>

                {/* Payment info */}
                {quotation.payments && quotation.payments.length > 0 && (
                    <Card style={{ marginTop: 12 }}>
                        <Text style={styles.paymentTitle}>Thanh toán</Text>
                        {quotation.payments.map((p: any, i: number) => (
                            <View key={i} style={styles.paymentRow}>
                                <Text style={styles.paymentLabel}>{p.label || `Đợt ${i + 1}`}</Text>
                                <View>
                                    <Text style={[styles.paymentAmount, p.paid && { color: COLORS.success }]}>
                                        {formatCurrency(p.amount)}
                                    </Text>
                                    <Text style={styles.paymentStatus}>{p.paid ? '✅ Đã TT' : '⏳ Chưa TT'}</Text>
                                </View>
                            </View>
                        ))}
                    </Card>
                )}
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: 16, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { fontSize: 15, color: COLORS.textSecondary },
    headerCard: { marginBottom: 16 },
    quotationCode: { fontSize: 12, fontWeight: '700', color: COLORS.primary, letterSpacing: 1 },
    quotationTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginTop: 4 },
    quotationDate: { fontSize: 13, color: COLORS.textLight, marginTop: 4 },
    categoryCard: { marginBottom: 12 },
    categoryName: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginBottom: 10 },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
    itemName: { flex: 1, fontSize: 13, color: COLORS.text, marginRight: 8 },
    itemRight: { alignItems: 'flex-end' },
    itemQty: { fontSize: 12, color: COLORS.textLight },
    itemAmount: { fontSize: 13, fontWeight: '600', color: COLORS.text },
    subtotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
    subtotalLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
    subtotalValue: { fontSize: 14, fontWeight: '700', color: COLORS.text },
    totalCard: { marginTop: 12 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    totalLabel: { fontSize: 14, color: COLORS.textSecondary },
    totalValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
    grandTotalRow: { borderTopWidth: 2, borderTopColor: COLORS.primary, paddingTop: 12, marginTop: 4 },
    grandTotalLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
    grandTotalValue: { fontSize: 18, fontWeight: '800', color: COLORS.accent },
    paymentTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
    paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
    paymentLabel: { fontSize: 14, color: COLORS.text },
    paymentAmount: { fontSize: 14, fontWeight: '600', color: COLORS.text, textAlign: 'right' },
    paymentStatus: { fontSize: 11, color: COLORS.textLight, textAlign: 'right', marginTop: 2 },
});
