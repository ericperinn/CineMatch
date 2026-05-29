import { Stack } from 'expo-router';
import { QueryProvider } from '@/providers/QueryProvider';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <QueryProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#020617' } }}>
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      </Stack>
    </QueryProvider>
  );
}
