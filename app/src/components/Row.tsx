import { createContext, useContext, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';

// panel: birbirine ait satırları ince çerçeveli tek kutuda toplar (ayarlar).
// içindeki satırlar kenardan boşluk alır; son satırın alt çizgisi çerçeveye karışır.
const InPanel = createContext(false);

export function Panel({ children }: { children: ReactNode }) {
  return (
    <InPanel.Provider value={true}>
      <View style={styles.panel}>
        <View style={styles.panelIn}>{children}</View>
      </View>
    </InPanel.Provider>
  );
}

type RowProps = { label: string; hint?: string; right?: ReactNode; onPress?: () => void; danger?: boolean };

// ayar satırı: solda etiket (ve altında açıklama), sağda değer ya da anahtar.
export function Row({ label, hint, right, onPress, danger }: RowProps) {
  const boxed = useContext(InPanel);
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, boxed && styles.rowBoxed, pressed && styles.pressed]}>
      <View style={styles.left}>
        <Text style={[styles.label, danger && styles.danger]}>{label}</Text>
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

// more: sayfa içinde bir yere açılır (›) · out: uygulamanın dışına çıkar (↗)
export function Value({ text, more }: { text: string; more?: boolean }) {
  return (
    <View style={styles.valueRow}>
      <Text style={styles.value} numberOfLines={1}>
        {text}
      </Text>
      {more ? <Mark kind="more" /> : null}
    </View>
  );
}

export function Mark({ kind }: { kind: 'more' | 'out' }) {
  return <Text style={kind === 'more' ? styles.more : styles.out}>{kind === 'more' ? '›' : '↗'}</Text>;
}

export function Section({ title }: { title: string }) {
  // başlık hep çevrilmiş söz: büyük harf uygulamanın dilinde
  const { up } = useLang();
  return <Text style={styles.section}>{up(title)}</Text>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.ink3 },
  rowBoxed: { paddingHorizontal: 14 },
  panel: { borderWidth: 1, borderColor: colors.ink3, borderRadius: radius.md, overflow: 'hidden', marginTop: 10 },
  panelIn: { marginBottom: -1 },
  danger: { color: colors.spotText },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, maxWidth: '62%' },
  more: { fontFamily: fonts.regular, fontSize: 18, lineHeight: 20, color: colors.paper },
  out: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 20, color: colors.paper },
  pressed: { opacity: 0.6 },
  left: { flex: 1, gap: 2 },
  label: { fontFamily: fonts.medium, fontSize: 16, letterSpacing: -0.2, color: colors.paper },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute },
  value: { flexShrink: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.mute },
  section: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.mute, marginTop: 28, marginBottom: 2 },
  sw: { width: 38, height: 22, borderWidth: 1, borderColor: colors.mute, borderRadius: radius.pill, justifyContent: 'center', padding: 3 },
  swOn: { borderColor: colors.spot },
  knob: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.mute },
  knobOn: { backgroundColor: colors.spot, alignSelf: 'flex-end' },
});
