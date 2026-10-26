import { Pressable, StyleSheet, View } from 'react-native';
import { useT } from '@/i18n';
import { scrim } from '@/theme/tokens';

// The dark veil under a bottom sheet, in two parts: a veil over the WHOLE screen, so the
// sheet's rounded corners stand on the dimmed page and not on a bright strip (owner,
// 22.10.2026: "the dimming is a hard rectangle while the sheet is rounded"), and a
// transparent pressable that fills the space above the sheet and closes it. Place it first
// inside the Modal, before the sheet.
export default function Scrim({ onPress }: { onPress: () => void }) {
  const t = useT();
  return (
    <>
      <View pointerEvents="none" style={styles.veil} />
      <Pressable style={styles.above} onPress={onPress} accessibilityRole="button" accessibilityLabel={t('word.close')} />
    </>
  );
}

const styles = StyleSheet.create({
  veil: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: scrim(0.36) },
  above: { flex: 1 },
});
