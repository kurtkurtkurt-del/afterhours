import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { colors, fonts } from '@/theme/tokens';
import { tagline, taglines } from '@/content/taglines';

type Props = { play: boolean };

// satır alttan hafif yükselerek belirir, okunacak kadar durur, söner, sıradaki gelir.
export default function Taglines({ play }: Props) {
  const [i, setI] = useState(0);
  const v = useSharedValue(0);

  useEffect(() => {
    if (!play) return;
    const words = taglines[i].split(' ').length;
    const hold = tagline.base + words * tagline.perWord;
    v.set(
      withSequence(
        withTiming(1, { duration: tagline.in, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: hold }),
        withTiming(0, { duration: tagline.out, easing: Easing.in(Easing.quad) }),
      ),
    );
    const next = setTimeout(() => setI((n) => (n + 1) % taglines.length), tagline.in + hold + tagline.out);
    return () => clearTimeout(next);
  }, [play, i, v]);

  const style = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ translateY: (1 - v.value) * tagline.rise }],
  }));

  return (
    <View style={styles.box} pointerEvents="none">
      <Animated.Text style={[styles.text, style]}>{taglines[i]}</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // sabit yükseklik: satır uzunluğu değişince hiçbir şey oynamaz (3 satıra kadar)
  box: { height: tagline.lineHeight * 3, justifyContent: 'flex-end' },
  text: {
    fontFamily: fonts.medium,
    fontSize: tagline.size,
    lineHeight: tagline.lineHeight,
    letterSpacing: -0.8,
    color: colors.paper,
  },
});
