import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { LayoutDashboard, FolderKanban, ClipboardCheck, Settings, Users, Warehouse } from 'lucide-react-native';
import { COLORS } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { FAB } from '@/components/FAB';

export default function TabsLayout() {
  const { canApprove, role } = useAuth();
  const canManageCustomers = role === 'giam_doc' || role === 'ke_toan' || role === 'kinh_doanh';
  const canManageInventory = role === 'giam_doc' || role === 'ke_toan' || role === 'kho' || role === 'ky_thuat';

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: COLORS.white,
          headerTitleStyle: { fontWeight: '600' },
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textLight,
          tabBarStyle: {
            borderTopColor: COLORS.borderLight,
            paddingTop: 4,
            height: 60,
            paddingBottom: 8,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Tổng quan',
            tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="customers"
          options={{
            title: 'Khách hàng',
            tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
            href: canManageCustomers ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="projects"
          options={{
            title: 'Dự án',
            tabBarIcon: ({ color, size }) => <FolderKanban size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="inventory"
          options={{
            title: 'Kho',
            tabBarIcon: ({ color, size }) => <Warehouse size={size} color={color} />,
            href: canManageInventory ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="approvals"
          options={{
            title: 'Phê duyệt',
            tabBarIcon: ({ color, size }) => <ClipboardCheck size={size} color={color} />,
            href: canApprove ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Cài đặt',
            tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
          }}
        />
      </Tabs>
      <FAB />
    </View>
  );
}
