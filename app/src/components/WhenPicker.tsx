import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Night } from '@/data/deck';
import { countWhen, dayName, dayWhen, type When } from '@/data/when';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

type Props = {
  open: boolean;
  rows: Night[]; // the deck before the time filter, for the counts and the dots
  selected: When | null;
  onSelect: (when: When | null) => void;
  onClose: () => void;
};

const PRESETS: When[] = ['weekend', 'week', 'month'];

// When: a strip of the next ten days (a red dot where something is on; today is
// "tonight", tomorrow "tomorrow"), and under it the longer ranges as pills.
export default function WhenPicker({ open, rows, selected, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { t, tx, up } = useLang();
  const days = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 10 }, (_, i) => {
      const d = new Date(start.getTime() + i * 86_400_000);
      const when: When = i === 0 ? 'tonight' : i === 1 ? 'tomorrow' : dayWhen(d);
      return { d, when, n: countWhen(rows, when) };
    });
  }, [rows]);
  const choose = (w: When | null) => {
    onSelect(w);
    onClose();
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.dim} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.grip} />
        <Text style={styles.step}>{up(t('filter.when'))}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
          {days.map(({ d, when, n }, i) => {
            const on = selected === when;
            return (
              <Pressable key={when} onPress={() => choose(when)} accessibilityRole="button" accessibilityState={{ selected: on }} style={({ pressed }) => [styles.day, on && styles.dayOn, n === 0 && !on && styles.dayEmpty, pressed && styles.pressed]}>
                <Text style={[styles.dayName, on && styles.dayNameOn]}>{i === 0 ? t('when.tonight') : dayName(d)}</Text>
                <Text style={[styles.dayNum, on && styles.dayNumOn]}>{d.getDate()}</Text>
                <View style={[styles.dot, n > 0 && styles.dotOn]} />
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.pills}>
          {PRESETS.map((w) => {
            const on = selected === w;
            return (
              <Pressable key={w} onPress={() => choose(w)} accessibilityRole="button" accessibilityState={{ selected: on }} style={({ pressed }) => [styles.pill, on && styles.pillOn, pressed && styles.pressed]}>
                <Text style={[styles.pillText, on && styles.pillTextOn]}>{tx('when.' + w, w)}</Text>
                <Text style={[styles.pillCount, on && styles.pillTextOn]}>{countWhen(rows, w)}</Text>
              </Pressable>
            );
          })}
          <Pressable onPress={() => choose(null)} accessibilityRole="button" accessibilityState={{ selected: selected === null }} style={({ pressed }) => [styles.pill, selected === null && styles.pillOn, pressed && styles.pressed]}>
            <Text style={[styles.pillText, selected === null && styles.pillTextOn]}>{t('when.any')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { flex: 1, backgroundColor: 'rgba(14,13,12,0.6)' },
  sheet: { backgroundColor: colors.ink, borderWidth: 1, borderBottomWidth: 0, borderColor: colors.ink3, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingTop: 10 },
  grip: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.ink3, marginBottom: 14 },
  step: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.4, color: colors.meta, marginBottom: 12, paddingHorizontal: brand.left },
  pressed: { opacity: 0.6 },
  days: { gap: 8, paddingHorizontal: brand.left },
  day: { width: 56, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.ink3, alignItems: 'center', gap: 2 },
  dayOn: { backgroundColor: colors.paper, borderColor: colors.paper },
  dayEmpty: { opacity: 0.45 },
  dayName: { fontFamily: fonts.regular, fontSize: 11, color: colors.meta },
  dayNameOn: { color: colors.ink2 },
  dayNum: { fontFamily: fonts.semibold, fontSize: 22, letterSpacing: -0.6, color: colors.paper },
  dayNumOn: { color: colors.ink },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 3, backgroundColor: 'transparent' },
  dotOn: { backgroundColor: colors.spot },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: brand.left, marginTop: 18 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 15, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.ink3 },
  pillOn: { backgroundColor: colors.paper, borderColor: colors.paper },
  pillText: { fontFamily: fonts.medium, fontSize: 15, color: colors.paper },
  pillTextOn: { color: colors.ink },
  pillCount: { fontFamily: fonts.jet, fontSize: 11, color: colors.meta },
});
