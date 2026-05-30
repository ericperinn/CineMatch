import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

// All helpers are best-effort: haptics throw on web/unsupported devices,
// clipboard can be denied. Swallow so UI never crashes on a side effect.
const safe = <T,>(promise: Promise<T>) => promise.catch(() => undefined);

export const tap = () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

export const success = () =>
  safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

export const warn = () =>
  safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));

export const heavy = () =>
  safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));

export const copyToClipboard = async (text: string) => {
  await safe(Clipboard.setStringAsync(text));
  await tap();
};
