import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/theme/tokens';

type Props = { on: boolean; onPress: () => void; tone?: 'paper' | 'ink' };

// sağ üstte küçük yazı ve bir nokta. açıkken nokta spot renge döner.
export default function SoundToggle({ on, onPress, tone = 'paper' }: Props) {
  const ink = tone === 'ink';
  return (
    <Pressable onPress={onPress} hitSlop={16} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Text style={[styles.label, ink && styles.labelInk]}>{on ? 'sound on' : 'sound'}</Text>
      <View style={[styles.dot, ink && styles.dotInk, on && styles.dotOn]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pressed: { opacity: 0.6 },
  label: { fontFamily: fonts.regular, fontSize: 13, letterSpacing: 0.2, color: colors.paper },
  labelInk: { color: colors.ink },
  dot: { width: 6, height: 6, borderRadius: 3, borderWidth: 1, borderColor: colors.paper },
  dotInk: { borderColor: colors.ink },
  dotOn: { backgroundColor: colors.spot, borderColor: colors.spot },
});
