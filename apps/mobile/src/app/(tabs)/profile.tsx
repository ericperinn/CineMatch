import React from 'react';
import { Text } from 'react-native';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { theme } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const logout = useAuthStore(state => state.logout);
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <ScreenContainer padded style={{ justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: theme.colors.text, fontSize: 20, marginBottom: 20 }}>Profile</Text>
      <Button label="Log out" variant="outline" onPress={handleLogout} />
    </ScreenContainer>
  );
}
