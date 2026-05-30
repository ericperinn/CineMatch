import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { theme } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import {
  useAcceptFriendRequest,
  useFriends,
  usePendingFriends,
  useSendFriendRequest,
  type FriendshipRow,
} from '@/services/queries/friends.queries';
import { extractApiError } from '@/services/queries/auth.queries';
import { socketService } from '@/services/socket';
import { success, tap, warn } from '@/lib/feedback';

interface CreatedSession {
  id: string;
}

interface SessionInvite {
  sessionId: string;
  mode: string;
  host: { id: string; name: string; avatarUrl: string | null };
}

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const { data: friends, isLoading: friendsLoading } = useFriends();
  const { data: pendingFriends } = usePendingFriends();
  const { mutate: sendRequest, isPending: isSending } = useSendFriendRequest();
  const { mutate: acceptRequest } = useAcceptFriendRequest();

  const [joinCode, setJoinCode] = useState('');
  const [pendingFriendId, setPendingFriendId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [friendIdInput, setFriendIdInput] = useState('');
  const [friendStatus, setFriendStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [invites, setInvites] = useState<SessionInvite[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['friends'] }),
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    socketService.connect();

    const offCreated = socketService.on('session:created', (session: CreatedSession) => {
      setPendingFriendId(null);
      router.push(`/session/${session.id}?role=host`);
    });
    const offError = socketService.on('error', (err: { message?: string }) => {
      setPendingFriendId(null);
      setError(err?.message ?? 'Something went wrong');
    });
    const offInvite = socketService.on('session:invite', (invite: SessionInvite) => {
      setInvites((prev) =>
        prev.some((i) => i.sessionId === invite.sessionId) ? prev : [invite, ...prev]
      );
    });

    return () => {
      offCreated();
      offError();
      offInvite();
    };
  }, [router]);

  const acceptInvite = (invite: SessionInvite) => {
    tap();
    setInvites((prev) => prev.filter((i) => i.sessionId !== invite.sessionId));
    router.push(`/session/${invite.sessionId}?role=guest`);
  };

  const dismissInvite = (sessionId: string) => {
    setInvites((prev) => prev.filter((i) => i.sessionId !== sessionId));
  };

  const startWith = (friend: FriendshipRow['friend']) => {
    setError(null);
    tap();
    setPendingFriendId(friend.id);
    socketService.emit('session:create', { guestId: friend.id, mode: 'DISCOVERY' });
  };

  const joinByCode = () => {
    const code = joinCode.trim();
    if (!code) return;
    tap();
    setError(null);
    router.push(`/session/${code}?role=guest`);
  };

  const handleSendRequest = () => {
    const id = friendIdInput.trim();
    if (!id) return;
    tap();
    setFriendStatus(null);
    sendRequest(id, {
      onSuccess: () => {
        success();
        setFriendStatus({ kind: 'ok', text: 'Friend request sent' });
        setFriendIdInput('');
      },
      onError: (err) => {
        warn();
        setFriendStatus({ kind: 'err', text: extractApiError(err, 'Could not send request') });
      },
    });
  };

  const handleAccept = (id: string) => {
    tap();
    setAcceptingId(id);
    setFriendStatus(null);
    acceptRequest(id, {
      onSuccess: () => success(),
      onError: (err) => {
        warn();
        setFriendStatus({ kind: 'err', text: extractApiError(err, 'Could not accept request') });
      },
      onSettled: () => setAcceptingId(null),
    });
  };

  return (
    <ScreenContainer padded={false} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Avatar name={user?.name || 'User'} size={42} />
          <View>
            <Text style={styles.welcomeText}>WELCOME BACK</Text>
            <Text style={styles.userName}>{user?.name?.split(' ')[0]}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {invites.map((invite) => (
          <View key={invite.sessionId} style={styles.inviteCard}>
            <Text style={styles.cardTag}>INCOMING INVITE</Text>
            <Text style={styles.inviteTitle}>
              <Text style={{ color: theme.colors.primary }}>{invite.host.name}</Text>{' '}
              wants to swipe with you.
            </Text>
            <View style={styles.inviteActions}>
              <Button label="Join" onPress={() => acceptInvite(invite)} />
              <Button
                label="Dismiss"
                variant="ghost"
                onPress={() => dismissInvite(invite.sessionId)}
              />
            </View>
          </View>
        ))}

        <View style={styles.primaryCard}>
          <Text style={styles.cardTag}>NEW SESSION</Text>
          <Text style={styles.cardTitle}>
            Swipe with <Text style={{ color: theme.colors.primary }}>a friend</Text> tonight.
          </Text>

          {friendsLoading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: theme.spacing.lg }} />
          ) : !friends || friends.length === 0 ? (
            <Text style={styles.emptyText}>
              No friends yet. Ask someone to register so you can match together.
            </Text>
          ) : (
            <View style={styles.friendList}>
              {friends.map((row) => {
                const isPending = pendingFriendId === row.friend.id;
                return (
                  <TouchableOpacity
                    key={row.id}
                    style={[styles.friendRow, isPending && styles.friendRowDisabled]}
                    onPress={() => !pendingFriendId && startWith(row.friend)}
                    activeOpacity={0.7}
                    disabled={!!pendingFriendId}
                  >
                    <Avatar name={row.friend.name} size={40} />
                    <Text style={styles.friendName}>{row.friend.name}</Text>
                    {isPending ? (
                      <ActivityIndicator color={theme.colors.primary} />
                    ) : (
                      <Text style={styles.friendCta}>Start →</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {pendingFriends && pendingFriends.length > 0 && (
          <View style={styles.secondaryCard}>
            <Text style={styles.sectionTitle}>Incoming friend requests</Text>
            {pendingFriends.map((row) => (
              <View key={row.id} style={styles.pendingRow}>
                <Avatar name={row.user.name} size={36} />
                <Text style={styles.friendName}>{row.user.name}</Text>
                <Button
                  label={acceptingId === row.id ? 'Accepting…' : 'Accept'}
                  variant="secondary"
                  onPress={() => handleAccept(row.id)}
                  disabled={acceptingId === row.id}
                />
              </View>
            ))}
          </View>
        )}

        <View style={styles.secondaryCard}>
          <Text style={styles.sectionTitle}>Add a friend</Text>
          <Input
            label=""
            placeholder="Paste friend's user ID"
            value={friendIdInput}
            onChangeText={setFriendIdInput}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.idInput}
          />
          <Button
            label="Send request"
            variant="secondary"
            onPress={handleSendRequest}
            isLoading={isSending}
            disabled={friendIdInput.trim().length < 6 || isSending}
          />
        </View>

        {friendStatus && (
          <Text
            style={[
              styles.statusText,
              { color: friendStatus.kind === 'ok' ? theme.colors.success : theme.colors.error },
            ]}
          >
            {friendStatus.text}
          </Text>
        )}

        <View style={styles.secondaryCard}>
          <Text style={styles.sectionTitle}>Join with code</Text>
          <View style={styles.joinRow}>
            <Input
              label=""
              placeholder="SESSION-ID"
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="none"
              style={styles.joinInput}
            />
            <Button
              label="Join"
              variant="secondary"
              onPress={joinByCode}
              disabled={joinCode.trim().length < 3}
            />
          </View>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
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
    paddingBottom: 120,
  },
  primaryCard: {
    backgroundColor: 'rgba(163,230,53,0.1)',
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(163,230,53,0.25)',
    marginVertical: theme.spacing.md,
  },
  inviteCard: {
    backgroundColor: 'rgba(163,230,53,0.14)',
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  inviteTitle: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '800',
    fontSize: 20,
    color: theme.colors.text,
    marginTop: 6,
    lineHeight: 24,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
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
  friendList: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.lg,
    backgroundColor: 'rgba(15,23,42,0.5)',
  },
  friendRowDisabled: {
    opacity: 0.5,
  },
  friendName: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '700',
    fontSize: 15,
    color: theme.colors.text,
  },
  friendCta: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 11,
    color: theme.colors.primary,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  emptyText: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
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
    fontWeight: '600',
    letterSpacing: 1.5,
    height: 56,
    marginBottom: 0,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  idInput: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 12,
  },
  statusText: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 13,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  error: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 13,
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
});
