import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet,
    TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import Colors, { cardShadow, radius, fontWeight } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';

const c = Colors.light;

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

export default function AttendanceScreen() {
    const { user } = useAuth();
    const [records, setRecords] = useState<any[]>([]);
    const [checkedIn, setCheckedIn] = useState(false);
    const [todayRecord, setTodayRecord] = useState<any>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().getMonth());
    const [year, setYear] = useState(new Date().getFullYear());

    const load = async () => {
        try {
            const res = await apiFetch(
                `/api/hr/attendance?userId=${user?.id}&month=${month + 1}&year=${year}&limit=50`,
            );
            const data = res?.data || res || [];
            setRecords(data);
            const today = new Date().toISOString().split('T')[0];
            const tr = data.find((r: any) => r.date?.startsWith(today));
            setTodayRecord(tr || null);
            setCheckedIn(!!tr?.checkIn);
        } catch {
            setRecords([]);
        }
        setLoading(false);
    };

    useEffect(() => { load(); }, [month, year]);

    const onRefresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    const handleCheckIn = async () => {
        try {
            let coords = null;
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({});
                coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
            }
            await apiFetch('/api/hr/attendance', {
                method: 'POST',
                body: JSON.stringify({ type: 'checkIn', location: coords }),
            });
            Alert.alert('\u2705 Ch\u1ea5m c\u00f4ng v\u00e0o th\u00e0nh c\u00f4ng');
            load();
        } catch (e: any) {
            Alert.alert('L\u1ed7i', e.message);
        }
    };

    const handleCheckOut = async () => {
        try {
            await apiFetch('/api/hr/attendance', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'checkOut',
                    recordId: todayRecord?.id,
                }),
            });
            Alert.alert('\u2705 Ch\u1ea5m c\u00f4ng ra th\u00e0nh c\u00f4ng');
            load();
        } catch (e: any) {
            Alert.alert('L\u1ed7i', e.message);
        }
    };

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
    const dateStr = now.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    if (loading) {
        return (
            <SafeAreaView style={s.safe} edges={['top']}>
                <View style={s.header}>
                    <TouchableOpacity>
                        <Ionicons name="arrow-back" size={24} color={c.primary} />
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Ch\u1ea5m c\u00f4ng</Text>
                    <View style={{ width: 24 }} />
                </View>
                <View style={{ padding: 16, gap: 16 }}>
                    <Skeleton width="100%" height={180} style={{ borderRadius: radius.card }} />
                    <Skeleton width="40%" height={16} />
                    <Skeleton width="100%" height={60} style={{ borderRadius: radius.card }} />
                    <Skeleton width="100%" height={60} style={{ borderRadius: radius.card }} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            <View style={s.header}>
                <TouchableOpacity>
                    <Ionicons name="arrow-back" size={24} color={c.primary} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Ch\u1ea5m c\u00f4ng</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                style={s.container}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={c.primary}
                        colors={[c.primary]}
                    />
                }>
                {/* Today card */}
                <View style={s.todayCard}>
                    <View style={s.heroBubble} />
                    <Text style={s.todayDate}>{dateStr}</Text>
                    <Text style={s.todayTime}>{timeStr}</Text>
                    <View style={s.btnRow}>
                        <TouchableOpacity
                            style={[s.checkBtn, checkedIn && s.checkBtnDisabled]}
                            onPress={handleCheckIn}
                            disabled={checkedIn}>
                            <Ionicons
                                name="log-in"
                                size={22}
                                color={checkedIn ? c.textMuted : '#fff'}
                            />
                            <Text
                                style={[s.checkBtnText, checkedIn && { color: c.textMuted }]}
                                numberOfLines={1}>
                                {checkedIn
                                    ? `\u0110\u00e3 v\u00e0o ${todayRecord?.checkIn
                                        ? new Date(todayRecord.checkIn).toLocaleTimeString(
                                            'vi-VN',
                                            { hour: '2-digit', minute: '2-digit' },
                                        )
                                        : ''
                                    }`
                                    : 'CH\u1ea4M C\u00d4NG V\u00c0O'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                s.checkBtn,
                                s.checkOutBtn,
                                !checkedIn && s.checkBtnDisabled,
                            ]}
                            onPress={handleCheckOut}
                            disabled={!checkedIn || !!todayRecord?.checkOut}>
                            <Ionicons
                                name="log-out"
                                size={22}
                                color={!checkedIn ? c.textMuted : '#fff'}
                            />
                            <Text
                                style={[s.checkBtnText, !checkedIn && { color: c.textMuted }]}
                                numberOfLines={1}>
                                {todayRecord?.checkOut
                                    ? `\u0110\u00e3 ra ${new Date(
                                        todayRecord.checkOut,
                                    ).toLocaleTimeString('vi-VN', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}`
                                    : 'CH\u1ea4M C\u00d4NG RA'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Month picker */}
                <View style={s.monthRow}>
                    <TouchableOpacity style={s.monthBtn}
                        onPress={() => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }}>
                        <Ionicons name="chevron-back" size={18} color={c.primary} />
                    </TouchableOpacity>
                    <Text style={s.monthText}>
                        {'Th\u00e1ng'} {month + 1}/{year}
                    </Text>
                    <TouchableOpacity style={s.monthBtn}
                        onPress={() => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }}>
                        <Ionicons name="chevron-forward" size={18} color={c.primary} />
                    </TouchableOpacity>
                </View>

                {/* Monthly summary */}
                <View style={s.summaryRow}>
                    {[
                        { label: 'T\u1ed5ng', value: records.length, color: c.primary },
                        { label: '\u0110\u1ee7', value: records.filter(r => r.checkIn && r.checkOut).length, color: '#16a34a' },
                        { label: 'Thi\u1ebfu', value: records.filter(r => r.checkIn && !r.checkOut).length, color: '#f59e0b' },
                    ].map((s2, i) => (
                        <View key={i} style={s.summaryCard}>
                            <Text style={[s.summaryValue, { color: s2.color }]}>{s2.value}</Text>
                            <Text style={s.summaryLabel}>{s2.label}</Text>
                        </View>
                    ))}
                </View>

                {/* History */}
                <Text style={s.sectionTitle}>{'L\u1ecbch s\u1eed ch\u1ea5m c\u00f4ng'}</Text>
                {records.length === 0 && (
                    <View style={s.emptyBox}>
                        <View style={s.emptyIcon}>
                            <Ionicons name="time-outline" size={32} color={c.primary} />
                        </View>
                        <Text style={s.emptyTitle}>Ch\u01b0a c\u00f3 d\u1eef li\u1ec7u</Text>
                    </View>
                )}
                {records.map((r: any, i: number) => (
                    <View key={r.id || i} style={s.historyCard}>
                        <Text style={s.historyDate}>
                            {r.date
                                ? new Date(r.date).toLocaleDateString('vi-VN', {
                                    weekday: 'short',
                                    day: '2-digit',
                                    month: '2-digit',
                                })
                                : ''}
                        </Text>
                        <View style={s.historyTimes}>
                            <View style={s.timeChip}>
                                <Ionicons name="log-in" size={14} color="#16a34a" />
                                <Text style={s.timeText}>
                                    {r.checkIn
                                        ? new Date(r.checkIn).toLocaleTimeString('vi-VN', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })
                                        : '--:--'}
                                </Text>
                            </View>
                            <View style={s.timeChip}>
                                <Ionicons name="log-out" size={14} color="#dc2626" />
                                <Text style={s.timeText}>
                                    {r.checkOut
                                        ? new Date(r.checkOut).toLocaleTimeString('vi-VN', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })
                                        : '--:--'}
                                </Text>
                            </View>
                        </View>
                        <View
                            style={[
                                s.statusBadge,
                                {
                                    backgroundColor: r.checkOut ? '#16a34a15' : '#f59e0b15',
                                },
                            ]}>
                            <Text
                                style={[
                                    s.statusLabel,
                                    { color: r.checkOut ? '#16a34a' : '#f59e0b' },
                                ]}>
                                {r.checkOut ? '\u0110\u1ee7' : 'Thi\u1ebfu'}
                            </Text>
                        </View>
                    </View>
                ))}

                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bgGradientStart },
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: c.borderP5,
    },
    headerTitle: { fontSize: 18, fontWeight: fontWeight.title, color: c.text },

    todayCard: {
        margin: 16,
        backgroundColor: c.primary,
        borderRadius: radius.card,
        padding: 24,
        alignItems: 'center',
        position: 'relative', overflow: 'hidden',
    },
    heroBubble: {
        position: 'absolute', right: -20, top: -20,
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: 'rgba(197,160,89,0.18)',
    },
    todayDate: {
        fontSize: 14, color: 'rgba(255,255,255,0.7)',
        marginBottom: 8, zIndex: 1,
    },
    todayTime: {
        fontSize: 48, fontWeight: '900', color: '#fff',
        marginBottom: 20, zIndex: 1,
    },
    btnRow: { flexDirection: 'row', gap: 12, width: '100%', zIndex: 1 },
    checkBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 8,
        backgroundColor: '#16a34a', borderRadius: radius.card,
        padding: 14,
    },
    checkOutBtn: { backgroundColor: '#dc2626' },
    checkBtnDisabled: { backgroundColor: c.borderP10 },
    checkBtnText: { fontSize: 12, fontWeight: fontWeight.title, color: '#fff' },

    sectionTitle: {
        fontSize: 13, fontWeight: fontWeight.secondary,
        color: c.textMuted, textTransform: 'uppercase',
        letterSpacing: 1,
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10,
    },

    historyCard: {
        flexDirection: 'row', alignItems: 'center',
        marginHorizontal: 16, marginBottom: 8,
        backgroundColor: c.card, borderRadius: radius.card,
        padding: 14, borderWidth: 1, borderColor: c.borderP5,
        ...cardShadow,
    },
    historyDate: { width: 65, fontSize: 12, fontWeight: fontWeight.secondary, color: c.text },
    historyTimes: { flex: 1, flexDirection: 'row', gap: 12 },
    timeChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    timeText: { fontSize: 13, fontWeight: fontWeight.secondary, color: c.text },
    statusBadge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
    statusLabel: { fontSize: 10, fontWeight: fontWeight.title },

    emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 6 },
    emptyIcon: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: c.borderP10,
        alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    },
    emptyTitle: { fontSize: 16, fontWeight: fontWeight.secondary, color: c.text },

    monthRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 16, paddingTop: 12, paddingBottom: 4,
    },
    monthBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: c.primary + '12', alignItems: 'center', justifyContent: 'center',
    },
    monthText: { fontSize: 15, fontWeight: fontWeight.title, color: c.text },
    summaryRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, paddingVertical: 8 },
    summaryCard: {
        flex: 1, alignItems: 'center', backgroundColor: c.card,
        borderRadius: radius.card, paddingVertical: 10,
        borderWidth: 1, borderColor: c.borderP5, ...cardShadow,
    },
    summaryValue: { fontSize: 22, fontWeight: fontWeight.title },
    summaryLabel: { fontSize: 10, fontWeight: fontWeight.label, color: c.textMuted, marginTop: 2, textTransform: 'uppercase' },
});
