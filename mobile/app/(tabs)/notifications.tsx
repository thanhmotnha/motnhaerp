import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, StyleSheet, TouchableOpacity,
    RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { apiFetch } from '@/lib/api';
import Colors, { cardShadow, radius, fontWeight } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';

const c = Colors.light;

const ICON_MAP: Record<string, { icon: string; color: string }> = {
    approval: { icon: 'checkmark-done', color: '#16a34a' },
    task: { icon: 'calendar', color: c.primary },
    material: { icon: 'cube', color: c.accent },
    production: { icon: 'construct', color: '#8b5cf6' },
    info: { icon: 'information-circle', color: c.primary },
    warning: { icon: 'alert-circle', color: '#f59e0b' },
    danger: { icon: 'warning', color: '#ef4444' },
    system: { icon: 'information-circle', color: '#6b7280' },
};

const getNotificationKey = (item: any) => item.id || [
    item.source || 'computed',
    item.type || '',
    item.link || '',
    item.title || item.message || '',
    item.createdAt || '',
].join('::');

const appendRouteParams = (route: string, params: Record<string, string | null | undefined>) => {
    const search = Object.entries(params)
        .filter(([, value]) => value)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&');

    return search ? `${route}?${search}` : route;
};

const parseLink = (rawLink?: string | null) => {
    if (!rawLink) return { pathname: '', searchParams: new URLSearchParams() };

    try {
        const url = new URL(rawLink, 'https://erp.motnha.vn');
        return { pathname: url.pathname, searchParams: url.searchParams };
    } catch {
        const [pathname = '', query = ''] = String(rawLink).split('?');
        return { pathname, searchParams: new URLSearchParams(query) };
    }
};

const resolveNotificationRoute = (item: any) => {
    const params = {
        projectId: item?.projectId || null,
        poId: item?.poId || null,
        materialPlanId: item?.materialPlanId || null,
    };

    if (typeof item?.route === 'string' && item.route.startsWith('/')) {
        return appendRouteParams(item.route, params);
    }

    const { pathname, searchParams } = parseLink(item?.link);
    const projectId = params.projectId || searchParams.get('projectId');
    const poId = params.poId || searchParams.get('poId');
    const materialPlanId = params.materialPlanId || searchParams.get('materialPlanId');
    const projectDetailId = searchParams.get('id') || projectId;
    const loweredText = `${item?.title || ''} ${item?.message || ''}`.toLowerCase();

    switch (pathname) {
        case '/projects':
            return projectDetailId ? `/projects/${projectDetailId}` : '/(tabs)/projects';
        case '/purchasing':
            return appendRouteParams('/purchasing', { projectId, poId, materialPlanId });
        case '/material-requisitions':
        case '/material-plans':
        case '/products':
            return appendRouteParams('/material-request', { projectId, materialPlanId, poId });
        case '/schedule':
        case '/work-orders':
            return appendRouteParams('/schedule', { projectId });
        case '/daily-logs':
            return appendRouteParams('/daily-log', { projectId });
        case '/warranty':
            return appendRouteParams('/warranty', { projectId });
        case '/acceptance':
            return appendRouteParams('/acceptance-check', { projectId });
        case '/hr':
        case '/leave-requests':
            return '/leave-request';
        default:
            break;
    }

    if (item?.type === 'approval') return '/approvals';
    if (item?.type === 'production') return '/production';
    if (item?.type === 'material') {
        return appendRouteParams('/material-request', { projectId, materialPlanId, poId });
    }
    if (item?.type === 'task') {
        return appendRouteParams('/schedule', { projectId });
    }
    if (loweredText.includes('bao hanh')) {
        return appendRouteParams('/warranty', { projectId });
    }
    if (loweredText.includes('nghi phep')) {
        return '/leave-request';
    }
    return null;
};

function Skeleton({ width, height, style }: any) {
    return (
        <View
            style={[
                { width, height, backgroundColor: c.skeletonBase, borderRadius: 8 },
                style,
            ]}
        />
    );
}

