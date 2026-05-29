import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { theme } from '@/constants/theme';
import { useLoginMutation } from '@/services/queries/auth.queries';
import { useAuthStore } from '@/store/useAuthStore';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('nina@cinematch.app');
  const [password, setPassword] = useState('');
  
  // Fake login for now until backend is ready, or use the mutation if API is up
  // const { mutate: login, isPending } = useLoginMutation();
  const [isPending, setIsPending] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = () => {
    setIsPending(true);
    // Simulate API call for now to allow testing the UI without backend
    setTimeout(() => {
      setAuth('fake-jwt-token', {
        id: '1',
        name: 'Nina K',
        email,
      });
      setIsPending(false);
      router.replace('/(tabs)/home');
    }, 1000);
    
    /* When backend is ready:
    login({ email, password }, {
      onSuccess: () => {
        router.replace('/(tabs)/home');
      },
      onError: (err) => {
        console.error(err);
      }
    });
    */
  };

  return (
    <ScreenContainer padded style={styles.container}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        
        {/* Header / Avatar */}
        <View style={styles.header}>
          <Avatar name="Nina K" size={56} ring ringColor={theme.colors.primary} />
          <View>
            <Text style={styles.title}>Welcome back.</Text>
            <Text style={styles.subtitle}>3 UNWATCHED MATCHES</Text>
          </View>
        </View>

        {/* Social Button Placeholder */}
        <Button 
          label="Continue with Letterboxd" 
          variant="secondary" 
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
        />
        <Input 
          label="Password" 
          value={password} 
          onChangeText={setPassword} 
          placeholder="••••••••" 
          secureTextEntry 
        />

        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>Forgot password?</Text>
        </TouchableOpacity>

        <Button 
          label="Log in" 
          onPress={handleLogin} 
          isLoading={isPending} 
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
