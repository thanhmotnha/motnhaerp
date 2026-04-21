import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { apiFetch, apiFetchAllPages, apiUpload } from '@/lib/api';
import Colors, { cardShadow, radius, fontWeight } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/lib/auth';

const c = Colors.light;

const PLAN_STATUS: Record<string, { color: string; bg: string }> = {
    'Chưa đặt': { color: '#ef4444', bg: '#fee2e2' },
    'Đã đặt': { color: '#f59e0b', bg: '#fef3c7' },
    'Đã nhận đủ': { color: '#16a34a', bg: '#dcfce7' },
    'Đã nhận 1 phần': { color: '#3b82f6', bg: '#dbeafe' },
    'Đặt một phần': { color: '#8b5cf6', bg: '#ede9fe' },
};

const REQ_STATUS: Record<string, { color: string; bg: string }> = {
    'Chờ xử lý': { color: '#f59e0b', bg: '#fef3c7' },
    'Đã duyệt': { color: '#22c55e', bg: '#dcfce7' },
    'Đã từ chối': { color: '#ef4444', bg: '#fee2e2' },
    'Chờ duyệt': { color: '#8b5cf6', bg: '#ede9fe' },
    'Đã tạo PO': { color: '#2563eb', bg: '#dbeafe' },
    'Đã nhận hàng': { color: '#16a34a', bg: '#dcfce7' },
};

const normalizeReqStatus = (status?: string | null) => {
    if (!status) return '';
    if (status !== 'Chờ duyệt' && status.includes('Chờ duyệt')) return 'Chờ duyệt';
    return status;
};

const fmtNum = (n: number) => new Intl.NumberFormat('vi-VN').format(n || 0);
const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('vi-VN') : '--';
const today = () => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
};

