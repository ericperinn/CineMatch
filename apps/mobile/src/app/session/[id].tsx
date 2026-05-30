import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';
import { socketService } from '@/services/socket';
import { copyToClipboard, heavy, success, tap } from '@/lib/feedback';

interface Movie {
  id: string;
  title: string;
  year: number | null;
  posterPath: string | null;
  overview?: string | null;
}

interface SessionInfo {
  id: string;
  hostId: string;
  guestId: string;
  mode: string;
  status: string;
}

interface MatchEvent {
  movie: Movie;
  currentCount: number;
  podiumSize: number;
}

const REFILL_THRESHOLD = 3;
const BATCH_SIZE = 10;
// w780 is a sharp poster on retina without blowing bandwidth (~140 KB each).
const TMDB_IMG = 'https://image.tmdb.org/t/p/w780';
// A generic dark blur for poster placeholders. Better than a flat color.
const POSTER_BLURHASH = 'L6Pj0^jE.AyE_3t7t7R**0o#DgR4';

function posterUri(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.startsWith('http') ? path : `${TMDB_IMG}${path}`;
}

export default function SessionScreen() {
  const router = useRouter();
  const { id, role } = useLocalSearchParams<{ id: string; role?: string }>();
  const isGuest = role === 'guest';

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [batch, setBatch] = useState<Movie[]>([]);
  const [index, setIndex] = useState(0);
  const [matchBanner, setMatchBanner] = useState<MatchEvent | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const [podiumSize, setPodiumSize] = useState(3);
  const [podium, setPodium] = useState<Movie[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [waitingMessage, setWaitingMessage] = useState(
    isGuest ? 'Joining session…' : 'Waiting for your friend to join…'
  );

  // Avoid spamming request-next-batch while one is in flight.
  const batchRequestedRef = useRef(false);

  useEffect(() => {
    if (!id) return;
    socketService.connect();

    const offReady = socketService.on('session:ready', (data: { session: SessionInfo; initialBatch: Movie[] }) => {
      setSession(data.session);
      setBatch(data.initialBatch || []);
      setIndex(0);
      setWaitingMessage('');
    });

    const offBatch = socketService.on('batch', (movies: Movie[]) => {
      batchRequestedRef.current = false;
      if (movies && movies.length > 0) {
        setBatch((prev) => [...prev, ...movies]);
      }
    });

    const offMatch = socketService.on('match', (data: MatchEvent) => {
      setMatchCount(data.currentCount);
      setPodiumSize(data.podiumSize);
      setMatchBanner(data);
      heavy();
      setTimeout(() => setMatchBanner(null), 2500);
    });

    const offCompleted = socketService.on(
      'session:completed',
      (data: { podium: Movie[] }) => setPodium(data.podium || [])
    );

    const offAbandoned = socketService.on('session:abandoned', () => {
      setError('Session was abandoned');
    });

    const offError = socketService.on('error', (err: { code?: string; message?: string }) => {
      setError(err?.message ?? 'Something went wrong');
    });

    if (isGuest) {
      socketService.emit('session:join', { sessionId: id });
    }

    return () => {
      offReady();
      offBatch();
      offMatch();
      offCompleted();
      offAbandoned();
      offError();
    };
  }, [id, isGuest]);

  const current = batch[index];
  const remaining = batch.length - index;

  // Request more when the deck gets low.
  useEffect(() => {
    if (!session || podium || !id) return;
    if (remaining <= REFILL_THRESHOLD && !batchRequestedRef.current) {
      batchRequestedRef.current = true;
      socketService.emit('request-next-batch', { sessionId: id, count: BATCH_SIZE });
    }
  }, [remaining, session, podium, id]);

  const swipe = (vote: 'LIKE' | 'DISLIKE') => {
    if (!current || !id) return;
    tap();
    socketService.emit('swipe', { sessionId: id, movieId: current.id, vote });
    setIndex((i) => i + 1);
  };

  const [copied, setCopied] = useState(false);
  const copyCode = async () => {
    if (!id) return;
    await copyToClipboard(String(id));
    await success();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const leave = () => {
    if (id) socketService.emit('session:leave', { sessionId: id });
    router.back();
  };

  const headerLabel = useMemo(() => {
    if (podium) return 'COMPLETE';
    return `${matchCount}/${podiumSize} MATCHES`;
  }, [matchCount, podiumSize, podium]);

  // --- Render ---
  if (error) {
    return (
      <ScreenContainer padded style={styles.centered}>
        <Text style={styles.errorTitle}>Oops</Text>
        <Text style={styles.errorBody}>{error}</Text>
        <Button label="Back" onPress={() => router.back()} style={{ marginTop: theme.spacing.lg }} />
      </ScreenContainer>
    );
  }

  if (podium) {
    return (
      <ScreenContainer padded={false}>
        <View style={styles.header}>
          <Text style={styles.headerLabel}>{headerLabel}</Text>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/home')}>
            <Text style={styles.leaveText}>Done</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.podiumScroll}>
          <Text style={styles.podiumTitle}>Your podium</Text>
          <Text style={styles.podiumSubtitle}>
            Three films you both want to watch tonight.
          </Text>
          {podium.map((movie, i) => (
            <View key={movie.id} style={styles.podiumRow}>
              <Text style={styles.podiumRank}>{i + 1}</Text>
              <PosterThumb movie={movie} size={88} />
              <View style={{ flex: 1 }}>
                <Text style={styles.podiumMovieTitle} numberOfLines={2}>{movie.title}</Text>
                {movie.year ? <Text style={styles.podiumMovieYear}>{movie.year}</Text> : null}
              </View>
            </View>
          ))}
          <Button
            label="Back to home"
            onPress={() => router.replace('/(tabs)/home')}
            style={{ marginTop: theme.spacing.xl }}
          />
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (!session || !current) {
    return (
      <ScreenContainer padded style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={styles.waitingText}>{waitingMessage || 'Loading next movies…'}</Text>
        {!isGuest && id ? (
          <View style={styles.codeCard}>
            <Text style={styles.codeHint}>SHARE THIS CODE</Text>
            <Text style={styles.codeValue} numberOfLines={1} selectable>
              {String(id)}
            </Text>
            <Button
              label={copied ? 'Copied!' : 'Copy code'}
              variant={copied ? 'secondary' : 'primary'}
              onPress={copyCode}
              style={{ marginTop: theme.spacing.md }}
            />
          </View>
        ) : null}
        <Button
          label="Leave"
          variant="outline"
          onPress={leave}
          style={{ marginTop: theme.spacing.lg }}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded={false}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>{headerLabel}</Text>
        <TouchableOpacity onPress={leave}>
          <Text style={styles.leaveText}>Leave</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardArea}>
        <SwipeableCard movie={current} onSwipe={swipe} />
      </View>

      <View style={styles.actions}>
        <ActionButton label="Pass" tint={theme.colors.error} onPress={() => swipe('DISLIKE')} />
        <ActionButton label="Like" tint={theme.colors.primary} onPress={() => swipe('LIKE')} />
      </View>

      {matchBanner && (
        <View style={styles.matchBanner} pointerEvents="none">
          <Text style={styles.matchTitle}>IT'S A MATCH</Text>
          <Text style={styles.matchMovie} numberOfLines={1}>{matchBanner.movie.title}</Text>
          <Text style={styles.matchProgress}>
            {matchBanner.currentCount}/{matchBanner.podiumSize}
          </Text>
        </View>
      )}
    </ScreenContainer>
  );
}

function SwipeableCard({
  movie,
  onSwipe,
}: {
  movie: Movie;
  onSwipe: (vote: 'LIKE' | 'DISLIKE') => void;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      // Dampen vertical drift so the card mostly slides horizontally.
      translateY.value = e.translationY * 0.4;
    })
    .onEnd((e) => {
      const SWIPE_THRESHOLD = 120;
      const VELOCITY_THRESHOLD = 800;
      const shouldDismiss =
        Math.abs(e.translationX) > SWIPE_THRESHOLD ||
        Math.abs(e.velocityX) > VELOCITY_THRESHOLD;

      if (shouldDismiss) {
        const dir = e.translationX >= 0 ? 1 : -1;
        const vote: 'LIKE' | 'DISLIKE' = dir > 0 ? 'LIKE' : 'DISLIKE';
        translateX.value = withTiming(dir * 600, { duration: 220 }, () => {
          // Reset before triggering the JS state change so the next card
          // mounts centered without a flicker.
          translateX.value = 0;
          translateY.value = 0;
          runOnJS(onSwipe)(vote);
        });
      } else {
        translateX.value = withSpring(0, { damping: 14 });
        translateY.value = withSpring(0, { damping: 14 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotateZ: `${translateX.value / 18}deg` },
    ],
  }));
  const likeOpacity = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, translateX.value / 100)),
  }));
  const passOpacity = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, -translateX.value / 100)),
  }));

  const uri = posterUri(movie.posterPath);

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, cardStyle]}>
        {uri ? (
          <Image
            source={{ uri }}
            style={styles.poster}
            contentFit="cover"
            transition={250}
            placeholder={{ blurhash: POSTER_BLURHASH }}
            placeholderContentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.poster, styles.posterPlaceholder]}>
            <Text style={styles.posterPlaceholderText}>NO POSTER</Text>
          </View>
        )}
        <View style={styles.cardCaption}>
          <Text style={styles.cardTitle} numberOfLines={2}>{movie.title}</Text>
          {movie.year ? <Text style={styles.cardYear}>{movie.year}</Text> : null}
          {movie.overview ? (
            <Text style={styles.cardOverview} numberOfLines={3}>{movie.overview}</Text>
          ) : null}
        </View>

        <Animated.View style={[styles.overlayBadge, styles.overlayLike, likeOpacity]} pointerEvents="none">
          <Text style={[styles.overlayText, { color: theme.colors.primary }]}>LIKE</Text>
        </Animated.View>
        <Animated.View style={[styles.overlayBadge, styles.overlayPass, passOpacity]} pointerEvents="none">
          <Text style={[styles.overlayText, { color: theme.colors.error }]}>PASS</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

