import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl, TouchableOpacity, Alert,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react-native';
import { useScheduleTask, useUpdateScheduleTask } from '@/hooks/useApi';
import { Card } from '@/components/ui/Card';
import { COLORS } from '@/lib/constants';
import { formatDate } from '@/lib/format';

const STATUS_FLOW: Record<string, string> = {
  'pending': 'in_progress',
  'Chưa bắt đầu': 'Đang thực hiện',
  'in_progress': 'completed',
  'Đang thực hiện': 'Hoàn thành',
};

const STATUS_LABEL: Record<string, string> = {
  'pending': 'Chờ thực hiện',
  'Chưa bắt đầu': 'Chờ thực hiện',
  'in_progress': 'Đang thực hiện',
  'Đang thực hiện': 'Đang thực hiện',
  'completed': 'Hoàn thành',
  'Hoàn thành': 'Hoàn thành',
  'overdue': 'Trễ hạn',
};

const STATUS_COLOR: Record<string, string> = {
  'pending': COLORS.textLight,
  'Chưa bắt đầu': COLORS.textLight,
  'in_progress': COLORS.info,
  'Đang thực hiện': COLORS.info,
  'completed': COLORS.success,
  'Hoàn thành': COLORS.success,
  'overdue': COLORS.danger,
};

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed' || status === 'Hoàn thành')
    return <CheckCircle size={20} color={COLORS.success} />;
  if (status === 'overdue')
    return <AlertCircle size={20} color={COLORS.danger} />;
  return <Clock size={20} color={STATUS_COLOR[status] || COLORS.textLight} />;
}

export default function ScheduleTaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: task, isLoading, refetch, isRefetching } = useScheduleTask(id);
  const updateMutation = useUpdateScheduleTask();
  const [updating, setUpdating] = useState(false);

  async function handleAdvanceStatus() {
    if (!task) return;
    const next = STATUS_FLOW[task.status];
    if (!next) return;

    Alert.alert(
      'Cập nhật trạng thái',
      `Chuyển sang: ${STATUS_LABEL[next] || next}?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            setUpdating(true);
            try {
              await updateMutation.mutateAsync({ id, status: next });
              refetch();
            } catch (err: any) {
              Alert.alert('Lỗi', err.message || 'Không thể cập nhật');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Không tìm thấy task</Text>
      </View>
    );
  }

  const nextStatus = STATUS_FLOW[task.status];
  const statusColor = STATUS_COLOR[task.status] || COLORS.textSecondary;
  const progress = typeof task.progress === 'number' ? task.progress : null;

  return (
    <>
      <Stack.Screen options={{ title: 'Chi tiết task' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Header */}
        <Card>
          <View style={styles.titleRow}>
            <StatusIcon status={task.status} />
            <Text style={styles.taskTitle}>{task.title || task.name}</Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {STATUS_LABEL[task.status] || task.status}
            </Text>
          </View>

          {task.description && (
            <Text style={styles.description}>{task.description}</Text>
          )}
        </Card>

        {/* Meta info */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thông tin</Text>
          {task.startDate && (
            <InfoRow label="Bắt đầu" value={formatDate(task.startDate)} />
          )}
          {task.endDate && (
            <InfoRow label="Kết thúc" value={formatDate(task.endDate)} />
          )}
          {task.assignee && (
            <InfoRow label="Phụ trách" value={task.assignee} />
          )}
          {task.priority && (
            <InfoRow label="Ưu tiên" value={task.priority} />
          )}
        </Card>

        {/* Progress */}
        {progress !== null && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Tiến độ</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressText}>{progress}%</Text>
            </View>
          </Card>
        )}

        {/* Dependencies */}
        {task.dependencies && task.dependencies.length > 0 && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Phụ thuộc</Text>
            {task.dependencies.map((dep: any, idx: number) => (
              <Text key={dep.id || idx} style={styles.depItem}>
                • {dep.title || dep.name || dep.id}
              </Text>
            ))}
          </Card>
        )}

        {/* Advance status button */}
        {nextStatus && (
          <TouchableOpacity
            style={[styles.advanceBtn, { borderColor: STATUS_COLOR[nextStatus] || COLORS.primary }]}
            onPress={handleAdvanceStatus}
            disabled={updating}
          >
            <Text style={[styles.advanceBtnText, { color: STATUS_COLOR[nextStatus] || COLORS.primary }]}>
              {updating ? 'Đang cập nhật...' : `→ Chuyển sang: ${STATUS_LABEL[nextStatus] || nextStatus}`}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 15, color: COLORS.textSecondary },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  taskTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, flex: 1 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 10 },
  statusText: { fontSize: 13, fontWeight: '600' },
  description: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginTop: 8 },
  sectionCard: { marginTop: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  infoRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  infoLabel: { fontSize: 13, color: COLORS.textSecondary, minWidth: 80 },
  infoValue: { fontSize: 13, color: COLORS.text, flex: 1, fontWeight: '500' },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBar: { flex: 1, height: 10, backgroundColor: COLORS.borderLight, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.success, borderRadius: 5 },
  progressText: { fontSize: 14, fontWeight: '700', color: COLORS.text, width: 40, textAlign: 'right' },
  depItem: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },
  advanceBtn: {
    marginTop: 20, borderWidth: 1.5, borderRadius: 10,
    paddingVertical: 14, alignItems: 'center',
  },
  advanceBtnText: { fontSize: 15, fontWeight: '600' },
});
