import React from 'react';
import {
    View, ScrollView, StyleSheet, Text, Pressable, ActivityIndicator,
    Image, Linking, RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Camera, Phone, Mail, MapPin, Calendar } from 'lucide-react-native';
import { useCustomer } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/lib/constants';
import type { CustomerInteraction } from '@/lib/types';

const fmtDate = (d: string) => new Date(d).toLocaleString('vi-VN');
const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}p trước`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h trước`;
    const days = Math.floor(h / 24);
    return `${days}d trước`;
};

function InteractionCard({ it }: { it: CustomerInteraction }) {
    return (
        <View style={styles.interaction}>
            <View style={styles.badgeRow}>
                <Text style={styles.typeBadge}>{it.type}</Text>
                {it.interestLevel ? (
                    <Text style={[styles.levelBadge, levelStyle(it.interestLevel)]}>{it.interestLevel}</Text>
                ) : null}
                {it.outcome ? (
                    <Text style={styles.outcomeBadge}>{it.outcome}</Text>
                ) : null}
                <Text style={styles.timestamp}>{timeAgo(it.date)}</Text>
            </View>
            <Text style={styles.content}>{it.content}</Text>
            {it.photos && it.photos.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                        {it.photos.map((url, i) => (
                            <Pressable key={i} onPress={() => Linking.openURL(url)}>
                                <Image source={{ uri: url }} style={styles.photo} />
                            </Pressable>
                        ))}
                    </View>
                </ScrollView>
            )}
            <Text style={styles.meta}>
                👤 {it.createdByUser?.name || 'Ẩn danh'}
                {it.companions && it.companions.length > 0
                    ? ` · Đi cùng: ${it.companions.map(c => c.name).join(', ')}`
                    : ''}
            </Text>
        </View>
    );
}

function levelStyle(lv: string) {
    if (lv === 'Nóng') return { backgroundColor: '#fee2e2', color: '#dc2626' };
    if (lv === 'Ấm') return { backgroundColor: '#fef3c7', color: '#d97706' };
    if (lv === 'Lạnh') return { backgroundColor: '#dbeafe', color: '#2563eb' };
    return {};
}

export default function CustomerDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const { data: c, isLoading, refetch, isRefetching } = useCustomer(id);

    const canCheckin = ['kinh_doanh', 'giam_doc', 'ke_toan'].includes(user?.role || '');
    const canCheckinForThis = canCheckin && (
        user?.role !== 'kinh_doanh' || c?.salesPersonId === user?.id
    );

    if (isLoading || !c) {
        return (
            <>
                <Stack.Screen options={{ title: 'Chi tiết KH', headerStyle: { backgroundColor: COLORS.primary }, headerTintColor: '#fff' }} />
                <View style={styles.loadingView}><ActivityIndicator color={COLORS.primary} /></View>
            </>
        );
    }

    return (
        <>
            <Stack.Screen options={{ title: c.name, headerStyle: { backgroundColor: COLORS.primary }, headerTintColor: '#fff' }} />
            <ScrollView
                style={styles.container}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            >
                <View style={styles.header}>
                    <Text style={styles.code}>{c.code}</Text>
                    <Text style={styles.name}>{c.name}</Text>
                    <View style={styles.pipelineRow}>
                        <Text style={styles.pipelineBadge}>{c.pipelineStage}</Text>
                        {c.salesPerson?.name && <Text style={styles.owner}>👤 {c.salesPerson.name}</Text>}
                    </View>
                    <View style={{ gap: 8, marginTop: 12 }}>
                        {c.phone && (
                            <Pressable onPress={() => Linking.openURL(`tel:${c.phone}`)} style={styles.contactRow}>
                                <Phone size={16} color={COLORS.primary} />
                                <Text style={styles.contactText}>{c.phone}</Text>
                            </Pressable>
                        )}
                        {c.email && (
                            <Pressable onPress={() => Linking.openURL(`mailto:${c.email}`)} style={styles.contactRow}>
                                <Mail size={16} color={COLORS.primary} />
                                <Text style={styles.contactText}>{c.email}</Text>
                            </Pressable>
                        )}
                        {c.address && (
                            <View style={styles.contactRow}>
                                <MapPin size={16} color={COLORS.textSecondary} />
                                <Text style={[styles.contactText, { color: COLORS.text }]}>{c.address}</Text>
                            </View>
                        )}
                        {c.lastContactAt && (
                            <View style={styles.contactRow}>
                                <Calendar size={16} color={COLORS.textSecondary} />
                                <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>Liên hệ cuối: {timeAgo(c.lastContactAt)}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {canCheckinForThis && (
                    <Pressable
                        style={styles.checkinBtn}
                        onPress={() => router.push(`/customers/${id}/checkin`)}
                    >
                        <Camera size={20} color="#fff" />
                        <Text style={styles.checkinBtnText}>Check-in / Ghi nhận</Text>
                    </Pressable>
                )}

                <Text style={styles.sectionTitle}>Lịch sử tương tác ({c.interactions?.length || 0})</Text>
                {(c.interactions || []).length === 0 ? (
                    <Text style={styles.emptyText}>Chưa có tương tác nào</Text>
                ) : (
                    (c.interactions || []).map(it => <InteractionCard key={it.id} it={it} />)
                )}
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingView: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { backgroundColor: COLORS.white, padding: 16, margin: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
    code: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'monospace' },
    name: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginTop: 4 },
    pipelineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
    pipelineBadge: { backgroundColor: COLORS.primaryLight, color: '#fff', fontSize: 12, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
    owner: { fontSize: 12, color: COLORS.textSecondary },
    contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    contactText: { fontSize: 14, color: COLORS.primary },
    checkinBtn: {
        marginHorizontal: 12, marginBottom: 12,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 10,
    },
    checkinBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginHorizontal: 16, marginTop: 6, marginBottom: 8, textTransform: 'uppercase' },
    emptyText: { textAlign: 'center', color: COLORS.textLight, paddingVertical: 32 },
    interaction: { backgroundColor: COLORS.white, marginHorizontal: 12, marginBottom: 8, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
    badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 },
    typeBadge: { backgroundColor: '#e5e7eb', color: '#374151', fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
    levelBadge: { fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
    outcomeBadge: { backgroundColor: '#e0e7ff', color: '#4338ca', fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
    timestamp: { fontSize: 11, color: COLORS.textLight, marginLeft: 'auto' },
    content: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
    photo: { width: 80, height: 80, borderRadius: 6, backgroundColor: COLORS.border },
    meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },
});
