import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useT } from '@/i18n';
import { colors, fonts } from '@/theme/tokens';

type Props = { on: boolean; onPress: () => void; onLongPress?: () => void; tone?: 'paper' | 'ink' | 'photo' };

// Small text and a dot at the top right. The dot turns spot red when on.
export default function SoundToggle({ on, onPress, onLongPress, tone = 'paper' }: Props) {
  const t = useT();
  const ink = tone === 'ink';
  const photo = tone === 'photo'; // over a picture or a coloured room: light in both themes
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={350} hitSlop={16} accessibilityRole="switch" accessibilityLabel={t('sound.a11y')} accessibilityHint={t('sound.a11y.hint')} accessibilityState={{ checked: on }} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Text style={[styles.label, ink && styles.labelInk, photo && styles.labelPhoto]}>{on ? t('sound.on') : t('sound.off')}</Text>
      <View style={[styles.dot, ink && styles.dotInk, photo && styles.dotPhoto, on && styles.dotOn]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pressed: { opacity: 0.6 },
  label: { fontFamily: fonts.regular, fontSize: 13, letterSpacing: 0.2, color: colors.paper },
  labelInk: { color: colors.ink },
  labelPhoto: { color: colors.onPhoto },
  dot: { width: 6, height: 6, borderRadius: 3, borderWidth: 1, borderColor: colors.paper },
  dotInk: { borderColor: colors.ink },
  dotPhoto: { borderColor: colors.onPhoto },
  dotOn: { backgroundColor: colors.spot, borderColor: colors.spot },
});
