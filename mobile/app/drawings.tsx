import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, ScrollView, StyleSheet, TouchableOpacity, Animated, Linking, Alert, Platform } from 'react-native';

let FileSystem: any = null;
try { FileSystem = require('expo-file-system/legacy'); } catch { }
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiFetch, apiFetchAllPages } from '@/lib/api';
import Colors, { cardShadow, radius, fontWeight } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';

const c = Colors.light;

// Skeleton
const Skeleton = ({ width, height, style }: any) => {
    const anim = useRef(new Animated.Value(0.3)).current;
    useEffect(() => { Animated.loop(Animated.sequence([Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }), Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true })])).start(); }, []);
    return <Animated.View style={[{ width, height, borderRadius: 8, backgroundColor: c.skeletonBase, opacity: anim }, style]} />;
};

const fileTypeIcon = (name: string) => {
    const ext = name?.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return { icon: 'document-text', color: '#ef4444', bg: '#fef2f2' };
    if (ext === 'dwg' || ext === 'dxf') return { icon: 'construct', color: '#f59e0b', bg: '#fffbeb' };
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return { icon: 'image', color: '#3b82f6', bg: '#eff6ff' };
    return { icon: 'document', color: '#64748b', bg: '#f8fafc' };
};

export default function DrawingsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ projectId?: string }>();
    const requestedProjectId = typeof params.projectId === 'string' ? params.projectId : '';
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [documents, setDocuments] = useState<any[]>([]);
    const [folders, setFolders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiFetchAllPages('/api/projects?status=Đang thi công').then(data => {
            setProjects(data);
            if (!data.length) return;
            if (requestedProjectId && data.some((project: any) => project.id === requestedProjectId)) {
                setSelectedProject((current) => current || requestedProjectId);
                return;
            }
            if (!selectedProject) setSelectedProject(data[0].id);
        }).catch(console.error);
    }, [requestedProjectId, selectedProject]);

    useEffect(() => {
        if (!selectedProject) return;
        setLoading(true);
        Promise.all([
            apiFetchAllPages(`/api/project-documents?projectId=${selectedProject}`),
            apiFetch(`/api/document-folders?projectId=${selectedProject}`),
        ]).then(([dRes, fRes]) => {
            setDocuments(dRes || []);
            setFolders(fRes?.data || fRes || []);
        }).catch(console.error).finally(() => setLoading(false));
    }, [selectedProject]);

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity style={s.headerCircle} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={c.primary} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Bản vẽ kỹ thuật</Text>
                <TouchableOpacity style={s.headerCircle}>
                    <Ionicons name="search" size={20} color={c.primary} />
                </TouchableOpacity>
            </View>

            {/* Project tabs */}
            <FlatList horizontal data={projects} showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.tabList} keyExtractor={p => p.id}
                renderItem={({ item }) => {
                    const active = item.id === selectedProject;
                    return (
                        <TouchableOpacity style={[s.tab, active && s.tabActive]} onPress={() => setSelectedProject(item.id)}>
                            <Text style={[s.tabText, active && s.tabTextActive]}>{item.name || item.code}</Text>
                        </TouchableOpacity>
                    );
                }}
            />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Folders */}
                <Text style={s.sectionLabel}>THƯ MỤC</Text>
                {loading ? (
                    <View style={s.folderGrid}>
                        {[1, 2, 3].map(i => <Skeleton key={i} width="30%" height={100} style={{ borderRadius: radius.card }} />)}
                    </View>
                ) : folders.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.folderGrid}>
                        {folders.map((f, i) => (
                            <View key={f.id || i} style={s.folderCard}>
                                <View style={s.folderIconBox}>
                                    <Ionicons name="folder" size={28} color={c.accent} />
                                </View>
                                <Text style={s.folderName} numberOfLines={1}>{f.name}</Text>
                                <Text style={s.folderCount}>{f._count?.documents || f.documentCount || 0} files</Text>
                            </View>
                        ))}
                    </ScrollView>
                ) : (
                    <View style={s.emptySmall}>
                        <Text style={s.emptySmallText}>Chưa có thư mục</Text>
                    </View>
                )}

                {/* Documents */}
                <Text style={s.sectionLabel}>TÀI LIỆU</Text>
                {loading ? (
                    <View style={{ paddingHorizontal: 16, gap: 8 }}>
                        {[1, 2, 3].map(i => <Skeleton key={i} width="100%" height={64} style={{ borderRadius: radius.card }} />)}
                    </View>
                ) : documents.length > 0 ? (
                    documents.map((d, i) => {
                        const ft = fileTypeIcon(d.fileName || d.name);
                        return (
                            <TouchableOpacity key={d.id || i} style={s.docCard} activeOpacity={0.7}
                                onPress={() => d.fileUrl && Linking.openURL(d.fileUrl)}>
                                <View style={[s.docIconBox, { backgroundColor: ft.bg }]}>
                                    <Ionicons name={ft.icon as any} size={20} color={ft.color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.docName} numberOfLines={1}>{d.fileName || d.name}</Text>
                                    <Text style={s.docMeta}>{d.folder?.name || ''}</Text>
                                </View>
                                <TouchableOpacity style={s.downloadBtn} onPress={async () => {
                                    if (!d.fileUrl) return;
                                    if (Platform.OS === 'web' || !FileSystem) { Linking.openURL(d.fileUrl); return; }
                                    try {
                                        const fileName = d.fileName || d.name || 'document';
                                        const fileUri = FileSystem.documentDirectory + fileName;
                                        const { uri } = await FileSystem.downloadAsync(d.fileUrl, fileUri);
                                        Alert.alert('\u0110\u00e3 t\u1ea3i', fileName);
                                    } catch {
                                        Alert.alert('L\u1ed7i', 'Kh\u00f4ng th\u1ec3 t\u1ea3i file');
                                    }
                                }}>
                                    <Ionicons name="download-outline" size={18} color={c.primary} />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        );
                    })
                ) : (
                    <View style={s.emptyBox}>
                        <View style={s.emptyIcon}>
                            <Ionicons name="document-outline" size={32} color={c.primary} />
                        </View>
                        <Text style={s.emptyTitle}>Chưa có bản vẽ</Text>
                        <Text style={s.emptyDesc}>Upload bản vẽ từ web ERP</Text>
                    </View>
                )}
            </ScrollView>
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

    // Project tabs
    tabList: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1.5, borderColor: c.borderP10, backgroundColor: c.card, marginRight: 6 },
    tabActive: { backgroundColor: c.primary, borderColor: c.primary },
    tabText: { fontSize: 13, fontWeight: fontWeight.secondary, color: c.textSecondary },
    tabTextActive: { color: '#fff' },

    sectionLabel: { fontSize: 11, fontWeight: fontWeight.title, color: c.primary, letterSpacing: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },

    // Folders
    folderGrid: { paddingHorizontal: 16, gap: 10 },
    folderCard: {
        width: 110, alignItems: 'center', padding: 14,
        borderRadius: radius.card, backgroundColor: c.card,
        borderWidth: 1, borderColor: c.borderP5, marginRight: 10,
        ...cardShadow,
    },
    folderIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.accent + '12', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    folderName: { fontSize: 12, fontWeight: fontWeight.secondary, color: c.text, textAlign: 'center' },
    folderCount: { fontSize: 10, color: c.textMuted, marginTop: 2 },

    // Docs
    docCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        marginHorizontal: 16, marginBottom: 8,
        padding: 14, borderRadius: radius.card,
        backgroundColor: c.card, borderWidth: 1, borderColor: c.borderP5,
        ...cardShadow,
    },
    docIconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    docName: { fontSize: 14, fontWeight: fontWeight.secondary, color: c.text },
    docMeta: { fontSize: 11, color: c.textMuted, marginTop: 2 },
    downloadBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.borderP10, alignItems: 'center', justifyContent: 'center' },

    // Empty
    emptySmall: { paddingHorizontal: 20, paddingVertical: 16 },
    emptySmallText: { fontSize: 13, color: c.textMuted },
    emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 6 },
    emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: c.borderP10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    emptyTitle: { fontSize: 16, fontWeight: fontWeight.secondary, color: c.text },
    emptyDesc: { fontSize: 13, color: c.textMuted },
});
