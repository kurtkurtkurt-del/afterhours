import { Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// sol üstte "back". geçmiş yoksa ana ekrana döner.
export default function BackButton() {
  const go = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <Pressable onPress={go} hitSlop={16} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
      <Text style={styles.text}>back</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: { position: 'absolute', top: brand.top, left: brand.left, zIndex: 1 },
  pressed: { opacity: 0.6 },
  text: { fontFamily: fonts.regular, fontSize: 13, letterSpacing: 0.2, color: colors.paper },
});
