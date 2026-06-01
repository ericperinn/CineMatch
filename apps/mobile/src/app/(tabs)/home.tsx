import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { theme } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import {
  useAcceptFriendRequest,
  useCancelFriendship,
  useFriends,
  usePendingFriends,
  useSendFriendRequest,
  useUserSearch,
  type FriendshipRow,
  type UserSearchResult,
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
  const { mutate: sendRequest } = useSendFriendRequest();
  const { mutate: acceptRequest } = useAcceptFriendRequest();
  const { mutate: cancelFriendship } = useCancelFriendship();

  const [sessionMode, setSessionMode] = useState<'DISCOVERY' | 'WATCHLIST'>('DISCOVERY');
  const [joinCode, setJoinCode] = useState('');
  const [pendingFriendId, setPendingFriendId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [friendStatus, setFriendStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [invites, setInvites] = useState<SessionInvite[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: searchResults, isFetching: isSearching } = useUserSearch(debouncedQuery);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['friends'] });
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
    tap();
    setInvites((prev) => prev.filter((i) => i.sessionId !== sessionId));
  };

  const startWith = (friend: FriendshipRow['friend']) => {
    setError(null);
    tap();
    setPendingFriendId(friend.id);
    socketService.emit('session:create', { guestId: friend.id, mode: sessionMode });
  };

  const joinByCode = () => {
    const code = joinCode.trim();
    if (!code) return;
    tap();
    setError(null);
    router.push(`/session/${code}?role=guest`);
  };

  const handleSendRequest = (targetId: string) => {
    tap();
    setSendingId(targetId);
    setFriendStatus(null);
    sendRequest(targetId, {
      onSuccess: () => {
        success();
        setFriendStatus({ kind: 'ok', text: 'Friend request sent' });
      },
      onError: (err) => {
        warn();
        setFriendStatus({ kind: 'err', text: extractApiError(err, 'Could not send request') });
      },
      onSettled: () => setSendingId(null),
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

  const handleCancel = (friendshipId: string) => {
    tap();
    setCancelingId(friendshipId);
    setFriendStatus(null);
    cancelFriendship(friendshipId, {
      onError: (err) => {
        warn();
        setFriendStatus({ kind: 'err', text: extractApiError(err, 'Could not cancel') });
      },
      onSettled: () => setCancelingId(null),
    });
  };

  return (
    <ScreenContainer padded={false} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Avatar name={user?.name || 'User'} size={44} />
          <View>
            <Text style={styles.welcomeText}>WELCOME BACK</Text>
            <Text style={styles.userName}>{user?.name?.split(' ')[0] ?? 'there'}</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Incoming live invites — most urgent */}
        {invites.map((invite) => (
          <View key={invite.sessionId} style={styles.inviteCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="paper-plane" size={14} color={theme.colors.primary} />
              <Text style={styles.cardTag}>INCOMING INVITE</Text>
            </View>
            <View style={styles.inviteBody}>
              <Avatar name={invite.host.name} size={48} ring ringColor={theme.colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.inviteTitle} numberOfLines={2}>
                  <Text style={{ color: theme.colors.primary }}>{invite.host.name}</Text>{' '}
                  wants to swipe with you.
                </Text>
              </View>
            </View>
            <View style={styles.inviteActions}>
              <Button
                label="Join"
                onPress={() => acceptInvite(invite)}
                style={{ flex: 1 }}
                leftIcon={<Ionicons name="play" size={18} color={theme.colors.primaryDark} />}
              />
              <Button
                label="Dismiss"
                variant="ghost"
                onPress={() => dismissInvite(invite.sessionId)}
              />
            </View>
          </View>
        ))}

        {/* Pending friend requests */}
        {pendingFriends && pendingFriends.length > 0 && (
          <View style={styles.card}>
            <SectionHeader icon="person-add" label="FRIEND REQUESTS" />
            <View style={{ gap: theme.spacing.sm }}>
              {pendingFriends.map((row) => {
                const busy = acceptingId === row.id || cancelingId === row.id;
                return (
                  <View key={row.id} style={styles.pendingRow}>
                    <Avatar name={row.user.name} size={40} />
                    <Text style={styles.friendName} numberOfLines={1}>{row.user.name}</Text>
                    <TouchableOpacity
                      onPress={() => handleCancel(row.id)}
                      disabled={busy}
                      hitSlop={10}
                      style={styles.iconActionGhost}
                      accessibilityLabel="Decline"
                    >
                      <Ionicons name="close" size={20} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleAccept(row.id)}
                      disabled={busy}
                      hitSlop={10}
                      style={styles.iconActionPrimary}
                      accessibilityLabel="Accept"
                    >
                      {acceptingId === row.id ? (
                        <ActivityIndicator size="small" color={theme.colors.primaryDark} />
                      ) : (
                        <Ionicons name="checkmark" size={20} color={theme.colors.primaryDark} />
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* NEW SESSION hero */}
        <View style={styles.heroCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="sparkles" size={14} color={theme.colors.primary} />
            <Text style={styles.cardTag}>NEW SESSION</Text>
          </View>
          <Text style={styles.heroTitle}>
            Swipe with <Text style={{ color: theme.colors.primary }}>a friend</Text> tonight.
          </Text>

          <View style={styles.modeToggle}>
            <ModePill
              icon="compass"
              label="Discovery"
              active={sessionMode === 'DISCOVERY'}
              onPress={() => {
                tap();
                setSessionMode('DISCOVERY');
              }}
            />
            <ModePill
              icon="bookmark"
              label="Watchlist"
              active={sessionMode === 'WATCHLIST'}
              onPress={() => {
                tap();
                setSessionMode('WATCHLIST');
              }}
            />
          </View>

          {friendsLoading ? (
            <View style={styles.friendStripWrap}>
              <View style={styles.friendStrip}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={styles.friendChip}>
                    <Skeleton width={64} height={64} borderRadius={32} />
                    <Skeleton width={52} height={10} borderRadius={4} />
                  </View>
                ))}
              </View>
            </View>
          ) : !friends || friends.length === 0 ? (
            <View style={styles.emptyFriends}>
              <View style={styles.emptyMark}>
                <Ionicons name="people-outline" size={28} color={theme.colors.textSubtle} />
              </View>
              <Text style={styles.emptyTitle}>No friends yet</Text>
              <Text style={styles.emptyBody}>
                Add someone below to start matching tonight.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.friendStrip}
              style={styles.friendStripWrap}
            >
              {friends.map((row) => {
                const isPending = pendingFriendId === row.friend.id;
                const disabled = !!pendingFriendId && !isPending;
                return (
                  <TouchableOpacity
                    key={row.id}
                    onPress={() => !pendingFriendId && startWith(row.friend)}
                    activeOpacity={0.7}
                    disabled={!!pendingFriendId}
                    style={[styles.friendChip, disabled && { opacity: 0.4 }]}
                  >
                    <View style={styles.friendChipAvatar}>
                      <Avatar
                        name={row.friend.name}
                        size={64}
                        ring
                        ringColor={isPending ? theme.colors.primary : theme.colors.border}
                      />
                      {isPending && (
                        <View style={styles.friendChipLoading}>
                          <ActivityIndicator color={theme.colors.primary} />
                        </View>
                      )}
                    </View>
                    <Text style={styles.friendChipName} numberOfLines={1}>
                      {row.friend.name.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Add a friend */}
        <View style={styles.card}>
          <SectionHeader icon="search" label="ADD A FRIEND" />
          <Input
            label=""
            placeholder="Search by email or name"
            value={searchInput}
            onChangeText={setSearchInput}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          {debouncedQuery.length >= 2 && isSearching && (
            <ActivityIndicator
              color={theme.colors.primary}
              style={{ marginTop: theme.spacing.sm }}
            />
          )}
          {searchResults?.map((result) => (
            <SearchResultRow
              key={result.id}
              result={result}
              sending={sendingId === result.id}
              canceling={!!result.friendshipId && cancelingId === result.friendshipId}
              accepting={!!result.friendshipId && acceptingId === result.friendshipId}
              onSend={() => handleSendRequest(result.id)}
              onCancel={() => result.friendshipId && handleCancel(result.friendshipId)}
              onAccept={() => result.friendshipId && handleAccept(result.friendshipId)}
            />
          ))}
          {debouncedQuery.length >= 2 &&
            !isSearching &&
            searchResults &&
            searchResults.length === 0 && (
              <View style={styles.emptySearch}>
                <Ionicons name="search-outline" size={20} color={theme.colors.textSubtle} />
                <Text style={styles.emptySearchText}>
                  No users match "{debouncedQuery}".
                </Text>
              </View>
            )}
          {friendStatus && (
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    friendStatus.kind === 'ok' ? theme.colors.success : theme.colors.error,
                },
              ]}
            >
              {friendStatus.text}
            </Text>
          )}
        </View>

        {/* Join with code */}
        <View style={styles.card}>
          <SectionHeader icon="link" label="JOIN WITH CODE" />
          <View style={styles.joinRow}>
            <View style={{ flex: 1 }}>
              <Input
                label=""
                placeholder="Paste session ID"
                value={joinCode}
                onChangeText={setJoinCode}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.joinInput}
              />
            </View>
            <Button
              label="Join"
              variant="secondary"
              onPress={joinByCode}
              disabled={joinCode.trim().length < 3}
              leftIcon={<Ionicons name="enter-outline" size={18} color={theme.colors.text} />}
            />
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={theme.colors.error} />
            <Text style={styles.error}>{error}</Text>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function SectionHeader({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
}) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Ionicons name={icon} size={14} color={theme.colors.primary} />
      <Text style={styles.cardTag}>{label}</Text>
    </View>
  );
}

function ModePill({
  icon,
  label,
  active,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.modePill, active && styles.modePillActive]}
    >
      <Ionicons
        name={icon}
        size={14}
        color={active ? theme.colors.primaryDark : theme.colors.textMuted}
      />
      <Text style={[styles.modePillText, active && styles.modePillTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SearchResultRow({
  result,
  sending,
  canceling,
  accepting,
  onSend,
  onCancel,
  onAccept,
}: {
  result: UserSearchResult;
  sending: boolean;
  canceling: boolean;
  accepting: boolean;
  onSend: () => void;
  onCancel: () => void;
  onAccept: () => void;
}) {
  const renderAction = () => {
    switch (result.relationship) {
      case 'friends':
        return (
          <View style={styles.statePillRow}>
            <Ionicons name="checkmark-circle" size={14} color={theme.colors.primary} />
            <Text style={styles.statePill}>Friends</Text>
          </View>
        );
      case 'pending_sent':
        return (
          <Button
            label={canceling ? '…' : 'Cancel'}
            variant="ghost"
            onPress={onCancel}
            disabled={canceling}
          />
        );
      case 'pending_received':
        return (
          <Button
            label={accepting ? '…' : 'Accept'}
            variant="primary"
            onPress={onAccept}
            disabled={accepting}
          />
        );
      default:
        return (
          <Button
            label={sending ? '…' : 'Add'}
            variant="secondary"
            onPress={onSend}
            disabled={sending}
            leftIcon={<Ionicons name="person-add" size={16} color={theme.colors.text} />}
          />
        );
    }
  };

  return (
    <View style={styles.searchRow}>
      <Avatar name={result.name} size={36} />
      <Text style={styles.friendName} numberOfLines={1}>{result.name}</Text>
      {renderAction()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: theme.spacing.xl,
  },

  // Header
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
    letterSpacing: 1.8,
  },
  userName: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '800',
    fontSize: 20,
    color: theme.colors.text,
    letterSpacing: -0.3,
    marginTop: 2,
  },

  // ScrollView content
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 140,
    gap: theme.spacing.md,
  },

  // Section header pattern
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: theme.spacing.md,
  },
  cardTag: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 10,
    color: theme.colors.primary,
    letterSpacing: 2,
    fontWeight: '800',
  },

  // Generic surface card
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  // Hero (NEW SESSION) card
  heroCard: {
    backgroundColor: 'rgba(163,230,53,0.08)',
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(163,230,53,0.22)',
  },
  heroTitle: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '900',
    fontSize: 26,
    color: theme.colors.text,
    lineHeight: 30,
    letterSpacing: -0.5,
    marginBottom: theme.spacing.md,
  },

  // Discovery / Watchlist segmented control
  modeToggle: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(15,23,42,0.55)',
    borderRadius: theme.radii.full,
    padding: 4,
    marginBottom: theme.spacing.md,
    alignSelf: 'flex-start',
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radii.full,
  },
  modePillActive: {
    backgroundColor: theme.colors.primary,
  },
  modePillText: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 0.3,
  },
  modePillTextActive: {
    color: theme.colors.primaryDark,
  },

  // Friend chips
  friendStripWrap: {
    marginHorizontal: -theme.spacing.lg,
  },
  friendStrip: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  friendChip: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    width: 76,
  },
  friendChipAvatar: {
    position: 'relative',
  },
  friendChipLoading: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendChipName: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Invite (urgent) card — full primary border
  inviteCard: {
    backgroundColor: 'rgba(163,230,53,0.14)',
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  inviteBody: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  inviteTitle: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '800',
    fontSize: 18,
    color: theme.colors.text,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },

  // Pending requests
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  iconActionGhost: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceHighlight,
  },
  iconActionPrimary: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },

  // Friend name shared
  friendName: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '700',
    fontSize: 15,
    color: theme.colors.text,
  },

  // Empty states
  emptyFriends: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    gap: 6,
  },
  emptyMark: {
    width: 56,
    height: 56,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  emptyTitle: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '800',
    fontSize: 16,
    color: theme.colors.text,
  },
  emptyBody: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    maxWidth: 240,
  },

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  emptySearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.sm,
    justifyContent: 'center',
  },
  emptySearchText: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  statePillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
  },
  statePill: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 11,
    color: theme.colors.primary,
    letterSpacing: 1.2,
    fontWeight: '700',
  },

  // Join with code
  joinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  joinInput: {
    fontFamily: theme.typography.fontFamily.mono,
    fontWeight: '600',
    letterSpacing: 0.5,
    height: 56,
    marginBottom: 0,
  },

  // Status text after actions
  statusText: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 13,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },

  // Inline error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
  },
  error: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 13,
    color: theme.colors.error,
  },
});
