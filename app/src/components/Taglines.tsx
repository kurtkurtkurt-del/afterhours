import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { colors, fonts } from '@/theme/tokens';
import { tagline, taglines } from '@/content/taglines';
import { useT } from '@/i18n';

type Props = { play: boolean };

// Each line rises in, holds long enough to read, fades out, and the next follows.
export default function Taglines({ play }: Props) {
  const [i, setI] = useState(0);
  const v = useSharedValue(0);
  const t = useT();
  const line = t(taglines[i]);

  useEffect(() => {
    if (!play) return;
    const words = line.split(' ').length;
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
  }, [play, i, v, line]);

  const style = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ translateY: (1 - v.value) * tagline.rise }],
  }));

  return (
    <View style={styles.box} pointerEvents="none">
      <Animated.Text style={[styles.text, style]}>{line}</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Fixed height so nothing shifts when the line length changes (up to 3 lines).
  box: { height: tagline.lineHeight * 3, justifyContent: 'flex-end' },
  text: {
    fontFamily: fonts.medium,
    fontSize: tagline.size,
    lineHeight: tagline.lineHeight,
    letterSpacing: -0.8,
    color: colors.paper,
  },
});
