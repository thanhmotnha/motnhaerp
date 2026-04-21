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
import { useCreateExpense, useProjects } from '@/hooks/useApi';
import { apiUpload } from '@/lib/api';
import { COLORS } from '@/lib/constants';

const CATEGORIES = ['Vật liệu', 'Nhân công', 'Thuê thiết bị', 'Vận chuyển', 'Khác'];

export default function CreateExpenseScreen() {
  const { projectId: paramProjectId, projectName: paramProjectName } =
    useLocalSearchParams<{ projectId: string; projectName: string }>();

  const [selectedProjectId, setSelectedProjectId] = useState(paramProjectId || '');
  const [selectedProjectName, setSelectedProjectName] = useState(paramProjectName || '');
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Vật liệu');
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const createMutation = useCreateExpense();
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
    if (!description.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập mô tả chi phí');
      return;
    }
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số tiền hợp lệ');
      return;
    }
    if (!selectedProjectId) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn dự án');
      return;
    }

    setUploading(true);
    let proofUrl: string | undefined;

    try {
      if (photo) {
        const manipulated = await ImageManipulator.manipulateAsync(
          photo,
          [{ resize: { width: 1200 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        const fd = new FormData();
        fd.append('file', { uri: manipulated.uri, name: `expense_${Date.now()}.jpg`, type: 'image/jpeg' } as any);
        fd.append('type', 'proofs');
        const res = await apiUpload('/api/upload', fd);
        proofUrl = res.url;
      }

      await createMutation.mutateAsync({
        projectId: selectedProjectId,
        description: description.trim(),
        amount: amountNum,
        category,
        proofUrl,
      });

      Alert.alert('Thành công', 'Đã ghi nhận chi phí', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể tạo chi phí');
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Ghi chi phí' }} />
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
          label="Mô tả chi phí *"
          value={description}
          onChangeText={setDescription}
          placeholder="VD: Mua sơn tường phòng ngủ"
          multiline
          numberOfLines={3}
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />

        <Input
          label="Số tiền (VND) *"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="VD: 500000"
        />

        {/* Category */}
        <Text style={styles.label}>Danh mục</Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryBtn, category === cat && styles.categoryBtnActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Proof photo */}
        <Text style={styles.label}>Ảnh chứng từ</Text>
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
          title={uploading || createMutation.isPending ? 'Đang gửi...' : 'Ghi nhận chi phí'}
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
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white,
  },
  categoryBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryText: { fontSize: 13, color: COLORS.textSecondary },
  categoryTextActive: { color: COLORS.white, fontWeight: '600' },
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
