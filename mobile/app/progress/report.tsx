import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Camera, X, Plus } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { apiUpload, apiFetch } from '@/lib/api';
import { COLORS } from '@/lib/constants';

const MAX_PHOTOS = 5;

export default function ProgressReportScreen() {
  const { projectId, projectName } = useLocalSearchParams<{
    projectId: string;
    projectName: string;
  }>();

  const [description, setDescription] = useState('');
  const [progress, setProgress] = useState('');
  const [photos, setPhotos] = useState<{ uri: string; uploaded?: string }[]>([]);
  const [loading, setLoading] = useState(false);

  async function pickImage(useCamera: boolean) {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert('Giới hạn', `Tối đa ${MAX_PHOTOS} ảnh`);
      return;
    }

    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền truy cập camera/thư viện ảnh');
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

    const newPhotos = result.assets.map((a) => ({ uri: a.uri }));
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, MAX_PHOTOS));
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function compressAndUpload(uri: string): Promise<string> {
    // Compress image to max 1200px width, 70% quality
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );

    const formData = new FormData();
    formData.append('file', {
      uri: manipulated.uri,
      name: `progress_${Date.now()}.jpg`,
      type: 'image/jpeg',
    } as any);
    formData.append('type', 'proofs');

    const result = await apiUpload('/api/upload', formData);
    return result.url;
  }

  async function handleSubmit() {
    if (!description.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập mô tả tiến độ');
      return;
    }

    const progressNum = parseInt(progress);
    if (progress && (isNaN(progressNum) || progressNum < 0 || progressNum > 100)) {
      Alert.alert('Lỗi', 'Tiến độ phải từ 0 đến 100%');
      return;
    }

    setLoading(true);

    try {
      // Upload all photos
      const uploadedUrls: string[] = [];
      for (const photo of photos) {
        const url = await compressAndUpload(photo.uri);
        uploadedUrls.push(url);
      }

      // Create progress report
      await apiFetch('/api/progress-reports', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          description: description.trim(),
          progress: progressNum || undefined,
          photos: uploadedUrls,
        }),
      });

      Alert.alert('Thành công', 'Đã tạo báo cáo tiến độ', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể tạo báo cáo');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Báo cáo tiến độ' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {projectName && (
          <Card style={{ marginBottom: 16 }}>
            <Text style={styles.projectLabel}>Dự án</Text>
            <Text style={styles.projectName}>{projectName}</Text>
          </Card>
        )}

        <Input
          label="Mô tả tiến độ *"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          placeholder="Mô tả công việc đã thực hiện..."
          style={{ minHeight: 100, textAlignVertical: 'top' }}
        />

        <Input
          label="Tiến độ (%)"
          value={progress}
          onChangeText={setProgress}
          keyboardType="numeric"
          placeholder="VD: 75"
        />

        {/* Photo Grid */}
        <Text style={styles.photoLabel}>Ảnh hiện trường (tối đa {MAX_PHOTOS})</Text>
        <View style={styles.photoGrid}>
          {photos.map((photo, i) => (
            <View key={i} style={styles.photoWrap}>
              <Image source={{ uri: photo.uri }} style={styles.photo} />
              <TouchableOpacity style={styles.removeBtn} onPress={() => removePhoto(i)}>
                <X size={14} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          ))}

          {photos.length < MAX_PHOTOS && (
            <>
              <TouchableOpacity style={styles.addPhoto} onPress={() => pickImage(true)}>
                <Camera size={24} color={COLORS.primary} />
                <Text style={styles.addPhotoText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addPhoto} onPress={() => pickImage(false)}>
                <Plus size={24} color={COLORS.primary} />
                <Text style={styles.addPhotoText}>Thư viện</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Button
          title={loading ? 'Đang gửi...' : 'Gửi báo cáo'}
          onPress={handleSubmit}
          loading={loading}
          size="lg"
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  projectLabel: { fontSize: 12, color: COLORS.textSecondary },
  projectName: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginTop: 2 },
  photoLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 10 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoWrap: { width: 100, height: 100, borderRadius: 10, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhoto: {
    width: 100,
    height: 100,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: { fontSize: 11, color: COLORS.primary, marginTop: 4 },
});
