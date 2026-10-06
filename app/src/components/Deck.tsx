import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import Button from '@/components/Button';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { AskButton } from '@/components/About';
import ShareButton from '@/components/ShareButton';
import { shareNight } from '@/lib/share';
import CardFace, { Hint, openDetails, openTicket, toDeckCard, type DeckCard, type DeckFriend } from '@/components/CardFace';
import { sparkTimes, type Spark } from '@/content/sparks';
import type { SparkInvite } from '@/data/sparks';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import type { Night } from '@/data/deck';

type Direction = 'left' | 'right';
// A spark in the spark panel: one to start yourself, or (invite set) one a friend started.
export type SparkEntry = { id: string; spark: Spark; invite?: SparkInvite };
// A card that is already drawn (friends' deck, waves, your deck in yours).
export type CardEntry = { id: string; card: DeckCard };
export type DeckEntry = Night | SparkEntry | CardEntry;
export const isSpark = (e: DeckEntry): e is SparkEntry => 'spark' in e;
export const isCard = (e: DeckEntry): e is CardEntry => 'card' in e;
// A spark's own page: the night page's layout with "create" (or, for an invite, in / out).
export const openSpark = (e: SparkEntry) => router.push(e.invite ? `/spark/${e.spark.kind}?invite=${e.invite.id}` : `/spark/${e.spark.kind}`);

// A spark drawn as a ticket card: its photo, its name, the suggested time and place.
function sparkCard(e: SparkEntry, t: ReturnType<typeof useLang>['t']): DeckCard {
  const inv = e.invite;
  const host = inv ? (inv.host_name ?? inv.host_handle ?? '').toLowerCase() : '';
  return {
    key: e.id,
    slug: '',
    title: inv ? inv.title : t(e.spark.title).replace(/\.$/, ''),
    venue: inv ? inv.place : t(e.spark.places[0]),
    city: '',
    kind: t(e.spark.label),
    source: 'spark',
    startsAt: inv ? inv.starts_at : (sparkTimes(e.spark)[0]?.toISOString() ?? null),
    image: null,
    local: e.spark.photo,
    poster: null,
    ticketUrl: null,
    friends: [],
    note: inv
      ? [t('spark.hosting', { name: host }), inv.wave && inv.wave > 1 ? t(inv.wave === 2 ? 'deck.wave2' : 'deck.wave3') : null, t('spark.going', { n: inv.going })].filter(Boolean).join(' · ')
      : t('spark.swipe'),
  };
}
type Props = {
  nights: DeckEntry[];
  friendsOf?: (night: Night) => DeckFriend[];
  bottom: number; // bottom edge of the caption
  top: number;    // upper bound for the poster (below the pickers)
  onSwipe: (entry: DeckEntry, direction: Direction) => void;
  onUndo?: (entry: DeckEntry) => void;
  onReset?: () => void;
  // "who is this?": nights with a text show the button on their card (components/About.tsx).
  hasAbout?: (entry: DeckEntry) => boolean;
  onAbout?: (entry: DeckEntry) => void;
};
// swipe: the same as throwing the top card that way (the buttons under the deck).
export type DeckHandle = { undo: () => void; swipe: (direction: Direction) => void };

const THRESHOLD = 110; // px: released beyond this sideways counts as a decision
const VELOCITY = 800;
const PULL = 90;       // px: pulled this far up or down opens the ticket / details

type CardHandle = { promote: () => void; keep: () => void; fly: (direction: Direction) => void };

