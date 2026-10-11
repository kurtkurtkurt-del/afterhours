import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

type Props = {
  open: boolean;
  title: string;
  value: string | null; // yyyy-mm-dd
  min?: string | null; // no day before this one
  onSelect: (day: string) => void;
  onClose: () => void;
};

const two = (n: number) => String(n).padStart(2, '0');
export const isoDay = (d: Date) => `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
export const fromIso = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const shortDay = (s: string | null) => (s ? `${s.slice(8, 10)}.${s.slice(5, 7)}` : '');

// One month at a time, weeks from Monday, for the days of a trip (12.10.2026). Days
// before `min` (and before today) are dimmed; a tap picks and closes.
export default function DayPicker({ open, title, value, min, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { lang, up } = useLang();
  const first = value ? fromIso(value) : min ? fromIso(min) : new Date();
  const [month, setMonth] = useState(() => new Date(first.getFullYear(), first.getMonth(), 1));
  const today = isoDay(new Date());
  const floor = min && min > today ? min : today;

  const cells = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const lead = (start.getDay() + 6) % 7; // Monday first
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const out: (string | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= days; d++) out.push(isoDay(new Date(month.getFullYear(), month.getMonth(), d)));
    while (out.length % 7) out.push(null);
    return out;
  }, [month]);
  const monthName = month.toLocaleDateString(lang === 'tr' ? 'tr-TR' : lang === 'de' ? 'de-DE' : 'en-GB', { month: 'long', year: 'numeric' }).toLowerCase();
  const weekdays = useMemo(() => {
    const monday = new Date(2024, 0, 1); // a Monday
    return Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * 86_400_000).toLocaleDateString(lang === 'tr' ? 'tr-TR' : lang === 'de' ? 'de-DE' : 'en-GB', { weekday: 'short' }).slice(0, 2).toLowerCase());
  }, [lang]);
  const step = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.dim} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.grip} />
        <Text style={styles.title}>{up(title)}</Text>
        <View style={styles.monthRow}>
          <Pressable onPress={() => step(-1)} hitSlop={12} accessibilityRole="button" style={styles.arrow}>
            <Text style={styles.arrowText}>‹</Text>
          </Pressable>
          <Text style={styles.month}>{monthName}</Text>
          <Pressable onPress={() => step(1)} hitSlop={12} accessibilityRole="button" style={styles.arrow}>
            <Text style={styles.arrowText}>›</Text>
          </Pressable>
        </View>
        <View style={styles.grid}>
          {weekdays.map((w, i) => (
            <Text key={`w${i}`} style={styles.weekday}>{w}</Text>
          ))}
          {cells.map((day, i) => {
            if (!day) return <View key={`e${i}`} style={styles.cell} />;
            const off = day < floor;
            const on = day === value;
            return (
              <Pressable key={day} onPress={off ? undefined : () => (onSelect(day), onClose())} style={[styles.cell, on && styles.cellOn]} accessibilityRole="button" accessibilityState={{ disabled: off, selected: on }}>
                <Text style={[styles.day, off && styles.dayOff, on && styles.dayOn, day === today && !on && styles.dayToday]}>{Number(day.slice(8, 10))}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { flex: 1, backgroundColor: 'rgba(14,13,12,0.6)' },
  sheet: { backgroundColor: colors.ink, borderWidth: 1, borderBottomWidth: 0, borderColor: colors.ink3, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: brand.left, paddingTop: 10 },
  grip: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.ink3, marginBottom: 14 },
  title: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.4, color: colors.meta },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 8 },
  month: { fontFamily: fonts.semibold, fontSize: 22, letterSpacing: -0.6, color: colors.paper },
  arrow: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontFamily: fonts.medium, fontSize: 24, color: colors.paper },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.285%', textAlign: 'center', fontFamily: fonts.jet, fontSize: 9, letterSpacing: 1, color: colors.meta, paddingVertical: 6 },
  cell: { width: '14.285%', height: 42, alignItems: 'center', justifyContent: 'center' },
  cellOn: { backgroundColor: colors.paper, borderRadius: radius.sm },
  day: { fontFamily: fonts.regular, fontSize: 15, color: colors.paper },
  dayOff: { color: colors.ink3 },
  dayOn: { color: colors.ink, fontFamily: fonts.medium },
  dayToday: { color: colors.spotText },
});
