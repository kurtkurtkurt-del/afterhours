import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import Button from '@/components/Button';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import CardFace, { Hint, openDetails, openTicket, toDeckCard, type DeckFriend } from '@/components/CardFace';
import { colors, fonts } from '@/theme/tokens';
import type { Night } from '@/data/deck';

type Direction = 'left' | 'right';
type Props = {
  nights: Night[];
  friendsOf?: (night: Night) => DeckFriend[];
  bottom: number; // altyazının alt kenarı
  onSwipe: (night: Night, direction: Direction) => void;
  onUndo?: (night: Night) => void;
  onReset?: () => void;
};
export type DeckHandle = { undo: () => void };

const THRESHOLD = 110; // px: yana bunun ötesinde bırakılırsa karar verilmiş sayılır
const VELOCITY = 800;
const PULL = 90;       // px: yukarı ya da aşağı bu kadar çekilince bilet / ayrıntılar

type CardHandle = { promote: () => void; keep: () => void };

// friends' deck ile aynı kart yüzü, üstüne destenin hareketi:
// sağa = keep (kenar kırmızıya döner), sola = let go, yukarı = bilet, aşağı = gece sayfası.
// her kartın kendi konumu var: üstteki uçup gittiğinde arkadaki zaten sıfırda duruyor.
const SwipeCard = forwardRef<CardHandle, {
  night: Night;
  friends: DeckFriend[];
  active: boolean;
  drag: SharedValue<number>;
  bottom: number;
  onDone: (direction: Direction) => void;
}>(function SwipeCard({ night, friends, active, drag, bottom, onDone }, ref) {
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const promoted = useSharedValue(active ? 1 : 0);
  const card = toDeckCard(night, friends);

  const flyOff = useCallback(
    (dir: Direction) => {
      drag.set(withTiming(1, { duration: 200 }));
      x.set(withTiming(dir === 'right' ? width * 1.5 : -width * 1.5, { duration: 260 }, () => runOnJS(onDone)(dir)));
    },
    [drag, x, width, onDone],
  );
  useImperativeHandle(ref, () => ({ promote: () => promoted.set(1), keep: () => flyOff('right') }), [promoted, flyOff]);
  useEffect(() => {
    if (!active) promoted.set(0); // geri alınıp arkaya dönen kart yeniden küçük
  }, [active, promoted]);

  const ticket = () => openTicket(card);
  const details = () => openDetails(card);

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
      if (!sideways && (e.translationY < -PULL || e.velocityY < -900)) runOnJS(ticket)();
      else if (!sideways && (e.translationY > PULL || e.velocityY > 900)) runOnJS(details)();
      x.set(withSpring(0, { damping: 18, stiffness: 180 }));
      y.set(withSpring(0, { damping: 18, stiffness: 180 }));
      drag.set(withSpring(0, { damping: 18, stiffness: 180 }));
    });

  const style = useAnimatedStyle(() => {
    if (active || promoted.value === 1) {
      return {
        opacity: 1,
        transform: [
          { translateX: x.value },
          { translateY: y.value },
          { rotate: `${interpolate(x.value, [-width, 0, width], [-10, 0, 10])}deg` },
        ],
      };
    }
    const p = drag.value;
    return { opacity: 0.7 + 0.3 * p, transform: [{ scale: 0.96 + 0.04 * p }, { translateY: 10 - 10 * p }] };
  });
  // sağa çekerken kenar kırmızıya döner (%40'ta tam); sola çekerken sol kenarda kâğıt çizgi
  const keepEdge = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [width * 0.15, width * 0.4], [0, 1], Extrapolation.CLAMP) }));
  const letGoEdge = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [-width * 0.4, -width * 0.15], [1, 0], Extrapolation.CLAMP) }));
  const upHint = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [-PULL * 0.6, -10], [1, 0], Extrapolation.CLAMP) }));
  const downHint = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [10, PULL * 0.6], [0, 1], Extrapolation.CLAMP) }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.slot, style]}>
        <CardFace card={card} bottom={bottom} rightLabel="keep →" onRight={() => flyOff('right')} />
        {active && (
          <>
            <Animated.View pointerEvents="none" style={[styles.edgeRight, keepEdge]} />
            <Animated.View pointerEvents="none" style={[styles.edgeLeft, letGoEdge]}>
              <Text style={styles.letGo}>let go</Text>
            </Animated.View>
            <Animated.View style={[styles.hint, styles.hintUp, upHint]} pointerEvents="none">
              <Hint label={card.ticketUrl ? 'ticket ↑' : 'open ↑'} />
            </Animated.View>
            <Animated.View style={[styles.hint, { bottom: bottom + 8 }, downHint]} pointerEvents="none">
              <Hint label="details ↓" />
            </Animated.View>
          </>
        )}
      </Animated.View>
    </GestureDetector>
  );
});

const Deck = forwardRef<DeckHandle, Props>(function Deck({ nights, friendsOf, bottom, onSwipe, onUndo, onReset }, ref) {
  const [i, setI] = useState(0);
  const drag = useSharedValue(0);
  const nextRef = useRef<CardHandle>(null);
  const top = nights[i];
  const next = nights[i + 1];

  const done = useCallback(
    (direction: Direction) => {
      if (top) onSwipe(top, direction);
      nextRef.current?.promote(); // arkadaki artık tam boy, react yetişmeden
      drag.set(0); // yeni arkadaki küçük başlasın
      setI((n) => n + 1);
    },
    [top, onSwipe, drag],
  );

  // geri al: bir önceki kart geri gelir (üstteki tekrar arkaya)
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
    }),
    [i, nights, onUndo, drag],
  );

  if (!top) {
    return (
      <View style={[styles.empty, { paddingBottom: bottom }]}>
        <Text style={styles.emptyText}>no more nights here.</Text>
        <Text style={styles.emptyMono}>{nights.length ? 'you have seen them all' : 'nothing listed yet'}</Text>
        {onReset && nights.length > 0 ? (
          <View style={styles.resetBtn}>
            <Button label="start over" kind="line" onPress={onReset} />
          </View>
        ) : null}
      </View>
    );
  }

  // sıra önemli: arkadaki önce çizilir. anahtar gecenin kimliği, böylece
  // arkadaki kart öne geçerken yeniden yaratılmaz.
  return (
    <View style={styles.stage}>
      {next && <SwipeCard ref={nextRef} key={next.id} night={next} friends={friendsOf?.(next) ?? []} active={false} drag={drag} bottom={bottom} onDone={done} />}
      <SwipeCard key={top.id} night={top} friends={friendsOf?.(top) ?? []} active drag={drag} bottom={bottom} onDone={done} />
    </View>
  );
});

export default Deck;

const styles = StyleSheet.create({
  stage: { flex: 1 },
  slot: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.ink, overflow: 'hidden' },
  edgeRight: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 56, backgroundColor: colors.spot },
  edgeLeft: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 56, borderRightWidth: 1.5, borderRightColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  letGo: { fontFamily: fonts.jet, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: colors.paper, transform: [{ rotate: '-90deg' }], width: 120, textAlign: 'center' },
  hint: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  hintUp: { top: '38%' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  resetBtn: { marginTop: 18, alignSelf: 'stretch', paddingHorizontal: 40 },
  emptyText: { fontFamily: fonts.medium, fontSize: 22, letterSpacing: -0.5, color: colors.paper },
  emptyMono: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.mute },
});
