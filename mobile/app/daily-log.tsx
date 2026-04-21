import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    TextInput, Image, Alert, ActivityIndicator, Modal,
    FlatList, Animated, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiFetch, apiFetchAllPages, apiUpload, queueOffline } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import Colors, { cardShadow, radius, fontWeight } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';

const c = Colors.light;
const WEATHER_OPTIONS = ['N\u1eafng', 'M\u00e2y', 'M\u01b0a nh\u1ecf', 'M\u01b0a l\u1edbn', 'N\u1eafng n\u00f3ng'];
const WEATHER_ICONS: Record<string, { icon: string; emoji: string; color: string }> = {
    'N\u1eafng': { icon: 'sunny', emoji: '\u2600\uFE0F', color: '#f59e0b' },
    'M\u00e2y': { icon: 'cloud', emoji: '\u26C5', color: '#6b7280' },
    'M\u01b0a nh\u1ecf': { icon: 'rainy', emoji: '\uD83C\uDF27\uFE0F', color: '#3b82f6' },
    'M\u01b0a l\u1edbn': { icon: 'thunderstorm', emoji: '\u26C8\uFE0F', color: '#1e40af' },
    'N\u1eafng n\u00f3ng': { icon: 'sunny', emoji: '\uD83E\uDD75', color: '#dc2626' },
};

const TXT = {
    title: 'Nh\u1eadt k\u00fd thi c\u00f4ng',
    newEntry: 'M\u1ee4C M\u1edaI',
    project: 'D\u1ef1 \u00e1n \u0111ang thi c\u00f4ng',
    selectProject: 'Ch\u1ecdn d\u1ef1 \u00e1n',
    task: 'H\u1ea1ng m\u1ee5c thi c\u00f4ng',
    selectTask: 'Ch\u1ecdn h\u1ea1ng m\u1ee5c t\u1eeb ti\u1ebfn \u0111\u1ed9',
    noTasks: 'Ch\u01b0a c\u00f3 h\u1ea1ng m\u1ee5c. Vui l\u00f2ng t\u1ea1o ti\u1ebfn \u0111\u1ed9 tr\u00ean web.',
    photo: '\u1ea2nh hi\u1ec7n tr\u01b0\u1eddng',
    tapPhoto: 'Ch\u1ea1m \u0111\u1ec3 ch\u1ee5p \u1ea3nh',
    gallery: 'Th\u01b0 vi\u1ec7n',
    camera: 'Ch\u1ee5p th\u00eam',
    weather: 'Th\u1eddi ti\u1ebft',
    workforce: 'Nh\u00e2n c\u00f4ng',
    workDone: 'C\u00f4ng vi\u1ec7c \u0111\u00e3 th\u1ef1c hi\u1ec7n',
    workPlaceholder: 'M\u00f4 t\u1ea3 c\u00f4ng vi\u1ec7c h\u00f4m nay, g\u1ed3m c\u1ea3 v\u01b0\u1edbng m\u1eafc ho\u1eb7c s\u1ef1 c\u1ed1 n\u1ebfu c\u00f3...',
    plan: 'K\u1ebf ho\u1ea1ch ng\u00e0y mai',
    planPlaceholder: 'D\u1ef1 ki\u1ebfn c\u00f4ng vi\u1ec7c ng\u00e0y mai...',
    save: 'L\u01afU NH\u1eacT K\u00dd THI C\u00d4NG',
    voice: 'Nh\u1ea5n gi\u1eef \u0111\u1ec3 n\u00f3i',
    listening: '\u0110ang nghe...',
    saved: '\u2705 Th\u00e0nh c\u00f4ng',
    savedDesc: 'Nh\u1eadt k\u00fd \u0111\u00e3 \u0111\u01b0\u1ee3c l\u01b0u',
    error: 'L\u1ed7i',
    needProject: 'Vui l\u00f2ng ch\u1ecdn d\u1ef1 \u00e1n',
    needTask: 'Vui l\u00f2ng ch\u1ecdn h\u1ea1ng m\u1ee5c thi c\u00f4ng',
    needContent: 'Vui l\u00f2ng nh\u1eadp n\u1ed9i dung c\u00f4ng vi\u1ec7c',
    needCamera: 'C\u1ea7n quy\u1ec1n truy c\u1eadp camera',
    progress: 'Ti\u1ebfn \u0111\u1ed9',
};

