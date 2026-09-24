import { Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// sol üstte "back". geçmiş yoksa ana ekrana döner.
type Props = { tone?: 'paper' | 'ink' };

export default function BackButton({ tone = 'paper' }: Props) {
  const go = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <Pressable onPress={go} hitSlop={16} accessibilityRole="button" accessibilityLabel="back" style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
      <Text style={[styles.text, tone === 'ink' && styles.ink]}>back</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: { position: 'absolute', top: brand.top, left: brand.left, zIndex: 1 },
  pressed: { opacity: 0.6 },
  text: { fontFamily: fonts.regular, fontSize: 13, letterSpacing: 0.2, color: colors.paper },
  ink: { color: colors.ink },
});
