import React, { useState } from 'react';
import {
  View, Text, ScrollView, Image,
  StyleSheet, Alert, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Camera, Plus, X } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useCreateWarrantyTicket, useProjects } from '@/hooks/useApi';
import { apiUpload } from '@/lib/api';
import { COLORS } from '@/lib/constants';

const PRIORITIES = ['Thấp', 'Trung bình', 'Cao', 'Khẩn'];

export default function CreateWarrantyScreen() {
  const { projectId: paramProjectId, projectName: paramProjectName } =
    useLocalSearchParams<{ projectId: string; projectName: string }>();

  const [selectedProjectId, setSelectedProjectId] = useState(paramProjectId || '');
  const [selectedProjectName, setSelectedProjectName] = useState(paramProjectName || '');
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reportedBy, setReportedBy] = useState('');
  const [priority, setPriority] = useState('Trung bình');
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const createMutation = useCreateWarrantyTicket();
  const projectsQuery = useProjects(1, '', '');
  const projects: any[] = projectsQuery.data?.data || [];

  async function pickPhoto(useCamera: boolean) {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền truy cập camera/thư viện ảnh');
      return;
    }
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  }

  async function handleSubmit() {
    if (!title.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tiêu đề');
      return;
    }
    if (!selectedProjectId) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn dự án');
      return;
    }

    setUploading(true);
    let photoUrl: string | undefined;

    try {
      if (photo) {
        const manipulated = await ImageManipulator.manipulateAsync(
          photo,
          [{ resize: { width: 1200 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        const fd = new FormData();
        fd.append('file', { uri: manipulated.uri, name: `warranty_${Date.now()}.jpg`, type: 'image/jpeg' } as any);
        fd.append('type', 'proofs');
        const res = await apiUpload('/api/upload', fd);
        photoUrl = res.url;
      }

      await createMutation.mutateAsync({
        projectId: selectedProjectId,
        title: title.trim(),
        description: description.trim() || undefined,
        reportedBy: reportedBy.trim() || undefined,
        priority,
        photoUrl,
      });

      Alert.alert('Thành công', 'Đã tạo phiếu bảo hành', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể tạo phiếu bảo hành');
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Tạo phiếu bảo hành' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Project picker */}
        <Text style={styles.label}>Dự án *</Text>
        <TouchableOpacity
          style={styles.picker}
          onPress={() => setShowProjectPicker(!showProjectPicker)}
        >
          <Text style={selectedProjectName ? styles.pickerText : styles.pickerPlaceholder}>
            {selectedProjectName || 'Chọn dự án'}
          </Text>
        </TouchableOpacity>
        {showProjectPicker && (
          <Card style={styles.dropdown}>
            <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
              {projects.map((p: any) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedProjectId(p.id);
                    setSelectedProjectName(p.name || p.code);
                    setShowProjectPicker(false);
                  }}
                >
                  <Text style={styles.dropdownCode}>{p.code}</Text>
                  <Text style={styles.dropdownText}>{p.name}</Text>
                </TouchableOpacity>
              ))}
              {projects.length === 0 && (
                <Text style={styles.dropdownEmpty}>Không có dự án</Text>
              )}
            </ScrollView>
          </Card>
        )}

        <Input
          label="Tiêu đề *"
          value={title}
          onChangeText={setTitle}
          placeholder="VD: Sơn bong tróc tại phòng khách"
        />

        <Input
          label="Mô tả chi tiết"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          placeholder="Mô tả vấn đề cần bảo hành..."
          style={{ minHeight: 90, textAlignVertical: 'top' }}
        />

        <Input
          label="Người báo"
          value={reportedBy}
          onChangeText={setReportedBy}
          placeholder="Tên người báo lỗi"
        />

        {/* Priority selector */}
        <Text style={styles.label}>Mức độ ưu tiên</Text>
        <View style={styles.priorityRow}>
          {PRIORITIES.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.priorityBtn, priority === p && styles.priorityBtnActive]}
              onPress={() => setPriority(p)}
            >
              <Text style={[styles.priorityText, priority === p && styles.priorityTextActive]}>
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Photo */}
        <Text style={styles.label}>Ảnh minh chứng</Text>
        {photo ? (
          <View style={styles.photoWrap}>
            <Image source={{ uri: photo }} style={styles.photo} />
            <TouchableOpacity style={styles.removeBtn} onPress={() => setPhoto(null)}>
              <X size={14} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.photoRow}>
            <TouchableOpacity style={styles.addPhoto} onPress={() => pickPhoto(true)}>
              <Camera size={24} color={COLORS.primary} />
              <Text style={styles.addPhotoText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addPhoto} onPress={() => pickPhoto(false)}>
              <Plus size={24} color={COLORS.primary} />
              <Text style={styles.addPhotoText}>Thư viện</Text>
            </TouchableOpacity>
          </View>
        )}

        <Button
          title={uploading || createMutation.isPending ? 'Đang tạo...' : 'Tạo phiếu bảo hành'}
          onPress={handleSubmit}
          loading={uploading || createMutation.isPending}
          size="lg"
          style={{ marginTop: 24, marginBottom: 40 }}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6, marginTop: 12 },
  picker: {
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14,
  },
  pickerText: { fontSize: 15, color: COLORS.text },
  pickerPlaceholder: { fontSize: 15, color: COLORS.textLight },
  dropdown: { marginTop: 4, marginBottom: 8, padding: 0 },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  dropdownText: { fontSize: 14, color: COLORS.text },
  dropdownCode: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  dropdownEmpty: { fontSize: 14, color: COLORS.textLight, padding: 14, textAlign: 'center' },
  priorityRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  priorityBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white,
  },
  priorityBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  priorityText: { fontSize: 13, color: COLORS.textSecondary },
  priorityTextActive: { color: COLORS.white, fontWeight: '600' },
  photoRow: { flexDirection: 'row', gap: 10 },
  photoWrap: { width: 120, height: 120, borderRadius: 10, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10,
    width: 22, height: 22, alignItems: 'center', justifyContent: 'center',
  },
  addPhoto: {
    width: 100, height: 100, borderRadius: 10,
    borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  addPhotoText: { fontSize: 11, color: COLORS.primary, marginTop: 4 },
});
