import React from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Camera, MapPin, Calendar, User } from 'lucide-react-native';
import { useProject } from '@/hooks/useApi';
import { Card } from '@/components/ui/Card';
import { Badge, getStatusVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { COLORS } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/format';



export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: project, isLoading, refetch, isRefetching } = useProject(id);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!project) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Không tìm thấy dự án</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: project.code || 'Chi tiết dự án' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Header */}
        <Card>
          <View style={styles.headerRow}>
            <Text style={styles.projectName}>{project.name}</Text>
            <Badge label={project.status} variant={getStatusVariant(project.status)} />
          </View>

          {project.customer?.name && (
            <View style={styles.infoRow}>
              <User size={14} color={COLORS.textSecondary} />
              <Text style={styles.infoText}>KH: {project.customer.name}</Text>
            </View>
          )}

          {project.address && (
            <View style={styles.infoRow}>
              <MapPin size={14} color={COLORS.textSecondary} />
              <Text style={styles.infoText}>{project.address}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Calendar size={14} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>
              {formatDate(project.startDate)} → {formatDate(project.endDate)}
            </Text>
          </View>

          {typeof project.value === 'number' && (
            <View style={styles.valueRow}>
              <Text style={styles.valueLabel}>Giá trị:</Text>
              <Text style={styles.valueAmount}>{formatCurrency(project.value)}</Text>
            </View>
          )}
        </Card>

        {/* Progress */}
        {typeof project.progress === 'number' && (
          <Card style={{ marginTop: 12 }}>
            <Text style={styles.sectionTitle}>Tiến độ tổng thể</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${project.progress}%` }]} />
              </View>
              <Text style={styles.progressText}>{project.progress}%</Text>
            </View>
          </Card>
        )}

        {/* Action */}
        <Button
          title="Báo cáo tiến độ"
          onPress={() => router.push({ pathname: '/progress/report', params: { projectId: id, projectName: project.name } })}
          size="lg"
          style={{ marginTop: 20 }}
          icon={<Camera size={18} color={COLORS.white} />}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { fontSize: 15, color: COLORS.textSecondary },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  projectName: { fontSize: 18, fontWeight: '700', color: COLORS.text, flex: 1, marginRight: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoText: { fontSize: 14, color: COLORS.textSecondary },
  valueRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  valueLabel: { fontSize: 14, color: COLORS.textSecondary },
  valueAmount: { fontSize: 16, fontWeight: '700', color: COLORS.accent },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBar: { flex: 1, height: 8, backgroundColor: COLORS.borderLight, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.success, borderRadius: 4 },
  progressText: { fontSize: 14, fontWeight: '700', color: COLORS.text, width: 40, textAlign: 'right' },
});
