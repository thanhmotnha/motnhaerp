import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet,
    TouchableOpacity, TextInput, Alert, ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiFetch } from '@/lib/api';
import Colors, { cardShadow, radius, fontWeight } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';

const c = Colors.light;
const LEAVE_TYPES = [
    'Ngh\u1ec9 ph\u00e9p',
    'Ngh\u1ec9 \u1ed1m',
    'Ngh\u1ec9 vi\u1ec7c ri\u00eang',
    'Ngh\u1ec9 kh\u00f4ng l\u01b0\u01a1ng',
];

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

export default function LeaveRequestScreen() {
    const router = useRouter();
    const [requests, setRequests] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [type, setType] = useState(LEAVE_TYPES[0]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [balance, setBalance] = useState({ total: 12, used: 0, remaining: 12 });

    const load = async () => {
        try {
            const res = await apiFetch('/api/hr/leave-requests?limit=30');
            const data = res?.data || res || [];
            setRequests(data);
            // Calculate balance
            const approved = data.filter((r: any) => r.status === '\u0110\u00e3 duy\u1ec7t');
            const usedDays = approved.reduce((sum: number, r: any) => {
                if (r.startDate && r.endDate) {
                    const diff = Math.ceil((new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / 86400000) + 1;
                    return sum + diff;
                }
                return sum + 1;
            }, 0);
            setBalance({ total: 12, used: usedDays, remaining: Math.max(0, 12 - usedDays) });
        } catch {
            setRequests([]);
        }
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    const handleSubmit = async () => {
        if (!startDate || !reason.trim()) {
            Alert.alert('Vui l\u00f2ng nh\u1eadp \u0111\u1ea7y \u0111\u1ee7');
            return;
        }
        setSaving(true);
        try {
            await apiFetch('/api/hr/leave-requests', {
                method: 'POST',
                body: JSON.stringify({
                    type,
                    startDate,
                    endDate: endDate || startDate,
                    reason: reason.trim(),
                }),
            });
            Alert.alert('\u2705 \u0110\u00e3 g\u1eedi \u0111\u01a1n ngh\u1ec9 ph\u00e9p');
            setShowForm(false);
            setReason('');
            setStartDate('');
            setEndDate('');
            load();
        } catch (e: any) {
            Alert.alert('L\u1ed7i', e.message);
        }
        setSaving(false);
    };

    const statusColor: Record<string, string> = {
        'Ch\u1edd duy\u1ec7t': '#f59e0b',
        '\u0110\u00e3 duy\u1ec7t': '#16a34a',
        'T\u1eeb ch\u1ed1i': '#dc2626',
    };

    if (loading) {
        return (
            <SafeAreaView style={s.safe} edges={['top']}>
                <View style={s.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={c.primary} />
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>{'\u0110\u01a1n ngh\u1ec9 ph\u00e9p'}</Text>
                    <View style={{ width: 24 }} />
                </View>
                <View style={{ padding: 16, gap: 12 }}>
                    <Skeleton width="100%" height={48} style={{ borderRadius: radius.card }} />
                    <Skeleton width="40%" height={14} />
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} width="100%" height={80} style={{ borderRadius: radius.card }} />
                    ))}
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={c.primary} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>{'\u0110\u01a1n ngh\u1ec9 ph\u00e9p'}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                style={s.container}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
                        colors={[c.primary]} tintColor={c.primary} />
                }>

                {/* Leave Balance */}
                <View style={s.balanceRow}>
                    {[
                        { label: 'T\u1ed5ng ph\u00e9p', value: balance.total, color: c.primary },
                        { label: '\u0110\u00e3 d\u00f9ng', value: balance.used, color: '#f59e0b' },
                        { label: 'C\u00f2n l\u1ea1i', value: balance.remaining, color: '#16a34a' },
                    ].map((b, i) => (
                        <View key={i} style={s.balanceCard}>
                            <Text style={[s.balanceValue, { color: b.color }]}>{b.value}</Text>
                            <Text style={s.balanceLabel}>{b.label}</Text>
                        </View>
                    ))}
                </View>
                {/* New request button */}
                <TouchableOpacity
                    style={s.newBtn}
                    onPress={() => setShowForm(!showForm)}>
                    <Ionicons
                        name={showForm ? 'close-circle' : 'add-circle'}
                        size={20}
                        color="#fff"
                    />
                    <Text style={s.newBtnText}>
                        {showForm
                            ? '\u0110\u00f3ng'
                            : 'T\u1ea1o \u0111\u01a1n ngh\u1ec9 ph\u00e9p'}
                    </Text>
                </TouchableOpacity>

                {/* Form */}
                {showForm && (
                    <View style={s.formCard}>
                        <Text style={s.formLabel}>Lo\u1ea1i ngh\u1ec9</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 8 }}>
                            {LEAVE_TYPES.map(t => (
                                <TouchableOpacity
                                    key={t}
                                    style={[s.typeChip, type === t && s.typeChipActive]}
                                    onPress={() => setType(t)}>
                                    <Text
                                        style={[
                                            s.typeChipText,
                                            type === t && { color: '#fff' },
                                        ]}>
                                        {t}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={s.formLabel}>
                            Ng\u00e0y b\u1eaft \u0111\u1ea7u
                        </Text>
                        <TextInput
                            style={s.input}
                            value={startDate}
                            onChangeText={setStartDate}
                            placeholder="2026-03-10"
                            placeholderTextColor={c.textMuted}
                        />

                        <Text style={s.formLabel}>
                            Ng\u00e0y k\u1ebft th\u00fac
                        </Text>
                        <TextInput
                            style={s.input}
                            value={endDate}
                            onChangeText={setEndDate}
                            placeholder="2026-03-10 (b\u1ecf tr\u1ed1ng = 1 ng\u00e0y)"
                            placeholderTextColor={c.textMuted}
                        />

                        <Text style={s.formLabel}>L\u00fd do</Text>
                        <TextInput
                            style={[s.input, { minHeight: 80 }]}
                            value={reason}
                            onChangeText={setReason}
                            multiline
                            placeholder="Nh\u1eadp l\u00fd do ngh\u1ec9..."
                            placeholderTextColor={c.textMuted}
                            textAlignVertical="top"
                        />

                        <TouchableOpacity
                            style={s.submitBtn}
                            onPress={handleSubmit}
                            disabled={saving}>
                            {saving ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={s.submitText}>G\u1eeci \u0111\u01a1n</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* List */}
                <Text style={s.sectionTitle}>
                    {'\u0110\u01a1n \u0111\u00e3 g\u1eedi'}
                </Text>
                {requests.length === 0 && !showForm && (
                    <View style={s.emptyBox}>
                        <View style={s.emptyIcon}>
                            <Ionicons name="calendar-outline" size={32} color={c.primary} />
                        </View>
                        <Text style={s.emptyTitle}>
                            Ch\u01b0a c\u00f3 \u0111\u01a1n ngh\u1ec9 ph\u00e9p
                        </Text>
                    </View>
                )}
                {requests.map((r: any) => (
                    <View key={r.id} style={s.card}>
                        <View style={s.cardHeader}>
                            <Text style={s.cardType}>{r.type}</Text>
                            <View
                                style={[
                                    s.statusBadge,
                                    {
                                        backgroundColor:
                                            (statusColor[r.status] || '#6b7280') + '15',
                                    },
                                ]}>
                                <Text
                                    style={[
                                        s.statusText,
                                        { color: statusColor[r.status] || '#6b7280' },
                                    ]}>
                                    {r.status}
                                </Text>
                            </View>
                        </View>
                        <View style={s.dateRow}>
                            <Ionicons name="calendar" size={14} color={c.textMuted} />
                            <Text style={s.cardDates}>
                                {r.startDate
                                    ? new Date(r.startDate).toLocaleDateString('vi-VN')
                                    : ''}{' '}
                                \u2192{' '}
                                {r.endDate
                                    ? new Date(r.endDate).toLocaleDateString('vi-VN')
                                    : ''}
                            </Text>
                        </View>
                        {r.reason && (
                            <Text style={s.cardReason} numberOfLines={2}>
                                {r.reason}
                            </Text>
                        )}
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

    newBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, margin: 16,
        backgroundColor: c.primary, borderRadius: radius.card, padding: 14,
        ...cardShadow,
    },
    newBtnText: { fontSize: 15, fontWeight: fontWeight.title, color: '#fff' },

    formCard: {
        marginHorizontal: 16, marginBottom: 16,
        backgroundColor: c.card, borderRadius: radius.card,
        padding: 18, borderWidth: 1, borderColor: c.borderP5,
        ...cardShadow,
    },
    formLabel: {
        fontSize: 13, fontWeight: fontWeight.secondary, color: c.text,
        marginTop: 12, marginBottom: 6,
    },
    input: {
        backgroundColor: c.bgGradientStart, borderRadius: radius.iconBox,
        padding: 12, fontSize: 14,
        borderWidth: 1, borderColor: c.borderP10,
        color: c.text,
    },
    typeChip: {
        paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: radius.pill, backgroundColor: c.bgGradientStart,
        borderWidth: 1, borderColor: c.borderP10,
    },
    typeChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    typeChipText: { fontSize: 12, fontWeight: fontWeight.secondary, color: c.textMuted },
    submitBtn: {
        backgroundColor: c.accent, borderRadius: radius.card,
        padding: 14, alignItems: 'center', marginTop: 16,
    },
    submitText: {
        fontSize: 15, fontWeight: fontWeight.title, color: '#fff',
        letterSpacing: 0.5, textTransform: 'uppercase',
    },

    sectionTitle: {
        fontSize: 13, fontWeight: fontWeight.secondary, color: c.textMuted,
        textTransform: 'uppercase', letterSpacing: 1,
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10,
    },

    card: {
        marginHorizontal: 16, marginBottom: 10,
        backgroundColor: c.card, borderRadius: radius.card,
        padding: 16, borderWidth: 1, borderColor: c.borderP5,
        ...cardShadow,
    },
    cardHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 8,
    },
    cardType: { fontSize: 15, fontWeight: fontWeight.title, color: c.text },
    statusBadge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
    statusText: { fontSize: 10, fontWeight: fontWeight.title, letterSpacing: 0.5 },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    cardDates: { fontSize: 13, color: c.textMuted },
    cardReason: { fontSize: 13, color: c.textSecondary, fontStyle: 'italic', marginTop: 4 },

    emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 6 },
    emptyIcon: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: c.borderP10,
        alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    },
    emptyTitle: { fontSize: 16, fontWeight: fontWeight.secondary, color: c.text },

    balanceRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, paddingVertical: 12 },
    balanceCard: {
        flex: 1, alignItems: 'center', backgroundColor: c.card,
        borderRadius: radius.card, paddingVertical: 12,
        borderWidth: 1, borderColor: c.borderP5, ...cardShadow,
    },
    balanceValue: { fontSize: 24, fontWeight: fontWeight.title },
    balanceLabel: { fontSize: 10, fontWeight: fontWeight.label, color: c.textMuted, marginTop: 2, textTransform: 'uppercase' },
});
