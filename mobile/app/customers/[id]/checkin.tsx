import React, { useState } from 'react';
import {
    View, Text, ScrollView, Image, StyleSheet, Alert, Pressable, TextInput,
    ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Camera, X, Image as ImageIcon } from 'lucide-react-native';
import { apiUpload } from '@/lib/api';
import { useCreateInteraction, useUsersByRole, useCustomer } from '@/hooks/useApi';
import { COLORS } from '@/lib/constants';
import type { InteractionType, InterestLevel, InteractionOutcome } from '@/lib/types';

const MAX_PHOTOS = 10;
const TYPES: InteractionType[] = ['Gặp trực tiếp', 'Điện thoại', 'Zalo', 'Email', 'Ghi chú'];
const LEVELS: { key: InterestLevel; color: string; bg: string }[] = [
    { key: 'Nóng', color: '#dc2626', bg: '#fee2e2' },
    { key: 'Ấm', color: '#d97706', bg: '#fef3c7' },
    { key: 'Lạnh', color: '#2563eb', bg: '#dbeafe' },
];
const OUTCOMES: InteractionOutcome[] = ['', 'Báo giá', 'Đặt cọc', 'Từ chối', 'Cần gặp lại'];

export default function CheckinScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { data: customer } = useCustomer(id);
    const { data: users } = useUsersByRole('kinh_doanh');
    const createInteraction = useCreateInteraction();

    const [type, setType] = useState<InteractionType>('Gặp trực tiếp');
    const [content, setContent] = useState('');
    const [photos, setPhotos] = useState<{ uri: string; uploaded?: string; uploading?: boolean }[]>([]);
    const [interestLevel, setInterestLevel] = useState<InterestLevel>('');
    const [outcome, setOutcome] = useState<InteractionOutcome>('');
    const [companionIds, setCompanionIds] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    async function pickImage(useCamera: boolean) {
        if (photos.length >= MAX_PHOTOS) {
            Alert.alert('Giới hạn', `Tối đa ${MAX_PHOTOS} ảnh`);
            return;
        }
        const permission = useCamera
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền camera/thư viện');
            return;
        }
        const result = useCamera
            ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
            : await ImagePicker.launchImageLibraryAsync({
                quality: 0.8,
                allowsMultipleSelection: true,
                selectionLimit: MAX_PHOTOS - photos.length,
            });
        if (result.canceled) return;
        const newPhotos = result.assets.map((a) => ({ uri: a.uri, uploading: true }));
        setPhotos((prev) => [...prev, ...newPhotos].slice(0, MAX_PHOTOS));
        // Start uploading each
        for (const p of newPhotos) {
            try {
                const url = await compressAndUpload(p.uri);
                setPhotos((prev) => prev.map(x => x.uri === p.uri ? { ...x, uploaded: url, uploading: false } : x));
            } catch (e: any) {
                setPhotos((prev) => prev.filter(x => x.uri !== p.uri));
                Alert.alert('Lỗi upload', e?.message || 'Không upload được ảnh');
            }
        }
    }

    async function compressAndUpload(uri: string): Promise<string> {
        const m = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 1200 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
        );
        const fd = new FormData();
        fd.append('file', { uri: m.uri, name: `checkin_${Date.now()}.jpg`, type: 'image/jpeg' } as any);
        fd.append('type', 'checkin');
        const res = await apiUpload('/api/upload', fd);
        return res.url;
    }

    function removePhoto(idx: number) {
        setPhotos((prev) => prev.filter((_, i) => i !== idx));
    }

    function toggleCompanion(userId: string) {
        setCompanionIds(prev => prev.includes(userId) ? prev.filter(x => x !== userId) : [...prev, userId]);
    }

    async function handleSubmit() {
        if (!content.trim()) {
            Alert.alert('Thiếu thông tin', 'Nhập nội dung check-in');
            return;
        }
        if (photos.some(p => p.uploading)) {
            Alert.alert('Đợi', 'Ảnh đang upload, đợi xong rồi lưu');
            return;
        }
        setSubmitting(true);
        try {
            await createInteraction.mutateAsync({
                customerId: id,
                type,
                content: content.trim(),
                photos: photos.map(p => p.uploaded).filter(Boolean) as string[],
                interestLevel,
                outcome,
                companionIds,
            });
            Alert.alert('✓ Đã lưu', 'Check-in thành công', [{ text: 'OK', onPress: () => router.back() }]);
        } catch (e: any) {
            Alert.alert('Lỗi', e?.message || 'Không lưu được');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <>
            <Stack.Screen options={{ title: 'Check-in KH', headerStyle: { backgroundColor: COLORS.primary }, headerTintColor: '#fff' }} />
            <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
                {customer && (
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerLabel}>Khách:</Text>
                        <Text style={styles.headerName}>{customer.name} · {customer.phone}</Text>
                    </View>
                )}

                <Section title="Loại">
                    <View style={styles.chipRow}>
                        {TYPES.map(t => (
                            <Pressable key={t} onPress={() => setType(t)}
                                style={[styles.chip, type === t && styles.chipActive]}>
                                <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t}</Text>
                            </Pressable>
                        ))}
                    </View>
                </Section>

                <Section title="Nội dung *">
                    <TextInput
                        style={styles.textArea}
                        value={content}
                        onChangeText={setContent}
                        multiline
                        placeholder="Ghi nội dung trao đổi, khảo sát nhà..."
                        placeholderTextColor={COLORS.textLight}
                    />
                </Section>

                <Section title={`Ảnh (${photos.length}/${MAX_PHOTOS})`}>
                    <View style={styles.photoBtns}>
                        <Pressable style={styles.photoBtn} onPress={() => pickImage(true)}>
                            <Camera size={18} color={COLORS.primary} />
                            <Text style={styles.photoBtnText}>Chụp ảnh</Text>
                        </Pressable>
                        <Pressable style={styles.photoBtn} onPress={() => pickImage(false)}>
                            <ImageIcon size={18} color={COLORS.primary} />
                            <Text style={styles.photoBtnText}>Thư viện</Text>
                        </Pressable>
                    </View>
                    {photos.length > 0 && (
                        <View style={styles.photoGrid}>
                            {photos.map((p, i) => (
                                <View key={i} style={styles.photoWrap}>
                                    <Image source={{ uri: p.uri }} style={styles.photo} />
                                    {p.uploading && (
                                        <View style={styles.photoOverlay}>
                                            <ActivityIndicator color="#fff" />
                                        </View>
                                    )}
                                    <Pressable style={styles.photoRemove} onPress={() => removePhoto(i)}>
                                        <X size={14} color="#fff" />
                                    </Pressable>
                                </View>
                            ))}
                        </View>
                    )}
                </Section>

                <Section title="Mức độ quan tâm">
                    <View style={styles.chipRow}>
                        {LEVELS.map(lv => (
                            <Pressable key={lv.key} onPress={() => setInterestLevel(interestLevel === lv.key ? '' : lv.key)}
                                style={[
                                    styles.chip,
                                    { borderColor: lv.color, backgroundColor: interestLevel === lv.key ? lv.color : lv.bg },
                                ]}>
                                <Text style={[
                                    styles.chipText,
                                    { color: interestLevel === lv.key ? '#fff' : lv.color, fontWeight: '600' },
                                ]}>{lv.key}</Text>
                            </Pressable>
                        ))}
                    </View>
                </Section>

                <Section title="Kết quả">
                    <View style={styles.chipRow}>
                        {OUTCOMES.map(o => (
                            <Pressable key={o} onPress={() => setOutcome(o)}
                                style={[styles.chip, outcome === o && styles.chipActive]}>
                                <Text style={[styles.chipText, outcome === o && styles.chipTextActive]}>
                                    {o || '(chưa có)'}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </Section>

                {users && users.length > 0 && (
                    <Section title="Đi cùng">
                        <View style={styles.chipRow}>
                            {users.map(u => (
                                <Pressable key={u.id} onPress={() => toggleCompanion(u.id)}
                                    style={[styles.chip, companionIds.includes(u.id) && styles.chipActive]}>
                                    <Text style={[styles.chipText, companionIds.includes(u.id) && styles.chipTextActive]}>
                                        {u.name}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </Section>
                )}

                <Pressable
                    style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitBtnText}>✓ Lưu check-in</Text>
                    )}
                </Pressable>

                <View style={{ height: 40 }} />
            </ScrollView>
        </>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionLabel}>{title}</Text>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    headerInfo: { padding: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: 'row', gap: 6 },
    headerLabel: { fontSize: 13, color: COLORS.textSecondary },
    headerName: { fontSize: 13, color: COLORS.text, fontWeight: '600', flex: 1 },
    section: { padding: 12, backgroundColor: COLORS.white, marginTop: 8 },
    sectionLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 8 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: COLORS.borderLight, borderWidth: 1, borderColor: COLORS.border },
    chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipText: { fontSize: 13, color: COLORS.text },
    chipTextActive: { color: '#fff', fontWeight: '600' },
    textArea: { minHeight: 100, padding: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, fontSize: 15, color: COLORS.text, textAlignVertical: 'top' },
    photoBtns: { flexDirection: 'row', gap: 8 },
    photoBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: COLORS.primary, backgroundColor: COLORS.primary + '11' },
    photoBtnText: { color: COLORS.primary, fontWeight: '600' },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    photoWrap: { position: 'relative', width: '31%', aspectRatio: 1 },
    photo: { width: '100%', height: '100%', borderRadius: 6, backgroundColor: COLORS.border },
    photoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
    photoRemove: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
    submitBtn: { marginHorizontal: 12, marginTop: 20, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
