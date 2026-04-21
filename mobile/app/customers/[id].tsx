import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, Image,
    ActivityIndicator, RefreshControl, Linking, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors, { cardShadow, radius, fontWeight } from '@/constants/Colors';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';

const c = Colors.light;

const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}p trước`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h trước`;
    return `${Math.floor(h / 24)}d trước`;
};

const LEVEL_COLORS: Record<string, string> = {
    'Nóng': c.danger, 'Ấm': c.warning, 'Lạnh': c.info,
};

export default function CustomerDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuth();
    const toast = useToast();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await apiFetch(`/api/customers/${id}`);
            setData(res);
        } catch (e: any) {
            toast.show(e.message || 'Lỗi', 'error');
        } finally { setLoading(false); setRefreshing(false); }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    if (loading || !data) {
        return (
            <SafeAreaView style={s.container} edges={['top']}>
                <ActivityIndicator size="large" color={c.primary} style={{ marginTop: 40 }} />
            </SafeAreaView>
        );
    }

    const canCheckin = user?.role !== 'kho' && user?.role !== 'ky_thuat';
    const canCheckinForThis = canCheckin && (user?.role !== 'kinh_doanh' || data.salesPersonId === user?.id);
    const interactions = data.interactions || [];

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={c.text} />
                </TouchableOpacity>
                <Text style={s.headerTitle} numberOfLines={1}>{data.name}</Text>
            </View>

            <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}
            >
                {/* Main info card */}
                <View style={s.card}>
                    <View style={s.rowCode}>
                        <Text style={s.code}>{data.code}</Text>
                        <View style={[s.pipelineBadge, { backgroundColor: c.primary }]}>
                            <Text style={s.pipelineBadgeText}>{data.pipelineStage}</Text>
                        </View>
                    </View>
                    <Text style={s.name}>{data.name}</Text>

                    <View style={{ gap: 10, marginTop: 12 }}>
                        {data.phone && (
                            <TouchableOpacity onPress={() => Linking.openURL(`tel:${data.phone}`)} style={s.contactRow}>
                                <View style={s.contactIcon}><Ionicons name="call" size={16} color={c.primary} /></View>
                                <Text style={s.contactText}>{data.phone}</Text>
                                <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
                            </TouchableOpacity>
                        )}
                        {data.email && (
                            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${data.email}`)} style={s.contactRow}>
                                <View style={s.contactIcon}><Ionicons name="mail" size={16} color={c.primary} /></View>
                                <Text style={s.contactText}>{data.email}</Text>
                            </TouchableOpacity>
                        )}
                        {data.address && (
                            <View style={s.contactRow}>
                                <View style={s.contactIcon}><Ionicons name="location" size={16} color={c.primary} /></View>
                                <Text style={[s.contactText, { color: c.text }]}>{data.address}</Text>
                            </View>
                        )}
                        {data.salesPerson?.name && (
                            <View style={s.contactRow}>
                                <View style={s.contactIcon}><Ionicons name="person" size={16} color={c.accent} /></View>
                                <Text style={s.contactText}>NVKD: <Text style={{ fontWeight: fontWeight.title }}>{data.salesPerson.name}</Text></Text>
                            </View>
                        )}
                        {data.lastContactAt && (
                            <View style={s.contactRow}>
                                <View style={s.contactIcon}><Ionicons name="time" size={16} color={c.textMuted} /></View>
                                <Text style={[s.contactText, { color: c.textMuted }]}>Liên hệ cuối: {timeAgo(data.lastContactAt)}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Check-in CTA */}
                {canCheckinForThis && (
                    <TouchableOpacity
                        onPress={() => router.push(`/customers/${id}/checkin` as any)}
                        style={s.checkinBtn}
                    >
                        <Ionicons name="camera" size={22} color="#fff" />
                        <Text style={s.checkinBtnText}>Check-in / Ghi nhận tương tác</Text>
                    </TouchableOpacity>
                )}

                {/* Timeline */}
                <Text style={s.sectionTitle}>LỊCH SỬ TƯƠNG TÁC ({interactions.length})</Text>
                {interactions.length === 0 ? (
                    <View style={[s.card, { alignItems: 'center', padding: 32 }]}>
                        <Ionicons name="chatbubbles-outline" size={36} color={c.textMuted} />
                        <Text style={{ color: c.textMuted, marginTop: 8 }}>Chưa có tương tác</Text>
                    </View>
                ) : (
                    interactions.map((it: any) => (
                        <View key={it.id} style={s.interaction}>
                            <View style={s.interactionHead}>
                                <View style={s.badgesRow}>
                                    <View style={s.typeBadge}>
                                        <Text style={s.typeBadgeText}>{it.type}</Text>
                                    </View>
                                    {it.interestLevel && (
                                        <View style={[s.levelBadge, { backgroundColor: (LEVEL_COLORS[it.interestLevel] || c.textMuted) + '22' }]}>
                                            <Text style={[s.levelBadgeText, { color: LEVEL_COLORS[it.interestLevel] || c.textMuted }]}>
                                                {it.interestLevel}
                                            </Text>
                                        </View>
                                    )}
                                    {it.outcome && (
                                        <View style={[s.levelBadge, { backgroundColor: '#e0e7ff' }]}>
                                            <Text style={[s.levelBadgeText, { color: '#4338ca' }]}>{it.outcome}</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={s.timestamp}>{timeAgo(it.date)}</Text>
                            </View>
                            <Text style={s.content}>{it.content}</Text>
                            {it.photos && it.photos.length > 0 && (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                                    <View style={{ flexDirection: 'row', gap: 6 }}>
                                        {it.photos.map((url: string, i: number) => (
                                            <Pressable key={i} onPress={() => Linking.openURL(url)}>
                                                <Image source={{ uri: url }} style={s.photo} />
                                            </Pressable>
                                        ))}
                                    </View>
                                </ScrollView>
                            )}
                            <View style={s.metaRow}>
                                <Ionicons name="person-circle-outline" size={14} color={c.textMuted} />
                                <Text style={s.metaText}>
                                    {it.createdByUser?.name || 'Ẩn danh'}
                                    {it.companions && it.companions.length > 0 && ` · Đi cùng: ${it.companions.map((x: any) => x.name).join(', ')}`}
                                </Text>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: fontWeight.title, color: c.text, flex: 1 },

    card: { backgroundColor: c.card, borderRadius: radius.card, padding: 16, marginBottom: 12, ...cardShadow },
    rowCode: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    code: { fontSize: 12, color: c.textMuted, fontFamily: 'monospace', fontWeight: fontWeight.title, letterSpacing: 1 },
    pipelineBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill },
    pipelineBadgeText: { color: '#fff', fontSize: 11, fontWeight: fontWeight.title, textTransform: 'uppercase', letterSpacing: 0.5 },
    name: { fontSize: 22, fontWeight: fontWeight.title, color: c.text, marginTop: 6 },

    contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    contactIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: c.primary + '10', alignItems: 'center', justifyContent: 'center' },
    contactText: { flex: 1, fontSize: 14, color: c.primary, fontWeight: fontWeight.label },

    checkinBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: c.primary, paddingVertical: 14, borderRadius: radius.button, marginBottom: 24,
        ...cardShadow,
    },
    checkinBtnText: { color: '#fff', fontSize: 15, fontWeight: fontWeight.title },

    sectionTitle: { fontSize: 11, fontWeight: fontWeight.title, color: c.textMuted, letterSpacing: 1, marginBottom: 10, marginLeft: 4 },

    interaction: { backgroundColor: c.card, borderRadius: radius.card, padding: 14, marginBottom: 8, ...cardShadow },
    interactionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
    badgesRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 },
    typeBadge: { backgroundColor: c.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
    typeBadgeText: { fontSize: 11, color: c.textSecondary, fontWeight: fontWeight.secondary },
    levelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
    levelBadgeText: { fontSize: 11, fontWeight: fontWeight.title },
    timestamp: { fontSize: 11, color: c.textMuted },
    content: { fontSize: 14, color: c.text, lineHeight: 20 },
    photo: { width: 80, height: 80, borderRadius: 8, backgroundColor: c.border },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.borderP5 },
    metaText: { fontSize: 12, color: c.textMuted },
});
