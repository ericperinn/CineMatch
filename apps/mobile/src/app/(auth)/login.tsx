import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { theme } from '@/constants/theme';
import { extractApiError, useLoginMutation } from '@/services/queries/auth.queries';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { mutate: login, isPending } = useLoginMutation();

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isPending;

  const handleLogin = () => {
    if (!canSubmit) return;
    setError(null);
    login(
      { email: email.trim(), password },
      {
        onSuccess: () => router.replace('/(tabs)/home'),
        onError: (err) => setError(extractApiError(err, 'Invalid email or password')),
      }
    );
  };

  return (
    <ScreenContainer padded style={styles.container}>
      <View style={{ flex: 1, justifyContent: 'center' }}>

        {/* Header / Avatar */}
        <View style={styles.header}>
          <Avatar name="CineMatch" size={56} ring ringColor={theme.colors.primary} />
          <View>
            <Text style={styles.title}>Welcome back.</Text>
            <Text style={styles.subtitle}>FIND YOUR NEXT WATCH</Text>
          </View>
        </View>

        {/* Social Button Placeholder */}
        <Button
          label="Continue with Letterboxd"
          variant="secondary"
          disabled
          style={{ marginBottom: 18 }}
        />

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Form */}
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

        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>Forgot password?</Text>
        </TouchableOpacity>

        {error && <Text style={styles.error}>{error}</Text>}

        <Button
          label="Log in"
          onPress={handleLogin}
          isLoading={isPending}
          disabled={!canSubmit}
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          New here?{' '}
          <Text style={styles.footerLink} onPress={() => router.push('/(auth)/register')}>
            Create an account
          </Text>
        </Text>
        <Text style={styles.securedText}>SECURED · OAUTH 2.0</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: theme.spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '800',
    fontSize: 26,
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 10,
    color: theme.colors.textSubtle,
    letterSpacing: 1.2,
    marginTop: 4,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 9,
    color: theme.colors.textSubtle,
    letterSpacing: 1.8,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: theme.spacing.lg,
    marginTop: -4,
  },
  forgotPasswordText: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  error: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 13,
    color: theme.colors.error,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  footerText: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  footerLink: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  securedText: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 9,
    color: theme.colors.textSubtle,
    letterSpacing: 1.8,
    marginTop: 12,
  },
});
