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
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { extractApiError, useForgotPasswordMutation } from '@/services/queries/auth.queries';
import { tap, success, warn } from '@/lib/feedback';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mutate: sendReset, isPending } = useForgotPasswordMutation();

  const canSubmit = email.trim().length > 0 && !isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    tap();
    setError(null);
    sendReset(email, {
      onSuccess: () => {
        success();
        setSubmitted(true);
      },
      onError: (err) => {
        warn();
        setError(extractApiError(err, 'Something went wrong'));
      },
    });
  };

  if (submitted) {
    return (
      <ScreenContainer padded style={styles.container}>
        <View style={styles.successBlock}>
          <View style={styles.markOk}>
            <Ionicons name="mail" size={28} color={theme.colors.primaryDark} />
          </View>
          <Text style={styles.title}>Check your inbox</Text>
          <Text style={styles.body}>
            If an account exists for{' '}
            <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{email}</Text>,
            we sent a reset link. It expires in 1 hour.
          </Text>
          <Button
            label="Back to sign in"
            onPress={() => router.replace('/(auth)/login')}
            style={{ marginTop: theme.spacing.xl, alignSelf: 'stretch' }}
            leftIcon={<Ionicons name="arrow-back" size={18} color={theme.colors.primaryDark} />}
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
              <Ionicons name="key" size={24} color={theme.colors.primaryDark} />
            </View>
            <Text style={styles.title}>Reset your password</Text>
            <Text style={styles.body}>
              Enter the email tied to your account. We'll send you a link to choose
              a new password.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.eyebrow}>EMAIL</Text>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              onSubmitEditing={handleSubmit}
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Button
              label="Send reset link"
              onPress={handleSubmit}
              isLoading={isPending}
              disabled={!canSubmit}
              style={{ marginTop: theme.spacing.sm }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Remembered it?{' '}
          <Text style={styles.footerLink} onPress={() => router.back()}>
            Sign in
          </Text>
        </Text>
      </View>
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
    width: 64,
    height: 64,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.primary,
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
  error: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 13,
    color: theme.colors.error,
    marginVertical: theme.spacing.sm,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: theme.spacing.xl,
    paddingTop: theme.spacing.md,
  },
  footerText: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  footerLink: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  successBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
});
