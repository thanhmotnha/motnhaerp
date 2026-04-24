import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch } from '@/lib/api';
import Colors from '@/constants/Colors';

const c = Colors.light;

export default function ProductionDetailScreen() {
    const { id } = useLocalSearchParams();
    const [order, setOrder] = useState<any>(null);
    const [photos, setPhotos] = useState<string[]>([]);

    useEffect(() => {
        apiFetch(`/api/furniture-orders/${id}`).then(setOrder).catch(console.error);
    }, [id]);

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') return;
        const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
        if (!result.canceled) setPhotos(prev => [...prev, result.assets[0].uri]);
    };

    const updateProgress = async (itemId: string, progress: number) => {
        if (!itemId) return Alert.alert('Lỗi', 'Thiếu mã sản phẩm');
        try {
            await apiFetch(`/api/furniture-orders/${id}/items/${itemId}`, {
                method: 'PATCH',
                body: JSON.stringify({ progress }),
            });
            Alert.alert('✅ Đã cập nhật', `Tiến độ: ${progress}%`);
            // Refresh order data để UI phản ánh progress mới
            const updated = await apiFetch(`/api/furniture-orders/${id}`);
            setOrder(updated);
        } catch (e: any) {
            Alert.alert('Lỗi', e.message || 'Không cập nhật được tiến độ');
        }
    };

    if (!order) return <View style={s.container}><Text style={s.loading}>Đang tải...</Text></View>;

    return (
        <ScrollView style={s.container}>
            {/* Header */}
            <View style={s.headerCard}>
                <Text style={s.code}>{order.code || `#${order.id?.slice(0, 8)}`}</Text>
                <Text style={s.projectName}>{order.project?.name || ''}</Text>
                <View style={s.statusRow}>
                    <View style={s.statusBadge}><Text style={s.statusText}>{order.status}</Text></View>
                    <Text style={s.dateText}>{order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN') : ''}</Text>
                </View>
            </View>

            {/* Items list */}
            <Text style={s.sectionTitle}>Danh sách sản phẩm ({order.items?.length || 0})</Text>
            {(order.items || []).map((item: any, i: number) => (
                <View key={item.id || i} style={s.itemCard}>
                    <View style={s.itemHeader}>
                        <Text style={s.itemName}>{item.name || item.product?.name || `SP ${i + 1}`}</Text>
                        <Text style={s.itemQty}>SL: {item.quantity || 1}</Text>
                    </View>
                    {item.material && <Text style={s.itemMaterial}>Vật liệu: {item.material}</Text>}
                    {item.size && <Text style={s.itemSize}>Kích thước: {item.size}</Text>}
                    {/* Progress */}
                    <View style={s.progressRow}>
                        <View style={s.progressBar}><View style={[s.progressFill, { width: `${item.progress || 0}%` }]} /></View>
                        <Text style={s.progressText}>{item.progress || 0}%</Text>
                    </View>
                    <View style={s.itemActions}>
                        <TouchableOpacity style={s.progressBtn} onPress={() => updateProgress(item.id, 50)}>
                            <Text style={s.progressBtnText}>50%</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.progressBtn, { backgroundColor: '#16a34a' }]} onPress={() => updateProgress(item.id, 100)}>
                            <Text style={s.progressBtnText}>100%</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ))}

            {/* Photos section */}
            <Text style={s.sectionTitle}>📷 Ảnh tiến độ</Text>
            <TouchableOpacity style={s.photoBtn} onPress={takePhoto}>
                <Ionicons name="camera" size={28} color={c.primary} />
                <Text style={s.photoBtnText}>Chụp ảnh tiến độ</Text>
            </TouchableOpacity>
            {photos.length > 0 && (
                <ScrollView horizontal style={s.photoScroll} showsHorizontalScrollIndicator={false}>
                    {photos.map((uri, i) => <Image key={i} source={{ uri }} style={s.photoThumb} />)}
                </ScrollView>
            )}

            {/* Design versions */}
            {order.designVersions?.length > 0 && (
                <>
                    <Text style={s.sectionTitle}>🎨 Phiên bản thiết kế</Text>
                    {order.designVersions.map((dv: any) => (
                        <View key={dv.id} style={s.designCard}>
                            <Ionicons name="color-palette" size={20} color="#8b5cf6" />
                            <View style={{ flex: 1 }}>
                                <Text style={s.designName}>v{dv.version} — {dv.name || 'Bản thiết kế'}</Text>
                                <Text style={s.designDate}>{dv.createdAt ? new Date(dv.createdAt).toLocaleDateString('vi-VN') : ''}</Text>
                            </View>
                            <View style={[s.designBadge, { backgroundColor: dv.status === 'Đã duyệt' ? '#16a34a20' : '#f59e0b20' }]}>
                                <Text style={[s.designStatus, { color: dv.status === 'Đã duyệt' ? '#16a34a' : '#f59e0b' }]}>{dv.status || 'Chờ duyệt'}</Text>
                            </View>
                        </View>
                    ))}
                </>
            )}

            <View style={{ height: 30 }} />
        </ScrollView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    loading: { padding: 40, textAlign: 'center', color: c.textMuted },
    headerCard: { margin: 16, backgroundColor: c.card, borderRadius: 16, padding: 20 },
    code: { fontSize: 12, fontWeight: '700', color: c.primary, fontFamily: 'monospace' },
    projectName: { fontSize: 18, fontWeight: '800', color: c.text, marginTop: 4, marginBottom: 8 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    statusBadge: { backgroundColor: '#f59e0b20', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    statusText: { fontSize: 12, fontWeight: '700', color: '#f59e0b' },
    dateText: { fontSize: 12, color: c.textMuted },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: c.text, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
    itemCard: { marginHorizontal: 16, marginBottom: 10, backgroundColor: c.card, borderRadius: 12, padding: 16 },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    itemName: { fontSize: 15, fontWeight: '700', color: c.text, flex: 1 },
    itemQty: { fontSize: 13, fontWeight: '600', color: c.accent },
    itemMaterial: { fontSize: 12, color: c.textMuted, marginBottom: 2 },
    itemSize: { fontSize: 12, color: c.textMuted, marginBottom: 8 },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    progressBar: { flex: 1, height: 6, backgroundColor: c.border, borderRadius: 3 },
    progressFill: { height: 6, backgroundColor: c.primary, borderRadius: 3 },
    progressText: { fontSize: 12, fontWeight: '600', color: c.textMuted },
    itemActions: { flexDirection: 'row', gap: 8 },
    progressBtn: { flex: 1, backgroundColor: c.primary, borderRadius: 8, paddingVertical: 6, alignItems: 'center' },
    progressBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
    photoBtn: { marginHorizontal: 16, backgroundColor: c.card, borderRadius: 12, padding: 20, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: c.border, borderStyle: 'dashed' },
    photoBtnText: { fontSize: 13, fontWeight: '600', color: c.textMuted },
    photoScroll: { paddingHorizontal: 16, marginTop: 10 },
    photoThumb: { width: 120, height: 90, borderRadius: 8, marginRight: 10 },
    designCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 8, backgroundColor: c.card, borderRadius: 10, padding: 14 },
    designName: { fontSize: 14, fontWeight: '600', color: c.text },
    designDate: { fontSize: 11, color: c.textMuted, marginTop: 2 },
    designBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
    designStatus: { fontSize: 11, fontWeight: '700' },
});
