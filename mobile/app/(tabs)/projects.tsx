import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors, { cardShadow, fontWeight } from '@/constants/Colors';
import { useAuth } from '@/lib/auth';
import { apiFetchAllPages } from '@/lib/api';
import { getProjectRoleLabel, isAssignedProjectRole } from '@/lib/projectRoles';

const c = Colors.light;

const stripVietnamese = (value?: string | null) =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

const getProjectStatusKey = (status?: string | null) => {
    const normalized = stripVietnamese(status);

    if (normalized.includes('dang thi cong') || normalized === 'thi cong') return 'active';
    if (normalized.includes('hoan thanh')) return 'done';
    if (normalized.includes('khao sat')) return 'survey';
    if (normalized.includes('thiet ke')) return 'design';
    return 'other';
};

const getStatusColor = (status?: string | null) => {
    switch (getProjectStatusKey(status)) {
        case 'active':
            return '#f59e0b';
        case 'done':
            return '#16a34a';
        case 'survey':
            return '#64748b';
        case 'design':
            return '#3b82f6';
        default:
            return c.primary;
    }
};

const Skeleton = ({ width, height, style }: any) => {
    const anim = useRef(new Animated.Value(0.35)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0.35, duration: 700, useNativeDriver: true }),
            ]),
        ).start();
    }, [anim]);

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius: 14,
                    backgroundColor: c.skeletonBase,
                    opacity: anim,
                },
                style,
            ]}
        />
    );
};

