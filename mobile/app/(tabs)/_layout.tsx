import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { LayoutDashboard, FolderKanban, ClipboardCheck, Settings, Users, Warehouse, CircleDollarSign } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { FAB } from '@/components/FAB';

export default function TabsLayout() {
  const { canApprove, role } = useAuth();
  const { theme } = useTheme();
  const canManageCustomers = role === 'giam_doc' || role === 'ke_toan' || role === 'kinh_doanh';
  const canManageInventory = role === 'giam_doc' || role === 'ke_toan' || role === 'kho' || role === 'ky_thuat';
  const canViewFinance = role === 'giam_doc' || role === 'ke_toan';

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: theme.primary },
          headerTintColor: theme.textOnPrimary,
          headerTitleStyle: { fontWeight: '600' },
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textMuted,
          tabBarStyle: {
            backgroundColor: theme.surface,
            borderTopColor: theme.borderLight,
            borderTopWidth: 1,
            paddingTop: 6,
            paddingBottom: Platform.OS === 'ios' ? 24 : 8,
            height: Platform.OS === 'ios' ? 82 : 64,
            // Floating shadow
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: theme.mode === 'dark' ? 0.4 : 0.06,
            shadowRadius: 8,
            elevation: 10,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
          tabBarItemStyle: { paddingVertical: 4 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Tổng quan',
            tabBarIcon: ({ color, size, focused }) => (
              <TabIconWrap focused={focused} color={color}>
                <LayoutDashboard size={size} color={color} />
              </TabIconWrap>
            ),
          }}
        />
        <Tabs.Screen
          name="customers"
          options={{
            title: 'Khách hàng',
            tabBarIcon: ({ color, size, focused }) => (
              <TabIconWrap focused={focused} color={color}>
                <Users size={size} color={color} />
              </TabIconWrap>
            ),
            href: canManageCustomers ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="projects"
          options={{
            title: 'Dự án',
            tabBarIcon: ({ color, size, focused }) => (
              <TabIconWrap focused={focused} color={color}>
                <FolderKanban size={size} color={color} />
              </TabIconWrap>
            ),
          }}
        />
        <Tabs.Screen
          name="inventory"
          options={{
            title: 'Kho',
            tabBarIcon: ({ color, size, focused }) => (
              <TabIconWrap focused={focused} color={color}>
                <Warehouse size={size} color={color} />
              </TabIconWrap>
            ),
            href: canManageInventory ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="finance"
          options={{
            title: 'Thu tiền',
            tabBarIcon: ({ color, size, focused }) => (
              <TabIconWrap focused={focused} color={color}>
                <CircleDollarSign size={size} color={color} />
              </TabIconWrap>
            ),
            href: canViewFinance ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="approvals"
          options={{
            title: 'Phê duyệt',
            tabBarIcon: ({ color, size, focused }) => (
              <TabIconWrap focused={focused} color={color}>
                <ClipboardCheck size={size} color={color} />
              </TabIconWrap>
            ),
            href: canApprove ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Cài đặt',
            tabBarIcon: ({ color, size, focused }) => (
              <TabIconWrap focused={focused} color={color}>
                <Settings size={size} color={color} />
              </TabIconWrap>
            ),
          }}
        />
      </Tabs>
      <FAB />
    </View>
  );
}

/** Small pill highlight behind icon when focused */
function TabIconWrap({ focused, color, children }: { focused: boolean; color: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={[
      styles.iconWrap,
      focused && { backgroundColor: theme.primaryGradientSoft[0] },
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center', justifyContent: 'center',
    width: 44, height: 28, borderRadius: 14,
  },
});
