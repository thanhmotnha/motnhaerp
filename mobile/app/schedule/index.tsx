import React from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { ErrorState } from '@/components/ErrorState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { COLORS } from '@/lib/constants';
import { formatDate } from '@/lib/format';

interface ScheduleTask {
    id: string;
    title: string;
    status: string;
    startDate?: string;
    endDate?: string;
    progress?: number;
    assignee?: string;
    priority?: string;
}

function useScheduleTasks(projectId: string) {
    return useQuery<{ data: ScheduleTask[] }>({
        queryKey: ['schedule-tasks', projectId],
        queryFn: () => apiFetch(`/api/schedule-tasks?projectId=${projectId}&limit=50`),
        enabled: !!projectId,
    });
}

function getTaskIcon(status: string) {
    if (status === 'completed' || status === 'Hoàn thành') return <CheckCircle size={16} color={COLORS.success} />;
    if (status === 'in_progress' || status === 'Đang thực hiện') return <Clock size={16} color={COLORS.info} />;
    if (status === 'overdue') return <AlertCircle size={16} color={COLORS.danger} />;
    return <Clock size={16} color={COLORS.textLight} />;
}

function getTaskStatusVariant(status: string) {
    const map: Record<string, string> = {
        'completed': 'success',
        'Hoàn thành': 'success',
        'in_progress': 'info',
        'Đang thực hiện': 'info',
        'pending': 'warning',
        'Chưa bắt đầu': 'warning',
        'overdue': 'danger',
    };
    return (map[status] || 'default') as any;
}

export default function ScheduleScreen() {
    const { projectId, projectName } = useLocalSearchParams<{
        projectId: string;
        projectName: string;
    }>();

    const { data, isLoading, isError, refetch, isRefetching } = useScheduleTasks(projectId);
    const tasks = data?.data || (Array.isArray(data) ? data : []);

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (isError) {
        return <ErrorState message="Không thể tải lịch trình" onRetry={refetch} />;
    }

    return (
        <>
            <Stack.Screen options={{ title: projectName ? `Lịch trình - ${projectName}` : 'Lịch trình' }} />
            <FlatList
                style={styles.container}
                contentContainerStyle={styles.content}
                data={tasks}
                keyExtractor={(item: any) => item.id}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
                renderItem={({ item }: { item: any }) => (
                    <TouchableOpacity onPress={() => router.push({ pathname: '/schedule/[id]' as any, params: { id: item.id } })}>
                    <Card style={styles.taskCard}>
                        <View style={styles.taskHeader}>
                            {getTaskIcon(item.status)}
                            <Text style={styles.taskTitle} numberOfLines={2}>{item.title || item.name}</Text>
                        </View>
                        <View style={styles.taskMeta}>
                            <Badge label={item.status} variant={getTaskStatusVariant(item.status)} size="sm" />
                            {item.startDate && (
                                <Text style={styles.taskDate}>
                                    {formatDate(item.startDate)} → {formatDate(item.endDate)}
                                </Text>
                            )}
                        </View>
                        {typeof item.progress === 'number' && (
                            <View style={styles.progressRow}>
                                <View style={styles.progressBar}>
                                    <View style={[styles.progressFill, { width: `${item.progress}%` }]} />
                                </View>
                                <Text style={styles.progressText}>{item.progress}%</Text>
                            </View>
                        )}
                        {item.assignee && (
                            <Text style={styles.assignee}>👤 {item.assignee}</Text>
                        )}
                    </Card>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={styles.center}>
                        <Text style={styles.empty}>Chưa có task nào</Text>
                    </View>
                }
            />
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: 16, paddingBottom: 32 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
    empty: { fontSize: 15, color: COLORS.textSecondary },
    taskCard: { marginBottom: 10 },
    taskHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
    taskTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, flex: 1 },
    taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
    taskDate: { fontSize: 12, color: COLORS.textSecondary },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    progressBar: { flex: 1, height: 6, backgroundColor: COLORS.borderLight, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: COLORS.success, borderRadius: 3 },
    progressText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, width: 30 },
    assignee: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
});
