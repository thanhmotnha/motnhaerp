import React from 'react';
import {
    View,
    Text,
    FlatList,
    Image,
    StyleSheet,
    RefreshControl,
    ActivityIndicator,
    Dimensions,
    TouchableOpacity,
    Modal,
    ScrollView,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react-native';
import { apiFetch } from '@/lib/api';
import { ErrorState } from '@/components/ErrorState';
import { COLORS } from '@/lib/constants';
import { formatDate } from '@/lib/format';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 48) / 3;

interface Photo {
    id?: string;
    url: string;
    caption?: string;
    date?: string;
    type?: string;
}

interface GalleryGroup {
    date: string;
    photos: Photo[];
}

function useCustomerGallery() {
    return useQuery<{ groups?: GalleryGroup[]; photos?: Photo[] }>({
        queryKey: ['customer-gallery'],
        queryFn: () => apiFetch('/api/customer/gallery'),
    });
}

export default function CustomerGalleryScreen() {
    const { data, isLoading, isError, refetch, isRefetching } = useCustomerGallery();
    const [selectedPhoto, setSelectedPhoto] = React.useState<Photo | null>(null);

    // Flatten all photos
    const allPhotos: Photo[] = data?.groups
        ? data.groups.flatMap((g: any) => g.photos.map((p: any) => ({ ...p, date: g.date })))
        : (data?.photos || []);

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (isError) {
        return <ErrorState message="Không thể tải ảnh" onRetry={refetch} />;
    }

    return (
        <>
            <Stack.Screen options={{ title: 'Ảnh công trường' }} />
            <FlatList
                style={styles.container}
                contentContainerStyle={styles.content}
                data={allPhotos}
                numColumns={3}
                keyExtractor={(_, i) => String(i)}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.photoWrapper}
                        onPress={() => setSelectedPhoto(item)}
                    >
                        <Image
                            source={{ uri: item.url || (item as any) }}
                            style={styles.photo}
                            resizeMode="cover"
                        />
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>Chưa có ảnh nào 📷</Text>
                    </View>
                }
            />

            {/* Photo Viewer Modal */}
            <Modal visible={!!selectedPhoto} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedPhoto(null)}>
                        <X size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    {selectedPhoto && (
                        <View style={styles.modalContent}>
                            <Image
                                source={{ uri: selectedPhoto.url || (selectedPhoto as any) }}
                                style={styles.fullPhoto}
                                resizeMode="contain"
                            />
                            {(selectedPhoto.caption || selectedPhoto.date) && (
                                <View style={styles.modalInfo}>
                                    {selectedPhoto.caption && (
                                        <Text style={styles.caption}>{selectedPhoto.caption}</Text>
                                    )}
                                    {selectedPhoto.date && (
                                        <Text style={styles.photoDate}>{formatDate(selectedPhoto.date)}</Text>
                                    )}
                                </View>
                            )}
                        </View>
                    )}
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: 12 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    emptyText: { fontSize: 15, color: COLORS.textSecondary },
    photoWrapper: { margin: 4 },
    photo: { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 8, backgroundColor: COLORS.borderLight },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 },
    modalContent: { width: '100%', alignItems: 'center' },
    fullPhoto: { width: width - 32, height: width - 32, borderRadius: 8 },
    modalInfo: { padding: 16, alignItems: 'center' },
    caption: { fontSize: 14, color: COLORS.white, textAlign: 'center' },
    photoDate: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
});
