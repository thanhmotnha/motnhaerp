import React, { useState, useCallback, useRef } from 'react';
import {
    View, FlatList, RefreshControl, StyleSheet, TextInput, Text, Pressable,
    ActivityIndicator, Alert,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Search, Users, Phone } from 'lucide-react-native';
import { useCustomers, useClaimCustomer } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/lib/constants';
import type { Customer } from '@/lib/types';

type OwnerFilter = 'mine' | 'unassigned' | 'all';

const daysSince = (d: string | null) => d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : null;

function CustomerCard({ c, myUserId, isNvkd, onClaim }: {
    c: Customer; myUserId?: string; isNvkd: boolean; onClaim: (id: string) => void;
}) {
    const days = daysSince(c.lastContactAt);
    const owned = c.salesPersonId === myUserId;
    const unowned = !c.salesPersonId;
    return (
        <Pressable onPress={() => router.push(`/customers/${c.id}`)} style={styles.card}>
            <View style={styles.cardRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{c.name}</Text>
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 }}>
                        <Phone size={12} color={COLORS.textSecondary} />
                        <Text style={styles.cardPhone}>{c.phone}</Text>
                    </View>
                </View>
                <View style={[styles.badge, { backgroundColor: pipelineColor(c.pipelineStage) + '22' }]}>
                    <Text style={[styles.badgeText, { color: pipelineColor(c.pipelineStage) }]}>{c.pipelineStage}</Text>
                </View>
            </View>
            <View style={styles.cardMeta}>
                <Text style={[styles.cardOwner, owned && { color: COLORS.success }]}>
                    {c.salesPerson?.name ? `👤 ${c.salesPerson.name}` : '❓ Chưa chủ'}
                </Text>
                {days !== null ? (
                    <Text style={[styles.cardDays, { color: days > 14 ? COLORS.danger : days > 7 ? COLORS.warning : COLORS.success }]}>
                        🕐 {days === 0 ? 'Hôm nay' : `${days}d`}
                    </Text>
                ) : (
                    <Text style={styles.cardDays}>Chưa liên hệ</Text>
                )}
            </View>
            {isNvkd && unowned && (
                <Pressable style={styles.claimBtn} onPress={() => onClaim(c.id)}>
                    <Text style={styles.claimBtnText}>🙋 Nhận khách này</Text>
                </Pressable>
            )}
        </Pressable>
    );
}

function pipelineColor(stage: string): string {
    const m: Record<string, string> = {
        'Lead': '#94a3b8', 'Prospect': '#f59e0b', 'Tư vấn': '#3b82f6',
        'Báo giá': '#8b5cf6', 'Ký HĐ': '#10b981', 'Thi công': '#f97316',
        'Cọc': '#10b981', 'Dừng': '#ef4444', 'VIP': '#ec4899',
    };
    return m[stage] || COLORS.textSecondary;
}

export default function CustomersScreen() {
    const { user } = useAuth();
    const isNvkd = user?.role === 'kinh_doanh';
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filter, setFilter] = useState<OwnerFilter>(isNvkd ? 'mine' : 'all');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { data, isLoading, refetch, isRefetching } = useCustomers({ search: debouncedSearch });
    const claim = useClaimCustomer();

    const handleSearchChange = useCallback((text: string) => {
        setSearchInput(text);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setDebouncedSearch(text), 400);
    }, []);

    const customers = (data?.data || []).filter(c => {
        if (filter === 'mine') return c.salesPersonId === user?.id;
        if (filter === 'unassigned') return !c.salesPersonId;
        return true;
    });

    const handleClaim = (id: string) => {
        Alert.alert('Xác nhận', 'Nhận khách này làm khách của bạn?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Nhận', onPress: () => claim.mutate(id, {
                    onSuccess: () => { Alert.alert('✓', 'Đã nhận khách'); refetch(); },
                    onError: (e: any) => Alert.alert('Lỗi', e.message),
                }),
            },
        ]);
    };

    return (
        <>
            <Stack.Screen options={{ title: 'Khách hàng', headerStyle: { backgroundColor: COLORS.primary }, headerTintColor: '#fff' }} />
            <View style={styles.container}>
                <View style={styles.searchBar}>
                    <Search size={18} color={COLORS.textLight} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm tên / SĐT / mã KH..."
                        placeholderTextColor={COLORS.textLight}
                        value={searchInput}
                        onChangeText={handleSearchChange}
                    />
                </View>

                <View style={styles.filterTabs}>
                    {isNvkd && (
                        <>
                            <FilterTab label="🙋 Của tôi" active={filter === 'mine'} onPress={() => setFilter('mine')} />
                            <FilterTab label="❓ Chưa chủ" active={filter === 'unassigned'} onPress={() => setFilter('unassigned')} />
                        </>
                    )}
                    {!isNvkd && (
                        <>
                            <FilterTab label="Tất cả" active={filter === 'all'} onPress={() => setFilter('all')} />
                            <FilterTab label="Chưa chủ" active={filter === 'unassigned'} onPress={() => setFilter('unassigned')} />
                        </>
                    )}
                </View>

                <FlatList
                    data={customers}
                    keyExtractor={(c) => c.id}
                    renderItem={({ item }) => (
                        <CustomerCard c={item} myUserId={user?.id} isNvkd={isNvkd} onClaim={handleClaim} />
                    )}
                    contentContainerStyle={{ padding: 12, gap: 8 }}
                    refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
                    ListEmptyComponent={
                        isLoading ? (
                            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
                        ) : (
                            <View style={{ alignItems: 'center', padding: 40 }}>
                                <Users size={48} color={COLORS.textLight} />
                                <Text style={{ color: COLORS.textLight, marginTop: 8 }}>
                                    {filter === 'mine' ? 'Bạn chưa có khách nào' : 'Không có khách hàng'}
                                </Text>
                            </View>
                        )
                    }
                />
            </View>
        </>
    );
}

function FilterTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
        <Pressable onPress={onPress} style={[styles.filterTab, active && styles.filterTabActive]}>
            <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        margin: 12, paddingHorizontal: 12, paddingVertical: 8,
        backgroundColor: COLORS.white, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
    },
    searchInput: { flex: 1, fontSize: 15, color: COLORS.text },
    filterTabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, marginBottom: 6 },
    filterTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
    filterTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    filterTabText: { fontSize: 13, color: COLORS.text },
    filterTabTextActive: { color: COLORS.white, fontWeight: '600' },
    card: { backgroundColor: COLORS.white, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: COLORS.border },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    cardName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
    cardPhone: { fontSize: 13, color: COLORS.textSecondary },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
    badgeText: { fontSize: 11, fontWeight: '600' },
    cardMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
    cardOwner: { fontSize: 12, color: COLORS.textSecondary },
    cardDays: { fontSize: 12 },
    claimBtn: { marginTop: 8, backgroundColor: COLORS.primary, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
    claimBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 13 },
});