export default function MaterialRequestScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ projectId?: string }>();
    const toast = useToast();
    const { user } = useAuth();
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [plans, setPlans] = useState<any[]>([]);
    const [requisitions, setRequisitions] = useState<any[]>([]);
    const [linkedPurchaseOrders, setLinkedPurchaseOrders] = useState<Record<string, any>>({});
    const [search, setSearch] = useState('');
    const [mode, setMode] = useState<'new' | 'history'>('new');
    const [projectModalVisible, setProjectModalVisible] = useState(false);
    const [projectSearch, setProjectSearch] = useState('');
    const [loadingPlans, setLoadingPlans] = useState(false);
    const [loadingHist, setLoadingHist] = useState(false);
    const [requestPlan, setRequestPlan] = useState<any>(null);
    const [requestQty, setRequestQty] = useState('');
    const [requestDate, setRequestDate] = useState(today());
    const [requestNotes, setRequestNotes] = useState('');
    const [submittingRequest, setSubmittingRequest] = useState(false);
    const [receiptItem, setReceiptItem] = useState<any>(null);
    const [rcvQty, setRcvQty] = useState('');
    const [rcvNotes, setRcvNotes] = useState('');
    const [rcvPhotos, setRcvPhotos] = useState<string[]>([]);
    const [submittingReceipt, setSubmittingReceipt] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const data = await apiFetchAllPages('/api/projects');
                setProjects(data);
                const preferred = typeof params.projectId === 'string' ? params.projectId : null;
                if (preferred && data.some((p: any) => p.id === preferred)) setSelectedProject(preferred);
                else if (data.length) setSelectedProject(data[0].id);
            } catch { setProjects([]); }
        })();
    }, [params.projectId]);

    useEffect(() => {
        if (!selectedProject) return;
        (async () => {
            setLoadingPlans(true);
            try {
                const q = search.trim();
                const data = await apiFetchAllPages(`/api/material-plans${q ? `?search=${encodeURIComponent(q)}` : ''}`);
                setPlans(data.filter((p: any) => p.projectId === selectedProject));
            } catch { setPlans([]); }
            setLoadingPlans(false);
        })();
    }, [search, selectedProject]);

    const loadHistory = useCallback(async () => {
        if (!selectedProject) return;
        setLoadingHist(true);
        try {
            const [reqRes, poData] = await Promise.all([
                apiFetch(`/api/material-requisitions?projectId=${selectedProject}`),
                apiFetchAllPages('/api/purchase-orders').catch(() => []),
            ]);
            const reqData = Array.isArray(reqRes) ? reqRes : (reqRes?.data || []);
            const projectPurchaseOrders = poData.filter((po: any) => po.projectId === selectedProject);
            setRequisitions(reqData);
            setLinkedPurchaseOrders(
                Object.fromEntries(projectPurchaseOrders.map((po: any) => [po.id, po])),
            );
        } catch {
            setRequisitions([]);
            setLinkedPurchaseOrders({});
        }
        setLoadingHist(false);
    }, [selectedProject]);

    useFocusEffect(
        useCallback(() => {
            if (mode !== 'history' || !selectedProject) return undefined;
            loadHistory();
            return undefined;
        }, [loadHistory, mode, selectedProject]),
    );

    const selectedProjectInfo = useMemo(
        () => projects.find((p: any) => p.id === selectedProject) || null,
        [projects, selectedProject],
    );
    const filteredProjects = useMemo(() => {
        const q = projectSearch.trim().toLowerCase();
        if (!q) return projects;
        return projects.filter((project: any) => {
            const name = String(project.name || '').toLowerCase();
            const code = String(project.code || '').toLowerCase();
            return name.includes(q) || code.includes(q);
        });
    }, [projectSearch, projects]);
    const projectName = selectedProjectInfo?.name || 'Chọn dự án';

    const openRequestModal = (plan: any) => {
        const suggested = Math.max(0, Number(plan.quantity || 0) - Number(plan.orderedQty || 0));
        setRequestPlan(plan);
        setRequestQty(suggested > 0 ? String(suggested) : '');
        setRequestDate(today());
        setRequestNotes('');
    };

    const submitRequest = async () => {
        if (!requestPlan || !selectedProject) return;
        const qty = Number.parseFloat(requestQty || '0');
        if (!qty || qty <= 0) return toast.show('Nhập số lượng yêu cầu hợp lệ', 'error');
        setSubmittingRequest(true);
        try {
            await apiFetch('/api/material-requisitions', {
                method: 'POST',
                body: JSON.stringify({
                    materialPlanId: requestPlan.id,
                    projectId: selectedProject,
                    requestedQty: qty,
                    requestedDate: requestDate || null,
                    notes: requestNotes,
                    createdBy: user?.name || '',
                }),
            });
            toast.show('Đã tạo yêu cầu vật tư', 'success');
            setRequestPlan(null);
            setMode('history');
            await loadHistory();
        } catch (e: any) {
            toast.show(e?.message || 'Không thể tạo yêu cầu', 'error');
        }
        setSubmittingRequest(false);
    };

    const takeReceiptPhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') return toast.show('Cần quyền camera', 'error');
        const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
        if (!result.canceled && result.assets[0]) setRcvPhotos((prev) => [...prev, result.assets[0].uri]);
    };

    const pickReceiptPhoto = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsMultipleSelection: true });
        if (!result.canceled) setRcvPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    };

    const openReceiptModal = (item: any) => {
        setReceiptItem(item);
        setRcvQty(String(item.receivedQty || item.requestedQty || ''));
        setRcvNotes(item.receiveNotes || '');
        setRcvPhotos([]);
    };

    const chooseProject = (projectId: string) => {
        setSelectedProject(projectId);
        setProjectModalVisible(false);
        setProjectSearch('');
    };

    const getLinkedPoProgress = useCallback((item: any) => {
        const linkedPo = item.purchaseOrderId ? linkedPurchaseOrders[item.purchaseOrderId] : null;
        const linkedPoItem = linkedPo?.items?.find((poItem: any) => poItem.materialPlanId === item.materialPlanId) || null;
        const receivedQty = linkedPoItem ? Number(linkedPoItem.receivedQty || 0) : Number(item.receivedQty || 0);
        const receivedAt = linkedPo?.receivedDate || item.receivedAt || null;
        const isComplete = linkedPo ? linkedPo.status === 'Hoàn thành' : Boolean(item.receivedAt);
        return {
            linkedPo,
            linkedPoItem,
            receivedQty,
            receivedAt,
            isComplete,
        };
    }, [linkedPurchaseOrders]);

    const submitReceipt = async () => {
        if (!receiptItem) return;
        const qty = Number.parseFloat(rcvQty || '0');
        if (!qty || qty <= 0) return toast.show('Nhập số lượng nhận hợp lệ', 'error');
        setSubmittingReceipt(true);
        try {
            const uploadedUrls: string[] = [];
            for (let i = 0; i < rcvPhotos.length; i += 1) {
                const res = await apiUpload('/api/upload', { type: 'proofs' }, [{ key: 'file', uri: rcvPhotos[i], name: `receipt_${receiptItem.id}_${i}.jpg` }]);
                if (!res?.url) throw new Error('Upload ảnh biên nhận thất bại');
                uploadedUrls.push(res.url);
            }
            const existingPhotos = Array.isArray(receiptItem.receivedPhotos)
                ? receiptItem.receivedPhotos.filter((url: unknown): url is string => typeof url === 'string')
                : [];

            await apiFetch(`/api/material-requisitions/${receiptItem.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    receivedQty: qty,
                    receivedPhotos: [...existingPhotos, ...uploadedUrls],
                    receiveNotes: rcvNotes,
                    receivedBy: user?.name || '',
                }),
            });
            toast.show('Đã xác nhận nhận hàng', 'success');
            setReceiptItem(null);
            await loadHistory();
        } catch (e: any) {
            toast.show(e?.message || 'Không thể xác nhận nhận hàng', 'error');
        }
        setSubmittingReceipt(false);
    };

    const renderPlan = ({ item }: { item: any }) => {
        const product = item.product || {};
        const status = PLAN_STATUS[item.status] || { color: c.textMuted, bg: '#f1f5f9' };
        const missing = Math.max(0, Number(item.quantity || 0) - Number(item.receivedQty || 0));
        return (
            <View style={s.card}>
                <View style={s.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.cardTitle}>{product.name || 'Vật tư'}</Text>
                        <Text style={s.cardSub}>{product.code || '--'} • {product.unit || 'đơn vị'}</Text>
                    </View>
                    <View style={[s.badge, { backgroundColor: status.bg }]}><Text style={[s.badgeText, { color: status.color }]}>{item.status || 'Chưa đặt'}</Text></View>
                </View>
                <View style={s.metrics}>
                    <View style={s.metric}><Text style={s.metricLabel}>Cần</Text><Text style={s.metricValue}>{fmtNum(item.quantity || 0)}</Text></View>
                    <View style={s.metric}><Text style={s.metricLabel}>Đã đặt</Text><Text style={[s.metricValue, { color: '#f59e0b' }]}>{fmtNum(item.orderedQty || 0)}</Text></View>
                    <View style={s.metric}><Text style={s.metricLabel}>Đã nhận</Text><Text style={[s.metricValue, { color: '#16a34a' }]}>{fmtNum(item.receivedQty || 0)}</Text></View>
                    <View style={s.metric}><Text style={s.metricLabel}>Còn thiếu</Text><Text style={[s.metricValue, { color: missing > 0 ? '#ef4444' : '#16a34a' }]}>{fmtNum(missing)}</Text></View>
                </View>
                <TouchableOpacity style={s.primaryBtn} onPress={() => openRequestModal(item)}>
                    <Ionicons name="clipboard-outline" size={18} color="#fff" />
                    <Text style={s.primaryBtnText}>Tạo yêu cầu vật tư</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderHistory = ({ item }: { item: any }) => {
        const product = item.materialPlan?.product || {};
        const displayStatus = normalizeReqStatus(item.status);
        const status = REQ_STATUS[displayStatus] || { color: c.textMuted, bg: '#f1f5f9' };
        const poProgress = getLinkedPoProgress(item);
        const canConfirmReceipt = !item.purchaseOrderId && ['Đã duyệt', 'Đã tạo PO'].includes(item.status) && !item.receivedAt;
        const canOpenPoReceive = !!item.purchaseOrderId && !poProgress.isComplete;
        return (
            <View style={s.card}>
                <View style={s.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.cardTitle}>{product.name || item.code}</Text>
                        <Text style={s.cardSub}>{item.code} • {product.unit || 'đơn vị'}</Text>
                    </View>
                    <View style={[s.badge, { backgroundColor: status.bg }]}><Text style={[s.badgeText, { color: status.color }]}>{displayStatus || 'Chờ xử lý'}</Text></View>
                </View>
                <View style={s.infoRow}><Ionicons name="calendar-outline" size={14} color={c.textMuted} /><Text style={s.infoText}>Ngày yêu cầu: {fmtDate(item.requestedDate || item.createdAt)}</Text></View>
                <View style={s.infoRow}><Ionicons name="person-outline" size={14} color={c.textMuted} /><Text style={s.infoText}>Người tạo: {item.createdBy || '--'}</Text></View>
                <View style={s.infoRow}><Ionicons name="layers-outline" size={14} color={c.textMuted} /><Text style={s.infoText}>SL yêu cầu: {fmtNum(item.requestedQty || 0)} {product.unit || ''}</Text></View>
                <View style={s.infoRow}><Ionicons name="checkmark-done-outline" size={14} color={c.textMuted} /><Text style={s.infoText}>{item.purchaseOrderId ? 'SL nhận theo PO' : 'SL đã nhận'}: {fmtNum(poProgress.receivedQty || 0)} {product.unit || poProgress.linkedPoItem?.unit || ''}</Text></View>
                {item.purchaseOrderId ? (
                    <View style={s.infoRow}>
                        <Ionicons name="receipt-outline" size={14} color={c.textMuted} />
                        <Text style={s.infoText}>
                            {poProgress.linkedPo?.code ? `${poProgress.linkedPo.code} • ${poProgress.linkedPo.status || 'Đã tạo PO'}` : 'Đã gắn với phiếu mua hàng'}
                        </Text>
                    </View>
                ) : null}
                {poProgress.linkedPoItem ? (
                    <View style={s.infoRow}>
                        <Ionicons name="git-network-outline" size={14} color={c.textMuted} />
                        <Text style={s.infoText}>
                            Tiến độ PO: {fmtNum(poProgress.linkedPoItem.receivedQty || 0)} / {fmtNum(poProgress.linkedPoItem.quantity || 0)} {product.unit || poProgress.linkedPoItem.unit || ''}
                        </Text>
                    </View>
                ) : null}
                {item.notes ? <View style={s.infoRow}><Ionicons name="chatbubble-ellipses-outline" size={14} color={c.textMuted} /><Text style={s.infoText}>{item.notes}</Text></View> : null}
                {canConfirmReceipt ? (
                    <TouchableOpacity style={s.successBtn} onPress={() => openReceiptModal(item)}>
                        <Ionicons name="camera-outline" size={18} color="#fff" />
                        <Text style={s.primaryBtnText}>Xác nhận nhận hàng</Text>
                    </TouchableOpacity>
                ) : null}
                {canOpenPoReceive ? (
                    <TouchableOpacity style={s.primaryBtn} onPress={() => router.push(`/purchasing?poId=${item.purchaseOrderId}&projectId=${item.projectId || selectedProject || ''}&materialPlanId=${item.materialPlanId}` as any)}>
                        <Ionicons name="cube-outline" size={18} color="#fff" />
                        <Text style={s.primaryBtnText}>Nhận hàng theo PO</Text>
                    </TouchableOpacity>
                ) : null}
                {poProgress.receivedAt ? <View style={s.receivedBox}><Ionicons name="checkmark-circle" size={16} color="#16a34a" /><Text style={s.receivedText}>{item.purchaseOrderId ? 'PO hoàn tất ngày' : 'Đã nhận ngày'} {fmtDate(poProgress.receivedAt)}</Text></View> : null}
            </View>
        );
    };

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            <View style={s.header}>
                <TouchableOpacity style={s.headerBtn} onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color={c.primary} /></TouchableOpacity>
                <Text style={s.headerTitle}>Yêu cầu vật tư</Text>
                <View style={{ width: 44 }} />
            </View>
            <View style={s.projectBar}>
                <Ionicons name="business-outline" size={16} color={c.primary} />
                <TouchableOpacity style={s.projectPicker} activeOpacity={0.8} onPress={() => setProjectModalVisible(true)}>
                    <View style={s.projectInfo}>
                        <Text style={s.projectLabel}>Dự án đang xem</Text>
                        <Text style={s.projectText}>{projectName}</Text>
                        {selectedProjectInfo?.code ? <Text style={s.projectMeta}>{selectedProjectInfo.code}</Text> : null}
                    </View>
                    <Ionicons name="chevron-down" size={18} color={c.textMuted} />
                </TouchableOpacity>
            </View>
            <View style={s.modeRow}>
                <TouchableOpacity style={[s.modeTab, mode === 'new' && s.modeTabActive]} onPress={() => setMode('new')}><Ionicons name="clipboard-outline" size={16} color={mode === 'new' ? '#fff' : c.primary} /><Text style={[s.modeText, mode === 'new' && s.modeTextActive]}>Tạo yêu cầu</Text></TouchableOpacity>
                <TouchableOpacity style={[s.modeTab, mode === 'history' && s.modeTabActive]} onPress={() => setMode('history')}><Ionicons name="time-outline" size={16} color={mode === 'history' ? '#fff' : c.primary} /><Text style={[s.modeText, mode === 'history' && s.modeTextActive]}>Lịch sử</Text></TouchableOpacity>
            </View>
            {mode === 'new' ? (
                <>
                    <View style={s.searchWrap}><View style={s.searchBox}><Ionicons name="search" size={20} color={c.textMuted} /><TextInput style={s.searchInput} value={search} onChangeText={setSearch} placeholder="Tìm vật tư theo tên hoặc mã" placeholderTextColor={c.textMuted} /></View></View>
                    {loadingPlans ? <View style={s.center}><ActivityIndicator color={c.primary} /></View> : (
                        <FlatList
                            data={plans}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={s.listContent}
                            ListEmptyComponent={<View style={s.empty}><Ionicons name="cube-outline" size={44} color={c.textMuted} /><Text style={s.emptyTitle}>Không có vật tư cần yêu cầu thêm</Text><Text style={s.emptyDesc}>Dự án này đã nhận đủ hoặc chưa có kế hoạch vật tư.</Text></View>}
                            renderItem={renderPlan}
                        />
                    )}
                </>
            ) : loadingHist ? <View style={s.center}><ActivityIndicator color={c.primary} /></View> : (
                <FlatList
                    data={requisitions}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={s.listContent}
                    ListEmptyComponent={<View style={s.empty}><Ionicons name="time-outline" size={44} color={c.textMuted} /><Text style={s.emptyTitle}>Chưa có yêu cầu vật tư</Text><Text style={s.emptyDesc}>Các yêu cầu đã tạo cho dự án sẽ hiển thị tại đây.</Text></View>}
                    renderItem={renderHistory}
                />
            )}

            <Modal visible={projectModalVisible} transparent animationType="slide" onRequestClose={() => setProjectModalVisible(false)}>
                <View style={s.overlay}>
                    <View style={s.sheet}>
                        <View style={s.handle} />
                        <Text style={s.sheetTitle}>Chọn dự án</Text>
                        <Text style={s.sheetSub}>Đổi dự án để xem kế hoạch vật tư và lịch sử yêu cầu đúng theo dự án bạn cần test.</Text>
                        <TextInput
                            style={s.input}
                            value={projectSearch}
                            onChangeText={setProjectSearch}
                            placeholder="Tìm theo mã hoặc tên dự án"
                            placeholderTextColor={c.textMuted}
                        />
                        <FlatList
                            data={filteredProjects}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={filteredProjects.length ? { paddingTop: 12 } : s.projectListEmpty}
                            ListEmptyComponent={
                                <View style={s.empty}>
                                    <Ionicons name="search-outline" size={40} color={c.textMuted} />
                                    <Text style={s.emptyTitle}>Không tìm thấy dự án</Text>
                                    <Text style={s.emptyDesc}>Thử lại bằng mã dự án hoặc một phần tên dự án.</Text>
                                </View>
                            }
                            renderItem={({ item }) => {
                                const active = item.id === selectedProject;
                                return (
                                    <TouchableOpacity
                                        style={[s.projectOption, active && s.projectOptionActive]}
                                        onPress={() => chooseProject(item.id)}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.projectOptionTitle}>{item.name}</Text>
                                            <Text style={s.projectOptionMeta}>
                                                {item.code || 'Không có mã'}{item.status ? ` • ${item.status}` : ''}
                                            </Text>
                                        </View>
                                        {active ? <Ionicons name="checkmark-circle" size={20} color={c.primary} /> : null}
                                    </TouchableOpacity>
                                );
                            }}
                        />
                        <TouchableOpacity style={s.cancelBtn} onPress={() => setProjectModalVisible(false)}>
                            <Text style={s.cancelText}>Đóng</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={!!requestPlan} transparent animationType="slide">
                <View style={s.overlay}>
                    <View style={s.sheet}>
                        <View style={s.handle} />
                        <Text style={s.sheetTitle}>Tạo yêu cầu vật tư</Text>
                        <Text style={s.sheetSub}>{requestPlan?.product?.name || '--'} • {requestPlan?.product?.unit || 'đơn vị'}</Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={s.label}>Số lượng yêu cầu</Text>
                            <TextInput style={s.input} value={requestQty} onChangeText={setRequestQty} keyboardType="numeric" placeholder="0" placeholderTextColor={c.textMuted} />
                            <Text style={s.label}>Ngày cần</Text>
                            <TextInput style={s.input} value={requestDate} onChangeText={setRequestDate} placeholder="YYYY-MM-DD" placeholderTextColor={c.textMuted} />
                            <Text style={s.label}>Ghi chú</Text>
                            <TextInput style={[s.input, s.textArea]} value={requestNotes} onChangeText={setRequestNotes} multiline placeholder="Ghi chú thêm cho yêu cầu này" placeholderTextColor={c.textMuted} />
                            <TouchableOpacity style={s.primaryBtn} onPress={submitRequest} disabled={submittingRequest}>{submittingRequest ? <ActivityIndicator color="#fff" /> : <><Ionicons name="send" size={18} color="#fff" /><Text style={s.primaryBtnText}>Gửi yêu cầu</Text></>}</TouchableOpacity>
                            <TouchableOpacity style={s.cancelBtn} onPress={() => setRequestPlan(null)}><Text style={s.cancelText}>Hủy</Text></TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <Modal visible={!!receiptItem} transparent animationType="slide">
                <View style={s.overlay}>
                    <View style={s.sheet}>
                        <View style={s.handle} />
                        <Text style={s.sheetTitle}>Xác nhận nhận hàng</Text>
                        <Text style={s.sheetSub}>{receiptItem?.materialPlan?.product?.name || '--'} • YC {fmtNum(receiptItem?.requestedQty || 0)}</Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={s.label}>Tổng số lượng đã nhận</Text>
                            <TextInput style={s.input} value={rcvQty} onChangeText={setRcvQty} keyboardType="numeric" placeholder="0" placeholderTextColor={c.textMuted} />
                            <Text style={s.label}>Ảnh biên nhận</Text>
                            <View style={s.photoRow}>
                                {rcvPhotos.map((uri, i) => <TouchableOpacity key={`${uri}-${i}`} onPress={() => setRcvPhotos((prev) => prev.filter((_, idx) => idx !== i))}><Image source={{ uri }} style={s.photoThumb} /></TouchableOpacity>)}
                                <TouchableOpacity style={s.photoBtn} onPress={takeReceiptPhoto}><Ionicons name="camera-outline" size={24} color={c.primary} /></TouchableOpacity>
                                <TouchableOpacity style={s.photoBtn} onPress={pickReceiptPhoto}><Ionicons name="images-outline" size={24} color={c.accent} /></TouchableOpacity>
                            </View>
                            <Text style={s.label}>Ghi chú nhận hàng</Text>
                            <TextInput style={[s.input, s.textArea]} value={rcvNotes} onChangeText={setRcvNotes} multiline placeholder="Thiếu, thừa hoặc hư hỏng nếu có" placeholderTextColor={c.textMuted} />
                            <TouchableOpacity style={s.successBtn} onPress={submitReceipt} disabled={submittingReceipt}>{submittingReceipt ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><Text style={s.primaryBtnText}>Xác nhận nhận hàng</Text></>}</TouchableOpacity>
                            <TouchableOpacity style={s.cancelBtn} onPress={() => setReceiptItem(null)}><Text style={s.cancelText}>Hủy</Text></TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bgGradientStart },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: c.borderP10 },
    headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.primary + '18', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: fontWeight.title, color: c.primary },
    projectBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },
    projectPicker: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: c.borderP10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
    projectInfo: { flex: 1 },
    projectLabel: { fontSize: 11, color: c.textMuted, marginBottom: 2 },
    projectText: { fontSize: 13, color: c.textSecondary, fontWeight: fontWeight.secondary },
    projectMeta: { fontSize: 11, color: c.primary, marginTop: 2 },
    modeRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: c.borderP5 },
    modeTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: c.primary + '30' },
    modeTabActive: { backgroundColor: c.primary, borderColor: c.primary },
    modeText: { fontSize: 13, color: c.primary, fontWeight: fontWeight.secondary },
    modeTextActive: { color: '#fff' },
    searchWrap: { padding: 16, backgroundColor: '#fff' },
    searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: c.borderP10, paddingHorizontal: 16, backgroundColor: '#fff' },
    searchInput: { flex: 1, fontSize: 15, color: c.text },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    listContent: { padding: 16, paddingBottom: 120, gap: 12 },
    empty: { alignItems: 'center', paddingVertical: 72, paddingHorizontal: 24 },
    emptyTitle: { fontSize: 16, fontWeight: fontWeight.title, color: c.text, marginTop: 12, textAlign: 'center' },
    emptyDesc: { fontSize: 13, color: c.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 20 },
    card: { backgroundColor: '#fff', borderRadius: radius.card, padding: 16, borderWidth: 1, borderColor: c.borderP5, ...cardShadow },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    cardTitle: { fontSize: 15, fontWeight: fontWeight.title, color: c.text },
    cardSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
    badgeText: { fontSize: 11, fontWeight: fontWeight.title },
    metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    metric: { width: '48%', backgroundColor: c.bgGradientStart, borderRadius: 12, padding: 12 },
    metricLabel: { fontSize: 11, color: c.textMuted, marginBottom: 4 },
    metricValue: { fontSize: 16, fontWeight: fontWeight.title, color: c.text },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
    infoText: { flex: 1, fontSize: 12, color: c.textSecondary },
    primaryBtn: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.primary, paddingVertical: 14, borderRadius: radius.button },
    successBtn: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#16a34a', paddingVertical: 14, borderRadius: radius.button },
    primaryBtnText: { fontSize: 14, color: '#fff', fontWeight: fontWeight.title },
    receivedBox: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#16a34a18', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
    receivedText: { fontSize: 12, color: '#16a34a', fontWeight: fontWeight.secondary },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, maxHeight: '88%' },
    handle: { width: 40, height: 4, backgroundColor: '#d1d5db', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
    sheetTitle: { fontSize: 18, fontWeight: fontWeight.title, color: c.text, textAlign: 'center' },
    sheetSub: { fontSize: 13, color: c.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 12 },
    label: { fontSize: 13, color: c.text, fontWeight: fontWeight.secondary, marginTop: 12, marginBottom: 6 },
    input: { borderWidth: 1.5, borderColor: c.borderP10, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.text },
    textArea: { minHeight: 90, textAlignVertical: 'top' },
    photoRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    photoBtn: { width: 70, height: 70, borderRadius: 12, borderWidth: 1.5, borderColor: c.borderP10, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
    photoThumb: { width: 70, height: 70, borderRadius: 12 },
    projectListEmpty: { flexGrow: 1, justifyContent: 'center' },
    projectOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: c.borderP10, marginTop: 10 },
    projectOptionActive: { borderColor: c.primary, backgroundColor: c.primary + '10' },
    projectOptionTitle: { fontSize: 14, fontWeight: fontWeight.title, color: c.text },
    projectOptionMeta: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    cancelBtn: { alignItems: 'center', paddingVertical: 14 },
    cancelText: { fontSize: 14, color: c.textMuted, fontWeight: fontWeight.secondary },
});

