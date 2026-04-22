import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
    ActivityIndicator, RefreshControl, Alert, Image, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Colors, { cardShadow, radius, fontWeight } from '@/constants/Colors';
import { apiFetch, apiUpload } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';

const c = Colors.light;

type Task = {
    id: string;
    title: string;
    description: string;
    status: 'Chưa làm' | 'Đang làm' | 'Xong' | 'Tạm hoãn';
    priority: 'Thấp' | 'Bình thường' | 'Cao' | 'Gấp';
    dueDate: string;
    completedAt: string | null;
    completedPhotos: string[];
    completedNotes: string;
    assignedBy: { id: string; name: string };
    project: { id: string; name: string; code: string } | null;
    productionBatch: { id: string; code: string } | null;
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any }> = {
    'Chưa làm': { color: '#94a3b8', bg: '#f1f5f9', icon: 'time-outline' },
    'Đang làm': { color: '#2980b9', bg: '#dbeafe', icon: 'play-circle-outline' },
    'Xong': { color: '#16a085', bg: '#dcfce7', icon: 'checkmark-circle' },
    'Tạm hoãn': { color: '#d97706', bg: '#fef3c7', icon: 'pause-circle-outline' },
};

const PRIORITY_COLORS: Record<string, string> = {
    'Thấp': '#6b7280',
    'Bình thường': '#2980b9',
    'Cao': '#d97706',
    'Gấp': '#dc2626',
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN');

export default function WorkshopTasksScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const toast = useToast();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'today' | 'all' | 'doing'>('today');
    const [completingTask, setCompletingTask] = useState<Task | null>(null);
    const [completeNotes, setCompleteNotes] = useState('');
    const [completePhotos, setCompletePhotos] = useState<{ uri: string; uploaded?: string; uploading?: boolean }[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await apiFetch(`/api/workshop-tasks?workerId=${user?.id}&limit=100`);
            setTasks(res?.data || []);
        } catch (e: any) {
            toast.show(e.message || 'Lỗi tải task', 'error');
        } finally { setLoading(false); setRefreshing(false); }
    }, [user?.id]);

    useEffect(() => { if (user?.id) load(); }, [load, user?.id]);

    async function quickChange(taskId: string, status: string) {
        try {
            await apiFetch(`/api/workshop-tasks/${taskId}`, {
                method: 'PUT',
                body: JSON.stringify({ status }),
            });
            toast.show(`→ ${status}`, 'success');
            load();
        } catch (e: any) { toast.show(e.message || 'Lỗi', 'error'); }
    }

    function openComplete(task: Task) {
        setCompletingTask(task);
        setCompleteNotes(task.completedNotes || '');
        setCompletePhotos([]);
    }

    async function pickImage(useCamera: boolean) {
        if (completePhotos.length >= 5) return;
        const perm = useCamera
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return;
        const result = useCamera
            ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
            : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsMultipleSelection: true, selectionLimit: 5 - completePhotos.length });
        if (result.canceled) return;
        const newPhotos = result.assets.map(a => ({ uri: a.uri, uploading: true }));
        setCompletePhotos(prev => [...prev, ...newPhotos]);
        for (const p of newPhotos) {
            try {
                const res = await apiUpload(
                    '/api/upload',
                    { type: 'proofs' },
                    [{ key: 'file', uri: p.uri, name: `task_${Date.now()}.jpg`, type: 'image/jpeg' }],
                );
                setCompletePhotos(prev => prev.map(x => x.uri === p.uri ? { ...x, uploaded: res?.url, uploading: false } : x));
            } catch {
                setCompletePhotos(prev => prev.filter(x => x.uri !== p.uri));
            }
        }
    }

    async function submitComplete() {
        if (!completingTask) return;
        if (completePhotos.some(p => p.uploading)) { Alert.alert('Đợi', 'Ảnh đang upload'); return; }
        setSubmitting(true);
        try {
            await apiFetch(`/api/workshop-tasks/${completingTask.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    status: 'Xong',
                    completedNotes: completeNotes,
                    completedPhotos: completePhotos.map(p => p.uploaded).filter(Boolean),
                }),
            });
            toast.show('✓ Đã báo cáo hoàn thành', 'success');
            setCompletingTask(null);
            load();
        } catch (e: any) { toast.show(e.message || 'Lỗi', 'error'); }
        finally { setSubmitting(false); }
    }

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const filtered = tasks.filter(t => {
        if (filter === 'doing') return t.status === 'Đang làm';
        if (filter === 'today') {
            const d = new Date(t.dueDate).toISOString().slice(0, 10);
            return d === today && t.status !== 'Xong';
        }
        return true;
    });

    const todoCount = tasks.filter(t => t.status === 'Chưa làm').length;
    const doingCount = tasks.filter(t => t.status === 'Đang làm').length;
    const doneCount = tasks.filter(t => t.status === 'Xong').length;

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={c.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={s.headerTitle}>Việc của tôi</Text>
                    <Text style={s.headerSub}>{user?.name || 'Thợ xưởng'}</Text>
                </View>
            </View>

            {/* Stats */}
            <View style={s.stats}>
                <StatCard label="Chờ" value={todoCount} color="#94a3b8" />
                <StatCard label="Đang làm" value={doingCount} color="#2980b9" />
                <StatCard label="Xong" value={doneCount} color="#16a085" />
            </View>

            {/* Filter chips */}
            <View style={s.chipRow}>
                <Chip label="Hôm nay" active={filter === 'today'} onPress={() => setFilter('today')} />
                <Chip label={`Đang làm (${doingCount})`} active={filter === 'doing'} onPress={() => setFilter('doing')} />
                <Chip label="Tất cả" active={filter === 'all'} onPress={() => setFilter('all')} />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={c.primary} style={{ marginTop: 40 }} />
            ) : (
                <ScrollView
                    contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}
                >
                    {filtered.length === 0 ? (
                        <View style={s.empty}>
                            <Ionicons name="checkmark-done-circle-outline" size={48} color={c.success} />
                            <Text style={{ color: c.textMuted, marginTop: 8, textAlign: 'center' }}>
                                {filter === 'today' ? 'Không có việc hôm nay 🎉' : 'Không có việc'}
                            </Text>
                        </View>
                    ) : (
                        filtered.map(t => {
                            const st = STATUS_CONFIG[t.status];
                            const priColor = PRIORITY_COLORS[t.priority];
                            const overdue = new Date(t.dueDate) < new Date() && t.status !== 'Xong';
                            return (
                                <View key={t.id} style={[s.card, { borderLeftColor: priColor, borderLeftWidth: 4 }]}>
                                    <View style={s.cardHead}>
                                        <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                                            <Ionicons name={st.icon} size={12} color={st.color} />
                                            <Text style={[s.statusText, { color: st.color }]}>{t.status}</Text>
                                        </View>
                                        <View style={[s.priorityBadge, { backgroundColor: priColor + '22' }]}>
                                            <Text style={[s.priorityText, { color: priColor }]}>{t.priority}</Text>
                                        </View>
                                    </View>
                                    <Text style={s.title}>{t.title}</Text>
                                    {t.description ? <Text style={s.desc}>{t.description}</Text> : null}
                                    <View style={s.metaRow}>
                                        <View style={s.metaItem}>
                                            <Ionicons name="calendar-outline" size={12} color={overdue ? c.danger : c.textMuted} />
                                            <Text style={[s.metaText, overdue && { color: c.danger, fontWeight: fontWeight.title }]}>
                                                {overdue ? '⚠ Quá hạn ' : ''}{fmtDate(t.dueDate)}
                                            </Text>
                                        </View>
                                        {t.project && (
                                            <View style={s.metaItem}>
                                                <Ionicons name="folder-outline" size={12} color={c.textMuted} />
                                                <Text style={s.metaText} numberOfLines={1}>{t.project.name}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={s.assigner}>👤 Giao bởi: {t.assignedBy?.name || '—'}</Text>
                                    {t.completedPhotos && t.completedPhotos.length > 0 && (
                                        <ScrollView horizontal style={{ marginTop: 8 }}>
                                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                                {t.completedPhotos.map((url, i) => (
                                                    <Image key={i} source={{ uri: url }} style={s.thumb} />
                                                ))}
                                            </View>
                                        </ScrollView>
                                    )}

                                    {/* Actions */}
                                    {t.status !== 'Xong' && (
                                        <View style={s.actions}>
                                            {t.status === 'Chưa làm' && (
                                                <TouchableOpacity
                                                    style={[s.actionBtn, { backgroundColor: '#2980b9' }]}
                                                    onPress={() => quickChange(t.id, 'Đang làm')}
                                                >
                                                    <Ionicons name="play" size={14} color="#fff" />
                                                    <Text style={s.actionText}>Bắt đầu</Text>
                                                </TouchableOpacity>
                                            )}
                                            {(t.status === 'Chưa làm' || t.status === 'Đang làm') && (
                                                <TouchableOpacity
                                                    style={[s.actionBtn, { backgroundColor: c.success }]}
                                                    onPress={() => openComplete(t)}
                                                >
                                                    <Ionicons name="checkmark" size={14} color="#fff" />
                                                    <Text style={s.actionText}>Báo xong</Text>
                                                </TouchableOpacity>
                                            )}
                                            {t.status === 'Đang làm' && (
                                                <TouchableOpacity
                                                    style={[s.actionBtn, { backgroundColor: c.warning }]}
                                                    onPress={() => quickChange(t.id, 'Tạm hoãn')}
                                                >
                                                    <Ionicons name="pause" size={14} color="#fff" />
                                                    <Text style={s.actionText}>Hoãn</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    )}
                                </View>
                            );
                        })
                    )}
                </ScrollView>
            )}

            {/* Complete modal */}
            <Modal visible={!!completingTask} animationType="slide" transparent onRequestClose={() => setCompletingTask(null)}>
                <View style={s.modalOverlay}>
                    <View style={s.modalSheet}>
                        <View style={s.modalHeader}>
                            <Text style={s.modalTitle}>Báo cáo hoàn thành</Text>
                            <TouchableOpacity onPress={() => setCompletingTask(null)}>
                                <Ionicons name="close" size={24} color={c.text} />
                            </TouchableOpacity>
                        </View>
                        {completingTask && (
                            <ScrollView contentContainerStyle={{ padding: 16 }}>
                                <Text style={s.modalTaskTitle}>{completingTask.title}</Text>
                                <Text style={s.modalLabel}>Ghi chú kết quả</Text>
                                <TextInput
                                    style={s.modalInput}
                                    value={completeNotes}
                                    onChangeText={setCompleteNotes}
                                    multiline
                                    placeholder="Mô tả kết quả, vấn đề phát sinh..."
                                    placeholderTextColor={c.textMuted}
                                />
                                <Text style={s.modalLabel}>Ảnh chứng minh ({completePhotos.length}/5)</Text>
                                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                                    <TouchableOpacity style={s.photoBtn} onPress={() => pickImage(true)}>
                                        <Ionicons name="camera" size={18} color={c.primary} />
                                        <Text style={s.photoBtnText}>Chụp</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={s.photoBtn} onPress={() => pickImage(false)}>
                                        <Ionicons name="images" size={18} color={c.primary} />
                                        <Text style={s.photoBtnText}>Thư viện</Text>
                                    </TouchableOpacity>
                                </View>
                                {completePhotos.length > 0 && (
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                        {completePhotos.map((p, i) => (
                                            <View key={i} style={s.photoWrap}>
                                                <Image source={{ uri: p.uri }} style={s.photoImg} />
                                                {p.uploading && (
                                                    <View style={s.photoOverlay}>
                                                        <ActivityIndicator color="#fff" />
                                                    </View>
                                                )}
                                                <TouchableOpacity
                                                    style={s.photoX}
                                                    onPress={() => setCompletePhotos(prev => prev.filter((_, j) => j !== i))}
                                                >
                                                    <Ionicons name="close" size={12} color="#fff" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                )}
                                <TouchableOpacity
                                    style={[s.submitBtn, submitting && { opacity: 0.6 }]}
                                    onPress={submitComplete}
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <>
                                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                            <Text style={s.submitBtnText}>Xác nhận hoàn thành</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <View style={s.statCard}>
            <Text style={[s.statValue, { color }]}>{value}</Text>
            <Text style={s.statLabel}>{label}</Text>
        </View>
    );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
        <TouchableOpacity onPress={onPress} style={[s.chip, active && s.chipActive]}>
            <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
        </TouchableOpacity>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: fontWeight.title, color: c.text },
    headerSub: { fontSize: 13, color: c.textMuted, marginTop: 2 },

    stats: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
    statCard: { flex: 1, backgroundColor: c.card, padding: 12, borderRadius: radius.card, alignItems: 'center', ...cardShadow },
    statValue: { fontSize: 24, fontWeight: fontWeight.title },
    statLabel: { fontSize: 11, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },

    chipRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginBottom: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: c.card, borderWidth: 1, borderColor: c.borderP10 },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { fontSize: 12, color: c.text, fontWeight: fontWeight.label },
    chipTextActive: { color: '#fff', fontWeight: fontWeight.title },

    card: { backgroundColor: c.card, borderRadius: radius.card, padding: 14, marginBottom: 10, ...cardShadow },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
    statusText: { fontSize: 11, fontWeight: fontWeight.title },
    priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, marginLeft: 'auto' },
    priorityText: { fontSize: 11, fontWeight: fontWeight.title },
    title: { fontSize: 15, fontWeight: fontWeight.title, color: c.text },
    desc: { fontSize: 13, color: c.textSecondary, marginTop: 4, lineHeight: 18 },
    metaRow: { flexDirection: 'row', gap: 12, marginTop: 8, flexWrap: 'wrap' },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 12, color: c.textMuted },
    assigner: { fontSize: 11, color: c.textMuted, marginTop: 6 },
    thumb: { width: 60, height: 60, borderRadius: 8, backgroundColor: c.border },

    actions: { flexDirection: 'row', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.borderP5 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: radius.button },
    actionText: { color: '#fff', fontWeight: fontWeight.title, fontSize: 12 },

    empty: { alignItems: 'center', padding: 40 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: c.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: c.borderP10 },
    modalTitle: { fontSize: 18, fontWeight: fontWeight.title, color: c.text },
    modalTaskTitle: { fontSize: 15, fontWeight: fontWeight.title, color: c.text, marginBottom: 14 },
    modalLabel: { fontSize: 12, fontWeight: fontWeight.title, color: c.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    modalInput: { borderWidth: 1, borderColor: c.borderP10, borderRadius: radius.button, padding: 12, minHeight: 80, marginBottom: 14, fontSize: 14, color: c.text, textAlignVertical: 'top' },
    photoBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: radius.button, borderWidth: 1.5, borderColor: c.primary, backgroundColor: c.primary + '10' },
    photoBtnText: { color: c.primary, fontWeight: fontWeight.title, fontSize: 13 },
    photoWrap: { position: 'relative', width: 80, height: 80 },
    photoImg: { width: '100%', height: '100%', borderRadius: 8, backgroundColor: c.border },
    photoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
    photoX: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.success, paddingVertical: 14, borderRadius: radius.button, marginTop: 16 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: fontWeight.title },
});
