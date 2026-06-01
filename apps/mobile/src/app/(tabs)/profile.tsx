import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfileStatus, useSyncProfile } from '@/services/queries/profile.queries';
import { socketService } from '@/services/socket';
import { copyToClipboard, success, tap } from '@/lib/feedback';
import { EditProfileSheet } from '@/components/EditProfileSheet';

const SYNCING_STATES = ['waiting', 'active', 'delayed'];

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const [copiedId, setCopiedId] = useState(false);
  const [editing, setEditing] = useState(false);

  const copyUserId = async () => {
    if (!user?.id) return;
    await copyToClipboard(user.id);
    await success();
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1500);
  };

  const hasLetterboxd = !!user?.letterboxdUsername;
  const { data: status } = useProfileStatus(hasLetterboxd);
  const { mutate: sync, isPending: isSyncing } = useSyncProfile();

  const syncState = status?.currentSync?.state;
  const isJobRunning = !!syncState && SYNCING_STATES.includes(syncState);

  const handleLogout = () => {
    tap();
    socketService.disconnect();
    logout();
    router.replace('/(auth)/login');
  };

  const handleSync = () => {
    tap();
    sync();
  };

  const lastSynced = status?.lastSyncedAt
    ? new Date(status.lastSyncedAt).toLocaleDateString()
    : 'Never';

  return (
    <ScreenContainer padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Avatar name={user?.name || 'User'} size={80} ring ringColor={theme.colors.primary} />
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <Button
            label="Edit profile"
            variant="tonal"
            onPress={() => {
              tap();
              setEditing(true);
            }}
            leftIcon={
              <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
            }
            style={styles.editBtn}
          />
        </View>

        <View style={styles.card}>
          <SectionHeader icon="people-outline" label="FRIEND CODE" />
          <View style={styles.codeToken}>
            <Text style={styles.codeValue} selectable numberOfLines={1}>
              {user?.id ?? ''}
            </Text>
          </View>
          <Text style={styles.meta}>
            Friends can paste this to add you — or just search your email.
          </Text>
          <Button
            label={copiedId ? 'Copied!' : 'Copy code'}
            variant={copiedId ? 'secondary' : 'primary'}
            onPress={copyUserId}
            leftIcon={
              <Ionicons
                name={copiedId ? 'checkmark' : 'copy-outline'}
                size={18}
                color={copiedId ? theme.colors.text : theme.colors.primaryDark}
              />
            }
            style={{ marginTop: theme.spacing.md }}
          />
        </View>

        <View style={styles.card}>
          <SectionHeader icon="film-outline" label="LETTERBOXD" />
          {hasLetterboxd ? (
            <>
              <Text style={styles.cardValue}>@{user?.letterboxdUsername}</Text>
              <View style={styles.statsRow}>
                <Stat label="TASTE" value={status?.tasteCount ?? 0} />
                <Stat label="WATCHLIST" value={status?.watchlistCount ?? 0} />
                <Stat label="FAVORITES" value={status?.tasteByFavorites ?? 0} />
              </View>
              <Text style={styles.meta}>Last synced · {lastSynced}</Text>
              {isJobRunning && (
                <Text style={[styles.meta, { color: theme.colors.primary, marginTop: 4 }]}>
                  Sync in progress ({syncState})…
                </Text>
              )}
              <Button
                label={isJobRunning ? 'Syncing…' : 'Sync now'}
                variant="secondary"
                onPress={handleSync}
                isLoading={isSyncing}
                disabled={isJobRunning}
                style={{ marginTop: theme.spacing.md }}
              />
            </>
          ) : (
            <Text style={styles.meta}>
              No Letterboxd account connected. Add your username on sign-up to import
              your taste.
            </Text>
          )}
        </View>

        <Button
          label="Log out"
          variant="outline"
          onPress={handleLogout}
          leftIcon={
            <Ionicons name="log-out-outline" size={18} color={theme.colors.text} />
          }
        />
      </ScrollView>

      <EditProfileSheet visible={editing} onClose={() => setEditing(false)} />
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
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={14} color={theme.colors.primary} />
      <Text style={styles.cardTag}>{label}</Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
    paddingBottom: 140,
    gap: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  name: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '800',
    fontSize: 24,
    color: theme.colors.text,
    letterSpacing: -0.5,
    marginTop: theme.spacing.sm,
  },
  email: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  editBtn: {
    marginTop: theme.spacing.md,
    height: 44,
    paddingHorizontal: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionHeader: {
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
    fontWeight: '700',
  },
  cardValue: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '700',
    fontSize: 18,
    color: theme.colors.text,
  },
  codeToken: {
    backgroundColor: theme.colors.surfaceHighlight,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  codeValue: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 13,
    color: theme.colors.text,
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.xl,
    marginTop: theme.spacing.md,
  },
  stat: {
    alignItems: 'flex-start',
  },
  statValue: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '800',
    fontSize: 22,
    color: theme.colors.text,
  },
  statLabel: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 9,
    color: theme.colors.textSubtle,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  meta: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
    lineHeight: 18,
  },
});
