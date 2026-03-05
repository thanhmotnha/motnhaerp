import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { COLORS, ROLES } from '@/lib/constants';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const roleInfo = user?.role ? ROLES[user.role] : null;

  function handleLogout() {
    Alert.alert('Đăng xuất', 'Bạn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <Card style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {roleInfo && (
          <View style={[styles.roleBadge, { backgroundColor: roleInfo.color + '20' }]}>
            <Text style={{ fontSize: 14 }}>{roleInfo.icon}</Text>
            <Text style={[styles.roleText, { color: roleInfo.color }]}>{roleInfo.label}</Text>
          </View>
        )}
      </Card>

      <View style={styles.section}>
        <Button title="Đăng xuất" onPress={handleLogout} variant="danger" size="lg" />
      </View>

      <Text style={styles.version}>MOTNHA Mobile v1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  profile: { alignItems: 'center', padding: 24, marginTop: 8 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: COLORS.white },
  name: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  email: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: { fontSize: 13, fontWeight: '600' },
  section: { marginTop: 24 },
  version: {
    textAlign: 'center',
    color: COLORS.textLight,
    fontSize: 12,
    marginTop: 24,
  },
});
