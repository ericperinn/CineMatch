import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { extractApiError, useRegisterMutation } from '@/services/queries/auth.queries';
import { tap, warn } from '@/lib/feedback';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [letterboxdUsername, setLetterboxdUsername] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { mutate: register, isPending } = useRegisterMutation();

  const canSubmit =
    name.trim().length >= 2 &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    !isPending;

  const handleRegister = () => {
    if (!canSubmit) return;
    tap();
    setError(null);
    register(
      { name, email, password, letterboxdUsername },
      {
        onSuccess: () => router.replace('/(tabs)/home'),
        onError: (err) => {
          warn();
          setError(extractApiError(err, 'Could not create your account'));
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
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>START MATCHING TONIGHT</Text>
          </View>

          <Input
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            autoCapitalize="words"
          />
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
            placeholder="At least 8 characters"
            secureTextEntry
          />
          <Input
            label="Letterboxd username (optional)"
            value={letterboxdUsername}
            onChangeText={setLetterboxdUsername}
            placeholder="username"
            autoCapitalize="none"
            onSubmitEditing={handleRegister}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Button
            label="Create account"
            onPress={handleRegister}
            isLoading={isPending}
            disabled={!canSubmit}
            style={{ marginTop: theme.spacing.sm }}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Already have an account?{' '}
          <Text style={styles.footerLink} onPress={() => router.back()}>
            Log in
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
  },
  header: {
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
  error: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 13,
    color: theme.colors.error,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: theme.spacing.xl,
    paddingTop: theme.spacing.md,
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
});
