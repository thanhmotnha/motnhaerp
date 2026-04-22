import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
    ActivityIndicator, RefreshControl, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors, { cardShadow, radius, fontWeight } from '@/constants/Colors';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';

const c = Colors.light;
const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n || 0) + 'đ';
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
    'Nháp': { bg: '#f1f5f9', color: '#64748b' },
    'Gửi KH': { bg: '#dbeafe', color: '#1d4ed8' },
    'Chấp nhận': { bg: '#dcfce7', color: '#15803d' },
    'Từ chối': { bg: '#fee2e2', color: '#b91c1c' },
    'Hết hạn': { bg: '#fef3c7', color: '#92400e' },
    'Đã chốt': { bg: '#d1fae5', color: '#047857' },
};

export default function QuotationsScreen() {
    const router = useRouter();
    const toast = useToast();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');

    const load = useCallback(async () => {
        try {
            const qs = new URLSearchParams({ limit: '100' });
            if (search) qs.set('search', search);
            const res = await apiFetch(`/api/quotations?${qs}`);
            setItems(res?.data || []);
        } catch (e: any) { toast.show(e.message || 'Lỗi', 'error'); }
        finally { setLoading(false); setRefreshing(false); }
    }, [search]);

    useEffect(() => { load(); }, [load]);

    const totalValue = items.reduce((s, q) => s + (q.totalAmount || q.subtotal || 0), 0);

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={c.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={s.headerTitle}>Báo giá</Text>
                    <Text style={s.headerSub}>{items.length} BG · {fmt(totalValue)}</Text>
                </View>
            </View>

            <View style={s.searchBar}>
                <Ionicons name="search" size={18} color={c.textMuted} />
                <TextInput
                    style={s.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Tìm mã BG / khách..."
                    placeholderTextColor={c.textMuted}
                />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={c.primary} style={{ marginTop: 40 }} />
            ) : (
                <ScrollView
                    contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}
                >
                    {items.length === 0 ? (
                        <View style={s.empty}>
                            <Ionicons name="document-outline" size={48} color={c.textMuted} />
                            <Text style={{ color: c.textMuted, marginTop: 8 }}>Không có báo giá</Text>
                        </View>
                    ) : (
                        items.map(q => {
                            const st = STATUS_COLORS[q.status] || { bg: '#f1f5f9', color: '#64748b' };
                            const value = q.totalAmount || q.subtotal || 0;
                            return (
                                <Pressable key={q.id} style={s.card}>
                                    <View style={s.cardTop}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.code}>{q.code}</Text>
                                            <Text style={s.title} numberOfLines={2}>{q.title || '(không tiêu đề)'}</Text>
                                            <View style={s.meta}>
                                                <Ionicons name="person-outline" size={12} color={c.textMuted} />
                                                <Text style={s.metaText}>{q.customer?.name || '—'}</Text>
                                            </View>
                                            {q.project?.name && (
                                                <View style={s.meta}>
                                                    <Ionicons name="folder-outline" size={12} color={c.textMuted} />
                                                    <Text style={s.metaText}>{q.project.name}</Text>
                                                </View>
                                            )}
                                            <View style={s.meta}>
                                                <Ionicons name="calendar-outline" size={12} color={c.textMuted} />
                                                <Text style={s.metaText}>{fmtDate(q.issueDate || q.createdAt)}</Text>
                                            </View>
                                        </View>
                                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                                            <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                                                <Text style={[s.statusText, { color: st.color }]}>{q.status}</Text>
                                            </View>
                                            <Text style={s.amount}>{fmt(value)}</Text>
                                            {q.validUntil && new Date(q.validUntil) < new Date() && (
                                                <Text style={s.expired}>⚠ Hết hạn</Text>
                                            )}
                                        </View>
                                    </View>
                                </Pressable>
                            );
                        })
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: fontWeight.title, color: c.text },
    headerSub: { fontSize: 13, color: c.textMuted, marginTop: 2 },

    searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: c.card, borderRadius: radius.button, borderWidth: 1, borderColor: c.borderP10 },
    searchInput: { flex: 1, fontSize: 14, color: c.text },

    card: { backgroundColor: c.card, borderRadius: radius.card, padding: 14, marginBottom: 10, ...cardShadow },
    cardTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    code: { fontSize: 12, color: c.primary, fontFamily: 'monospace', fontWeight: fontWeight.title, letterSpacing: 0.5 },
    title: { fontSize: 15, fontWeight: fontWeight.title, color: c.text, marginTop: 4 },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    metaText: { fontSize: 12, color: c.textSecondary },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
    statusText: { fontSize: 11, fontWeight: fontWeight.title, textTransform: 'uppercase', letterSpacing: 0.5 },
    amount: { fontSize: 14, fontWeight: fontWeight.title, color: c.text },
    expired: { fontSize: 11, color: c.danger, fontWeight: fontWeight.title },

    empty: { alignItems: 'center', padding: 40 },
});