// Same card face as friends' deck, plus deck gestures:
// right = keep (edge turns red), left = let go, up = ticket, down = night page.
// Each card owns its position, so the card behind is already at rest when the top one flies off.
// A spark has no ticket and no page: only sideways.
const SwipeCard = forwardRef<CardHandle, {
  night: DeckEntry;
  friends: DeckFriend[];
  active: boolean;
  drag: SharedValue<number>;
  bottom: number;
  top: number;
  onDone: (direction: Direction) => void;
  onAbout?: () => void;
}>(function SwipeCard({ night, friends, active, drag, bottom, top, onDone, onAbout }, ref) {
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  // The card behind is hidden and fades in once promoted.
  const shown = useSharedValue(active ? 1 : 0);
  const spark = isSpark(night) ? night : null;
  const { t, up } = useLang();
  const card = spark ? sparkCard(spark, t) : isCard(night) ? night.card : toDeckCard(night as Night, friends);

  const flyOff = useCallback(
    (dir: Direction) => {
      drag.set(withTiming(1, { duration: 200 }));
      x.set(withTiming(dir === 'right' ? width * 1.5 : -width * 1.5, { duration: 260 }, () => runOnJS(onDone)(dir)));
    },
    [drag, x, width, onDone],
  );
  useImperativeHandle(ref, () => ({ promote: () => shown.set(withTiming(1, { duration: 320 })), keep: () => flyOff('right'), fly: flyOff }), [shown, flyOff]);
  useEffect(() => {
    if (!active) shown.set(0); // a card sent back by undo is hidden again
  }, [active, shown]);

  // A spark has no ticket: up does nothing, down opens its page.
  const upable = !spark;
  const ticket = () => openTicket(card);
  const details = () => (spark ? openSpark(spark) : openDetails(card));

  const pan = Gesture.Pan()
    .enabled(active)
    .onUpdate((e) => {
      x.set(e.translationX);
      y.set(e.translationY * 0.6);
      drag.set(Math.min(1, Math.abs(e.translationX) / THRESHOLD));
    })
    .onEnd((e) => {
      const flung = Math.abs(e.velocityX) > VELOCITY;
      const sideways = Math.abs(e.translationX) > Math.abs(e.translationY);
      if (sideways && (Math.abs(x.get()) > THRESHOLD || flung)) {
        const dir: Direction = x.get() > 0 || (flung && e.velocityX > 0) ? 'right' : 'left';
        drag.set(withTiming(1, { duration: 200 }));
        x.set(withTiming(dir === 'right' ? width * 1.5 : -width * 1.5, { duration: 260 }, () => runOnJS(onDone)(dir)));
        return;
      }
      if (upable && !sideways && (e.translationY < -PULL || e.velocityY < -900)) runOnJS(ticket)();
      else if (!sideways && (e.translationY > PULL || e.velocityY > 900)) runOnJS(details)();
      x.set(withSpring(0, { damping: 18, stiffness: 180 }));
      y.set(withSpring(0, { damping: 18, stiffness: 180 }));
      drag.set(withSpring(0, { damping: 18, stiffness: 180 }));
    });

  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${interpolate(x.value, [-width, 0, width], [-10, 0, 10])}deg` },
      { scale: 0.97 + 0.03 * shown.value },
    ],
  }));
  // Dragging right turns the edge red (fully at 40%); dragging left shows a paper line on the left edge.
  const keepEdge = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [width * 0.15, width * 0.4], [0, 1], Extrapolation.CLAMP) }));
  const letGoEdge = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [-width * 0.4, -width * 0.15], [1, 0], Extrapolation.CLAMP) }));
  const upHint = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [-PULL * 0.6, -10], [1, 0], Extrapolation.CLAMP) }));
  const downHint = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [10, PULL * 0.6], [0, 1], Extrapolation.CLAMP) }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.slot, style]}>
        <CardFace
          card={card}
          bottom={bottom}
          fit={{ top }}
          rightLabel={`${spark ? t(spark.invite ? 'spark.in' : 'spark.create') : t('word.keep')} →`}
          onRight={() => flyOff('right')}
          onDetails={spark ? details : undefined}
        />
        {active && (
          <>
            {onAbout ? <AskButton onPress={onAbout} style={[styles.ask, { top: top + 10 }]} /> : null}
            {/* A night can be shared straight from the card, under "who is this?" when it has one. */}
            {!spark && !isCard(night) ? <ShareButton onPress={() => shareNight(night as Night)} style={{ top: top + (onAbout ? 54 : 10), right: 16, bottom: 'auto' }} /> : null}
            <Animated.View pointerEvents="none" style={[styles.edgeRight, keepEdge]} />
            <Animated.View pointerEvents="none" style={[styles.edgeLeft, letGoEdge]}>
              <Text style={styles.letGo}>{up(t('word.letgo'))}</Text>
            </Animated.View>
            {upable ? (
              <Animated.View style={[styles.hint, styles.hintUp, upHint]} pointerEvents="none">
                <Hint label={`${card.ticketUrl ? t('word.ticket') : t('deck.open')} ↑`} />
              </Animated.View>
            ) : null}
            <Animated.View style={[styles.hint, { bottom: bottom + 8 }, downHint]} pointerEvents="none">
              <Hint label={`${t('word.details')} ↓`} />
            </Animated.View>
          </>
        )}
      </Animated.View>
    </GestureDetector>
  );
});

const Deck = forwardRef<DeckHandle, Props>(function Deck({ nights, friendsOf, bottom, top: posterTop, onSwipe, onUndo, onReset, hasAbout, onAbout }, ref) {
  const { t, up } = useLang();
  const [i, setI] = useState(0);
  const drag = useSharedValue(0);
  const nextRef = useRef<CardHandle>(null);
  const topRef = useRef<CardHandle>(null);
  const top = nights[i];
  const next = nights[i + 1];

  // Kept: a red mark pops up over the deck for a moment (0 → 1 in, 1 → 2 out).
  const burst = useSharedValue(0);
  const still = useReducedMotion();
  const burstStyle = useAnimatedStyle(() => ({
    opacity: interpolate(burst.value, [0, 0.6, 1.5, 2], [0, 1, 1, 0], Extrapolation.CLAMP),
    transform: still
      ? []
      : [
          { translateY: interpolate(burst.value, [0, 1, 2], [14, 0, -18], Extrapolation.CLAMP) },
          { scale: interpolate(burst.value, [0, 0.7, 1, 2], [0.5, 1.12, 1, 0.96], Extrapolation.CLAMP) },
        ],
  }));

  const done = useCallback(
    (direction: Direction) => {
      if (top) onSwipe(top, direction);
      if (top && direction === 'right' && !isSpark(top)) {
        burst.set(0);
        burst.set(withSequence(withTiming(1, { duration: 260 }), withDelay(420, withTiming(2, { duration: 280 }))));
      }
      nextRef.current?.promote(); // show the next card before React re-renders
      drag.set(0); // the new card behind starts hidden
      setI((n) => n + 1);
    },
    [top, onSwipe, drag, burst],
  );

  // Undo: the previous card returns (the current one goes back behind it).
  useImperativeHandle(
    ref,
    () => ({
      undo: () => {
        if (i === 0) return;
        const prev = nights[i - 1];
        setI(i - 1);
        drag.set(0);
        if (prev && onUndo) onUndo(prev);
      },
      swipe: (direction) => topRef.current?.fly(direction),
    }),
    [i, nights, onUndo, drag],
  );

  if (!top) {
    return (
      <View style={[styles.empty, { paddingBottom: bottom }]}>
        <Text style={styles.emptyText}>{t('deck.empty')}</Text>
        <Text style={styles.emptyMono}>{up(nights.length ? t('deck.seenAll') : t('deck.nothing'))}</Text>
        {onReset && nights.length > 0 ? (
          <View style={styles.resetBtn}>
            <Button label={t('deck.startOver')} kind="line" onPress={onReset} />
          </View>
        ) : null}
      </View>
    );
  }

  // Order matters: the card behind renders first. Keys are night ids, so the card
  // behind is not recreated when it moves to the front.
  return (
    <View style={styles.stage}>
      {next && <SwipeCard ref={nextRef} key={next.id} night={next} friends={isSpark(next) || isCard(next) ? [] : (friendsOf?.(next) ?? [])} active={false} drag={drag} bottom={bottom} top={posterTop} onDone={done} />}
      <SwipeCard ref={topRef} key={top.id} night={top} friends={isSpark(top) || isCard(top) ? [] : (friendsOf?.(top) ?? [])} active drag={drag} bottom={bottom} top={posterTop} onDone={done} onAbout={onAbout && hasAbout?.(top) ? () => onAbout(top) : undefined} />
      <Animated.View pointerEvents="none" style={[styles.burst, { paddingBottom: bottom }, burstStyle]} accessibilityLiveRegion="polite">
        <View style={styles.burstMark}>
          <Svg width={34} height={34} viewBox="0 0 24 24">
            <Path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" fill={colors.paper} />
          </Svg>
        </View>
        <Text style={styles.burstText}>{up(t('deck.kept'))}</Text>
      </Animated.View>
    </View>
  );
});

export default Deck;

const styles = StyleSheet.create({
  stage: { flex: 1 },
  ask: { position: 'absolute', right: 16 },
  burst: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 10 },
  burstMark: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.spot, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  burstText: { fontFamily: fonts.jet, fontSize: 11, letterSpacing: 2, color: colors.paper, backgroundColor: colors.ink, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, overflow: 'hidden' },
  slot: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.ink, overflow: 'hidden', borderRadius: radius.lg },
  edgeRight: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 56, backgroundColor: colors.spot },
  edgeLeft: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 56, borderRightWidth: 1.5, borderRightColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  letGo: { fontFamily: fonts.jet, fontSize: 11, letterSpacing: 2, color: colors.paper, transform: [{ rotate: '-90deg' }], width: 120, textAlign: 'center' },
  hint: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  hintUp: { top: '38%' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  resetBtn: { marginTop: 18, alignSelf: 'stretch', paddingHorizontal: 40 },
  emptyText: { fontFamily: fonts.medium, fontSize: 22, letterSpacing: -0.5, color: colors.paper },
  emptyMono: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.6, color: colors.mute },
});
