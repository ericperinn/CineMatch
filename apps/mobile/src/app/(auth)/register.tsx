import React from 'react';
import { View, Text } from 'react-native';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';

export default function RegisterScreen() {
  const router = useRouter();

  return (
    <ScreenContainer padded style={{ justifyContent: 'center' }}>
      <Text style={{ color: theme.colors.text, fontSize: 24, marginBottom: 20 }}>Register</Text>
      <Button label="Back to Login" onPress={() => router.back()} />
    </ScreenContainer>
  );
}
