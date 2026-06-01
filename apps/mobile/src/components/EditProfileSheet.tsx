import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useUpdateMe } from '@/services/queries/users.queries';
import { extractApiError } from '@/services/queries/auth.queries';
import { success, tap, warn } from '@/lib/feedback';

const LETTERBOXD_REGEX = /^[a-zA-Z0-9_-]{1,30}$/;

export function EditProfileSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const user = useAuthStore((state) => state.user);
  const { mutate: updateMe, isPending } = useUpdateMe();
  const [name, setName] = useState('');
  const [letterboxd, setLetterboxd] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset fields whenever the sheet opens (or the underlying user changes).
  useEffect(() => {
    if (!visible) return;
    setName(user?.name ?? '');
    setLetterboxd(user?.letterboxdUsername ?? '');
    setError(null);
  }, [visible, user?.name, user?.letterboxdUsername]);

  const trimmedName = name.trim();
  const trimmedLetterboxd = letterboxd.trim();

  const nameValid = trimmedName.length >= 2;
  const letterboxdValid =
    trimmedLetterboxd === '' || LETTERBOXD_REGEX.test(trimmedLetterboxd);

  const nameChanged = trimmedName !== (user?.name ?? '');
  const letterboxdChanged =
    (trimmedLetterboxd || null) !== (user?.letterboxdUsername ?? null);

  const hasChanges = nameChanged || letterboxdChanged;
  const canSave = hasChanges && nameValid && letterboxdValid && !isPending;

  const handleSave = () => {
    if (!canSave) return;
    tap();
    setError(null);
    updateMe(
      {
        ...(nameChanged ? { name: trimmedName } : {}),
        ...(letterboxdChanged
          ? { letterboxdUsername: trimmedLetterboxd ? trimmedLetterboxd : null }
          : {}),
      },
      {
        onSuccess: () => {
          success();
          onClose();
        },
        onError: (err) => {
          warn();
          setError(extractApiError(err, "Couldn't save your profile"));
        },
      }
    );
  };

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
      transparent
      statusBarTranslucent
    >
      {visible && (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          </Animated.View>

          <Animated.View
            entering={SlideInDown.springify().damping(20).mass(0.6)}
            style={styles.sheet}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}
            >
              <View style={styles.handle} />
              <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.header}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eyebrow}>EDIT PROFILE</Text>
                    <Text style={styles.title}>Tweak your details</Text>
                  </View>
                  <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Close">
                    <Ionicons name="close" size={26} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <Input
                  label="Name"
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  autoCapitalize="words"
                />
                {!nameValid && name.length > 0 && (
                  <Text style={styles.fieldHint}>Name must be at least 2 characters.</Text>
                )}

                <Input
                  label="Letterboxd username (optional)"
                  value={letterboxd}
                  onChangeText={setLetterboxd}
                  placeholder="e.g. davecinema"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={handleSave}
                />
                {!letterboxdValid && (
                  <Text style={styles.fieldHint}>
                    Use 1-30 letters, numbers, dashes or underscores.
                  </Text>
                )}

                {error && (
                  <View style={styles.errorBox}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={16}
                      color={theme.colors.error}
                    />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <Button
                  label="Save changes"
                  onPress={handleSave}
                  isLoading={isPending}
                  disabled={!canSave}
                  leftIcon={
                    <Ionicons name="checkmark" size={18} color={theme.colors.primaryDark} />
                  }
                  style={{ marginTop: theme.spacing.md }}
                />
                <Button label="Cancel" variant="ghost" onPress={onClose} />
              </ScrollView>
            </KeyboardAvoidingView>
          </Animated.View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,6,23,0.7)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '92%',
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radii.xl,
    borderTopRightRadius: theme.radii.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: theme.colors.border,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.surfaceHighlight,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  scroll: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  eyebrow: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 10,
    color: theme.colors.primary,
    letterSpacing: 2,
    fontWeight: '800',
    marginBottom: 4,
  },
  title: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '900',
    fontSize: 24,
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  fieldHint: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.errorSoft,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  errorText: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 13,
    color: theme.colors.error,
    flex: 1,
  },
});
