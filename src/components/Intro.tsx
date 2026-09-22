import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts, intro } from '@/theme/tokens';

type Props = { onDone: () => void };

// seçenek 3: akşam çöküyor. kâğıt tek tonla mürekkebe döner, karanlıkta isim belirir.
export default function Intro({ onDone }: Props) {
  const veil = useSharedValue(0);
  const word = useSharedValue(0);
  const next = useSharedValue(0);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    veil.value = withDelay(
      intro.hold,
      withTiming(1, { duration: intro.dusk, easing: Easing.bezier(0.5, 0, 0.9, 0.4) }),
    );
    word.value = withDelay(intro.wordDelay, withTiming(1, { duration: intro.word }));
    next.value = withDelay(intro.nextDelay, withTiming(1, { duration: intro.next }));

    const bar = setTimeout(() => setDark(true), intro.hold + intro.dusk * 0.55);
    const leave = setTimeout(onDone, intro.leaveAt);
    return () => {
      clearTimeout(bar);
      clearTimeout(leave);
    };
  }, [veil, word, next, onDone]);

  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));
  const wordStyle = useAnimatedStyle(() => ({ opacity: word.value }));
  const nextStyle = useAnimatedStyle(() => ({ opacity: next.value }));

  return (
    <Pressable style={styles.root} onPress={onDone}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Animated.View style={[styles.veil, veilStyle]} />
      <Animated.Text style={[styles.word, wordStyle]}>afterhours</Animated.Text>
      <Animated.View style={[styles.next, nextStyle]}>
        <Text style={styles.nextText}>bu gece nerede?</Text>
        <Text style={styles.nextText}>münih · istanbul</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  veil: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.ink },
  word: {
    fontFamily: fonts.medium,
    fontSize: 30,
    letterSpacing: -0.6,
    color: colors.paper,
  },
  next: { position: 'absolute', top: '56%', alignItems: 'center', gap: 2 },
  nextText: { fontFamily: fonts.regular, fontSize: 14, color: colors.paper2, opacity: 0.8 },
});