// Voice recognition helper (Web Speech API)
function useVoiceInput() {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (isListening) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: false }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: false }),
                ]),
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isListening]);

    const startListening = useCallback((onResult: (text: string) => void) => {
        if (Platform.OS === 'web') {
            const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
            if (!SpeechRecognition) {
                Alert.alert('Kh\u00f4ng h\u1ed7 tr\u1ee3', 'Vui l\u00f2ng d\u00f9ng Chrome.');
                return;
            }
            const recognition = new SpeechRecognition();
            recognition.lang = 'vi-VN';
            recognition.continuous = true;
            recognition.interimResults = true;
            recognitionRef.current = recognition;

            let finalTranscript = '';
            recognition.onresult = (e: any) => {
                let interim = '';
                for (let i = e.resultIndex; i < e.results.length; i++) {
                    if (e.results[i].isFinal) {
                        finalTranscript += e.results[i][0].transcript + ' ';
                    } else {
                        interim += e.results[i][0].transcript;
                    }
                }
                onResult(finalTranscript + interim);
            };
            recognition.onerror = () => { setIsListening(false); };
            recognition.onend = () => { setIsListening(false); };
            recognition.start();
            setIsListening(true);
        } else {
            // Native: try expo-speech-recognition
            try {
                const ExpoSpeech = require('expo-speech-recognition');
                ExpoSpeech.requestPermissionsAsync().then(({ granted }: any) => {
                    if (!granted) { Alert.alert('C\u1ea7n quy\u1ec1n microphone'); return; }
                    setIsListening(true);
                    ExpoSpeech.start({ lang: 'vi-VN', interimResults: true });
                    const sub = ExpoSpeech.addOnResultListener?.((event: any) => {
                        if (event.results?.[0]?.transcript) {
                            onResult(event.results[0].transcript);
                        }
                    });
                    const endSub = ExpoSpeech.addOnEndListener?.(() => {
                        setIsListening(false);
                        sub?.remove();
                        endSub?.remove();
                    });
                    recognitionRef.current = { sub, endSub, ExpoSpeech };
                });
            } catch {
                Alert.alert('Voice', 'C\u1ea7n build APK \u0111\u1ec3 d\u00f9ng voice tr\u00ean native.');
            }
        }
    }, []);

    const stopListening = useCallback(() => {
        recognitionRef.current?.stop();
        setIsListening(false);
    }, []);

    return { isListening, startListening, stopListening, pulseAnim };
}

