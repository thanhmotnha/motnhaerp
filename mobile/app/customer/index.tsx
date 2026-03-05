import React from 'react';
import {
    View,
    Text,
    ScrollView,
    RefreshControl,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin, Phone, CheckCircle, Clock, Circle } from 'lucide-react-native';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { ErrorState } from '@/components/ErrorState';
import { Card } from '@/components/ui/Card';
import { COLORS } from '@/lib/constants';
import { formatDate, formatCurrency } from '@/lib/format';

function useCustomerProject() {
    return useQuery({
        queryKey: ['customer-project'],
        queryFn: () => apiFetch('/api/customer/project'),
    });
}

function useCustomerGallery() {
    return useQuery({
        queryKey: ['customer-gallery'],
        queryFn: () => apiFetch('/api/customer/gallery'),
    });
}

export default function CustomerDashboardScreen() {
    const { user } = useAuth();
    const { data, isLoading, isError, refetch, isRefetching } = useCustomerProject();
    const galleryQuery = useCustomerGallery();

    const project = (data as any)?.project || data;
    const milestones = (data as any)?.milestones || [];
    const latestPhotos = (galleryQuery.data as any)?.photos?.slice(0, 4) || [];

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (isError) {
        return <ErrorState message="Không thể tải thông tin dự án" onRetry={refetch} />;
    }

    return (
        <>
            <Stack.Screen options={{ title: 'Dự án của tôi' }} />
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            >
                {/* Greeting */}
                <Text style={styles.greeting}>Xin chào, {user?.name}! 🏠</Text>

                {/* Project Overview */}
                {project && (
                    <Card style={styles.projectCard}>
                        <Text style={styles.projectCode}>{project.code}</Text>
                        <Text style={styles.projectName}>{project.name}</Text>
                        {project.address && (
                            <View style={styles.infoRow}>
                                <MapPin size={14} color={COLORS.textLight} />
                                <Text style={styles.infoText}>{project.address}</Text>
                            </View>
                        )}

                        {/* Big progress */}
                        <View style={styles.progressSection}>
                            <Text style={styles.progressLabel}>Tiến độ tổng thể</Text>
                            <Text style={styles.progressValue}>{project.progress ?? 0}%</Text>
                            <View style={styles.progressBar}>
                                <View
                                    style={[styles.progressFill, { width: `${project.progress ?? 0}%` }]}
                                />
                            </View>
                        </View>

                        <View style={styles.dateRow}>
                            <View style={styles.dateItem}>
                                <Calendar size={14} color={COLORS.textLight} />
                                <Text style={styles.dateLabel}>Khởi công</Text>
                                <Text style={styles.dateValue}>{formatDate(project.startDate)}</Text>
                            </View>
                            <View style={styles.dateItem}>
                                <Calendar size={14} color={COLORS.accent} />
                                <Text style={styles.dateLabel}>Dự kiến bàn giao</Text>
                                <Text style={[styles.dateValue, { color: COLORS.accent }]}>
                                    {formatDate(project.expectedEndDate || project.endDate)}
                                </Text>
                            </View>
                        </View>

                        {project.contractValue && (
                            <View style={styles.contractRow}>
                                <Text style={styles.contractLabel}>Giá trị hợp đồng</Text>
                                <Text style={styles.contractValue}>{formatCurrency(project.contractValue)}</Text>
                            </View>
                        )}
                    </Card>
                )}

                {/* Milestones Timeline */}
                {milestones.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Tiến trình xây dựng</Text>
                        {milestones.map((m: any, i: number) => (
                            <View key={m.id || i} style={styles.milestoneItem}>
                                <View style={styles.milestoneIcon}>
                                    {m.status === 'completed' ? (
                                        <CheckCircle size={20} color={COLORS.success} />
                                    ) : m.status === 'in_progress' ? (
                                        <Clock size={20} color={COLORS.info} />
                                    ) : (
                                        <Circle size={20} color={COLORS.disabled} />
                                    )}
                                    {i < milestones.length - 1 && <View style={styles.milestoneLine} />}
                                </View>
                                <View style={styles.milestoneContent}>
                                    <Text style={[
                                        styles.milestoneName,
                                        m.status === 'completed' && { color: COLORS.success },
                                        m.status === 'in_progress' && { fontWeight: '700' },
                                    ]}>
                                        {m.name || m.title}
                                    </Text>
                                    {m.date && <Text style={styles.milestoneDate}>{formatDate(m.date)}</Text>}
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Latest Photos */}
                {latestPhotos.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Ảnh mới nhất</Text>
                            <TouchableOpacity onPress={() => router.push('/customer/gallery' as any)}>
                                <Text style={styles.seeAll}>Xem tất cả →</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {latestPhotos.map((photo: any, i: number) => (
                                <Image
                                    key={i}
                                    source={{ uri: photo.url || photo }}
                                    style={styles.photo}
                                />
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Contact */}
                <Card style={styles.contactCard}>
                    <Text style={styles.contactTitle}>Liên hệ người phụ trách</Text>
                    {project?.manager && (
                        <>
                            <Text style={styles.contactName}>{project.manager.name}</Text>
                            <TouchableOpacity style={styles.contactRow}>
                                <Phone size={14} color={COLORS.primary} />
                                <Text style={styles.contactPhone}>{project.manager.phone || 'Chưa cập nhật'}</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </Card>
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: 16, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    greeting: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
    projectCard: { padding: 20, marginBottom: 16 },
    projectCode: { fontSize: 12, fontWeight: '700', color: COLORS.primary, letterSpacing: 1 },
    projectName: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 4, marginBottom: 8 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    infoText: { fontSize: 13, color: COLORS.textSecondary },
    progressSection: { marginTop: 16, alignItems: 'center' },
    progressLabel: { fontSize: 13, color: COLORS.textSecondary },
    progressValue: { fontSize: 36, fontWeight: '800', color: COLORS.primary, marginVertical: 8 },
    progressBar: { width: '100%', height: 10, backgroundColor: COLORS.borderLight, borderRadius: 5, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: COLORS.success, borderRadius: 5 },
    dateRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
    dateItem: { alignItems: 'center', gap: 4 },
    dateLabel: { fontSize: 11, color: COLORS.textLight },
    dateValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
    contractRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
    contractLabel: { fontSize: 14, color: COLORS.textSecondary },
    contractValue: { fontSize: 16, fontWeight: '700', color: COLORS.accent },
    section: { marginBottom: 20 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
    seeAll: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
    milestoneItem: { flexDirection: 'row', minHeight: 48 },
    milestoneIcon: { width: 32, alignItems: 'center' },
    milestoneLine: { width: 2, flex: 1, backgroundColor: COLORS.borderLight, marginVertical: 4 },
    milestoneContent: { flex: 1, paddingLeft: 10, paddingBottom: 16 },
    milestoneName: { fontSize: 14, color: COLORS.text },
    milestoneDate: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
    photo: { width: 140, height: 100, borderRadius: 10, marginRight: 10, backgroundColor: COLORS.borderLight },
    contactCard: { marginTop: 8, marginBottom: 20 },
    contactTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
    contactName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
    contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
    contactPhone: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
});
