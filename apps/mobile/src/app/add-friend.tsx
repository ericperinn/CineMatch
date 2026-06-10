import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useUserById } from '@/services/queries/users.queries';
import {
  useAcceptFriendRequest,
  useSendFriendRequest,
  type UserSearchResult,
} from '@/services/queries/friends.queries';
import { extractApiError } from '@/services/queries/auth.queries';
import { success, tap, warn } from '@/lib/feedback';

export default function AddFriendScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  const { data: user, isLoading, isError } = useUserById(id);

  const { mutate: sendRequest, isPending: isSending } = useSendFriendRequest();
  const { mutate: acceptRequest, isPending: isAccepting } = useAcceptFriendRequest();
  const [error, setError] = useState<string | null>(null);
  const [sentLocally, setSentLocally] = useState(false);

  // Wait for the persisted auth to land so we don't bounce the user to login
  // for a millisecond before realizing they're already signed in.
  if (!hasHydrated) {
    return (
      <ScreenContainer padded style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  if (!token) {
    return (
      <Layout title="Sign in first" body="Log in to send a friend request.">
        <Button
          label="Go to login"
          onPress={() => router.replace('/(auth)/login')}
        />
      </Layout>
    );
  }

  if (!id) {
    return (
      <Layout title="Bad link" body="This invite link is missing a user id.">
        <Button
          label="Back to home"
          onPress={() => router.replace('/(tabs)/home')}
          variant="outline"
        />
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <ScreenContainer padded style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={styles.loadingText}>Looking up your friend…</Text>
      </ScreenContainer>
    );
  }

  if (isError || !user) {
    return (
      <Layout
        title="User not found"
        body="That invite link doesn't point to a CineMatch account."
      >
        <Button
          label="Back to home"
          onPress={() => router.replace('/(tabs)/home')}
          variant="outline"
        />
      </Layout>
    );
  }

  const handleSend = () => {
    tap();
    setError(null);
    sendRequest(user.id, {
      onSuccess: () => {
        success();
        setSentLocally(true);
      },
      onError: (err) => {
        warn();
        setError(extractApiError(err, 'Could not send the request'));
      },
    });
  };

  const handleAccept = () => {
    if (!user.friendshipId) return;
    tap();
    setError(null);
    acceptRequest(user.friendshipId, {
      onSuccess: () => {
        success();
        router.replace('/(tabs)/home');
      },
      onError: (err) => {
        warn();
        setError(extractApiError(err, 'Could not accept the request'));
      },
    });
  };

  return (
    <ScreenContainer padded style={styles.centered}>
      <Text style={styles.eyebrow}>FRIEND INVITE</Text>

      <Avatar
        name={user.name}
        size={96}
        ring
        ringColor={theme.colors.primary}
        imageUrl={user.avatarUrl ?? undefined}
      />

      <Text style={styles.name}>{user.name}</Text>

      <ActionBlock
        user={user}
        sentLocally={sentLocally}
        isSending={isSending}
        isAccepting={isAccepting}
        onSend={handleSend}
        onAccept={handleAccept}
        onHome={() => router.replace('/(tabs)/home')}
        onStartSession={() => router.replace('/(tabs)/home')}
      />

      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Button
        label="Cancel"
        variant="ghost"
        onPress={() => router.replace('/(tabs)/home')}
        style={{ marginTop: theme.spacing.md }}
      />
    </ScreenContainer>
  );
}

function ActionBlock({
  user,
  sentLocally,
  isSending,
  isAccepting,
  onSend,
  onAccept,
  onHome,
  onStartSession,
}: {
  user: UserSearchResult;
  sentLocally: boolean;
  isSending: boolean;
  isAccepting: boolean;
  onSend: () => void;
  onAccept: () => void;
  onHome: () => void;
  onStartSession: () => void;
}) {
  // After a successful Send we don't have a fresh server fetch — flip the
  // local state so the user sees "Request sent" instead of "Send request".
  if (sentLocally || user.relationship === 'pending_sent') {
    return (
      <>
        <StatusChip
          icon="time-outline"
          color={theme.colors.textMuted}
          label="Request sent — waiting on them"
        />
        <Button
          label="Back to home"
          onPress={onHome}
          variant="secondary"
          leftIcon={<Ionicons name="arrow-back" size={18} color={theme.colors.text} />}
        />
      </>
    );
  }

  if (user.relationship === 'pending_received') {
    return (
      <>
        <StatusChip
          icon="mail-open-outline"
          color={theme.colors.primary}
          label={`${user.name} sent you a friend request`}
        />
        <Button
          label="Accept"
          onPress={onAccept}
          isLoading={isAccepting}
          leftIcon={<Ionicons name="checkmark" size={18} color={theme.colors.primaryDark} />}
        />
      </>
    );
  }

  if (user.relationship === 'friends') {
    return (
      <>
        <StatusChip
          icon="people"
          color={theme.colors.primary}
          label="You're already friends"
        />
        <Button
          label="Start a session"
          onPress={onStartSession}
          leftIcon={<Ionicons name="play" size={18} color={theme.colors.primaryDark} />}
        />
      </>
    );
  }

  return (
    <Button
      label="Send friend request"
      onPress={onSend}
      isLoading={isSending}
      leftIcon={<Ionicons name="person-add" size={18} color={theme.colors.primaryDark} />}
    />
  );
}

function Layout({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <ScreenContainer padded style={styles.centered}>
      <Text style={styles.eyebrow}>FRIEND INVITE</Text>
      <View style={styles.fallbackMark}>
        <Ionicons name="alert" size={28} color={theme.colors.textMuted} />
      </View>
      <Text style={styles.name}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <View style={{ height: theme.spacing.md }} />
      {children}
    </ScreenContainer>
  );
}

function StatusChip({
  icon,
  color,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  label: string;
}) {
  return (
    <View style={styles.statusChip}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  eyebrow: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 10,
    color: theme.colors.primary,
    letterSpacing: 2,
    fontWeight: '800',
    marginBottom: theme.spacing.sm,
  },
  name: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '900',
    fontSize: 26,
    color: theme.colors.text,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  body: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 15,
    color: theme.colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 20,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusText: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  loadingText: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
  fallbackMark: {
    width: 64,
    height: 64,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.errorSoft,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  errorText: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 13,
    color: theme.colors.error,
    flex: 1,
  },
});
