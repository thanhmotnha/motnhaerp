import React from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Sun, Moon, SmartphoneNfc, LogOut, Shield } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ROLES } from '@/lib/constants';
import { isBiometricAvailable, isBiometricEnabled, disableBiometric } from '@/lib/biometric';

export default function SettingsScreen() {
    const { user, logout } = useAuth();
    const { theme, pref, setPref, mode } = useTheme();
    const roleInfo = user?.role ? ROLES[user.role] : null;
    const [bioEnabled, setBioEnabled] = React.useState(false);
    const [bioAvailable, setBioAvailable] = React.useState(false);

    React.useEffect(() => {
        (async () => {
            const { available } = await isBiometricAvailable();
            setBioAvailable(available);
            setBioEnabled(await isBiometricEnabled());
        })();
    }, []);

    function handleLogout() {
        Alert.alert('Đăng xuất', 'Bạn muốn đăng xuất?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Đăng xuất', style: 'destructive',
                onPress: async () => {
                    await logout();
                    router.replace('/(auth)/login');
                },
            },
        ]);
    }

    async function handleDisableBio() {
        Alert.alert('Tắt sinh trắc học', 'Bạn cần đăng nhập lại bằng mật khẩu để bật lại.', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Tắt', style: 'destructive', onPress: async () => {
                    await disableBiometric();
                    setBioEnabled(false);
                },
            },
        ]);
    }

    return (
        <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16 }}>
            {/* Profile card */}
            <Card style={styles.profile} padding={24} elevation="md">
                <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                    <Text style={[styles.avatarText, { color: '#fff' }]}>
                        {user?.name?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                </View>
                <Text style={[styles.name, { color: theme.text }]}>{user?.name}</Text>
                <Text style={[styles.email, { color: theme.textMuted }]}>{user?.email}</Text>
                {roleInfo && (
                    <View style={[styles.roleBadge, { backgroundColor: roleInfo.color + '20' }]}>
                        <Text style={{ fontSize: 14 }}>{roleInfo.icon}</Text>
                        <Text style={[styles.roleText, { color: roleInfo.color }]}>{roleInfo.label}</Text>
                    </View>
                )}
            </Card>

            {/* Theme toggle */}
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>GIAO DIỆN</Text>
            <Card padding={0} elevation="sm">
                <ThemeOption
                    icon={<Sun size={18} color={theme.warning} />}
                    label="Sáng"
                    active={pref === 'light'}
                    onPress={() => setPref('light')}
                />
                <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
                <ThemeOption
                    icon={<Moon size={18} color={theme.primary} />}
                    label="Tối"
                    active={pref === 'dark'}
                    onPress={() => setPref('dark')}
                />
                <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />
                <ThemeOption
                    icon={<SmartphoneNfc size={18} color={theme.textSecondary} />}
                    label={`Theo hệ thống (đang ${mode === 'dark' ? 'tối' : 'sáng'})`}
                    active={pref === 'system'}
                    onPress={() => setPref('system')}
                />
            </Card>

            {/* Security */}
            {bioAvailable && bioEnabled && (
                <>
                    <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>BẢO MẬT</Text>
                    <Card padding={0} elevation="sm">
                        <Pressable style={styles.row} onPress={handleDisableBio}>
                            <View style={[styles.rowIcon, { backgroundColor: theme.primaryGradientSoft[0] }]}>
                                <Shield size={18} color={theme.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.rowTitle, { color: theme.text }]}>Đăng nhập sinh trắc</Text>
                                <Text style={[styles.rowSub, { color: theme.textMuted }]}>Đang bật · Bấm để tắt</Text>
                            </View>
                        </Pressable>
                    </Card>
                </>
            )}

            {/* Logout */}
            <View style={{ marginTop: 24 }}>
                <Button
                    title="Đăng xuất"
                    onPress={handleLogout}
                    variant="danger"
                    size="lg"
                    icon={<LogOut size={18} color="#fff" />}
                />
            </View>

            <Text style={[styles.version, { color: theme.textMuted }]}>MOTNHA Mobile v1.2.0</Text>
        </ScrollView>
    );
}

function ThemeOption({ icon, label, active, onPress }: { icon: React.ReactNode; label: string; active: boolean; onPress: () => void }) {
    const { theme } = useTheme();
    return (
        <Pressable style={styles.row} onPress={onPress}>
            <View style={[styles.rowIcon, { backgroundColor: theme.bgTertiary }]}>{icon}</View>
            <Text style={[styles.rowTitle, { color: theme.text, flex: 1 }]}>{label}</Text>
            {active && <View style={[styles.radioDot, { backgroundColor: theme.primary, borderColor: theme.primary }]} />}
            {!active && <View style={[styles.radioDot, { borderColor: theme.border }]} />}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    profile: { alignItems: 'center' },
    avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    avatarText: { fontSize: 28, fontWeight: '700' },
    name: { fontSize: 20, fontWeight: '700' },
    email: { fontSize: 14, marginTop: 4 },
    roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
    roleText: { fontSize: 13, fontWeight: '600' },

    sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 24, marginBottom: 8, marginLeft: 4 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    rowTitle: { fontSize: 15, fontWeight: '500' },
    rowSub: { fontSize: 12, marginTop: 2 },
    radioDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
    divider: { height: 1, marginLeft: 64 },

    version: { textAlign: 'center', fontSize: 12, marginTop: 32 },
});
