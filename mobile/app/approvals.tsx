import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, FlatList, StyleSheet, TouchableOpacity,
    RefreshControl, Alert, Animated, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiFetch, apiFetchAllPages } from '@/lib/api';
import Colors, { cardShadow, radius, fontWeight } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';

const c = Colors.light;

const TXT = {
    title: 'Trung t\u00e2m ph\u00ea duy\u1ec7t',
    pending: '\u0111ang ch\u1edd duy\u1ec7t',
    allDone: 'T\u1ea5t c\u1ea3 \u0111\u00e3 duy\u1ec7t!',
    noPending: 'Kh\u00f4ng c\u00f3 y\u00eau c\u1ea7u n\u00e0o \u0111ang ch\u1edd ph\u00ea duy\u1ec7t',
    approve: 'Duy\u1ec7t',
    reject: 'T\u1eeb ch\u1ed1i',
    approved: '\u2705 \u0110\u00e3 duy\u1ec7t',
    rejected: '\u274c \u0110\u00e3 t\u1eeb ch\u1ed1i',
    rejectTitle: 'L\u00fd do t\u1eeb ch\u1ed1i',
    rejectPlaceholder: 'Nh\u1eadp l\u00fd do t\u1eeb ch\u1ed1i...',
    cancel: 'H\u1ee7y',
    confirm: 'X\u00e1c nh\u1eadn',
    detail: 'Chi ti\u1ebft y\u00eau c\u1ea7u',
    requester: 'Ng\u01b0\u1eddi y\u00eau c\u1ea7u',
    date: 'Ng\u00e0y t\u1ea1o',
    project: 'D\u1ef1 \u00e1n',
    items: 'H\u1ea1ng m\u1ee5c',
    total: 'T\u1ed5ng s\u1ed1 l\u01b0\u1ee3ng',
    error: 'L\u1ed7i',
};

const normalizeMaterialStatus = (status?: string | null) => {
    if (!status) return '';
    if (status !== 'Ch\u1edd duy\u1ec7t' && status.includes('Ch\u1edd duy\u1ec7t')) return 'Ch\u1edd duy\u1ec7t';
    return status;
};

// Skeleton
const Skeleton = ({ width, height, style }: any) => {
    const anim = useRef(new Animated.Value(0.3)).current;
    useEffect(() => {
        Animated.loop(Animated.sequence([
            Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        ])).start();
    }, []);
    return <Animated.View style={[{ width, height, borderRadius: 8, backgroundColor: c.skeletonBase, opacity: anim }, style]} />;
};

