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
  if (!Device.isDevice) {
    console.log('[push] skipped: not a physical device (web or simulator)');
    return null;
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const result = await Notifications.requestPermissionsAsync();
    status = result.status;
  }
  if (status !== 'granted') {
    console.log('[push] permission not granted:', status);
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;

  console.log('[push] requesting token, projectId =', projectId ?? '(none)');

  try {
    const result = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    console.log('[push] got token:', result.data);
    return result.data;
  } catch (err) {
    console.warn('[push] getExpoPushTokenAsync failed:', (err as Error)?.message ?? err);
    return null;
  }
}

// Tracks the token we registered with the backend so logout can revoke
// exactly that one (and only that one — other devices keep their own).
let lastRegisteredToken: string | null = null;

export async function registerPushToken(): Promise<string | null> {
  await setupAndroidChannelAsync();
  const token = await fetchExpoPushToken();
  if (!token) return null;

  try {
    await api.post('/users/me/push-tokens', {
      token,
      platform: Platform.OS,
    });
    console.log('[push] backend registered token for', Platform.OS);
    lastRegisteredToken = token;
    return token;
  } catch (err) {
    console.warn(
      '[push] backend register failed:',
      (err as { response?: { status?: number; data?: unknown }; message?: string })?.response?.data
        ?? (err as Error)?.message
        ?? err,
    );
    return null;
  }
}

export async function unregisterPushToken(): Promise<void> {
  if (!lastRegisteredToken) return;
  try {
    await api.delete('/users/me/push-tokens', {
      data: { token: lastRegisteredToken },
    });
    console.log('[push] backend unregistered token');
  } catch (err) {
    console.warn(
      '[push] backend unregister failed:',
      (err as { response?: { data?: unknown }; message?: string })?.response?.data
        ?? (err as Error)?.message
        ?? err,
    );
  } finally {
    lastRegisteredToken = null;
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
