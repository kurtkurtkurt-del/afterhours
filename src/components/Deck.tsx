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
} from 'react-native-reanimated';
import NightCard from '@/components/NightCard';
import { colors, fonts } from '@/theme/tokens';
import type { Night } from '@/data/deck';

type Props = { nights: Night[]; onSwipe: (night: Night, direction: 'left' | 'right') => void };

const THRESHOLD = 110; // px: bunun ötesinde bırakılırsa karar verilmiş sayılır
const VELOCITY = 800;

// deste: üstteki kart parmağı izler, eğilir, eşiği geçince uçar; arkadaki öne gelir.
export default function Deck({ nights, onSwipe }: Props) {
  const { width } = useWindowDimensions();
  const [i, setI] = useState(0);
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  const top = nights[i];
  const next = nights[i + 1];

  const advance = useCallback(
    (direction: 'left' | 'right') => {
      if (top) onSwipe(top, direction);
      setI((n) => n + 1);
      x.set(0);
      y.set(0);
    },
    [top, onSwipe, x, y],
  );

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      x.set(e.translationX);
      y.set(e.translationY * 0.4);
    })
    .onEnd((e) => {
      const flung = Math.abs(e.velocityX) > VELOCITY;
      if (Math.abs(x.get()) > THRESHOLD || flung) {
        const dir = x.get() > 0 || (flung && e.velocityX > 0) ? 'right' : 'left';
        x.set(withTiming(dir === 'right' ? width * 1.5 : -width * 1.5, { duration: 260 }, () => runOnJS(advance)(dir)));
      } else {
        x.set(withSpring(0, { damping: 18, stiffness: 180 }));
        y.set(withSpring(0, { damping: 18, stiffness: 180 }));
      }
    });

  const topStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${interpolate(x.value, [-width, 0, width], [-14, 0, 14])}deg` },
    ],
  }));
  const keepStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [20, THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));
  const letGoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [-THRESHOLD, -20], [1, 0], Extrapolation.CLAMP),
  }));
  const nextStyle = useAnimatedStyle(() => {
    const p = interpolate(Math.abs(x.value), [0, THRESHOLD], [0, 1], Extrapolation.CLAMP);
    return { transform: [{ scale: 0.94 + 0.06 * p }, { translateY: 12 - 12 * p }], opacity: 0.7 + 0.3 * p };
  });

  if (!top) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>no more nights here.</Text>
        <Text style={styles.emptyMono}>come back tomorrow</Text>
      </View>
    );
  }

  return (
    <View style={styles.stage}>
      {next && (
        <Animated.View key={next.id} style={[styles.slot, nextStyle]}>
          <NightCard night={next} />
        </Animated.View>
      )}
      <GestureDetector gesture={pan}>
        <Animated.View key={top.id} style={[styles.slot, topStyle]}>
          <NightCard night={top} />
          <Animated.Text style={[styles.stamp, styles.keep, keepStyle]}>keep</Animated.Text>
          <Animated.Text style={[styles.stamp, styles.letGo, letGoStyle]}>let go</Animated.Text>
        </Animated.View>
      </GestureDetector>
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