export default function ApprovalsScreen() {
    const router = useRouter();
    const [items, setItems] = useState<any[]>([]);
    const [projectNames, setProjectNames] = useState<Record<string, string>>({});
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [rejectModal, setRejectModal] = useState<any>(null);
    const [rejectReason, setRejectReason] = useState('');

    const load = async () => {
        try {
            const [mrRes, poData, projectList] = await Promise.all([
                apiFetch('/api/material-requisitions?limit=100').catch(() => []),
                apiFetchAllPages('/api/purchase-orders').catch(() => []),
                apiFetchAllPages('/api/projects').catch(() => []),
            ]);
            setProjectNames(
                Object.fromEntries(projectList.map((project: any) => [project.id, project.name])),
            );
            const materialReqs = (Array.isArray(mrRes) ? mrRes : (mrRes?.data || []))
                .filter((m: any) => ['Ch\u1edd x\u1eed l\u00fd', 'Ch\u1edd duy\u1ec7t'].includes(normalizeMaterialStatus(m.status)))
                .map((m: any) => ({
                    ...m,
                    _displayStatus: normalizeMaterialStatus(m.status),
                    _type: 'Y\u00eau c\u1ea7u v\u1eadt t\u01b0',
                    _kind: 'material',
                    _endpoint: `/api/material-requisitions/${m.id}`,
                }));
            const pos = poData
                .filter((p: any) => String(p.status || '').includes('Ch\u1edd duy\u1ec7t'))
                .map((p: any) => ({
                    ...p,
                    _type: '\u0110\u01a1n mua h\u00e0ng',
                    _kind: 'purchase_order',
                    _endpoint: `/api/purchase-orders/${p.id}`,
                }));
            setItems([...materialReqs, ...pos]);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { load(); }, []);
    const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

    const approve = async (item: any) => {
        try {
            await apiFetch(item._endpoint, { method: 'PUT', body: JSON.stringify({ status: '\u0110\u00e3 duy\u1ec7t' }) });
            Alert.alert(TXT.approved);
            load();
        } catch (e: any) { Alert.alert(TXT.error, e.message); }
    };

    const confirmReject = async () => {
        if (!rejectModal) return;
        try {
            const status = rejectModal._kind === 'material' ? '\u0110\u00e3 t\u1eeb ch\u1ed1i' : 'T\u1eeb ch\u1ed1i';
            await apiFetch(rejectModal._endpoint, {
                method: 'PUT',
                body: JSON.stringify({
                    status,
                    ...(rejectModal._kind === 'purchase_order' && rejectReason.trim() ? { notes: rejectReason.trim() } : {}),
                }),
            });
            Alert.alert(TXT.rejected);
            setRejectModal(null);
            setRejectReason('');
            load();
        } catch (e: any) { Alert.alert(TXT.error, e.message); }
    };

    const fmt = (n: number) => n?.toLocaleString('vi-VN') || '0';

    const renderCard = ({ item }: { item: any }) => {
        const isExpanded = expanded === item.id;
        const projectName = item.project?.name || projectNames[item.projectId] || '';
        const itemsList = item._kind === 'material'
            ? [{
                name: item.materialPlan?.product?.name || item.code,
                quantity: item.requestedQty || 0,
                unit: item.materialPlan?.product?.unit || '',
            }]
            : (item.items || item.products || []);
        const totalQty = itemsList.reduce((s: number, i: any) => s + Number(i.quantity || 0), 0);

        return (
            <View style={s.card}>
                {/* Header */}
                <TouchableOpacity style={s.cardHeader} activeOpacity={0.7}
                    onPress={() => setExpanded(isExpanded ? null : item.id)}>
                    <View style={s.cardRow}>
                        <View style={s.typePill}>
                            <Text style={s.typeText}>{item._type}</Text>
                        </View>
                        <View style={s.statusPill}>
                            <Text style={s.statusText}>{item._displayStatus || item.status || `Ch\u1edd duy\u1ec7t`}</Text>
                        </View>
                    </View>
                    <Text style={s.cardTitle}>{projectName || item.materialPlan?.product?.name || item.name || 'Y\u00eau c\u1ea7u'}</Text>
                    <View style={s.cardMetaRow}>
                        <Ionicons name="person-outline" size={12} color={c.textMuted} />
                        <Text style={s.cardMeta}>
                            {item.createdBy?.name || item.createdBy || ''}
                            {item.createdAt ? ` \u2022 ${new Date(item.createdAt).toLocaleDateString('vi-VN')}` : ''}
                        </Text>
                        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={c.primary} style={{ marginLeft: 'auto' }} />
                    </View>
                </TouchableOpacity>

                {/* Expandable detail */}
                {isExpanded && (
                    <View style={s.detailSection}>
                        <View style={s.detailDivider} />

                        {/* Info grid */}
                        <View style={s.detailGrid}>
                            <View style={s.detailItem}>
                                <Text style={s.detailLabel}>{TXT.requester}</Text>
                                <Text style={s.detailValue}>{item.createdBy?.name || item.createdBy || '-'}</Text>
                            </View>
                            <View style={s.detailItem}>
                                <Text style={s.detailLabel}>{TXT.date}</Text>
                                <Text style={s.detailValue}>
                                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '-'}
                                </Text>
                            </View>
                            <View style={s.detailItem}>
                                <Text style={s.detailLabel}>{TXT.project}</Text>
                                <Text style={s.detailValue}>{projectName || '-'}</Text>
                            </View>
                            <View style={s.detailItem}>
                                <Text style={s.detailLabel}>{TXT.total}</Text>
                                <Text style={[s.detailValue, { color: c.primary, fontWeight: fontWeight.title }]}>
                                    {fmt(totalQty)}
                                </Text>
                            </View>
                        </View>

                        {/* Items list */}
                        {itemsList.length > 0 && (
                            <>
                                <Text style={s.itemsLabel}>{TXT.items} ({itemsList.length})</Text>
                                {itemsList.slice(0, 5).map((li: any, idx: number) => (
                                    <View key={idx} style={s.lineItem}>
                                        <View style={s.lineItemDot} />
                                        <Text style={s.lineItemName} numberOfLines={1}>{li.name || li.productName || `#${idx + 1}`}</Text>
                                        <Text style={s.lineItemQty}>x{li.quantity || 0}{li.unit ? ` ${li.unit}` : ''}</Text>
                                    </View>
                                ))}
                                {itemsList.length > 5 && (
                                    <Text style={s.moreItems}>+{itemsList.length - 5} h\u1ea1ng m\u1ee5c kh\u00e1c</Text>
                                )}
                            </>
                        )}

                        {item.notes && (
                            <View style={s.noteBox}>
                                <Ionicons name="chatbubble-outline" size={12} color={c.textMuted} />
                                <Text style={s.noteText}>{item.notes}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Action buttons */}
                <View style={s.actionRow}>
                    <TouchableOpacity style={s.approveBtn} onPress={() => approve(item)} activeOpacity={0.8}>
                        <Ionicons name="checkmark" size={18} color="#fff" />
                        <Text style={s.approveBtnText}>{TXT.approve}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.rejectBtn} onPress={() => { setRejectModal(item); setRejectReason(''); }} activeOpacity={0.8}>
                        <Ionicons name="close" size={18} color={c.danger} />
                        <Text style={s.rejectBtnText}>{TXT.reject}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            <View style={s.header}>
                <TouchableOpacity style={s.headerCircle} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={c.primary} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>{TXT.title}</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={s.badgeBar}>
                <View style={s.badgeDot} />
                <Text style={s.badgeText}>{items.length} {TXT.pending}</Text>
            </View>

            {loading ? (
                <View style={{ paddingHorizontal: 16, gap: 10, paddingTop: 12 }}>
                    {[1, 2, 3].map(i => <Skeleton key={i} width="100%" height={120} style={{ borderRadius: radius.card }} />)}
                </View>
            ) : (
                <FlatList
                    data={items}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 8 }}
                    keyExtractor={item => item.id}
                    ListEmptyComponent={
                        <View style={s.emptyBox}>
                            <View style={s.emptyIcon}>
                                <Ionicons name="checkmark-done" size={36} color={c.primary} />
                            </View>
                            <Text style={s.emptyTitle}>{TXT.allDone}</Text>
                            <Text style={s.emptyDesc}>{TXT.noPending}</Text>
                        </View>
                    }
                    renderItem={renderCard}
                />
            )}

            {/* Reject reason modal */}
            <Modal visible={!!rejectModal} transparent animationType="fade">
                <View style={s.modalOverlay}>
                    <View style={s.modalContent}>
                        <Text style={s.modalTitle}>{rejectModal?._kind === 'purchase_order' ? TXT.rejectTitle : 'Xác nhận từ chối'}</Text>
                        <Text style={s.modalSub}>{rejectModal?.project?.name || projectNames[rejectModal?.projectId] || rejectModal?.materialPlan?.product?.name || rejectModal?.name || ''}</Text>
                        {rejectModal?._kind === 'purchase_order' ? (
                            <TextInput
                                style={s.modalInput}
                                value={rejectReason}
                                onChangeText={setRejectReason}
                                placeholder={TXT.rejectPlaceholder}
                                placeholderTextColor="#94a3b8"
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                            />
                        ) : (
                            <Text style={s.modalInfoText}>Backend `motnha` hiện chỉ đổi trạng thái của yêu cầu vật tư sang `Đã từ chối`, chưa có field riêng để lưu lý do từ chối.</Text>
                        )}
                        <View style={s.modalActions}>
                            <TouchableOpacity style={s.modalCancel} onPress={() => setRejectModal(null)}>
                                <Text style={s.modalCancelText}>{TXT.cancel}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.modalConfirm} onPress={confirmReject}>
                                <Text style={s.modalConfirmText}>{TXT.confirm}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bgGradientStart },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: c.borderP5,
    },
    headerCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.borderP10, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: fontWeight.title, color: c.primary },

    badgeBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10 },
    badgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent },
    badgeText: { fontSize: 13, fontWeight: fontWeight.label, color: c.textSecondary },

    card: {
        borderRadius: radius.card, backgroundColor: c.card,
        borderLeftWidth: 4, borderLeftColor: c.accent, marginBottom: 10,
        overflow: 'hidden', ...cardShadow,
    },
    cardHeader: { padding: 16 },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    typePill: { backgroundColor: c.primary + '10', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
    typeText: { fontSize: 10, fontWeight: fontWeight.title, color: c.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
    statusPill: { backgroundColor: c.accent + '15', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
    statusText: { fontSize: 10, fontWeight: fontWeight.title, color: c.accent, textTransform: 'uppercase' },
    cardTitle: { fontSize: 15, fontWeight: fontWeight.secondary, color: c.text, marginBottom: 4 },
    cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    cardMeta: { fontSize: 12, color: c.textMuted },

    // Expandable detail
    detailSection: { paddingHorizontal: 16, paddingBottom: 12 },
    detailDivider: { height: 1, backgroundColor: c.borderP5, marginBottom: 12 },
    detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
    detailItem: {
        width: '48%', backgroundColor: c.bgGradientStart,
        borderRadius: radius.iconBox, padding: 10, marginBottom: 4,
    },
    detailLabel: { fontSize: 10, fontWeight: fontWeight.label, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
    detailValue: { fontSize: 13, fontWeight: fontWeight.secondary, color: c.text, marginTop: 2 },
    itemsLabel: { fontSize: 12, fontWeight: fontWeight.title, color: c.primary, marginTop: 8, marginBottom: 6 },
    lineItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: c.borderP5 },
    lineItemDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: c.accent },
    lineItemName: { flex: 1, fontSize: 13, color: c.text },
    lineItemQty: { fontSize: 12, fontWeight: fontWeight.secondary, color: c.textMuted },
    lineItemPrice: { fontSize: 12, fontWeight: fontWeight.secondary, color: c.primary, minWidth: 70, textAlign: 'right' },
    moreItems: { fontSize: 11, color: c.textMuted, fontStyle: 'italic', marginTop: 4 },
    noteBox: { flexDirection: 'row', gap: 6, backgroundColor: c.bgGradientStart, borderRadius: radius.iconBox, padding: 10, marginTop: 8 },
    noteText: { fontSize: 12, color: c.textSecondary, flex: 1 },

    actionRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 16 },
    approveBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 10, borderRadius: radius.button, backgroundColor: c.primary,
        shadowColor: c.primary, shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3,
    },
    approveBtnText: { fontSize: 13, fontWeight: fontWeight.title, color: '#fff' },
    rejectBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 10, borderRadius: radius.button,
        borderWidth: 1.5, borderColor: c.danger + '40', backgroundColor: c.danger + '08',
    },
    rejectBtnText: { fontSize: 13, fontWeight: fontWeight.secondary, color: c.danger },

    emptyBox: { alignItems: 'center', paddingVertical: 80, gap: 6 },
    emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.borderP10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: fontWeight.title, color: c.text },
    emptyDesc: { fontSize: 14, color: c.textMuted },

    // Reject modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 20, padding: 24 },
    modalTitle: { fontSize: 18, fontWeight: fontWeight.title, color: c.text, marginBottom: 4 },
    modalSub: { fontSize: 13, color: c.textMuted, marginBottom: 16 },
    modalInfoText: { fontSize: 13, color: c.textSecondary, lineHeight: 20, backgroundColor: c.bgGradientStart, borderRadius: radius.card, padding: 14, borderWidth: 1, borderColor: c.borderP10 },
    modalInput: {
        minHeight: 80, backgroundColor: c.bgGradientStart, borderRadius: radius.card,
        padding: 14, fontSize: 14, color: c.text, borderWidth: 1, borderColor: c.borderP10,
    },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
    modalCancel: {
        flex: 1, paddingVertical: 12, borderRadius: radius.button,
        borderWidth: 1, borderColor: c.borderP10, alignItems: 'center',
    },
    modalCancelText: { fontSize: 14, fontWeight: fontWeight.secondary, color: c.textMuted },
    modalConfirm: {
        flex: 1, paddingVertical: 12, borderRadius: radius.button,
        backgroundColor: c.danger, alignItems: 'center',
    },
    modalConfirmText: { fontSize: 14, fontWeight: fontWeight.title, color: '#fff' },
});
