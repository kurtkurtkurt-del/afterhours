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
import NightCard from '@/components/NightCard';
import { colors, fonts } from '@/theme/tokens';
import type { Night } from '@/data/deck';

type Direction = 'left' | 'right';
type Props = { nights: Night[]; onSwipe: (night: Night, direction: Direction) => void; onOpen?: (night: Night) => void; onUndo?: (night: Night) => void; onReset?: () => void };
export type DeckHandle = { undo: () => void };

const THRESHOLD = 110; // px: bunun ötesinde bırakılırsa karar verilmiş sayılır
const VELOCITY = 800;

type CardHandle = { promote: () => void };

// her kartın kendi konumu var: üstteki uçup gittiğinde arkadaki zaten sıfırda
// duruyor, sıfırlama ve göz kırpma olmuyor. ortak olan tek şey "drag":
// üsttekinin ne kadar çekildiği; arkadaki ona göre büyür.
// "promoted" ui tarafında yaşar: arkadaki kart üste geçerken react'ın yeniden
// çizmesini beklemeden tam boya sabitlenir, böylece arada çökme olmaz.
const SwipeCard = forwardRef<CardHandle, {
  night: Night;
  active: boolean;
  drag: SharedValue<number>;
  onDone: (direction: Direction) => void;
  onOpen?: () => void;
}>(function SwipeCard({ night, active, drag, onDone, onOpen }, ref) {
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const promoted = useSharedValue(active ? 1 : 0);
  useImperativeHandle(ref, () => ({ promote: () => promoted.set(1) }), [promoted]);
  useEffect(() => {
    if (!active) promoted.set(0); // geri alınıp arkaya dönen kart yeniden küçük
  }, [active, promoted]);

  const pan = Gesture.Pan()
    .enabled(active)
    .onUpdate((e) => {
      x.set(e.translationX);
      y.set(e.translationY * 0.4);
      drag.set(Math.min(1, Math.abs(e.translationX) / THRESHOLD));
    })
    .onEnd((e) => {
      const flung = Math.abs(e.velocityX) > VELOCITY;
      if (Math.abs(x.get()) > THRESHOLD || flung) {
        const dir: Direction = x.get() > 0 || (flung && e.velocityX > 0) ? 'right' : 'left';
        drag.set(withTiming(1, { duration: 200 }));
        x.set(withTiming(dir === 'right' ? width * 1.5 : -width * 1.5, { duration: 260 }, () => runOnJS(onDone)(dir)));
      } else {
        x.set(withSpring(0, { damping: 18, stiffness: 180 }));
        y.set(withSpring(0, { damping: 18, stiffness: 180 }));
        drag.set(withSpring(0, { damping: 18, stiffness: 180 }));
      }
    });

  // çift dokunuş gecenin sayfasını açar; sürükleme ile yarışır, hangisi önce belirginse o kazanır
  const doubleTap = Gesture.Tap()
    .enabled(active)
    .numberOfTaps(2)
    .onEnd(() => {
      if (onOpen) runOnJS(onOpen)();
    });
  const gesture = Gesture.Race(doubleTap, pan);

  const style = useAnimatedStyle(() => {
    if (active || promoted.value === 1) {
      return {
        opacity: 1,
        transform: [
          { translateX: x.value },
          { translateY: y.value },
          { rotate: `${interpolate(x.value, [-width, 0, width], [-14, 0, 14])}deg` },
        ],
      };
    }
    const p = drag.value;
    return { opacity: 0.7 + 0.3 * p, transform: [{ scale: 0.94 + 0.06 * p }, { translateY: 12 - 12 * p }] };
  });
  const keepStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [20, THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));
  const letGoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [-THRESHOLD, -20], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.slot, style]}>
        <NightCard night={night} />
        {active && (
          <>
            <Animated.Text style={[styles.stamp, styles.keep, keepStyle]}>keep</Animated.Text>
            <Animated.Text style={[styles.stamp, styles.letGo, letGoStyle]}>let go</Animated.Text>
          </>
        )}
      </Animated.View>
    </GestureDetector>
  );
});

const Deck = forwardRef<DeckHandle, Props>(function Deck({ nights, onSwipe, onOpen, onUndo, onReset }, ref) {
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
      <View style={styles.empty}>
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
      {next && <SwipeCard ref={nextRef} key={next.id} night={next} active={false} drag={drag} onDone={done} />}
      <SwipeCard key={top.id} night={top} active drag={drag} onDone={done} onOpen={onOpen ? () => onOpen(top) : undefined} />
    </View>
  );
});

export default Deck;

const styles = StyleSheet.create({
  stage: { flex: 1 },
  slot: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  stamp: {
    position: 'absolute',
    top: 18,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderWidth: 1.5,
  },
  keep: { right: 18, color: colors.spot, borderColor: colors.spot, transform: [{ rotate: '-8deg' }] },
  letGo: { left: 18, color: colors.paper, borderColor: colors.paper, transform: [{ rotate: '8deg' }] },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  resetBtn: { marginTop: 18, alignSelf: 'stretch', paddingHorizontal: 40 },
  emptyText: { fontFamily: fonts.medium, fontSize: 22, letterSpacing: -0.5, color: colors.paper },
  emptyMono: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.mute },
});