export default function DailyLogScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useLocalSearchParams<{ projectId?: string }>();
    const toast = useToast();
    const requestedProjectId = typeof params.projectId === 'string' ? params.projectId : '';

    // Data
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [scheduleTasks, setScheduleTasks] = useState<any[]>([]);
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [loadingTasks, setLoadingTasks] = useState(false);

    // Form
    const [photos, setPhotos] = useState<{ uri: string; lat?: number; lng?: number; time: string }[]>([]);
    const [workDone, setWorkDone] = useState('');
    const [tomorrowPlan, setTomorrowPlan] = useState('');
    const [weather, setWeather] = useState(WEATHER_OPTIONS[0]);
    const [workforce, setWorkforce] = useState('');
    const [saving, setSaving] = useState(false);

    // Modals
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [showTaskModal, setShowTaskModal] = useState(false);

    // Voice
    const voice = useVoiceInput();
    const [activeVoiceField, setActiveVoiceField] = useState<string | null>(null);

    // History mode
    const [mode, setMode] = useState<'new' | 'history'>('new');
    const [logs, setLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Load projects
    useEffect(() => {
        (async () => {
            try {
                const data = await apiFetchAllPages('/api/projects?status=\u0110ang thi c\u00f4ng');
                setProjects(data);
                if (!data.length) return;
                if (requestedProjectId && data.some((project: any) => project.id === requestedProjectId)) {
                    setSelectedProject(requestedProjectId);
                    return;
                }
                setSelectedProject(data[0].id);
            } catch { setProjects([]); }
        })();
    }, [requestedProjectId]);

    // Load history logs
    const loadHistory = useCallback(async () => {
        setLoadingLogs(true);
        try {
            const q = selectedProject ? `&projectId=${selectedProject}` : '';
            const res = await apiFetch(`/api/daily-logs?limit=500${q}`);
            setLogs(res?.data || res || []);
        } catch { setLogs([]); }
        setLoadingLogs(false);
    }, [selectedProject]);

    useEffect(() => {
        if (mode === 'history') loadHistory();
    }, [mode, selectedProject]);

    // Load schedule tasks when project changes
    useEffect(() => {
        if (!selectedProject) return;
        setLoadingTasks(true);
        setSelectedTask(null);
        (async () => {
            try {
                const res = await apiFetch(`/api/schedule-tasks?projectId=${selectedProject}`);
                setScheduleTasks(res?.flat || res?.data || []);
            } catch { setScheduleTasks([]); }
            setLoadingTasks(false);
        })();
    }, [selectedProject]);

    const selectedProj = projects.find(p => p.id === selectedProject);
    const mergeWorkSummary = useCallback((item: any) => {
        const work = String(item?.workDone || '').trim();
        const issue = String(item?.issues || '').trim();
        if (work && issue) return `${work}\n\nVấn đề / Sự cố: ${issue}`;
        return work || issue;
    }, []);

    // Photo functions
    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert(TXT.needCamera); return; }
        const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false });
        if (result.canceled) return;
        let loc = null;
        try {
            const { status: ls } = await Location.requestForegroundPermissionsAsync();
            if (ls === 'granted') loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        } catch { }
        setPhotos(prev => [...prev, { uri: result.assets[0].uri, lat: loc?.coords?.latitude, lng: loc?.coords?.longitude, time: new Date().toISOString() }]);
    };

    const pickPhoto = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsMultipleSelection: true });
        if (result.canceled) return;
        setPhotos(prev => [...prev, ...result.assets.map(a => ({ uri: a.uri, time: new Date().toISOString() }))]);
    };

    const removePhoto = (idx: number) => setPhotos(prev => prev.filter((_, i) => i !== idx));

    // Voice handlers
    const toggleVoice = (field: string, currentValue: string, setter: (v: string) => void) => {
        if (voice.isListening && activeVoiceField === field) {
            voice.stopListening();
            setActiveVoiceField(null);
        } else {
            if (voice.isListening) voice.stopListening();
            setActiveVoiceField(field);
            voice.startListening((text: string) => {
                setter(currentValue + text);
            });
        }
    };

    // Save
    const handleSave = async () => {
        if (!selectedProject) { toast.show(TXT.needProject, 'warning'); return; }
        if (!selectedTask) { toast.show(TXT.needTask, 'warning'); return; }
        if (!workDone.trim()) { toast.show(TXT.needContent, 'warning'); return; }
        if (voice.isListening) voice.stopListening();
        setSaving(true);
        const logData = {
            projectId: selectedProject,
            scheduleTaskId: selectedTask.id,
            scheduleTaskName: selectedTask.name,
            weather,
            workforce: workforce ? parseInt(workforce) : 0,
            workDone: workDone.trim(),
            issues: '',
            tomorrowPlan: tomorrowPlan.trim(),
        };
        try {
            const saved = await apiFetch('/api/daily-logs', {
                method: 'POST',
                body: JSON.stringify(logData),
            });
            // Upload photos if any
            if (saved?.id && photos.length > 0) {
                try {
                    await apiUpload(`/api/daily-logs/${saved.id}/photos`, {}, photos.map((p: any, i: number) => ({
                        key: 'photos',
                        uri: p.uri || p,
                        name: `photo_${i}.jpg`,
                    })));
                } catch { /* photo upload optional */ }
            }
            toast.show(TXT.savedDesc, 'success');
            setTimeout(() => router.back(), 800);
        } catch {
            await queueOffline({ path: '/api/daily-logs', method: 'POST', body: logData });
            toast.show('\u0110\u00e3 l\u01b0u offline, s\u1ebd g\u1eedi khi c\u00f3 m\u1ea1ng', 'info');
            setTimeout(() => router.back(), 800);
        }
        setSaving(false);
    };

    // Render mic button
    const MicButton = ({ field, value, setter }: { field: string; value: string; setter: (v: string) => void }) => {
        const isActive = voice.isListening && activeVoiceField === field;
        return (
            <TouchableOpacity
                style={[st.micBtn, isActive && st.micBtnActive]}
                onPress={() => toggleVoice(field, value, setter)}>
                <Animated.View style={isActive ? { transform: [{ scale: voice.pulseAnim }] } : undefined}>
                    <Ionicons name={isActive ? 'mic' : 'mic-outline'} size={20} color={isActive ? '#fff' : c.primary} />
                </Animated.View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={st.wrapper} edges={['top']}>
            {/* Header */}
            <View style={st.header}>
                <TouchableOpacity style={st.headerCircle} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={c.primary} />
                </TouchableOpacity>
                <View style={{ flex: 1, paddingHorizontal: 12 }}>
                    <Text style={st.headerTitle}>{TXT.title}</Text>
                    <Text style={st.headerSub}>
                        {mode === 'new' ? `${TXT.newEntry} \u2022 ${new Date().toLocaleDateString('vi-VN')}` : `L\u1ecbch s\u1eed \u2022 ${logs.length} b\u1ea3n ghi`}
                    </Text>
                </View>
                <TouchableOpacity style={st.headerCircle}
                    onPress={() => setMode(mode === 'new' ? 'history' : 'new')}>
                    <Ionicons name={mode === 'new' ? 'time-outline' : 'create-outline'} size={22} color={c.primary} />
                </TouchableOpacity>
            </View>

            {/* Tab toggle */}
            <View style={st.tabRow}>
                <TouchableOpacity style={[st.tab, mode === 'new' && st.tabActive]}
                    onPress={() => setMode('new')}>
                    <Ionicons name="create" size={16} color={mode === 'new' ? '#fff' : c.primary} />
                    <Text style={[st.tabText, mode === 'new' && st.tabTextActive]}>{'T\u1ea1o m\u1edbi'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[st.tab, mode === 'history' && st.tabActive]}
                    onPress={() => setMode('history')}>
                    <Ionicons name="time" size={16} color={mode === 'history' ? '#fff' : c.primary} />
                    <Text style={[st.tabText, mode === 'history' && st.tabTextActive]}>{'L\u1ecbch s\u1eed'}</Text>
                </TouchableOpacity>
            </View>

            {mode === 'history' ? (
                <FlatList
                    data={logs}
                    keyExtractor={(item, i) => item.id || String(i)}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 8 }}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                            <Ionicons name="document-text-outline" size={48} color={c.borderP10} />
                            <Text style={{ fontSize: 15, color: c.textMuted, marginTop: 12 }}>{'Ch\u01b0a c\u00f3 nh\u1eadt k\u00fd n\u00e0o'}</Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const projName = projects.find(p => p.id === item.projectId)?.name || item.project?.name || '';
                        const mergedWorkSummary = mergeWorkSummary(item);
                        return (
                            <View style={st.historyCard}>
                                <View style={st.historyHeader}>
                                    <View style={st.historyDateBadge}>
                                        <Text style={st.historyDateText}>
                                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '--'}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={st.historyProject} numberOfLines={1}>{projName}</Text>
                                        <Text style={st.historyTask} numberOfLines={1}>{item.scheduleTaskName || ''}</Text>
                                    </View>
                                    {item.weather && (
                                        <View style={st.historyWeatherBadge}>
                                            <Ionicons name="cloud" size={12} color={c.textMuted} />
                                            <Text style={st.historyWeatherText}>{item.weather}</Text>
                                        </View>
                                    )}
                                </View>
                                {/* Photo thumbnails */}
                                {(item.photos?.length > 0 || item.images?.length > 0) && (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}
                                        style={{ marginVertical: 8 }} contentContainerStyle={{ gap: 6 }}>
                                        {(item.photos || item.images || []).map((img: any, idx: number) => (
                                            <Image key={idx}
                                                source={{ uri: typeof img === 'string' ? img : img.url || img.uri }}
                                                style={{ width: 80, height: 60, borderRadius: 8, backgroundColor: c.skeletonBase }}
                                            />
                                        ))}
                                    </ScrollView>
                                )}
                                {mergedWorkSummary ? (
                                    <Text style={st.historyContent} numberOfLines={5}>{mergedWorkSummary}</Text>
                                ) : null}
                                <View style={st.historyFooter}>
                                    <Text style={st.historyMeta}>
                                        {item.workforce ? `\u{1F477} ${item.workforce} ng\u01b0\u1eddi` : ''}
                                        {item.createdBy?.name ? ` \u2022 ${item.createdBy.name}` : ''}
                                    </Text>
                                </View>
                            </View>
                        );
                    }}
                />
            ) : (
                <ScrollView style={st.container} contentContainerStyle={{ paddingBottom: 40 }}>
                    {/* ========== 1. PROJECT SELECTOR ========== */}
                    <Text style={st.sectionLabel}>
                        <Ionicons name="business-outline" size={14} color={c.primary} />
                        {'  '}{TXT.project}
                    </Text>
                    <TouchableOpacity style={st.selectorCard} onPress={() => setShowProjectModal(true)}>
                        <View style={st.selectorIcon}>
                            <Ionicons name="business" size={20} color={c.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={st.selectorValue}>{selectedProj?.name || TXT.selectProject}</Text>
                            {selectedProj?.code && <Text style={st.selectorSub}>{selectedProj.code}</Text>}
                        </View>
                        <Ionicons name="chevron-down" size={20} color={c.primary} />
                    </TouchableOpacity>

                    {/* ========== 2. SCHEDULE TASK SELECTOR ========== */}
                    <Text style={st.sectionLabel}>
                        <Ionicons name="list-outline" size={14} color={c.primary} />
                        {'  '}{TXT.task}
                    </Text>
                    {loadingTasks ? (
                        <View style={st.taskLoading}>
                            <ActivityIndicator color={c.primary} />
                        </View>
                    ) : selectedTask ? (
                        <TouchableOpacity style={st.taskSelected} onPress={() => setShowTaskModal(true)}>
                            <View style={st.taskProgressCircle}>
                                <Text style={st.taskProgressText}>{selectedTask.progress || 0}%</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={st.taskSelectedName}>{selectedTask.name}</Text>
                                {selectedTask.wbs && <Text style={st.taskSelectedWbs}>WBS: {selectedTask.wbs}</Text>}
                            </View>
                            <TouchableOpacity onPress={() => setShowTaskModal(true)}>
                                <Ionicons name="swap-horizontal" size={20} color={c.primary} />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={st.taskEmpty} onPress={() => setShowTaskModal(true)}>
                            <Ionicons name="add-circle-outline" size={24} color={c.primary} />
                            <Text style={st.taskEmptyText}>{TXT.selectTask}</Text>
                            {scheduleTasks.length === 0 && !loadingTasks && (
                                <Text style={st.taskEmptyHint}>{TXT.noTasks}</Text>
                            )}
                        </TouchableOpacity>
                    )}

                    {/* ========== 3. PHOTOS ========== */}
                    <Text style={st.sectionLabel}>
                        <Ionicons name="camera-outline" size={14} color={c.primary} />
                        {'  '}{TXT.photo}
                    </Text>
                    {photos.length > 0 ? (
                        <View style={st.photoMain}>
                            <Image source={{ uri: photos[0].uri }} style={st.photoMainImg} resizeMode="cover" />
                            <View style={st.photoOverlay}>
                                <View style={st.photoMetaRow}>
                                    <View style={st.photoDot} />
                                    <Text style={st.photoMetaText}>
                                        {'D\u1ef0 \u00c1N: '}{selectedProj?.name?.toUpperCase()}
                                    </Text>
                                </View>
                                {selectedTask && (
                                    <View style={st.photoMetaRow}>
                                        <View style={st.photoDot} />
                                        <Text style={st.photoMetaText}>
                                            {'H\u1ea0NG M\u1ee4C: '}{selectedTask.name?.toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                                <View style={st.photoMetaRow}>
                                    <View style={st.photoDot} />
                                    <Text style={st.photoMetaText}>
                                        {'TH\u1edcI GIAN: '}{new Date(photos[0].time).toLocaleString('vi-VN')}
                                    </Text>
                                </View>
                                {photos[0].lat && (
                                    <View style={st.photoMetaRow}>
                                        <View style={st.photoDot} />
                                        <Text style={st.photoMetaText}>
                                            {'V\u1eca TR\u00cd: '}{photos[0].lat.toFixed(4)}, {photos[0].lng?.toFixed(4)}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity style={st.photoEmpty} onPress={takePhoto}>
                            <Ionicons name="camera" size={40} color={c.primary} />
                            <Text style={st.photoEmptyText}>{TXT.tapPhoto}</Text>
                        </TouchableOpacity>
                    )}

                    <View style={st.actionRow}>
                        <TouchableOpacity style={st.actionBtn} onPress={pickPhoto}>
                            <Ionicons name="images" size={22} color={c.accent} />
                            <Text style={st.actionBtnText}>{TXT.gallery}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={st.actionBtn} onPress={takePhoto}>
                            <Ionicons name="camera" size={22} color={c.accent} />
                            <Text style={st.actionBtnText}>{TXT.camera}</Text>
                        </TouchableOpacity>
                    </View>

                    {photos.length > 1 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}
                            style={{ marginHorizontal: 16, marginBottom: 8 }}
                            contentContainerStyle={{ gap: 8 }}>
                            {photos.map((p, i) => (
                                <View key={i} style={st.thumb}>
                                    <Image source={{ uri: p.uri }} style={st.thumbImg} />
                                    <TouchableOpacity style={st.thumbRemove} onPress={() => removePhoto(i)}>
                                        <Ionicons name="close-circle" size={18} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    )}

                    {/* ========== 4. WEATHER & WORKFORCE ========== */}
                    <View style={st.fieldRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={st.sectionLabel}>
                                <Ionicons name="sunny-outline" size={14} color={c.primary} />
                                {'  '}{TXT.weather}
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
                                {WEATHER_OPTIONS.map(w => {
                                    const wi = WEATHER_ICONS[w];
                                    const active = weather === w;
                                    return (
                                        <TouchableOpacity key={w} style={[st.weatherPill, active && st.weatherPillActive]}
                                            onPress={() => setWeather(w)}>
                                            <Text style={{ fontSize: 20 }}>{wi?.emoji || '\u2600\uFE0F'}</Text>
                                            <Text style={[st.weatherPillText, active && { color: '#fff' }]}>{w}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                        <View style={{ width: 100 }}>
                            <Text style={st.sectionLabel}>
                                <Ionicons name="people-outline" size={14} color={c.primary} />
                                {'  '}{TXT.workforce}
                            </Text>
                            <TextInput style={st.input} value={workforce} onChangeText={setWorkforce}
                                keyboardType="numeric" placeholder="0" placeholderTextColor="#94a3b8" />
                        </View>
                    </View>

                    {/* ========== 5. TEXT FIELDS WITH VOICE ========== */}
                    <Text style={st.sectionLabel}>
                        <Ionicons name="create-outline" size={14} color={c.primary} />
                        {'  '}{TXT.workDone}
                    </Text>
                    <View style={st.textAreaWrap}>
                        <TextInput style={st.textArea} value={workDone} onChangeText={setWorkDone}
                            multiline numberOfLines={6} placeholder={TXT.workPlaceholder}
                            placeholderTextColor="#94a3b8" textAlignVertical="top" />
                        <MicButton field="workDone" value={workDone} setter={setWorkDone} />
                        {voice.isListening && activeVoiceField === 'workDone' && (
                            <View style={st.listeningBadge}>
                                <View style={st.listeningDot} />
                                <Text style={st.listeningText}>{TXT.listening}</Text>
                            </View>
                        )}
                    </View>

                    <Text style={st.sectionLabel}>
                        <Ionicons name="clipboard-outline" size={14} color={c.primary} />
                        {'  '}{TXT.plan}
                    </Text>
                    <View style={st.textAreaWrap}>
                        <TextInput style={st.textArea} value={tomorrowPlan} onChangeText={setTomorrowPlan}
                            multiline numberOfLines={3} placeholder={TXT.planPlaceholder}
                            placeholderTextColor="#94a3b8" textAlignVertical="top" />
                        <MicButton field="plan" value={tomorrowPlan} setter={setTomorrowPlan} />
                    </View>

                    {/* ========== SAVE ========== */}
                    <TouchableOpacity style={st.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.9}>
                        {saving ? <ActivityIndicator color="#fff" /> : (
                            <>
                                <Ionicons name="save" size={22} color="#fff" />
                                <Text style={st.saveBtnText}>{TXT.save}</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            )}

            {/* ========== PROJECT MODAL ========== */}
            <Modal visible={showProjectModal} transparent animationType="slide">
                <View style={st.modalOverlay}>
                    <View style={st.modalContent}>
                        <View style={st.modalHeader}>
                            <Text style={st.modalTitle}>{TXT.selectProject}</Text>
                            <TouchableOpacity onPress={() => setShowProjectModal(false)}>
                                <Ionicons name="close" size={24} color={c.text} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={projects}
                            keyExtractor={p => p.id}
                            renderItem={({ item: p }) => (
                                <TouchableOpacity
                                    style={[st.modalItem, selectedProject === p.id && st.modalItemActive]}
                                    onPress={() => { setSelectedProject(p.id); setShowProjectModal(false); }}>
                                    <View style={st.modalItemIcon}>
                                        <Ionicons name="business" size={18} color={selectedProject === p.id ? '#fff' : c.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[st.modalItemName, selectedProject === p.id && { color: '#fff' }]}>
                                            {p.name}
                                        </Text>
                                        <Text style={[st.modalItemSub, selectedProject === p.id && { color: 'rgba(255,255,255,0.7)' }]}>
                                            {p.code} {'\u2022'} {p.status}
                                        </Text>
                                    </View>
                                    {selectedProject === p.id && <Ionicons name="checkmark-circle" size={22} color="#fff" />}
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <Text style={st.modalEmpty}>{'Kh\u00f4ng c\u00f3 d\u1ef1 \u00e1n'}</Text>
                            }
                        />
                    </View>
                </View>
            </Modal>

            {/* ========== TASK MODAL ========== */}
            <Modal visible={showTaskModal} transparent animationType="slide">
                <View style={st.modalOverlay}>
                    <View style={st.modalContent}>
                        <View style={st.modalHeader}>
                            <Text style={st.modalTitle}>{TXT.task}</Text>
                            <TouchableOpacity onPress={() => setShowTaskModal(false)}>
                                <Ionicons name="close" size={24} color={c.text} />
                            </TouchableOpacity>
                        </View>
                        {loadingTasks ? (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <ActivityIndicator color={c.primary} />
                            </View>
                        ) : (
                            <FlatList
                                data={scheduleTasks}
                                keyExtractor={t => t.id}
                                renderItem={({ item: t }) => {
                                    const isSelected = selectedTask?.id === t.id;
                                    const progressColor = t.progress >= 100 ? '#16a34a' : t.progress > 0 ? '#f59e0b' : '#cbd5e1';
                                    return (
                                        <TouchableOpacity
                                            style={[st.taskItem, isSelected && st.taskItemActive]}
                                            onPress={() => { setSelectedTask(t); setShowTaskModal(false); }}>
                                            <View style={[st.taskItemProgress, { borderColor: progressColor }]}>
                                                <Text style={[st.taskItemProgressText, { color: progressColor }]}>
                                                    {t.progress || 0}%
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[st.taskItemName, isSelected && { color: '#fff' }]}>
                                                    {t.name}
                                                </Text>
                                                <Text style={[st.taskItemMeta, isSelected && { color: 'rgba(255,255,255,0.7)' }]}>
                                                    {t.wbs ? `WBS: ${t.wbs} \u2022 ` : ''}{t.status || 'Ch\u01b0a b\u1eaft \u0111\u1ea7u'}
                                                </Text>
                                            </View>
                                            {isSelected && <Ionicons name="checkmark-circle" size={22} color="#fff" />}
                                        </TouchableOpacity>
                                    );
                                }}
                                ListEmptyComponent={
                                    <View style={{ padding: 40, alignItems: 'center', gap: 8 }}>
                                        <Ionicons name="alert-circle-outline" size={32} color={c.textMuted} />
                                        <Text style={st.modalEmpty}>{TXT.noTasks}</Text>
                                    </View>
                                }
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: c.bgGradientStart },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: c.bgGradientStart, borderBottomWidth: 1, borderBottomColor: c.borderP10,
    },
    headerCircle: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: c.primary + '18', alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: fontWeight.title, color: c.primary },
    headerSub: { fontSize: 10, fontWeight: fontWeight.secondary, color: '#64748b', letterSpacing: 1.5, marginTop: 1 },

    // Tab toggle
    tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, paddingVertical: 10, backgroundColor: c.bgGradientStart },
    tab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 10, borderRadius: radius.card,
        borderWidth: 1, borderColor: c.primary + '30',
    },
    tabActive: { backgroundColor: c.primary, borderColor: c.primary },
    tabText: { fontSize: 13, fontWeight: fontWeight.secondary, color: c.primary },
    tabTextActive: { color: '#fff' },

    // History list
    historyCard: {
        backgroundColor: c.card, borderRadius: radius.card, padding: 14,
        marginBottom: 10, borderWidth: 1, borderColor: c.borderP5,
        ...cardShadow,
    },
    historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    historyDateBadge: {
        backgroundColor: c.primary + '12', borderRadius: radius.iconBox,
        paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center',
    },
    historyDateText: { fontSize: 13, fontWeight: fontWeight.title, color: c.primary },
    historyProject: { fontSize: 14, fontWeight: fontWeight.title, color: c.text },
    historyTask: { fontSize: 11, color: c.textMuted, marginTop: 1 },
    historyWeatherBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.borderP5, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
    historyWeatherText: { fontSize: 10, color: c.textMuted },
    historyContent: { fontSize: 13, color: c.textSecondary, lineHeight: 19 },
    historyFooter: { flexDirection: 'row', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.borderP5 },
    historyMeta: { fontSize: 11, color: c.textMuted },

    container: { flex: 1 },
    sectionLabel: { fontSize: 13, fontWeight: fontWeight.secondary, color: c.primary, paddingHorizontal: 16, marginTop: 20, marginBottom: 8 },

    // Project selector
    selectorCard: {
        marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#fff', padding: 16, borderRadius: radius.card,
        borderWidth: 1, borderColor: c.borderP10, ...cardShadow,
    },
    selectorIcon: {
        width: 44, height: 44, borderRadius: radius.iconBox,
        backgroundColor: c.primary + '12', alignItems: 'center', justifyContent: 'center',
    },
    selectorValue: { fontSize: 16, fontWeight: fontWeight.title, color: c.text },
    selectorSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },

    // Task selector
    taskLoading: { padding: 20, alignItems: 'center' },
    taskSelected: {
        marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#fff', padding: 16, borderRadius: radius.card,
        borderWidth: 2, borderColor: c.primary + '30', ...cardShadow,
    },
    taskProgressCircle: {
        width: 48, height: 48, borderRadius: 24,
        borderWidth: 3, borderColor: c.primary,
        alignItems: 'center', justifyContent: 'center',
    },
    taskProgressText: { fontSize: 12, fontWeight: fontWeight.title, color: c.primary },
    taskSelectedName: { fontSize: 15, fontWeight: fontWeight.title, color: c.text },
    taskSelectedWbs: { fontSize: 12, color: c.textMuted, marginTop: 2, fontFamily: 'monospace' },
    taskEmpty: {
        marginHorizontal: 16, alignItems: 'center', gap: 8,
        backgroundColor: '#fff', paddingVertical: 24, borderRadius: radius.card,
        borderWidth: 2, borderColor: c.borderP10, borderStyle: 'dashed',
    },
    taskEmptyText: { fontSize: 14, fontWeight: fontWeight.secondary, color: c.primary },
    taskEmptyHint: { fontSize: 11, color: c.textMuted, textAlign: 'center', paddingHorizontal: 20 },

    // Photos
    photoMain: {
        marginHorizontal: 16, aspectRatio: 16 / 9, borderRadius: 16, overflow: 'hidden',
        borderWidth: 2, borderColor: c.borderP15,
        shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
    },
    photoMainImg: { width: '100%', height: '100%' },
    photoOverlay: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: 12, gap: 4, backgroundColor: 'rgba(0,0,0,0.55)',
    },
    photoMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    photoDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.accent },
    photoMetaText: { fontSize: 9, fontWeight: fontWeight.secondary, color: '#fff', letterSpacing: 1.5 },
    photoEmpty: {
        marginHorizontal: 16, aspectRatio: 16 / 9, borderRadius: 16,
        borderWidth: 2, borderColor: c.borderP15, borderStyle: 'dashed',
        backgroundColor: c.primary + '08', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    photoEmptyText: { fontSize: 14, fontWeight: fontWeight.secondary, color: c.primary },

    actionRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, gap: 12, marginBottom: 8 },
    actionBtn: {
        flex: 1, flexDirection: 'column', alignItems: 'center', gap: 6,
        paddingVertical: 14, backgroundColor: '#fff', borderRadius: 16,
        borderWidth: 1, borderColor: c.borderP10, ...cardShadow,
    },
    actionBtnText: { fontSize: 12, fontWeight: fontWeight.title, color: c.primary },

    thumb: { width: 80, height: 64, borderRadius: 10, overflow: 'hidden' },
    thumbImg: { width: '100%', height: '100%' },
    thumbRemove: { position: 'absolute', top: 2, right: 2 },

    fieldRow: { flexDirection: 'row', gap: 8 },
    weatherPill: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: c.borderP10, gap: 2 },
    weatherPillActive: { backgroundColor: c.accent, borderColor: c.accent },
    weatherPillText: { fontSize: 12, fontWeight: fontWeight.secondary, color: '#64748b' },

    input: {
        marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 16, padding: 14,
        fontSize: 14, color: c.text, borderWidth: 1, borderColor: c.borderP10, ...cardShadow,
    },

    // Text area with mic
    textAreaWrap: { marginHorizontal: 16, position: 'relative' },
    textArea: {
        minHeight: 120, backgroundColor: '#fff', borderRadius: 16, padding: 16,
        paddingRight: 56, fontSize: 14, color: c.text,
        borderWidth: 1, borderColor: c.borderP10, ...cardShadow,
    },
    micBtn: {
        position: 'absolute', right: 10, top: 10,
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: c.primary + '12',
        alignItems: 'center', justifyContent: 'center',
    },
    micBtnActive: { backgroundColor: '#ef4444' },
    listeningBadge: {
        position: 'absolute', bottom: 10, left: 16,
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#ef4444', borderRadius: radius.pill,
        paddingHorizontal: 10, paddingVertical: 4,
    },
    listeningDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
    listeningText: { fontSize: 11, fontWeight: fontWeight.title, color: '#fff' },

    // Save
    saveBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        marginHorizontal: 16, marginTop: 24, backgroundColor: c.primary,
        paddingVertical: 18, borderRadius: 16,
        borderBottomWidth: 4, borderBottomColor: 'rgba(35,65,149,0.4)',
        shadowColor: c.primary, shadowOpacity: 0.35, shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 }, elevation: 8,
    },
    saveBtnText: { fontSize: 16, fontWeight: fontWeight.title, color: '#fff', letterSpacing: 1 },

    // Modals
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        maxHeight: '70%', paddingBottom: 30,
    },
    modalHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: c.borderP5,
    },
    modalTitle: { fontSize: 18, fontWeight: fontWeight.title, color: c.text },
    modalItem: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingHorizontal: 20, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: c.borderP5,
    },
    modalItemActive: { backgroundColor: c.primary },
    modalItemIcon: {
        width: 40, height: 40, borderRadius: radius.iconBox,
        backgroundColor: c.primary + '12', alignItems: 'center', justifyContent: 'center',
    },
    modalItemName: { fontSize: 15, fontWeight: fontWeight.title, color: c.text },
    modalItemSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    modalEmpty: { textAlign: 'center', color: c.textMuted, fontSize: 14 },

    taskItem: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingHorizontal: 20, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: c.borderP5,
    },
    taskItemActive: { backgroundColor: c.primary },
    taskItemProgress: {
        width: 44, height: 44, borderRadius: 22,
        borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    },
    taskItemProgressText: { fontSize: 11, fontWeight: fontWeight.title },
    taskItemName: { fontSize: 14, fontWeight: fontWeight.secondary, color: c.text },
    taskItemMeta: { fontSize: 11, color: c.textMuted, marginTop: 2 },
});
