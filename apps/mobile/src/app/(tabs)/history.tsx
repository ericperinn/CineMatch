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
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
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
        <View style={[styles.listContent, { paddingTop: theme.spacing.md, gap: theme.spacing.md }]}>
          <SessionRowSkeleton />
          <SessionRowSkeleton />
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
          ListEmptyComponent={<EmptyState />}
        />
      )}
    </ScreenContainer>
  );
}

function SessionRowSkeleton() {
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Skeleton width={44} height={44} borderRadius={22} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={10} />
        </View>
        <Skeleton width={70} height={22} borderRadius={11} />
      </View>
      <View style={styles.posterStrip}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.thumb}>
            <Skeleton width="100%" height={120} borderRadius={theme.radii.md} />
            <Skeleton width="80%" height={10} />
            <Skeleton width="40%" height={9} />
          </View>
        ))}
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyMark}>
        <Ionicons name="film-outline" size={32} color={theme.colors.textSubtle} />
      </View>
      <Text style={styles.emptyTitle}>No sessions yet</Text>
      <Text style={styles.emptyBody}>
        Start swiping with a friend on the Home tab — your podiums will land here.
      </Text>
    </View>
  );
}

function SessionRow({ entry }: { entry: SessionHistoryEntry }) {
  const completed = entry.status === 'COMPLETED';
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Avatar name={entry.partner.name} size={44} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.partnerName} numberOfLines={1}>{entry.partner.name}</Text>
          <View style={styles.metaRow}>
            <Ionicons
              name={entry.role === 'host' ? 'paper-plane' : 'mail-open-outline'}
              size={11}
              color={theme.colors.textSubtle}
            />
            <Text style={styles.meta}>
              {entry.role === 'host' ? 'You invited' : 'Invited you'} ·{' '}
              {formatDate(entry.finishedAt ?? entry.createdAt)}
            </Text>
          </View>
        </View>
        <StatusBadge completed={completed} mode={entry.mode} />
      </View>

      {completed && entry.podium.length > 0 ? (
        <View style={styles.posterStrip}>
          {entry.podium.slice(0, 3).map((movie, i) => (
            <PosterThumb key={movie.id} movie={movie} rank={i + 1} />
          ))}
        </View>
      ) : completed ? (
        <InlineNote icon="trophy-outline" text="Completed without a podium." />
      ) : (
        <InlineNote icon="exit-outline" text="You ended this session early." />
      )}
    </View>
  );
}

function StatusBadge({ completed, mode }: { completed: boolean; mode: string }) {
  if (completed) {
    return (
      <View style={[styles.badge, styles.badgeOk]}>
        <Ionicons name="trophy" size={11} color={theme.colors.primaryDark} />
        <Text style={[styles.badgeText, { color: theme.colors.primaryDark }]}>
          {mode === 'WATCHLIST' ? 'WATCHLIST' : 'PODIUM'}
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, styles.badgeMuted]}>
      <Ionicons name="close-circle" size={11} color={theme.colors.textMuted} />
      <Text style={[styles.badgeText, { color: theme.colors.textMuted }]}>ENDED</Text>
    </View>
  );
}

function InlineNote({
  icon,
  text,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
}) {
  return (
    <View style={styles.noteRow}>
      <Ionicons name={icon} size={14} color={theme.colors.textSubtle} />
      <Text style={styles.note}>{text}</Text>
    </View>
  );
}

function PosterThumb({ movie, rank }: { movie: SessionHistoryMovie; rank: number }) {
  const uri = posterUri(movie.posterPath);
  return (
    <View style={styles.thumb}>
      <View style={styles.thumbImgWrap}>
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
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>{rank}</Text>
        </View>
      </View>
      <Text style={styles.thumbTitle} numberOfLines={2}>{movie.title}</Text>
      {movie.year ? <Text style={styles.thumbYear}>{movie.year}</Text> : null}
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
    fontWeight: '900',
    fontSize: 32,
    color: theme.colors.text,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 10,
    color: theme.colors.textSubtle,
    letterSpacing: 1.8,
    marginTop: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 140,
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
    fontWeight: '800',
    fontSize: 16,
    color: theme.colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  meta: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 10,
    color: theme.colors.textSubtle,
    letterSpacing: 1.2,
  },

  // Status badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: theme.radii.full,
  },
  badgeOk: {
    backgroundColor: theme.colors.primary,
  },
  badgeMuted: {
    backgroundColor: theme.colors.surfaceHighlight,
  },
  badgeText: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 9,
    letterSpacing: 1.2,
    fontWeight: '800',
  },

  // Inline note (e.g., abandoned, no podium)
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.md,
  },
  note: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 13,
    fontStyle: 'italic',
    color: theme.colors.textMuted,
  },

  // Poster strip
  posterStrip: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  thumb: {
    flex: 1,
    gap: 6,
  },
  thumbImgWrap: {
    position: 'relative',
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
  rankBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontFamily: theme.typography.fontFamily.mono,
    fontWeight: '900',
    fontSize: 11,
    color: theme.colors.primaryDark,
  },
  thumbTitle: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text,
    lineHeight: 14,
  },
  thumbYear: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 9,
    color: theme.colors.textSubtle,
    letterSpacing: 1.2,
  },

  // Empty
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: theme.spacing.xxl * 2,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  emptyMark: {
    width: 72,
    height: 72,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
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
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
});