function PosterThumb({ movie, size }: { movie: Movie; size: number }) {
  const uri = posterUri(movie.posterPath);
  const style = { width: size, height: size * 1.5, borderRadius: theme.radii.md };
  if (!uri) return <View style={[style, styles.posterPlaceholder]} />;
  return (
    <Image
      source={{ uri }}
      style={style}
      contentFit="cover"
      transition={200}
      placeholder={{ blurhash: POSTER_BLURHASH }}
      placeholderContentFit="cover"
      cachePolicy="memory-disk"
    />
  );
}

function ActionButton({
  label,
  tint,
  onPress,
}: {
  label: string;
  tint: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.actionBtn, { borderColor: tint }]}
    >
      <Text style={[styles.actionLabel, { color: tint }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  headerLabel: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 11,
    color: theme.colors.primary,
    letterSpacing: 2,
    fontWeight: '700',
  },
  leaveText: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  card: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  poster: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: theme.colors.surfaceHighlight,
  },
  posterPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterPlaceholderText: {
    fontFamily: theme.typography.fontFamily.mono,
    color: theme.colors.textSubtle,
    letterSpacing: 1.5,
    fontSize: 11,
  },
  cardCaption: {
    padding: theme.spacing.lg,
    gap: 4,
  },
  cardTitle: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '800',
    fontSize: 22,
    color: theme.colors.text,
  },
  cardYear: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 11,
    color: theme.colors.textSubtle,
    letterSpacing: 1.2,
  },
  cardOverview: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
    lineHeight: 18,
  },
  overlayBadge: {
    position: 'absolute',
    top: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radii.sm,
    borderWidth: 3,
    backgroundColor: 'rgba(2,6,23,0.85)',
  },
  overlayLike: {
    right: theme.spacing.lg,
    borderColor: theme.colors.primary,
    transform: [{ rotate: '-12deg' }],
  },
  overlayPass: {
    left: theme.spacing.lg,
    borderColor: theme.colors.error,
    transform: [{ rotate: '12deg' }],
  },
  overlayText: {
    fontFamily: theme.typography.fontFamily.mono,
    fontWeight: '900',
    fontSize: 26,
    letterSpacing: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl + 32,
  },
  actionBtn: {
    flex: 1,
    height: 64,
    borderRadius: theme.radii.xl,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 1,
  },
  waitingText: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  codeCard: {
    marginTop: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
  },
  codeHint: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 10,
    color: theme.colors.textSubtle,
    letterSpacing: 2,
    fontWeight: '700',
  },
  codeValue: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '700',
    marginTop: theme.spacing.sm,
  },
  matchBanner: {
    position: 'absolute',
    top: '40%',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  matchTitle: {
    fontFamily: theme.typography.fontFamily.mono,
    fontWeight: '800',
    fontSize: 13,
    color: theme.colors.primaryDark,
    letterSpacing: 2.5,
  },
  matchMovie: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '800',
    fontSize: 22,
    color: theme.colors.primaryDark,
    marginTop: 6,
    textAlign: 'center',
  },
  matchProgress: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 12,
    color: theme.colors.primaryDark,
    marginTop: 4,
    letterSpacing: 1.5,
  },
  errorTitle: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '800',
    fontSize: 24,
    color: theme.colors.error,
  },
  errorBody: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  podiumScroll: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  podiumTitle: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '800',
    fontSize: 26,
    color: theme.colors.text,
  },
  podiumSubtitle: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
  },
  podiumRank: {
    fontFamily: theme.typography.fontFamily.mono,
    fontWeight: '800',
    fontSize: 22,
    color: theme.colors.primary,
    width: 24,
    textAlign: 'center',
  },
  podiumMovieTitle: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '800',
    fontSize: 16,
    color: theme.colors.text,
  },
  podiumMovieYear: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 11,
    color: theme.colors.textSubtle,
    letterSpacing: 1.2,
    marginTop: 4,
  },
});
