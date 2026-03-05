import React from 'react';
import { Tabs } from 'expo-router';
import { LayoutDashboard, FolderKanban, ClipboardCheck, Settings } from 'lucide-react-native';
import { COLORS } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';

export default function TabsLayout() {
  const { canApprove } = useAuth();

  return (
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
        name="projects"
        options={{
          title: 'Dự án',
          tabBarIcon: ({ color, size }) => <FolderKanban size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="approvals"
        options={{
          title: 'Phê duyệt',
          tabBarIcon: ({ color, size }) => <ClipboardCheck size={size} color={color} />,
          href: canApprove ? undefined : null, // Hide tab for non-approval roles
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
  );
}
