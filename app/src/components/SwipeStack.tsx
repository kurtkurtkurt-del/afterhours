import { forwardRef, useImperativeHandle, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming, Extrapolation } from 'react-native-reanimated';
import { colors, fonts, radius } from '@/theme/tokens';

export type Way = 'left' | 'right' | 'down';
export type StackHandle = { swipe: (way: Way) => void };
type Props<T> = {
  items: T[];
  keyOf: (item: T) => string;
  render: (item: T) => ReactNode;
  onSwipe: (item: T, way: Way) => void;
  stamps: { left: string; right: string; down?: string };
  empty?: ReactNode;
};

const FAR = 600;
const PULL = 110;

// A pile of full cards: drag right or left (or down, when stamps.down is set) to
// decide; a stamp grows on the card as it goes. Used by the group deck (5E) and the
// panel's queues (15B). swipe(way) through the ref does the same from a button.
function SwipeStackInner<T>({ items, keyOf, render, onSwipe, stamps, empty }: Props<T>, ref: React.Ref<StackHandle>) {
  const [i, setI] = useState(0);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const top = items[i];
  const next = items[i + 1];

  const done = (way: Way) => {
    const item = items[i];
    x.set(0);
    y.set(0);
    setI((n) => n + 1);
    if (item) onSwipe(item, way);
  };
  const fly = (way: Way) => {
    if (!top) return;
    if (way === 'down') y.set(withTiming(FAR, { duration: 260 }, () => runOnJS(done)(way)));
    else x.set(withTiming(way === 'right' ? FAR : -FAR, { duration: 260 }, () => runOnJS(done)(way)));
  };
  useImperativeHandle(ref, () => ({ swipe: fly }));

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      x.set(e.translationX);
      y.set(stamps.down ? Math.max(0, e.translationY) : 0);
    })
    .onEnd((e) => {
      if (e.translationX > PULL || e.velocityX > 900) runOnJS(fly)('right');
      else if (e.translationX < -PULL || e.velocityX < -900) runOnJS(fly)('left');
      else if (stamps.down && (e.translationY > PULL || e.velocityY > 900)) runOnJS(fly)('down');
      else {
        x.set(withTiming(0));
        y.set(withTiming(0));
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { rotate: `${interpolate(x.value, [-300, 300], [-14, 14])}deg` }],
  }));
  const right = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [20, PULL], [0, 1], Extrapolation.CLAMP) }));
  const left = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [-PULL, -20], [1, 0], Extrapolation.CLAMP) }));
  const down = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [20, PULL], [0, 1], Extrapolation.CLAMP) }));
  const behind = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(Math.abs(x.value) + y.value, [0, PULL], [0.94, 1], Extrapolation.CLAMP) }] }));

  if (!top) return <View style={styles.fill}>{empty}</View>;
  return (
    <View style={styles.fill}>
      {next ? (
        <Animated.View key={keyOf(next)} style={[styles.card, behind]} pointerEvents="none">
          {render(next)}
        </Animated.View>
      ) : null}
      <GestureDetector gesture={pan}>
        <Animated.View key={keyOf(top)} style={[styles.card, cardStyle]}>
          {render(top)}
          <Animated.View style={[styles.stamp, styles.stampRight, right]} pointerEvents="none">
            <Text style={[styles.stampText, styles.stampTextRight]}>{stamps.right}</Text>
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.stampLeft, left]} pointerEvents="none">
            <Text style={styles.stampText}>{stamps.left}</Text>
          </Animated.View>
          {stamps.down ? (
            <Animated.View style={[styles.stamp, styles.stampDown, down]} pointerEvents="none">
              <Text style={styles.stampText}>{stamps.down}</Text>
            </Animated.View>
          ) : null}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const SwipeStack = forwardRef(SwipeStackInner) as <T>(p: Props<T> & { ref?: React.Ref<StackHandle> }) => ReturnType<typeof SwipeStackInner>;
export default SwipeStack;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  card: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.ink },
  stamp: { position: 'absolute', top: 28, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 2.5, borderRadius: radius.sm, backgroundColor: 'rgba(14,13,12,0.35)' },
  stampRight: { left: 20, borderColor: colors.spot, transform: [{ rotate: '-12deg' }] },
  stampLeft: { right: 20, borderColor: colors.paper, transform: [{ rotate: '12deg' }] },
  stampDown: { alignSelf: 'center', left: '30%', top: 60, borderColor: colors.paper },
  stampText: { fontFamily: fonts.logo, fontSize: 26, letterSpacing: 1, color: colors.paper },
  stampTextRight: { color: colors.spotText },
});
