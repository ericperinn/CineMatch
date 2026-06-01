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
import { extractApiError, useLoginMutation } from '@/services/queries/auth.queries';
import { tap, warn } from '@/lib/feedback';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { mutate: login, isPending } = useLoginMutation();

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isPending;

  const handleLogin = () => {
    if (!canSubmit) return;
    tap();
    setError(null);
    login(
      { email: email.trim(), password },
      {
        onSuccess: () => router.replace('/(tabs)/home'),
        onError: (err) => {
          warn();
          setError(extractApiError(err, 'Invalid email or password'));
        },
      }
    );
  };

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
            <View style={styles.logoMark}>
              <Ionicons name="film" size={28} color={theme.colors.primaryDark} />
            </View>
            <Text style={styles.brand}>CineMatch</Text>
            <Text style={styles.tagline}>
              Pick what to watch tonight — together.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.eyebrow}>SIGN IN</Text>

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              onSubmitEditing={handleLogin}
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Button
              label="Sign in"
              onPress={handleLogin}
              isLoading={isPending}
              disabled={!canSubmit}
              style={{ marginTop: theme.spacing.sm }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          New here?{' '}
          <Text style={styles.footerLink} onPress={() => router.push('/(auth)/register')}>
            Create an account
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
    gap: theme.spacing.xl,
  },
  hero: {
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.xl,
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 6,
  },
  brand: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '900',
    fontSize: 36,
    color: theme.colors.text,
    letterSpacing: -1,
  },
  tagline: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 15,
    color: theme.colors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
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
    marginBottom: theme.spacing.md,
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
});