export default function ProjectsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const isFieldUser = isAssignedProjectRole(user?.role);
    const roleLabel = getProjectRoleLabel(user?.role);

    const [projects, setProjects] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            setProjects(await apiFetchAllPages('/api/projects'));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            load();
            return undefined;
        }, []),
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    const summary = useMemo(() => {
        const active = projects.filter((project) => getProjectStatusKey(project.status) === 'active').length;
        const completed = projects.filter((project) => getProjectStatusKey(project.status) === 'done').length;
        const survey = projects.filter((project) => getProjectStatusKey(project.status) === 'survey').length;
        const design = projects.filter((project) => getProjectStatusKey(project.status) === 'design').length;

        return { active, completed, survey, design };
    }, [projects]);

    const statusHighlights = useMemo(
        () => [
            { label: 'Đang thi công', value: summary.active, color: '#f59e0b' },
            { label: 'Hoàn thành', value: summary.completed, color: '#16a34a' },
            { label: 'Khảo sát', value: summary.survey, color: '#64748b' },
            { label: 'Thiết kế', value: summary.design, color: '#3b82f6' },
        ].filter((item) => item.value > 0),
        [summary.active, summary.completed, summary.design, summary.survey],
    );

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            <FlatList
                data={loading ? [] : projects}
                keyExtractor={(item) => item.id}
                contentContainerStyle={s.content}
                showsVerticalScrollIndicator={false}
                refreshControl={(
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={c.primary}
                        colors={[c.primary]}
                    />
                )}
                ListHeaderComponent={(
                    <>
                        <View style={s.headerBlock}>
                            <Text style={s.eyebrow}>Workspace dự án</Text>
                            <Text style={s.title}>Dự án</Text>
                            <Text style={s.subtitle}>
                                {isFieldUser
                                    ? `${roleLabel} chỉ thấy các dự án đang được phân công, đồng bộ trực tiếp với ERP.`
                                    : 'Danh sách và trạng thái dự án được lấy trực tiếp từ ERP web, không cắt page như trước.'}
                            </Text>
                        </View>

                        <View style={s.heroPanel}>
                            <View style={s.heroGlow} />
                            <Text style={s.heroLabel}>Đồng bộ ERP</Text>
                            <Text style={s.heroValue}>{projects.length}</Text>
                            <Text style={s.heroTitle}>dự án đang hiển thị trên mobile</Text>
                            <View style={s.heroMetaRow}>
                                <View style={s.heroMetaCard}>
                                    <Text style={s.heroMetaValue}>{summary.active}</Text>
                                    <Text style={s.heroMetaLabel}>Đang thi công</Text>
                                </View>
                                <View style={s.heroMetaCard}>
                                    <Text style={s.heroMetaValue}>{summary.completed}</Text>
                                    <Text style={s.heroMetaLabel}>Hoàn thành</Text>
                                </View>
                            </View>
                        </View>

                        {statusHighlights.length > 0 && (
                            <View style={s.chipRow}>
                                {statusHighlights.map((item) => (
                                    <View key={item.label} style={[s.statusChip, { backgroundColor: `${item.color}12` }]}> 
                                        <View style={[s.statusDot, { backgroundColor: item.color }]} />
                                        <Text style={[s.statusChipText, { color: item.color }]}>{item.label}</Text>
                                        <Text style={s.statusChipCount}>{item.value}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        <View style={s.sectionHeader}>
                            <Text style={s.sectionTitle}>Danh sách dự án</Text>
                            <Text style={s.sectionHint}>{projects.length} mục</Text>
                        </View>

                        {loading ? (
                            <View style={s.loadingWrap}>
                                {[1, 2, 3, 4].map((item) => (
                                    <Skeleton
                                        key={item}
                                        width="100%"
                                        height={164}
                                        style={{ borderRadius: 24, marginBottom: 12 }}
                                    />
                                ))}
                            </View>
                        ) : null}
                    </>
                )}
                renderItem={({ item }) => {
                    const tone = getStatusColor(item.status);
                    const owner = item.supervisor || item.manager || item.customer?.name || 'Chưa cập nhật đầu mối';
                    return (
                        <TouchableOpacity
                            style={s.projectCard}
                            activeOpacity={0.88}
                            onPress={() => router.push(`/projects/${item.id}` as any)}>
                            <View style={s.projectTopRow}>
                                <View style={s.codeChip}>
                                    <Text style={s.codeChipText}>{item.code || 'DA'}</Text>
                                </View>
                                <View style={[s.projectStatusPill, { backgroundColor: `${tone}16` }]}> 
                                    <View style={[s.projectStatusDot, { backgroundColor: tone }]} />
                                    <Text style={[s.projectStatusText, { color: tone }]}>{item.status || 'Đang cập nhật'}</Text>
                                </View>
                            </View>

                            <Text style={s.projectName}>{item.name}</Text>
                            <Text style={s.projectMeta}>{owner}{item.type ? ` • ${item.type}` : ''}</Text>
                            {item.address ? (
                                <Text style={s.projectAddress} numberOfLines={2}>{item.address}</Text>
                            ) : null}

                            <View style={s.projectFooter}>
                                <View style={{ flex: 1 }}>
                                    <View style={s.progressRow}>
                                        <Text style={s.progressLabel}>Tiến độ</Text>
                                        <Text style={s.progressValue}>{item.progress || 0}%</Text>
                                    </View>
                                    <View style={s.progressTrack}>
                                        <View
                                            style={[
                                                s.progressFill,
                                                { width: `${Math.min(item.progress || 0, 100)}%` },
                                            ]}
                                        />
                                    </View>
                                </View>
                                <View style={s.chevronWrap}>
                                    <Ionicons name="arrow-forward" size={18} color={c.primary} />
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    !loading ? (
                        <View style={s.emptyState}>
                            <View style={s.emptyIcon}>
                                <Ionicons name="business-outline" size={30} color={c.primary} />
                            </View>
                            <Text style={s.emptyTitle}>Chưa có dự án</Text>
                            <Text style={s.emptySub}>Khi ERP web có dự án, danh sách mobile sẽ cập nhật theo ngay tại đây.</Text>
                        </View>
                    ) : null
                }
            />
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bgGradientStart },
    content: { paddingBottom: 112 },
    headerBlock: {
        paddingHorizontal: 20,
        paddingTop: 14,
    },
    eyebrow: {
        fontSize: 12,
        color: c.primary,
        fontWeight: fontWeight.title,
        textTransform: 'uppercase',
        letterSpacing: 1.1,
    },
    title: {
        marginTop: 8,
        fontSize: 30,
        color: c.text,
        fontWeight: fontWeight.title,
    },
    subtitle: {
        marginTop: 8,
        fontSize: 14,
        lineHeight: 22,
        color: c.textSecondary,
    },
    heroPanel: {
        marginHorizontal: 16,
        marginTop: 18,
        padding: 22,
        borderRadius: 28,
        backgroundColor: c.primary,
        overflow: 'hidden',
    },
    heroGlow: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(197,160,89,0.28)',
        right: -24,
        top: -12,
    },
    heroLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.68)',
        fontWeight: fontWeight.title,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    heroValue: {
        marginTop: 14,
        fontSize: 52,
        lineHeight: 56,
        color: '#fff',
        fontWeight: '800',
    },
    heroTitle: {
        marginTop: 4,
        fontSize: 18,
        color: '#fff',
        fontWeight: fontWeight.secondary,
    },
    heroMetaRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 20,
    },
    heroMetaCard: {
        flex: 1,
        borderRadius: 18,
        padding: 14,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    heroMetaValue: {
        fontSize: 24,
        color: '#fff',
        fontWeight: '800',
    },
    heroMetaLabel: {
        marginTop: 4,
        fontSize: 12,
        color: 'rgba(255,255,255,0.72)',
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        paddingHorizontal: 16,
        paddingTop: 18,
    },
    statusChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 999,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusChipText: {
        fontSize: 12,
        fontWeight: fontWeight.secondary,
    },
    statusChipCount: {
        fontSize: 12,
        color: c.text,
        fontWeight: fontWeight.title,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: 20,
        marginTop: 26,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        color: c.text,
        fontWeight: fontWeight.title,
    },
    sectionHint: {
        fontSize: 12,
        color: c.textMuted,
    },
    loadingWrap: { paddingHorizontal: 16 },
    projectCard: {
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 18,
        borderRadius: 24,
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.borderP5,
        ...cardShadow,
    },
    projectTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    codeChip: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: c.primary + '10',
    },
    codeChipText: {
        fontSize: 11,
        color: c.primary,
        fontWeight: fontWeight.title,
        letterSpacing: 0.6,
    },
    projectStatusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 999,
    },
    projectStatusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    projectStatusText: {
        fontSize: 11,
        fontWeight: fontWeight.secondary,
    },
    projectName: {
        marginTop: 14,
        fontSize: 20,
        color: c.text,
        fontWeight: fontWeight.title,
    },
    projectMeta: {
        marginTop: 8,
        fontSize: 13,
        lineHeight: 20,
        color: c.textSecondary,
    },
    projectAddress: {
        marginTop: 8,
        fontSize: 13,
        lineHeight: 20,
        color: c.textMuted,
    },
    projectFooter: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 14,
        marginTop: 18,
    },
    progressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    progressLabel: {
        fontSize: 12,
        color: c.textMuted,
    },
    progressValue: {
        fontSize: 12,
        color: c.primary,
        fontWeight: fontWeight.title,
    },
    progressTrack: {
        height: 7,
        borderRadius: 999,
        backgroundColor: '#e9edf6',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 999,
        backgroundColor: c.accent,
    },
    chevronWrap: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.primary + '10',
    },
    emptyState: {
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingTop: 48,
    },
    emptyIcon: {
        width: 58,
        height: 58,
        borderRadius: 29,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.primary + '10',
    },
    emptyTitle: {
        marginTop: 14,
        fontSize: 16,
        color: c.text,
        fontWeight: fontWeight.secondary,
    },
    emptySub: {
        marginTop: 6,
        fontSize: 13,
        lineHeight: 20,
        color: c.textMuted,
        textAlign: 'center',
    },
});


