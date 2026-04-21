import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
    Image, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Colors, { cardShadow, radius, fontWeight } from '@/constants/Colors';
import { apiFetch, apiUpload } from '@/lib/api';
import { useToast } from '@/components/Toast';

const c = Colors.light;
const MAX_PHOTOS = 10;

type Type = 'Gặp trực tiếp' | 'Điện thoại' | 'Zalo' | 'Email' | 'Ghi chú';
const TYPES: Type[] = ['Gặp trực tiếp', 'Điện thoại', 'Zalo', 'Email', 'Ghi chú'];

type Level = '' | 'Nóng' | 'Ấm' | 'Lạnh';
const LEVELS: { key: Exclude<Level, ''>; color: string; bg: string }[] = [
    { key: 'Nóng', color: c.danger, bg: '#fee2e2' },
    { key: 'Ấm', color: c.warning, bg: '#fef3c7' },
    { key: 'Lạnh', color: c.info, bg: '#dbeafe' },
];

type Outcome = '' | 'Báo giá' | 'Đặt cọc' | 'Từ chối' | 'Cần gặp lại';
const OUTCOMES: Outcome[] = ['', 'Báo giá', 'Đặt cọc', 'Từ chối', 'Cần gặp lại'];

export default function CheckinScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const toast = useToast();

    const [customer, setCustomer] = useState<any>(null);
    const [type, setType] = useState<Type>('Gặp trực tiếp');
    const [content, setContent] = useState('');
    const [photos, setPhotos] = useState<{ uri: string; uploaded?: string; uploading?: boolean }[]>([]);
    const [interestLevel, setInterestLevel] = useState<Level>('');
    const [outcome, setOutcome] = useState<Outcome>('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        apiFetch(`/api/customers/${id}`).then(setCustomer).catch(() => { });
    }, [id]);

    async function pickImage(useCamera: boolean) {
        if (photos.length >= MAX_PHOTOS) { Alert.alert('Giới hạn', `Tối đa ${MAX_PHOTOS} ảnh`); return; }
        const perm = useCamera
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Quyền truy cập', 'Cần cấp quyền'); return; }
        const result = useCamera
            ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
            : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsMultipleSelection: true, selectionLimit: MAX_PHOTOS - photos.length });
        if (result.canceled) return;
        const newOnes = result.assets.map(a => ({ uri: a.uri, uploading: true }));
        setPhotos(prev => [...prev, ...newOnes].slice(0, MAX_PHOTOS));
        for (const p of newOnes) {
            try {
                const res = await apiUpload(
                    '/api/upload',
                    { type: 'checkin' },
                    [{ key: 'file', uri: p.uri, name: `checkin_${Date.now()}.jpg`, type: 'image/jpeg' }],
                );
                setPhotos(prev => prev.map(x => x.uri === p.uri ? { ...x, uploaded: res?.url, uploading: false } : x));
            } catch {
                setPhotos(prev => prev.filter(x => x.uri !== p.uri));
                toast.show('Upload ảnh lỗi', 'error');
            }
        }
    }

    async function submit() {
        if (!content.trim()) { Alert.alert('Thiếu', 'Nhập nội dung'); return; }
        if (photos.some(p => p.uploading)) { Alert.alert('Đợi', 'Ảnh đang upload'); return; }
        setSubmitting(true);
        try {
            await apiFetch(`/api/customers/${id}/interactions`, {
                method: 'POST',
                body: JSON.stringify({
                    type, content: content.trim(),
                    photos: photos.map(p => p.uploaded).filter(Boolean),
                    interestLevel, outcome, companionIds: [],
                }),
            });
            toast.show('Đã lưu check-in', 'success');
            router.back();
        } catch (e: any) {
            toast.show(e.message || 'Lỗi', 'error');
        } finally { setSubmitting(false); }
    }

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={c.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={s.headerTitle}>Check-in khách</Text>
                    <Text style={s.headerSub}>{customer?.name || '...'}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
                <Section label="Loại gặp">
                    <View style={s.chipRow}>
                        {TYPES.map(t => (
                            <Pill key={t} label={t} active={type === t} onPress={() => setType(t)} />
                        ))}
                    </View>
                </Section>

                <Section label="Nội dung *">
                    <TextInput
                        style={s.textArea}
                        value={content}
                        onChangeText={setContent}
                        placeholder="Ghi nội dung trao đổi, khảo sát, kết quả gặp..."
                        placeholderTextColor={c.textMuted}
                        multiline
                    />
                </Section>

                <Section label={`Ảnh (${photos.length}/${MAX_PHOTOS})`}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity style={s.photoBtn} onPress={() => pickImage(true)}>
                            <Ionicons name="camera" size={18} color={c.primary} />
                            <Text style={s.photoBtnText}>Chụp ảnh</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.photoBtn} onPress={() => pickImage(false)}>
                            <Ionicons name="images" size={18} color={c.primary} />
                            <Text style={s.photoBtnText}>Thư viện</Text>
                        </TouchableOpacity>
                    </View>
                    {photos.length > 0 && (
                        <View style={s.photoGrid}>
                            {photos.map((p, i) => (
                                <View key={i} style={s.photoWrap}>
                                    <Image source={{ uri: p.uri }} style={s.photo} />
                                    {p.uploading && (
                                        <View style={s.photoOverlay}>
                                            <ActivityIndicator color="#fff" />
                                        </View>
                                    )}
                                    <TouchableOpacity
                                        style={s.photoX}
                                        onPress={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                                    >
                                        <Ionicons name="close" size={14} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}
                </Section>

                <Section label="Mức độ quan tâm">
                    <View style={s.chipRow}>
                        {LEVELS.map(lv => (
                            <TouchableOpacity
                                key={lv.key}
                                onPress={() => setInterestLevel(interestLevel === lv.key ? '' : lv.key)}
                                style={[
                                    s.chip,
                                    { borderColor: lv.color, backgroundColor: interestLevel === lv.key ? lv.color : lv.bg },
                                ]}
                            >
                                <Text style={[s.chipText, { color: interestLevel === lv.key ? '#fff' : lv.color, fontWeight: fontWeight.title }]}>
                                    {lv.key}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Section>

                <Section label="Kết quả">
                    <View style={s.chipRow}>
                        {OUTCOMES.map(o => (
                            <Pill key={o || 'none'} label={o || 'Chưa có'} active={outcome === o} onPress={() => setOutcome(o)} />
                        ))}
                    </View>
                </Section>

                <TouchableOpacity
                    style={[s.submitBtn, submitting && { opacity: 0.6 }]}
                    onPress={submit}
                    disabled={submitting}
                >
                    {submitting ? <ActivityIndicator color="#fff" /> : (
                        <>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                            <Text style={s.submitBtnText}>Lưu check-in</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <View style={{ marginBottom: 16 }}>
            <Text style={s.sectionLabel}>{label}</Text>
            {children}
        </View>
    );
}

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
        <TouchableOpacity onPress={onPress} style={[s.chip, active && { backgroundColor: c.primary, borderColor: c.primary }]}>
            <Text style={[s.chipText, active && { color: '#fff', fontWeight: fontWeight.title }]}>{label}</Text>
        </TouchableOpacity>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: fontWeight.title, color: c.text },
    headerSub: { fontSize: 13, color: c.textMuted, marginTop: 2 },

    sectionLabel: { fontSize: 11, fontWeight: fontWeight.title, color: c.textMuted, letterSpacing: 1, marginBottom: 8, marginLeft: 4 },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: c.card, borderWidth: 1, borderColor: c.borderP10 },
    chipText: { fontSize: 13, color: c.text, fontWeight: fontWeight.label },

    textArea: {
        minHeight: 100, padding: 14, backgroundColor: c.card, borderWidth: 1, borderColor: c.borderP10,
        borderRadius: radius.card, fontSize: 15, color: c.text, textAlignVertical: 'top',
    },

    photoBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 12, borderRadius: radius.button, borderWidth: 1.5, borderColor: c.primary, backgroundColor: c.primary + '10',
    },
    photoBtnText: { color: c.primary, fontWeight: fontWeight.title, fontSize: 13 },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    photoWrap: { position: 'relative', width: '31%', aspectRatio: 1 },
    photo: { width: '100%', height: '100%', borderRadius: 8, backgroundColor: c.border },
    photoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
    photoX: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },

    submitBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: c.primary, paddingVertical: 16, borderRadius: radius.button, marginTop: 8,
        ...cardShadow,
    },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: fontWeight.title },
});
