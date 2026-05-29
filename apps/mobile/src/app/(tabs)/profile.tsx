import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfileStatus, useSyncProfile } from '@/services/queries/profile.queries';

const SYNCING_STATES = ['waiting', 'active', 'delayed'];

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const hasLetterboxd = !!user?.letterboxdUsername;
  const { data: status } = useProfileStatus(hasLetterboxd);
  const { mutate: sync, isPending: isSyncing } = useSyncProfile();

  const syncState = status?.currentSync?.state;
  const isJobRunning = !!syncState && SYNCING_STATES.includes(syncState);

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  const lastSynced = status?.lastSyncedAt
    ? new Date(status.lastSyncedAt).toLocaleDateString()
    : 'Never';

  return (
    <ScreenContainer padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Avatar name={user?.name || 'User'} size={72} ring ringColor={theme.colors.primary} />
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTag}>LETTERBOXD</Text>
          {hasLetterboxd ? (
            <>
              <Text style={styles.cardValue}>@{user?.letterboxdUsername}</Text>
              <View style={styles.statsRow}>
                <Stat label="TASTE" value={status?.tasteCount ?? 0} />
                <Stat label="WATCHLIST" value={status?.watchlistCount ?? 0} />
                <Stat label="FAVORITES" value={status?.tasteByFavorites ?? 0} />
              </View>
              <Text style={styles.meta}>Last synced: {lastSynced}</Text>
              {isJobRunning && (
                <Text style={[styles.meta, { color: theme.colors.primary }]}>
                  Sync in progress ({syncState})…
                </Text>
              )}
              <Button
                label={isJobRunning ? 'Syncing…' : 'Sync now'}
                variant="secondary"
                onPress={() => sync()}
                isLoading={isSyncing}
                disabled={isJobRunning}
                style={{ marginTop: theme.spacing.md }}
              />
            </>
          ) : (
            <Text style={styles.meta}>
              No Letterboxd account connected. Add your username on sign-up to import your taste.
            </Text>
          )}
        </View>

        <Button label="Log out" variant="outline" onPress={handleLogout} />
      </ScrollView>
    </ScreenContainer>
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
    paddingBottom: 120,
    gap: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  name: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '800',
    fontSize: 22,
    color: theme.colors.text,
  },
  email: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    marginTop: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  stat: {
    alignItems: 'flex-start',
  },
  statValue: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '800',
    fontSize: 20,
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
  },
});
