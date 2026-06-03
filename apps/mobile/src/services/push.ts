import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { api } from './api';
import { useAuthStore } from '../store/useAuthStore';

// Foreground behaviour: show the banner + play the sound, don't bump the
// app icon badge (no unread count UX yet).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function setupAndroidChannelAsync() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#a3e635',
  });
}

async function fetchExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const result = await Notifications.requestPermissionsAsync();
    status = result.status;
  }
  if (status !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;

  try {
    const result = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return result.data;
  } catch (err) {
    console.warn('[push] could not get Expo push token', err);
    return null;
  }
}

export async function registerPushToken(): Promise<string | null> {
  await setupAndroidChannelAsync();
  const token = await fetchExpoPushToken();
  if (!token) return null;

  try {
    await api.post('/users/me/push-tokens', {
      token,
      platform: Platform.OS,
    });
    return token;
  } catch (err) {
    console.warn('[push] backend register failed', err);
    return null;
  }
}

/**
 * Wires the push token lifecycle to the auth state and routes notification
 * taps. Call once from the root layout.
 */
export function usePushNotifications() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const registeredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      registeredRef.current = null;
      return;
    }
    let cancelled = false;
    registerPushToken().then((pushToken) => {
      if (cancelled) return;
      registeredRef.current = pushToken;
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as {
        type?: string;
        sessionId?: string;
      };
      if (data?.type === 'session_invite' && data.sessionId) {
        router.push(`/session/${data.sessionId}?role=guest`);
      } else if (data?.type === 'match' && data.sessionId) {
        router.push(`/session/${data.sessionId}`);
      } else if (data?.type === 'friend_request' || data?.type === 'friend_accepted') {
        router.push('/(tabs)/home');
      }
    });
    return () => sub.remove();
  }, [router]);
}
