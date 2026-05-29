import React from 'react';
import { Text } from 'react-native';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { theme } from '@/constants/theme';

export default function HistoryScreen() {
  return (
    <ScreenContainer padded style={{ justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: theme.colors.text, fontSize: 20 }}>History</Text>
    </ScreenContainer>
  );
}
