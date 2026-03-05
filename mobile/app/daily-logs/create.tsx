import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    Alert,
    TouchableOpacity,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { apiFetch } from '@/lib/api';
import { COLORS } from '@/lib/constants';

export default function CreateDailyLogScreen() {
    const { projectId, projectName } = useLocalSearchParams<{
        projectId: string;
        projectName: string;
    }>();

    const [weather, setWeather] = useState('Nắng');
    const [workforce, setWorkforce] = useState('');
    const [workDone, setWorkDone] = useState('');
    const [issues, setIssues] = useState('');
    const [tomorrowPlan, setTomorrowPlan] = useState('');
    const [loading, setLoading] = useState(false);

    const weatherOptions = ['Nắng', 'Mưa', 'Âm u', 'Mưa nhẹ', 'Bão'];

    async function handleSubmit() {
        if (!workDone.trim()) {
            Alert.alert('Thiếu thông tin', 'Vui lòng nhập công việc đã thực hiện');
            return;
        }

        setLoading(true);
        try {
            await apiFetch('/api/daily-logs', {
                method: 'POST',
                body: JSON.stringify({
                    projectId,
                    weather,
                    workforce: workforce.trim() || undefined,
                    workDone: workDone.trim(),
                    issues: issues.trim() || undefined,
                    tomorrowPlan: tomorrowPlan.trim() || undefined,
                    date: new Date().toISOString().split('T')[0],
                }),
            });

            Alert.alert('Thành công', 'Đã tạo nhật ký công trường', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (err: any) {
            Alert.alert('Lỗi', err.message || 'Không thể tạo nhật ký');
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <Stack.Screen options={{ title: 'Nhật ký công trường' }} />
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                {projectName && (
                    <Card style={{ marginBottom: 16 }}>
                        <Text style={styles.projectLabel}>Dự án</Text>
                        <Text style={styles.projectName}>{projectName}</Text>
                        <Text style={styles.dateText}>
                            Ngày: {new Date().toLocaleDateString('vi-VN')}
                        </Text>
                    </Card>
                )}

                {/* Weather */}
                <Text style={styles.label}>Thời tiết</Text>
                <View style={styles.weatherRow}>
                    {weatherOptions.map((w) => (
                        <TouchableOpacity
                            key={w}
                            style={[styles.weatherChip, weather === w && styles.weatherChipActive]}
                            onPress={() => setWeather(w)}
                        >
                            <Text style={[styles.weatherText, weather === w && styles.weatherTextActive]}>
                                {w === 'Nắng' ? '☀️' : w === 'Mưa' ? '🌧️' : w === 'Âm u' ? '☁️' : w === 'Mưa nhẹ' ? '🌦️' : '🌪️'} {w}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Input
                    label="Nhân lực có mặt"
                    value={workforce}
                    onChangeText={setWorkforce}
                    placeholder="VD: 5 thợ xây, 3 thợ điện, 2 phụ"
                    multiline
                />

                <Input
                    label="Công việc đã thực hiện *"
                    value={workDone}
                    onChangeText={setWorkDone}
                    multiline
                    numberOfLines={4}
                    placeholder="Mô tả chi tiết công việc hôm nay..."
                    style={{ minHeight: 100, textAlignVertical: 'top' }}
                />

                <Input
                    label="Vấn đề / Sự cố"
                    value={issues}
                    onChangeText={setIssues}
                    multiline
                    numberOfLines={3}
                    placeholder="Ghi lại sự cố, khó khăn nếu có..."
                    style={{ minHeight: 80, textAlignVertical: 'top' }}
                />

                <Input
                    label="Kế hoạch ngày mai"
                    value={tomorrowPlan}
                    onChangeText={setTomorrowPlan}
                    multiline
                    numberOfLines={3}
                    placeholder="Dự kiến công việc ngày mai..."
                    style={{ minHeight: 80, textAlignVertical: 'top' }}
                />

                <Button
                    title={loading ? 'Đang gửi...' : 'Gửi nhật ký'}
                    onPress={handleSubmit}
                    loading={loading}
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
    projectLabel: { fontSize: 12, color: COLORS.textSecondary },
    projectName: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginTop: 2 },
    dateText: { fontSize: 13, color: COLORS.textLight, marginTop: 4 },
    label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
    weatherRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    weatherChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.white,
    },
    weatherChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    weatherText: { fontSize: 13, color: COLORS.text },
    weatherTextActive: { color: COLORS.white, fontWeight: '600' },
});
