import { useEffect, useState } from 'react';
import Storage from 'expo-sqlite/kv-store';
import { LayoutChangeEvent, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/Button';
import Taglines from '@/components/Taglines';
import SoundToggle from '@/components/SoundToggle';
import Backdrop from '@/components/Backdrop';
import LangRow from '@/components/LangRow';
import { useT } from '@/i18n';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

type Props = { play: boolean; soundOn: boolean; onToggleSound: () => void; onPickSound: () => void };

// Placeholder. When the intro lifts, the name slides from the centre to the corner.
export default function City({ play, soundOn, onToggleSound, onPickSound }: Props) {
  const { width, height } = useWindowDimensions();
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const move = useSharedValue(0);
  const t = useT();
  const actions = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const [hint, setHint] = useState(() => Storage.getItemSync('hint.sound') !== '1');
  useEffect(() => {
    if (!play || !hint) return;
    const timer = setTimeout(() => {
      Storage.setItemSync('hint.sound', '1');
      setHint(false);
    }, 7000);
    return () => clearTimeout(timer);
  }, [play, hint]);

  const onLayout = (e: LayoutChangeEvent) => {
    if (!size) setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  };

  useEffect(() => {
    if (play && size) {
      move.set(withTiming(1, { duration: brand.move, easing: Easing.inOut(Easing.cubic) }));
      actions.set(withDelay(brand.move * 0.6, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })));
    }
  }, [play, size, move, actions]);

  const scale = brand.logoSmall / brand.logoBig;
  // Path from the centre to the centre of the small top-left position.
  const dx = size ? brand.left + (size.w * scale) / 2 - width / 2 : 0;
  const dy = size ? brand.top + (size.h * scale) / 2 - height / 2 : 0;

  const wordStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dx * move.value },
      { translateY: dy * move.value },
      { scale: 1 - (1 - scale) * move.value },
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
          afterhours<Text style={styles.dot}>.</Text>
        </Animated.Text>
      </View>
      <Animated.View style={[styles.corner, actionsStyle]} pointerEvents={play ? 'auto' : 'none'}>
        <SoundToggle on={soundOn} onPress={onToggleSound} onLongPress={onPickSound} />
        {hint ? <Text style={styles.hint}>{t('sound.hint')}</Text> : null}
      </Animated.View>
      <Animated.View style={[styles.lang, actionsStyle]} pointerEvents={play ? 'auto' : 'none'}>
        <LangRow />
      </Animated.View>
      <Animated.View
        style={[styles.actions, { paddingBottom: insets.bottom + 24 }, actionsStyle]}
        pointerEvents={play ? 'auto' : 'none'}
      >
        <Taglines play={play} />
        <View style={styles.gap} />
        <Button label={t('word.signin')} onPress={() => router.push({ pathname: '/signup', params: { mode: 'in' } })} />
        <Button label={t('word.signup')} kind="line" onPress={() => router.push('/signup')} />
        <Button label={t('home.explore')} kind="line" onPress={() => router.push('/film')} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  centre: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  gap: { height: 16 },
  // aligned with the small name, on the right
  corner: { position: 'absolute', right: brand.left, top: brand.top, alignItems: 'flex-end', gap: 6 },
  // just below the small name, top left
  lang: { position: 'absolute', left: brand.left, top: brand.top + 46 },
  hint: { fontFamily: fonts.regular, fontSize: 11, color: colors.mute },
  actions: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: brand.left, gap: 12 },
  word: { fontFamily: fonts.logo, fontSize: brand.logoBig, letterSpacing: -0.5, color: colors.paper },
  dot: { color: colors.spot },
});
