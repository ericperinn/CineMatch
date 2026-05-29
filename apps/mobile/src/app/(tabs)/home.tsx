import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { theme } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { socketService } from '@/services/socket';

export default function HomeScreen() {
  const user = useAuthStore(state => state.user);
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    // Connect to WebSocket when arriving at Home
    socketService.connect();
    const socket = socketService.getSocket();

    if (socket) {
      // Listen for session creation
      socket.on('session:created', (session) => {
        setIsStarting(false);
        router.push(`/session/${session.id}` as any);
      });

      socket.on('error', (error) => {
        setIsStarting(false);
        console.error('Socket error:', error);
        alert(error.message || 'Error starting session');
      });
    }

    return () => {
      // Don't disconnect on unmount so the socket stays active when navigating to session
      if (socket) {
        socket.off('session:created');
        socket.off('error');
      }
    };
  }, [router]);

  const handleStartSession = () => {
    setIsStarting(true);
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('session:create', {
        // Mock guest ID for now. In real app, you select a friend.
        guestId: 'guest-123',
        mode: 'DISCOVERY'
      });
    } else {
      setIsStarting(false);
      alert('Socket not connected');
    }
  };

  const handleJoinSession = () => {
    if (!joinCode) return;
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('session:join', { sessionId: joinCode });
      router.push(`/session/${joinCode}` as any);
    }
  };

  return (
    <ScreenContainer padded={false} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Avatar name={user?.name || 'User'} size={42} />
          <View>
            <Text style={styles.welcomeText}>WELCOME BACK</Text>
            <Text style={styles.userName}>{user?.name?.split(' ')[0]}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Main CTA */}
        <View style={styles.primaryCard}>
          <Text style={styles.cardTag}>NEW SESSION</Text>
          <Text style={styles.cardTitle}>
            Swipe with <Text style={{ color: theme.colors.primary }}>a friend</Text> tonight.
          </Text>
          
          <Button 
            label="Start now" 
            onPress={handleStartSession} 
            isLoading={isStarting}
            style={{ marginTop: theme.spacing.md }}
          />
        </View>

        {/* Join with code */}
        <View style={styles.secondaryCard}>
          <Text style={styles.sectionTitle}>Join with code</Text>
          <View style={styles.joinRow}>
            <Input 
              label="" 
              placeholder="A1B2C3" 
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="characters"
              style={styles.joinInput}
            />
            <Button 
              label="Join" 
              variant="secondary"
              onPress={handleJoinSession}
              disabled={joinCode.length < 3}
            />
          </View>
        </View>

      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: theme.spacing.xl,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  welcomeText: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 10,
    color: theme.colors.textSubtle,
    letterSpacing: 1.5,
  },
  userName: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '800',
    fontSize: 18,
    color: theme.colors.text,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 100, // Space for bottom tab bar
  },
  primaryCard: {
    backgroundColor: 'rgba(163,230,53,0.1)', // Primary tint
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(163,230,53,0.25)',
    marginVertical: theme.spacing.md,
  },
  cardTag: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 10,
    color: theme.colors.primary,
    letterSpacing: 2,
    fontWeight: '700',
  },
  cardTitle: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '800',
    fontSize: 24,
    color: theme.colors.text,
    lineHeight: 28,
    marginTop: 6,
  },
  secondaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '700',
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  joinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  joinInput: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.mono,
    fontWeight: '700',
    letterSpacing: 3,
    textAlign: 'center',
    height: 56, // Match button height
    marginBottom: 0,
  }
});
