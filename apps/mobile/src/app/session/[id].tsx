import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  runOnJS,
  SlideInDown,
  SlideOutDown,
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
  const [detailFor, setDetailFor] = useState<Movie | null>(null);
  const [copied, setCopied] = useState(false);
  const [waitingMessage] = useState(
    isGuest ? 'Joining session…' : 'Waiting for your friend to join…'
  );

  const batchRequestedRef = useRef(false);

  useEffect(() => {
    if (!id) return;
    socketService.connect();

    const offReady = socketService.on('session:ready', (data: { session: SessionInfo; initialBatch: Movie[] }) => {
      setSession(data.session);
      setBatch(data.initialBatch || []);
      setIndex(0);
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
      setTimeout(() => setMatchBanner(null), 2800);
    });

    const offCompleted = socketService.on(
      'session:completed',
      (data: { podium: Movie[] }) => setPodium(data.podium || [])
    );

    const offAbandoned = socketService.on('session:abandoned', () => {
      setError('Your friend left the session.');
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
  const next = batch[index + 1];
  const remaining = batch.length - index;

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

  const copyCode = async () => {
    if (!id) return;
    await copyToClipboard(String(id));
    await success();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const leave = () => {
    tap();
    if (id) socketService.emit('session:leave', { sessionId: id });
    router.back();
  };

  // --- Error ---
  if (error) {
    return (
      <ScreenContainer padded style={styles.centered}>
        <View style={styles.errorMark}>
          <Ionicons name="alert" size={32} color={theme.colors.error} />
        </View>
        <Text style={styles.errorTitle}>Session ended</Text>
        <Text style={styles.errorBody}>{error}</Text>
        <Button label="Back to home" onPress={() => router.replace('/(tabs)/home')} style={{ marginTop: theme.spacing.lg }} />
      </ScreenContainer>
    );
  }

  // --- Podium (session completed) ---
  if (podium) {
    return (
      <ScreenContainer padded={false}>
        <SessionHeader
          left={<MatchPill count={matchCount} size={podiumSize} complete />}
          right={
            <IconButton icon="close" label="Close" onPress={() => router.replace('/(tabs)/home')} />
          }
        />
        <ScrollView contentContainerStyle={styles.podiumScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.podiumHero}>
            <View style={styles.podiumMark}>
              <Ionicons name="trophy" size={28} color={theme.colors.primaryDark} />
            </View>
            <Text style={styles.podiumTitle}>You have a podium</Text>
            <Text style={styles.podiumSubtitle}>
              Three films you both want to watch tonight.
            </Text>
          </View>

          {podium.map((movie, i) => (
            <View key={movie.id} style={styles.podiumRow}>
              <Text style={styles.podiumRank}>{i + 1}</Text>
              <PosterThumb movie={movie} size={88} />
              <View style={{ flex: 1 }}>
                <Text style={styles.podiumMovieTitle} numberOfLines={2}>{movie.title}</Text>
                {movie.year ? <Text style={styles.podiumMovieYear}>{movie.year}</Text> : null}
              </View>
              <TouchableOpacity
                hitSlop={12}
                onPress={() => setDetailFor(movie)}
                style={styles.podiumInfoBtn}
              >
                <Ionicons name="information-circle-outline" size={22} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}

          <Button
            label="Back to home"
            onPress={() => router.replace('/(tabs)/home')}
            style={{ marginTop: theme.spacing.xl }}
            leftIcon={<Ionicons name="arrow-back" size={18} color={theme.colors.primaryDark} />}
          />
        </ScrollView>
        <MovieDetailModal movie={detailFor} onClose={() => setDetailFor(null)} />
      </ScreenContainer>
    );
  }

  // --- Waiting / loading ---
  if (!session || !current) {
    return (
      <ScreenContainer padded style={styles.centered}>
        <View style={styles.waitingHero}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={styles.waitingTitle}>
            {isGuest ? 'Joining session…' : 'Waiting for your friend'}
          </Text>
          <Text style={styles.waitingBody}>
            {isGuest
              ? 'Hang tight — getting movies tailored to both of you.'
              : waitingMessage}
          </Text>
        </View>

        {!isGuest && id ? (
          <View style={styles.codeCard}>
            <View style={styles.codeHeader}>
              <Ionicons name="link" size={14} color={theme.colors.primary} />
              <Text style={styles.codeHint}>SHARE THIS CODE</Text>
            </View>
            <View style={styles.codeTokenWrap}>
              <Text style={styles.codeValue} numberOfLines={1} selectable>
                {String(id)}
              </Text>
            </View>
            <Button
              label={copied ? 'Copied!' : 'Copy code'}
              variant={copied ? 'secondary' : 'primary'}
              onPress={copyCode}
              leftIcon={
                <Ionicons
                  name={copied ? 'checkmark' : 'copy-outline'}
                  size={18}
                  color={copied ? theme.colors.text : theme.colors.primaryDark}
                />
              }
              style={{ marginTop: theme.spacing.md }}
            />
          </View>
        ) : null}

        <Button
          label="Leave"
          variant="outline"
          onPress={leave}
          style={{ marginTop: theme.spacing.lg }}
          leftIcon={<Ionicons name="exit-outline" size={18} color={theme.colors.text} />}
        />
      </ScreenContainer>
    );
  }

  // --- Swipe deck ---
  return (
    <ScreenContainer padded={false}>
      <SessionHeader
        left={<MatchPill count={matchCount} size={podiumSize} />}
        right={<IconButton icon="close" label="Leave" onPress={leave} />}
      />

      <View style={styles.cardArea}>
        {next ? (
          <View style={[styles.cardSlot, styles.cardBehind]} pointerEvents="none">
            <StaticCard movie={next} />
          </View>
        ) : null}

        <View style={styles.cardSlot}>
          <SwipeableCard movie={current} onSwipe={swipe} />
        </View>
      </View>

      <View style={styles.actions}>
        <ActionButton
          icon="close"
          tint={theme.colors.error}
          onPress={() => swipe('DISLIKE')}
          accessibilityLabel="Pass"
        />
        <ActionButton
          icon="information-circle-outline"
          tint={theme.colors.text}
          onPress={() => setDetailFor(current)}
          size="small"
          accessibilityLabel="Movie details"
        />
        <ActionButton
          icon="heart"
          tint={theme.colors.primary}
          onPress={() => swipe('LIKE')}
          accessibilityLabel="Like"
        />
      </View>

      {matchBanner && <MatchBanner event={matchBanner} />}

      <MovieDetailModal movie={detailFor} onClose={() => setDetailFor(null)} />
    </ScreenContainer>
  );
}

// ---------------- Components ----------------

function SessionHeader({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <View style={styles.header}>
      {left}
      {right}
    </View>
  );
}

function MatchPill({ count, size, complete }: { count: number; size: number; complete?: boolean }) {
  return (
    <View style={[styles.matchPill, complete && styles.matchPillComplete]}>
      <Ionicons
        name={complete ? 'trophy' : 'heart'}
        size={14}
        color={complete ? theme.colors.primaryDark : theme.colors.primary}
      />
      <Text style={[styles.matchPillText, complete && { color: theme.colors.primaryDark }]}>
        {complete ? 'PODIUM' : `${count} / ${size} MATCHES`}
      </Text>
    </View>
  );
}

function IconButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={12}
      accessibilityLabel={label}
      style={styles.iconButton}
    >
      <Ionicons name={icon} size={20} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );
}

function ActionButton({
  icon,
  tint,
  onPress,
  size = 'large',
  accessibilityLabel,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tint: string;
  onPress: () => void;
  size?: 'large' | 'small';
  accessibilityLabel: string;
}) {
  const isSmall = size === 'small';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.actionBtn,
        { borderColor: tint },
        isSmall && styles.actionBtnSmall,
      ]}
    >
      <Ionicons name={icon} size={isSmall ? 22 : 30} color={tint} />
    </TouchableOpacity>
  );
}

function CardBody({ movie, compact }: { movie: Movie; compact?: boolean }) {
  const uri = posterUri(movie.posterPath);
  return (
    <>
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
        {!compact && movie.overview ? (
          <Text style={styles.cardOverview} numberOfLines={3}>
            {movie.overview}
          </Text>
        ) : null}
        {!compact && !movie.overview ? (
          <Text style={[styles.cardOverview, { fontStyle: 'italic' }]}>
            No description available.
          </Text>
        ) : null}
      </View>
    </>
  );
}

function StaticCard({ movie }: { movie: Movie }) {
  // The "next card" preview only shows the poster — caption would otherwise
  // bleed through the gap above the current card's caption and look like
  // ghost-text overlapping the front card title.
  const uri = posterUri(movie.posterPath);
  return (
    <View style={styles.card}>
      {uri ? (
        <Image
          source={{ uri }}
          style={styles.posterFill}
          contentFit="cover"
          transition={250}
          placeholder={{ blurhash: POSTER_BLURHASH }}
          placeholderContentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[styles.posterFill, styles.posterPlaceholder]} />
      )}
    </View>
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

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, cardStyle]}>
        <CardBody movie={movie} />

        <Animated.View style={[styles.overlayBadge, styles.overlayLike, likeOpacity]} pointerEvents="none">
          <Ionicons name="heart" size={28} color={theme.colors.primary} />
          <Text style={[styles.overlayText, { color: theme.colors.primary }]}>LIKE</Text>
        </Animated.View>
        <Animated.View style={[styles.overlayBadge, styles.overlayPass, passOpacity]} pointerEvents="none">
          <Ionicons name="close" size={28} color={theme.colors.error} />
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

