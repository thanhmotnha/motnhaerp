import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { queryClient } from '@/lib/queryClient';
import { COLORS } from '@/lib/constants';

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: COLORS.primary },
              headerTintColor: COLORS.white,
              headerTitleStyle: { fontWeight: '600' },
              contentStyle: { backgroundColor: COLORS.background },
            }}
          >
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="projects/[id]" options={{ title: 'Chi tiết dự án' }} />
            <Stack.Screen name="progress/report" options={{ title: 'Báo cáo tiến độ' }} />
            <Stack.Screen name="purchase-orders/[id]" options={{ title: 'Chi tiết PO' }} />
            <Stack.Screen name="purchase-orders/create" options={{ title: 'Tạo đơn mua hàng' }} />
            <Stack.Screen name="daily-logs/create" options={{ title: 'Nhật ký công trường' }} />
            <Stack.Screen name="schedule/index" options={{ title: 'Lịch trình dự án' }} />
            <Stack.Screen name="customer/index" options={{ title: 'Dự án của tôi', headerShown: false }} />
            <Stack.Screen name="customer/gallery" options={{ title: 'Ảnh công trường' }} />
            <Stack.Screen name="customer/quotation" options={{ title: 'Báo giá dự án' }} />
          </Stack>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
