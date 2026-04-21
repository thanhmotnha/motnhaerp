import React from 'react';
import {
    View, Text, FlatList, StyleSheet, Image, ActivityIndicator,
    RefreshControl, ScrollView, Pressable, Linking,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { FileText, Calendar } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { COLORS } from '@/lib/constants';
import { formatDate } from '@/lib/format';

interface Report {
    id: string;
    progressFrom: number;
    progressTo: number;
    description: string;
    images: string;  // JSON string
    reportDate: string;
    createdBy: string;
    taskId: string;
    projectId: string;
    createdAt: string;
}

function parseImages(raw: string): string[] {
    try { return JSON.parse(raw); } catch { return []; }
}

function ReportCard({ r }: { r: Report }) {
    const images = parseImages(r.images);
    const delta = r.progressTo - r.progressFrom;
    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.author}>👤 {r.createdBy}</Text>
                    <Text style={styles.date}>{formatDate(r.reportDate)}</Text>
                </View>
                <View style={styles.progressBadge}>
                    <Text style={styles.progressLabel}>Tiến độ</Text>
                    <Text style={styles.progressValue}>{r.progressFrom}% → {r.progressTo}%</Text>
                    {delta > 0 && <Text style={styles.progressDelta}>+{delta}%</Text>}
                </View>
            </View>
            {r.description ? <Text style={styles.description}>{r.description}</Text> : null}
            {images.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                        {images.map((url, i) => (
                            <Pressable key={i} onPress={() => Linking.openURL(url)}>
                                <Image source={{ uri: url }} style={styles.photo} />
                            </Pressable>
                        ))}
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

export default function ProgressReportsListScreen() {
    const { projectId, projectName } = useLocalSearchParams<{ projectId: string; projectName?: string }>();
    const { data, isLoading, refetch, isRefetching } = useQuery<Report[]>({
        queryKey: ['progress-reports', projectId],
        queryFn: () => apiFetch(`/api/progress-reports?projectId=${projectId}`),
        enabled: !!projectId,
    });

    const reports = data || [];

    return (
        <>
            <Stack.Screen options={{
                title: projectName ? `Báo cáo: ${projectName}` : 'Báo cáo hiện trường',
                headerStyle: { backgroundColor: COLORS.primary },
                headerTintColor: '#fff',
            }} />
            <View style={styles.container}>
                <FlatList
                    data={reports}
                    keyExtractor={(r) => r.id}
                    refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
                    renderItem={({ item }) => <ReportCard r={item} />}
                    ListEmptyComponent={
                        isLoading ? (
                            <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
                        ) : (
                            <View style={{ alignItems: 'center', padding: 40 }}>
                                <FileText size={48} color={COLORS.textLight} />
                                <Text style={{ color: COLORS.textLight, marginTop: 8 }}>Chưa có báo cáo nào</Text>
                            </View>
                        )
                    }
                    contentContainerStyle={{ padding: 12, gap: 8 }}
                />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    card: { backgroundColor: COLORS.white, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    author: { fontSize: 14, fontWeight: '600', color: COLORS.text },
    date: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    progressBadge: { alignItems: 'flex-end' },
    progressLabel: { fontSize: 10, color: COLORS.textSecondary, textTransform: 'uppercase' },
    progressValue: { fontSize: 13, fontWeight: '600', color: COLORS.primary, marginTop: 2 },
    progressDelta: { fontSize: 12, color: COLORS.success, fontWeight: '600' },
    description: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
    photo: { width: 90, height: 90, borderRadius: 6, backgroundColor: COLORS.border },
});