function MatchBanner({ event }: { event: MatchEvent }) {
  return (
    <Animated.View
      entering={SlideInDown.springify().damping(16)}
      exiting={SlideOutDown.duration(220)}
      style={styles.matchBanner}
      pointerEvents="none"
    >
      <View style={styles.matchBannerInner}>
        <PosterThumb movie={event.movie} size={52} />
        <View style={{ flex: 1 }}>
          <View style={styles.matchTitleRow}>
            <Ionicons name="heart" size={14} color={theme.colors.primaryDark} />
            <Text style={styles.matchTitle}>IT'S A MATCH</Text>
          </View>
          <Text style={styles.matchMovie} numberOfLines={1}>{event.movie.title}</Text>
          <Text style={styles.matchProgress}>
            {event.currentCount} of {event.podiumSize} so far
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

function MovieDetailModal({ movie, onClose }: { movie: Movie | null; onClose: () => void }) {
  // animationType="none" so React Native doesn't add its own fade on top of
  // the Reanimated entering animations — which was making the sheet "jump".
  return (
    <Modal
      visible={!!movie}
      onRequestClose={onClose}
      animationType="none"
      transparent
      statusBarTranslucent
    >
      {movie && (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View
            entering={FadeIn.duration(180)}
            style={styles.modalBackdrop}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          </Animated.View>
          <Animated.View
            entering={SlideInDown.duration(220)}
            style={styles.modalSheet}
          >
            <View style={styles.modalHandle} />
            <ScrollView
              contentContainerStyle={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalHeader}>
                <PosterThumb movie={movie} size={120} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={styles.modalTitle} numberOfLines={3}>{movie.title}</Text>
                  {movie.year ? (
                    <View style={styles.modalChipRow}>
                      <View style={styles.modalChip}>
                        <Ionicons name="calendar-outline" size={12} color={theme.colors.primary} />
                        <Text style={styles.modalChipText}>{movie.year}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
                <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Close">
                  <Ionicons name="close" size={26} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSectionTag}>SYNOPSIS</Text>
              <Text style={styles.modalOverview}>
                {movie.overview?.trim() || 'No description available for this title.'}
              </Text>
            </ScrollView>
          </Animated.View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  matchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radii.full,
    backgroundColor: 'rgba(163,230,53,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(163,230,53,0.3)',
  },
  matchPillComplete: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  matchPillText: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 11,
    color: theme.colors.primary,
    letterSpacing: 1.8,
    fontWeight: '800',
  },

  // Card area — relative container that both cards (current + next) overlay
  cardArea: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    position: 'relative',
  },
  // Each card slot is absolute-positioned so current and next stack perfectly.
  cardSlot: {
    position: 'absolute',
    top: theme.spacing.sm,
    bottom: theme.spacing.sm,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    alignItems: 'center',
  },
  cardBehind: {
    transform: [{ scale: 0.96 }, { translateY: -14 }],
    opacity: 0.5,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    flex: 1,
    // Solid surface instead of the translucent token — the swipe card needs
    // to feel like a real object sitting on top of the page, not a tinted
    // overlay that lets the navy bg bleed through.
    backgroundColor: '#0c1830',
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  // Poster takes the remaining space inside the card after the caption is laid
  // out. No aspect ratio so the card never overflows the slot.
  poster: {
    width: '100%',
    flex: 1,
    backgroundColor: theme.colors.surfaceHighlight,
  },
  posterFill: {
    width: '100%',
    height: '100%',
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
    padding: theme.spacing.md,
    gap: 2,
  },
  cardTitle: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '800',
    fontSize: 20,
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  cardYear: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 11,
    color: theme.colors.textSubtle,
    letterSpacing: 1.2,
    marginTop: 4,
  },
  cardOverview: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
    lineHeight: 18,
  },

  // Swipe overlays
  overlayBadge: {
    position: 'absolute',
    top: theme.spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radii.md,
    borderWidth: 3,
    backgroundColor: 'rgba(2,6,23,0.88)',
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
    fontSize: 22,
    letterSpacing: 3,
  },

  // Action buttons
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl + 32,
  },
  actionBtn: {
    width: 68,
    height: 68,
    borderRadius: theme.radii.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  actionBtnSmall: {
    width: 50,
    height: 50,
  },

  // Waiting view
  waitingHero: {
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  waitingTitle: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '800',
    fontSize: 22,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  waitingBody: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },

  // Code card
  codeCard: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    width: '90%',
    maxWidth: 400,
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: theme.spacing.sm,
  },
  codeHint: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 10,
    color: theme.colors.primary,
    letterSpacing: 2,
    fontWeight: '700',
  },
  codeTokenWrap: {
    backgroundColor: theme.colors.surfaceHighlight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  codeValue: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 13,
    color: theme.colors.text,
    letterSpacing: 0.5,
  },

  // Match banner
  matchBanner: {
    position: 'absolute',
    top: '32%',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.md,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 12,
  },
  matchBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  matchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  matchTitle: {
    fontFamily: theme.typography.fontFamily.mono,
    fontWeight: '800',
    fontSize: 11,
    color: theme.colors.primaryDark,
    letterSpacing: 2,
  },
  matchMovie: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '800',
    fontSize: 18,
    color: theme.colors.primaryDark,
    marginTop: 2,
    letterSpacing: -0.3,
  },
  matchProgress: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 11,
    color: theme.colors.primaryDark,
    marginTop: 2,
    letterSpacing: 0.5,
    opacity: 0.7,
  },

  // Error
  errorMark: {
    width: 64,
    height: 64,
    borderRadius: theme.radii.full,
    backgroundColor: 'rgba(239,68,68,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  errorTitle: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '800',
    fontSize: 24,
    color: theme.colors.text,
  },
  errorBody: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    maxWidth: 280,
  },

  // Podium
  podiumHero: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  podiumMark: {
    width: 56,
    height: 56,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  podiumScroll: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  podiumTitle: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '900',
    fontSize: 28,
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  podiumSubtitle: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  podiumRank: {
    fontFamily: theme.typography.fontFamily.mono,
    fontWeight: '900',
    fontSize: 24,
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
  podiumInfoBtn: {
    padding: theme.spacing.xs,
  },

  // Movie detail modal
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,6,23,0.7)',
  },
  modalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '88%',
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radii.xl,
    borderTopRightRadius: theme.radii.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: theme.colors.border,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.surfaceHighlight,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  modalScroll: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontFamily: theme.typography.fontFamily.sans,
    fontWeight: '800',
    fontSize: 22,
    color: theme.colors.text,
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  modalChipRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  modalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
    backgroundColor: 'rgba(163,230,53,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(163,230,53,0.3)',
  },
  modalChipText: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 11,
    color: theme.colors.primary,
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  modalSectionTag: {
    fontFamily: theme.typography.fontFamily.mono,
    fontSize: 10,
    color: theme.colors.primary,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  modalOverview: {
    fontFamily: theme.typography.fontFamily.sans,
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
  },
});
