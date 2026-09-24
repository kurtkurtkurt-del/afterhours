import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/theme/tokens';

// ayar satırı: solda etiket (ve altında açıklama), sağda değer ya da anahtar.
export function Row({ label, hint, right, onPress }: { label: string; hint?: string; right?: ReactNode; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.left}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

// iki durumlu anahtar: içi dolu spot nokta = açık
export function Switch({ on }: { on: boolean }) {
  return (
    <View style={[styles.sw, on && styles.swOn]}>
      <View style={[styles.knob, on && styles.knobOn]} />
    </View>
  );
}

export function Value({ text }: { text: string }) {
  return <Text style={styles.value}>{text}</Text>;
}

export function Section({ title }: { title: string }) {
  return <Text style={styles.section}>{title}</Text>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.ink3 },
  pressed: { opacity: 0.6 },
  left: { flex: 1, gap: 2 },
  label: { fontFamily: fonts.medium, fontSize: 16, letterSpacing: -0.2, color: colors.paper },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute },
  value: { fontFamily: fonts.regular, fontSize: 14, color: colors.mute },
  section: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.mute, marginTop: 28, marginBottom: 2 },
  sw: { width: 38, height: 22, borderWidth: 1, borderColor: colors.mute, justifyContent: 'center', padding: 3 },
  swOn: { borderColor: colors.spot },
  knob: { width: 14, height: 14, backgroundColor: colors.mute },
  knobOn: { backgroundColor: colors.spot, alignSelf: 'flex-end' },
});
