import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, radius } from '@/theme/tokens';

type Props = { label: string; onPress?: () => void; kind?: 'fill' | 'line' };

// Two button styles on dark backgrounds: filled (paper) and outlined (paper border).
export default function Button({ label, onPress, kind = 'fill' }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.base, kind === 'fill' ? styles.fill : styles.line, pressed && styles.pressed]}
    >
      <Text style={[styles.label, kind === 'fill' ? styles.labelInk : styles.labelPaper]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.paper, borderRadius: radius.md },
  fill: { backgroundColor: colors.paper },
  line: { backgroundColor: 'transparent' },
  pressed: { opacity: 0.7 },
  label: { fontFamily: fonts.medium, fontSize: 16, letterSpacing: -0.2 },
  labelInk: { color: colors.ink },
  labelPaper: { color: colors.paper },
});
