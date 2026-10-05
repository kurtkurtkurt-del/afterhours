import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Extrapolation, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '@/i18n';
import { colors } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// Without history, go to the home screen.
const go = () => (router.canGoBack() ? router.back() : router.replace('/'));

const EDGE = 24;   // width of the left-edge strip that catches the gesture
const PULL = 70;
const SIZE = 44; // the round button   // pull distance that triggers back

// Back, two ways:
// 1. Swipe right from the left edge (anywhere, one-thumbed); a red line shows while pulling.
// 2. A round paper button with a left chevron, bottom left where the thumb is; the same
//    shape as the raised middle tab. tone="ink" inverts it for paper backgrounds.
// Most pages render it inside the top band; its position comes from the window height,
// so it always lands bottom left regardless of where it is rendered.
// lift: raise it when something is pinned at the bottom (like the room's input).
// inline: a normal row in the flow (like below the sign-up form).
type Props = { tone?: 'paper' | 'ink'; lift?: number; inline?: boolean };

export default function BackButton({ tone = 'paper', lift = 0, inline = false }: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const t = useT();
  const button = (
    <Pressable
      onPress={go}
      hitSlop={{ top: 14, bottom: 14, left: 24, right: 24 }}
      accessibilityRole="button"
      accessibilityLabel={t('word.back')}
      style={({ pressed }) => [styles.circle, tone === 'ink' && styles.circleInk, inline ? styles.inline : [styles.fixed, { top: height - insets.bottom - SIZE - 16 - lift }], pressed && styles.pressed]}
    >
      <Svg width={20} height={20} viewBox="0 0 20 20">
        <Path d="M12.5 4 6.5 10l6 6" stroke={tone === 'ink' ? colors.paper : colors.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    </Pressable>
  );
  if (inline) return button;
  return (
    <>
      <EdgeBack />
      {button}
    </>
  );
}

// Pull right from the left edge to go back: a thin full-height strip on top of the page.
export function EdgeBack() {
  const { height } = useWindowDimensions();
  const pull = useSharedValue(0);
  const pan = Gesture.Pan()
    .activeOffsetX(12)
    .failOffsetY([-24, 24])
    .onUpdate((e) => {
      pull.set(Math.max(0, e.translationX));
    })
    .onEnd((e) => {
      if (e.translationX > PULL || e.velocityX > 700) runOnJS(go)();
      pull.set(withTiming(0, { duration: 200 }));
    });
  const line = useAnimatedStyle(() => ({
    opacity: interpolate(pull.value, [0, PULL], [0, 1], Extrapolation.CLAMP),
    transform: [{ scaleY: interpolate(pull.value, [0, PULL], [0.3, 1], Extrapolation.CLAMP) }],
  }));
  return (
    <GestureDetector gesture={pan}>
      <View style={[styles.edge, { height }]} collapsable={false}>
        <Animated.View style={[styles.line, line]} pointerEvents="none" />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fixed: { position: 'absolute', left: brand.left, zIndex: 20, elevation: 20 },
  inline: { alignSelf: 'flex-start', marginTop: 6 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.95 }] },
  circle: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  circleInk: { backgroundColor: colors.ink },
  edge: { position: 'absolute', top: 0, left: 0, width: EDGE, zIndex: 19, elevation: 19 },
  line: { position: 'absolute', top: '20%', bottom: '20%', left: 0, width: 3, borderRadius: 2, backgroundColor: colors.spot },
});
