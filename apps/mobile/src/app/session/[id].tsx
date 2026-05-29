import React from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { theme } from '@/constants/theme';

export default function SessionScreen() {
  const { id } = useLocalSearchParams();

  return (
    <ScreenContainer padded style={{ justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: theme.colors.primary, fontSize: 24, fontWeight: 'bold' }}>Session: {id}</Text>
      <Text style={{ color: theme.colors.textMuted, marginTop: 10 }}>Ready to swipe!</Text>
    </ScreenContainer>
  );
}
