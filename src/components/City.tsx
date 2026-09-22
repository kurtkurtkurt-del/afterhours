import { useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/Button';
import Taglines from '@/components/Taglines';
import SoundToggle from '@/components/SoundToggle';
import Backdrop from '@/components/Backdrop';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

type Props = { play: boolean; soundOn: boolean; onToggleSound: () => void };

// yer tutucu. intro kalkınca isim ortadan köşeye kayar.
export default function City({ play, soundOn, onToggleSound }: Props) {
  const { width, height } = useWindowDimensions();
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const t = useSharedValue(0);
  const actions = useSharedValue(0);
  const insets = useSafeAreaInsets();

  const onLayout = (e: LayoutChangeEvent) => {
    if (!size) setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  };

  useEffect(() => {
    if (play && size) {
      t.set(withTiming(1, { duration: brand.move, easing: Easing.inOut(Easing.cubic) }));
      actions.set(withDelay(brand.move * 0.6, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })));
    }
  }, [play, size, t, actions]);

  const scale = brand.smallSize / brand.bigSize;
  // ortadaki merkezden, sol üstteki küçük halin merkezine olan yol
  const dx = size ? brand.left + (size.w * scale) / 2 - width / 2 : 0;
  const dy = size ? brand.top + (size.h * scale) / 2 - height / 2 : 0;

  const wordStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dx * t.value },
      { translateY: dy * t.value },
      { scale: 1 - (1 - scale) * t.value },
    ],
  }));

  const actionsStyle = useAnimatedStyle(() => ({
    opacity: actions.value,
    transform: [{ translateY: (1 - actions.value) * 16 }],
  }));

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Backdrop />
      <View style={styles.centre} pointerEvents="none">
        <Animated.Text onLayout={onLayout} style={[styles.word, wordStyle]}>
          afterhours
        </Animated.Text>
      </View>
      <Animated.View style={[styles.corner, actionsStyle]} pointerEvents={play ? 'auto' : 'none'}>
        <SoundToggle on={soundOn} onPress={onToggleSound} />
      </Animated.View>
      <Animated.View
        style={[styles.actions, { paddingBottom: insets.bottom + 24 }, actionsStyle]}
        pointerEvents={play ? 'auto' : 'none'}
      >
        <Taglines play={play} />
        <View style={styles.gap} />
        <Button label="sign up" onPress={() => router.push('/signup')} />
        <Button label="explore your city" kind="line" onPress={() => router.push('/explore')} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  centre: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  gap: { height: 16 },
  // ismin küçük haliyle aynı hizada, sağda
  corner: { position: 'absolute', right: brand.left, top: brand.top + (brand.smallSize * 1.2 - 16) / 2 },
  actions: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: brand.left, gap: 12 },
  word: { fontFamily: fonts.medium, fontSize: brand.bigSize, letterSpacing: -0.6, color: colors.paper },
});
