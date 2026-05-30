import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Avatar } from '@/components/ui/Avatar';
import { theme } from '@/constants/theme';
import {
  useSessionHistory,
  type SessionHistoryEntry,
  type SessionHistoryMovie,
} from '@/services/queries/sessions.queries';

const POSTER_BLURHASH = 'L6Pj0^jE.AyE_3t7t7R**0o#DgR4';

function posterUri(path: string | null): string | null {
  if (!path) return null;
  return path.startsWith('http') ? path : `https://image.tmdb.org/t/p/w342${path}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function HistoryScreen() {
  const { data, isLoading, refetch, isRefetching } = useSessionHistory();

  return (
    <ScreenContainer padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>YOUR PAST SESSIONS</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <SessionRow entry={item} />}
          ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No sessions yet</Text>
              <Text style={styles.emptyBody}>
                Start swiping with a friend to fill your history.
              </Text>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
}

function SessionRow({ entry }: { entry: SessionHistoryEntry }) {
  const completed = entry.status === 'COMPLETED';
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Avatar name={entry.partner.name} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={styles.partnerName}>{entry.partner.name}</Text>
          <Text style={styles.meta}>
            {entry.role === 'host' ? 'You invited' : 'Invited you'} ·{' '}
            {formatDate(entry.finishedAt ?? entry.createdAt)}
          </Text>
        </View>
        <Text style={[styles.badge, completed ? styles.badgeOk : styles.badgeMuted]}>
          {completed ? 'COMPLETED' : 'ABANDONED'}
        </Text>
      </View>

      {completed && entry.podium.length > 0 ? (
        <View style={styles.posterStrip}>
          {entry.podium.slice(0, 3).map((movie) => (
            <PosterThumb key={movie.id} movie={movie} />
          ))}
        </View>
      ) : completed ? (
        <Text style={styles.metaItalic}>Completed without a podium.</Text>
      ) : (
        <Text style={styles.metaItalic}>You ended this session early.</Text>
      )}
    </View>
  );
}

function PosterThumb({ movie }: { movie: SessionHistoryMovie }) {
  const uri = posterUri(movie.posterPath);
  return (
    <View style={styles.thumb}>
      {uri ? (
        <Image
          source={{ uri }}
          style={styles.thumbImg}
          contentFit="cover"
          transition={200}
          placeholder={{ blurhash: POSTER_BLURHASH }}
          placeholderContentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[styles.thumbImg, styles.thumbPlaceholder]} />
      )}
      <Text style={styles.thumbTitle} numberOfLines={2}>{movie.title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  title: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '800',
    fontSize: 28,
    color: theme.colors.text,
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 10,
    color: theme.colors.textSubtle,
    letterSpacing: 1.5,
    marginTop: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 120,
    flexGrow: 1,
  },
  row: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  partnerName: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '700',
    fontSize: 16,
    color: theme.colors.text,
  },
  meta: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 10,
    color: theme.colors.textSubtle,
    letterSpacing: 1.2,
    marginTop: 2,
  },
  metaItalic: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 13,
    fontStyle: 'italic',
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
  badge: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.sm,
    overflow: 'hidden',
  },
  badgeOk: {
    color: theme.colors.primaryDark,
    backgroundColor: theme.colors.primary,
  },
  badgeMuted: {
    color: theme.colors.textMuted,
    backgroundColor: theme.colors.surfaceHighlight,
  },
  posterStrip: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  thumb: {
    flex: 1,
    maxWidth: '33%',
    gap: 6,
  },
  thumbImg: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surfaceHighlight,
  },
  thumbPlaceholder: {
    backgroundColor: theme.colors.surfaceHighlight,
  },
  thumbTitle: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: theme.spacing.xxl * 2,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyTitle: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '800',
    fontSize: 20,
    color: theme.colors.text,
  },
  emptyBody: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
});
