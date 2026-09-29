import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Extrapolation, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '@/i18n';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// Without history, go to the home screen.
const go = () => (router.canGoBack() ? router.back() : router.replace('/'));

const EDGE = 24;   // width of the left-edge strip that catches the gesture
const PULL = 70;   // pull distance that triggers back

// Back, two ways:
// 1. Swipe right from the left edge (anywhere, one-thumbed); a red line shows while pulling.
// 2. A small underlined "back" bottom left, where the thumb is; same style as the "change"
//    and "close" links on the page, no box, no border.
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
      style={({ pressed }) => [inline ? styles.inline : [styles.fixed, { top: height - insets.bottom - 30 - lift }], pressed && styles.pressed]}
    >
      <Text style={[styles.text, tone === 'ink' && styles.textInk]}>{t('word.back')}</Text>
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
  inline: { alignSelf: 'flex-start', paddingVertical: 6 },
  pressed: { opacity: 0.6 },
  text: { fontFamily: fonts.regular, fontSize: 13, letterSpacing: 0.2, color: colors.paper, textDecorationLine: 'underline' },
  textInk: { color: colors.ink },
  edge: { position: 'absolute', top: 0, left: 0, width: EDGE, zIndex: 19, elevation: 19 },
  line: { position: 'absolute', top: '20%', bottom: '20%', left: 0, width: 3, borderRadius: 2, backgroundColor: colors.spot },
});
