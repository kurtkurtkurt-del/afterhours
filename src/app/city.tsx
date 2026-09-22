import { useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Backdrop from '@/components/Backdrop';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// yer tutucu. introdan aynı kareyle devralır: isim ortada başlar, köşeye kayar.
export default function CityScreen() {
  const { width, height } = useWindowDimensions();
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const t = useSharedValue(0);

  const onLayout = (e: LayoutChangeEvent) => {
    if (!size) setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  };

  useEffect(() => {
    if (size) t.set(withTiming(1, { duration: brand.move, easing: Easing.inOut(Easing.cubic) }));
  }, [size, t]);

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

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Backdrop />
      <View style={styles.centre} pointerEvents="none">
        <Animated.Text onLayout={onLayout} style={[styles.word, wordStyle]}>
          afterhours
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  centre: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  word: { fontFamily: fonts.medium, fontSize: brand.bigSize, letterSpacing: -0.6, color: colors.paper },
});