export default function NotificationsScreen() {
    const router = useRouter();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await apiFetch('/api/notifications?limit=50');
            const data = res?.data || res || [];
            setItems(data.map((item: any) => ({ ...item, _key: getNotificationKey(item) })));
        } catch {
            setItems([]);
        }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    useFocusEffect(
        React.useCallback(() => {
            load();
            return undefined;
        }, [load]),
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    const markRead = async (item: any) => {
        const itemKey = getNotificationKey(item);
        try {
            if (item?.id && item?.source !== 'computed') {
                await apiFetch(`/api/notifications/${item.id}`, { method: 'PATCH' });
            }
        } catch { }
        setItems(prev => prev.map((n) => getNotificationKey(n) === itemKey ? { ...n, isRead: true } : n));
        const route = resolveNotificationRoute(item);
        if (route) router.push(route as any);
    };

    const timeAgo = (date: string) => {
        if (!date) return '';
        const diff = Date.now() - new Date(date).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins} ph\u00fat`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs} gi\u1edd`;
        return `${Math.floor(hrs / 24)} ng\u00e0y`;
    };

    const getIcon = (type: string) => ICON_MAP[type] || ICON_MAP.system;
    const unreadCount = items.filter((item) => !item.isRead).length;

    if (loading) {
        return (
            <SafeAreaView style={s.safe} edges={['top']}>
                <View style={s.header}>
                    <View>
                        <Text style={s.headerTitle}>Th\u00f4ng b\u00e1o</Text>
                        <Text style={s.headerSub}>Theo doi phe duyet, cong viec va canh bao moi nhat</Text>
                    </View>
                </View>
                <View style={{ paddingHorizontal: 16, gap: 12, paddingTop: 16 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                        <View key={i} style={s.skeletonCard}>
                            <Skeleton width={44} height={44} style={{ borderRadius: 12 }} />
                            <View style={{ flex: 1, gap: 6 }}>
                                <Skeleton width="70%" height={14} />
                                <Skeleton width="90%" height={12} />
                                <Skeleton width="30%" height={10} />
                            </View>
                        </View>
                    ))}
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            <View style={s.header}>
                <View>
                    <Text style={s.headerTitle}>Th\u00f4ng b\u00e1o</Text>
                    <Text style={s.headerSub}>Theo doi phe duyet, cong viec va canh bao moi nhat</Text>
                </View>
                {unreadCount > 0 && (
                    <View style={s.unreadBadge}>
                        <Text style={s.unreadText}>{unreadCount}</Text>
                    </View>
                )}
            </View>

            {items.length === 0 ? (
                <View style={s.emptyBox}>
                    <View style={s.emptyIcon}>
                        <Ionicons name="notifications-outline" size={40} color={c.primary} />
                    </View>
                    <Text style={s.emptyTitle}>Ch\u01b0a c\u00f3 th\u00f4ng b\u00e1o</Text>
                    <Text style={s.emptyDesc}>
                        C\u00e1c th\u00f4ng b\u00e1o m\u1edbi s\u1ebd xu\u1ea5t hi\u1ec7n \u1edf \u0111\u00e2y
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(item) => item._key || getNotificationKey(item)}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[c.primary]}
                            tintColor={c.primary}
                        />
                    }
                    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 }}
                    ListHeaderComponent={(
                        <View style={s.summaryCard}>
                            <View style={s.summaryGlow} />
                            <View style={s.summaryCopy}>
                                <Text style={s.summaryEyebrow}>Inbox</Text>
                                <Text style={s.summaryTitle}>{unreadCount} muc can xem</Text>
                                <Text style={s.summaryText}>
                                    Tap vao tung the de danh dau da doc va di thang den dung man hinh lien quan.
                                </Text>
                            </View>
                            <View style={s.summaryBadge}>
                                <Ionicons name="flash-outline" size={18} color={c.accentLight} />
                            </View>
                        </View>
                    )}
                    renderItem={({ item }) => {
                        const iconInfo = getIcon(item.type);
                        const sourceLabel = item.source === 'computed' ? 'Realtime' : 'Da luu';
                        return (
                            <TouchableOpacity
                                style={[s.card, !item.isRead && s.cardUnread]}
                                activeOpacity={0.7}
                                onPress={() => markRead(item)}>
                                <View
                                    style={[
                                        s.iconBox,
                                        { backgroundColor: iconInfo.color + '15' },
                                    ]}>
                                    <Ionicons
                                        name={iconInfo.icon as any}
                                        size={22}
                                        color={iconInfo.color}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={s.cardTop}>
                                        <Text style={s.cardTitle} numberOfLines={1}>
                                            {item.title || item.message}
                                        </Text>
                                        <View style={s.sourcePill}>
                                            <Text style={s.sourceText}>{sourceLabel}</Text>
                                        </View>
                                    </View>
                                    {(item.body || item.message) && (
                                        <Text style={s.cardBody} numberOfLines={2}>
                                            {item.body || item.message}
                                        </Text>
                                    )}
                                    <Text style={s.cardTime}>{timeAgo(item.createdAt)} tr\u01b0\u1edbc</Text>
                                </View>
                                {!item.isRead && <View style={s.unreadDot} />}
                            </TouchableOpacity>
                        );
                    }}
                />
            )}
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bgGradientStart },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        paddingHorizontal: 20, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: c.borderP5,
    },
    headerTitle: { fontSize: 22, fontWeight: fontWeight.title, color: c.primary },
    headerSub: { fontSize: 12, color: c.textMuted, marginTop: 4, maxWidth: 260, lineHeight: 18 },
    unreadBadge: {
        backgroundColor: '#ef4444', borderRadius: 10,
        minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 6,
    },
    unreadText: { fontSize: 11, fontWeight: fontWeight.title, color: '#fff' },
    summaryCard: {
        marginBottom: 14,
        padding: 18,
        borderRadius: 22,
        backgroundColor: c.primaryDark,
        overflow: 'hidden',
        shadowColor: c.primaryDark,
        shadowOpacity: 0.18,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 5,
    },
    summaryGlow: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        right: -40,
        top: -60,
        backgroundColor: 'rgba(197,160,89,0.18)',
    },
    summaryCopy: { paddingRight: 56 },
    summaryEyebrow: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.58)',
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        fontWeight: fontWeight.label,
    },
    summaryTitle: {
        fontSize: 22,
        color: '#fff',
        fontWeight: fontWeight.title,
        marginTop: 6,
    },
    summaryText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        lineHeight: 18,
        marginTop: 8,
    },
    summaryBadge: {
        position: 'absolute',
        right: 16,
        top: 16,
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    skeletonCard: {
        flexDirection: 'row', gap: 12, padding: 14,
        backgroundColor: c.card, borderRadius: radius.card,
        ...cardShadow,
    },

    card: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        padding: 16, marginBottom: 8,
        backgroundColor: c.card,
        borderRadius: radius.card,
        borderWidth: 1, borderColor: c.borderP5,
        borderLeftWidth: 4,
        borderLeftColor: 'transparent',
        ...cardShadow,
    },
    cardUnread: {
        backgroundColor: c.primary + '05',
        borderColor: c.primary + '20',
        borderLeftColor: c.primary,
    },
    iconBox: {
        width: 44, height: 44, borderRadius: radius.iconBox,
        alignItems: 'center', justifyContent: 'center',
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardTitle: { fontSize: 14, fontWeight: fontWeight.secondary, color: c.text },
    cardBody: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    cardTime: { fontSize: 11, color: c.textMuted, marginTop: 4 },
    sourcePill: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: radius.pill,
        backgroundColor: c.borderP10,
        marginLeft: 'auto',
    },
    sourceText: {
        fontSize: 10,
        color: c.textMuted,
        fontWeight: fontWeight.title,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    unreadDot: {
        width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary,
    },

    emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
    emptyIcon: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: c.borderP10,
        alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    },
    emptyTitle: { fontSize: 18, fontWeight: fontWeight.title, color: c.text },
    emptyDesc: { fontSize: 14, color: c.textMuted },
});
