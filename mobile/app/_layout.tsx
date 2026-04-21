import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ToastProvider } from '@/components/Toast';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === 'login';
    if (!user && !inAuth) router.replace('/login');
    else if (user && inAuth) router.replace('/(tabs)');
  }, [user, loading, segments]);

  if (loading) return null;
  return <>{children}</>;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => { if (error) throw error; }, [error]);
  useEffect(() => { if (loaded) SplashScreen.hideAsync(); }, [loaded]);

  if (!loaded) return null;

  return (
    <ToastProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ToastProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="login" />
          <Stack.Screen name="schedule" />
          <Stack.Screen name="daily-log" />
          <Stack.Screen name="material-request" />
          <Stack.Screen name="purchasing" />
          <Stack.Screen name="drawings" />
          <Stack.Screen name="warranty" />
          <Stack.Screen name="approvals" />
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="projects/[id]" />
          <Stack.Screen name="attendance" />
          <Stack.Screen name="leave-request" />
          <Stack.Screen name="production" />
          <Stack.Screen name="production-detail" />
          <Stack.Screen name="punch-list" />
          <Stack.Screen name="acceptance-check" />
        </Stack>
      </AuthGate>
    </ThemeProvider>
  );
}
