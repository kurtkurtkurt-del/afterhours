import { useCallback, useState } from 'react';
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
type Props = { nights: Night[]; onSwipe: (night: Night, direction: Direction) => void };

const THRESHOLD = 110; // px: bunun ötesinde bırakılırsa karar verilmiş sayılır
const VELOCITY = 800;

// her kartın kendi konumu var: üstteki uçup gittiğinde arkadaki zaten sıfırda
// duruyor, sıfırlama ve göz kırpma olmuyor. ortak olan tek şey "drag":
// üsttekinin ne kadar çekildiği; arkadaki ona göre büyür.
function SwipeCard({
  night,
  active,
  drag,
  onDone,
}: {
  night: Night;
  active: boolean;
  drag: SharedValue<number>;
  onDone: (direction: Direction) => void;
}) {
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);
  const y = useSharedValue(0);

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

  const style = useAnimatedStyle(() => {
    if (active) {
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
    <GestureDetector gesture={pan}>
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
}

export default function Deck({ nights, onSwipe }: Props) {
  const [i, setI] = useState(0);
  const drag = useSharedValue(0);
  const top = nights[i];
  const next = nights[i + 1];

  const done = useCallback(
    (direction: Direction) => {
      if (top) onSwipe(top, direction);
      drag.set(0);
      setI((n) => n + 1);
    },
    [top, onSwipe, drag],
  );

  if (!top) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>no more nights here.</Text>
        <Text style={styles.emptyMono}>come back tomorrow</Text>
      </View>
    );
  }

  // sıra önemli: arkadaki önce çizilir. anahtar gecenin kimliği, böylece
  // arkadaki kart öne geçerken yeniden yaratılmaz.
  return (
    <View style={styles.stage}>
      {next && <SwipeCard key={next.id} night={next} active={false} drag={drag} onDone={done} />}
      <SwipeCard key={top.id} night={top} active drag={drag} onDone={done} />
    </View>
  );
}

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
  emptyText: { fontFamily: fonts.medium, fontSize: 22, letterSpacing: -0.5, color: colors.paper },
  emptyMono: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.mute },
});
