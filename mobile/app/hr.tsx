import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors, { cardShadow, radius, fontWeight } from '@/constants/Colors';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';

const c = Colors.light;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN');
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function HrScreen() {
    const router = useRouter();
    const toast = useToast();
    const [employees, setEmployees] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [leaves, setLeaves] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const today = todayStr();
            const [emp, att, lv] = await Promise.all([
                apiFetch('/api/employees?limit=500'),
                apiFetch(`/api/hr/daily-attendance?date=${today}`).catch(() => []),
                apiFetch(`/api/hr/leave-requests?status=approved&date=${today}`).catch(() => []),
            ]);
            setEmployees(emp?.data || emp || []);
            setAttendance(Array.isArray(att) ? att : (att?.data || []));
            setLeaves(Array.isArray(lv) ? lv : (lv?.data || []));
        } catch (e: any) { toast.show(e.message || 'Lỗi', 'error'); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const totalEmps = employees.length;
    const presentToday = attendance.filter(a => a.checkIn || a.status === 'present').length;
    const onLeaveToday = leaves.length;
    const absentToday = Math.max(0, totalEmps - presentToday - onLeaveToday);

    // Recent leave requests (pending)
    const pendingLeaves = leaves.filter(l => l.status === 'pending' || l.status === 'Chờ duyệt').slice(0, 5);

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={c.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={s.headerTitle}>Nhân sự</Text>
                    <Text style={s.headerSub}>{fmtDate(todayStr())}</Text>
                </View>
            </View>

            {/* Stats grid */}
            <View style={s.statsGrid}>
                <StatCard icon="people" label="Tổng NV" value={totalEmps} color={c.primary} />
                <StatCard icon="checkmark-circle" label="Có mặt" value={presentToday} color={c.success} />
                <StatCard icon="bed" label="Nghỉ phép" value={onLeaveToday} color={c.warning} />
                <StatCard icon="close-circle" label="Vắng" value={absentToday} color={c.danger} />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={c.primary} style={{ marginTop: 40 }} />
            ) : (
                <ScrollView
                    contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}
                >
                    {/* On leave today */}
                    <Text style={s.sectionTitle}>🌴 NGHỈ PHÉP HÔM NAY ({leaves.length})</Text>
                    {leaves.length === 0 ? (
                        <View style={[s.card, { alignItems: 'center', padding: 20 }]}>
                            <Text style={{ color: c.textMuted }}>Không có ai nghỉ phép</Text>
                        </View>
                    ) : (
                        leaves.slice(0, 10).map(l => (
                            <View key={l.id} style={s.card}>
                                <View style={s.cardRow}>
                                    <View style={[s.avatar, { backgroundColor: c.warning + '22' }]}>
                                        <Ionicons name="person" size={18} color={c.warning} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.empName}>{l.employee?.name || l.employeeName || '—'}</Text>
                                        <Text style={s.leaveType}>{l.type || 'Nghỉ phép'}</Text>
                                        <Text style={s.leaveDate}>
                                            {fmtDate(l.startDate)} → {fmtDate(l.endDate)}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}

                    {/* Pending leave requests */}
                    {pendingLeaves.length > 0 && (
                        <>
                            <Text style={[s.sectionTitle, { marginTop: 20 }]}>⏳ ĐƠN XIN NGHỈ CHỜ DUYỆT ({pendingLeaves.length})</Text>
                            {pendingLeaves.map(l => (
                                <View key={l.id} style={s.card}>
                                    <View style={s.cardRow}>
                                        <View style={[s.avatar, { backgroundColor: c.info + '22' }]}>
                                            <Ionicons name="document-text" size={18} color={c.info} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.empName}>{l.employee?.name || '—'}</Text>
                                            <Text style={s.leaveType}>{l.reason || 'Không ghi'}</Text>
                                            <Text style={s.leaveDate}>{fmtDate(l.startDate)} → {fmtDate(l.endDate)}</Text>
                                        </View>
                                        <View style={s.pendingBadge}>
                                            <Text style={s.pendingText}>CHỜ</Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </>
                    )}

                    {/* Employee list */}
                    <Text style={[s.sectionTitle, { marginTop: 20 }]}>👥 DANH SÁCH NHÂN VIÊN ({totalEmps})</Text>
                    {employees.slice(0, 20).map((e: any) => (
                        <View key={e.id} style={s.card}>
                            <View style={s.cardRow}>
                                <View style={[s.avatar, { backgroundColor: c.primary + '15' }]}>
                                    <Text style={s.avatarText}>{e.name?.charAt(0)?.toUpperCase()}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.empName}>{e.name}</Text>
                                    <Text style={s.empRole}>{e.position || e.role || '—'}</Text>
                                    {e.department && <Text style={s.empDept}>📍 {e.department}</Text>}
                                </View>
                                {e.phone && (
                                    <TouchableOpacity style={s.callBtn}>
                                        <Ionicons name="call" size={16} color={c.primary} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    ))}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

function StatCard({ icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
    return (
        <View style={s.statCard}>
            <View style={[s.statIcon, { backgroundColor: color + '15' }]}>
                <Ionicons name={icon} size={18} color={color} />
            </View>
            <Text style={[s.statValue, { color }]}>{value}</Text>
            <Text style={s.statLabel}>{label}</Text>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: fontWeight.title, color: c.text },
    headerSub: { fontSize: 13, color: c.textMuted, marginTop: 2 },

    statsGrid: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginBottom: 12 },
    statCard: { flex: 1, backgroundColor: c.card, padding: 10, borderRadius: radius.card, alignItems: 'center', ...cardShadow },
    statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    statValue: { fontSize: 20, fontWeight: fontWeight.title },
    statLabel: { fontSize: 10, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 2 },

    sectionTitle: { fontSize: 11, fontWeight: fontWeight.title, color: c.textMuted, letterSpacing: 1, marginBottom: 10, marginLeft: 4 },

    card: { backgroundColor: c.card, borderRadius: radius.card, padding: 12, marginBottom: 8, ...cardShadow },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 16, fontWeight: fontWeight.title, color: c.primary },
    empName: { fontSize: 14, fontWeight: fontWeight.title, color: c.text },
    empRole: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    empDept: { fontSize: 11, color: c.textMuted, marginTop: 2 },
    leaveType: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    leaveDate: { fontSize: 11, color: c.textMuted, marginTop: 2 },
    pendingBadge: { backgroundColor: c.warning + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
    pendingText: { fontSize: 10, color: c.warning, fontWeight: fontWeight.title, letterSpacing: 0.5 },
    callBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: c.primary + '10', alignItems: 'center', justifyContent: 'center' },
});
