import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { extractApiError, useResetPasswordMutation } from '@/services/queries/auth.queries';
import { tap, success, warn } from '@/lib/feedback';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { mutate: resetPassword, isPending } = useResetPasswordMutation();

  const passwordValid = password.length >= 8;
  const matches = password === confirm;
  const canSubmit =
    !!token && passwordValid && matches && !isPending;

  const handleSubmit = () => {
    if (!canSubmit || !token) return;
    tap();
    setError(null);
    resetPassword(
      { token, password },
      {
        onSuccess: () => {
          success();
          setDone(true);
        },
        onError: (err) => {
          warn();
          setError(extractApiError(err, 'Could not reset your password'));
        },
      },
    );
  };

  if (!token) {
    return (
      <ScreenContainer padded style={styles.container}>
        <View style={styles.centerBlock}>
          <View style={styles.markError}>
            <Ionicons name="alert" size={28} color={theme.colors.error} />
          </View>
          <Text style={styles.title}>Bad link</Text>
          <Text style={styles.body}>
            This password reset link is missing its token. Request a new one from
            the sign in screen.
          </Text>
          <Button
            label="Back to sign in"
            onPress={() => router.replace('/(auth)/login')}
            style={{ marginTop: theme.spacing.lg, alignSelf: 'stretch' }}
          />
        </View>
      </ScreenContainer>
    );
  }

  if (done) {
    return (
      <ScreenContainer padded style={styles.container}>
        <View style={styles.centerBlock}>
          <View style={styles.markOk}>
            <Ionicons name="checkmark" size={32} color={theme.colors.primaryDark} />
          </View>
          <Text style={styles.title}>Password updated</Text>
          <Text style={styles.body}>
            You're all set. Sign in with your new password.
          </Text>
          <Button
            label="Sign in"
            onPress={() => router.replace('/(auth)/login')}
            style={{ marginTop: theme.spacing.lg, alignSelf: 'stretch' }}
            leftIcon={<Ionicons name="log-in" size={18} color={theme.colors.primaryDark} />}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.markPrimary}>
              <Ionicons name="lock-closed" size={24} color={theme.colors.primaryDark} />
            </View>
            <Text style={styles.title}>Choose a new password</Text>
            <Text style={styles.body}>
              Pick something you'll remember — minimum 8 characters.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.eyebrow}>NEW PASSWORD</Text>
            <Input
              label="New password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              secureTextEntry
            />
            <Input
              label="Confirm password"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repeat your password"
              secureTextEntry
              onSubmitEditing={handleSubmit}
            />

            {password.length > 0 && !passwordValid && (
              <Text style={styles.hint}>Use at least 8 characters.</Text>
            )}
            {confirm.length > 0 && password.length > 0 && !matches && (
              <Text style={styles.hint}>Passwords don't match yet.</Text>
            )}

            {error && <Text style={styles.error}>{error}</Text>}

            <Button
              label="Set new password"
              onPress={handleSubmit}
              isLoading={isPending}
              disabled={!canSubmit}
              style={{ marginTop: theme.spacing.sm }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: theme.spacing.xl,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: theme.spacing.lg,
  },
  hero: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xl,
  },
  markPrimary: {
    width: 56,
    height: 56,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  markOk: {
    width: 72,
    height: 72,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markError: {
    width: 64,
    height: 64,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.errorSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '900',
    fontSize: 28,
    color: theme.colors.text,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  body: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 15,
    color: theme.colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 21,
  },
  form: {
    gap: theme.spacing.xs,
  },
  eyebrow: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 10,
    color: theme.colors.textSubtle,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  hint: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
  },
  error: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 13,
    color: theme.colors.error,
    marginVertical: theme.spacing.sm,
    textAlign: 'center',
  },
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
});
