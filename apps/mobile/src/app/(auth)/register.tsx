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
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.logoMark}>
              <Ionicons name="film" size={24} color={theme.colors.primaryDark} />
            </View>
            <Text style={styles.brand}>Create your account</Text>
            <Text style={styles.tagline}>
              Sync a Letterboxd profile to seed your matches with your taste.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.eyebrow}>NEW ACCOUNT</Text>

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
              placeholder="e.g. davecinema"
              autoCapitalize="none"
              autoCorrect={false}
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Already have an account?{' '}
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
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
  },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '900',
    fontSize: 28,
    color: theme.colors.text,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 20,
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
});
