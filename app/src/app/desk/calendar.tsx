import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import StaffPage, { Quiet } from '@/components/StaffPage';
import { Mark, Panel, Row, Section } from '@/components/Row';
import { myVenues, venueNights, type MyVenue, type VenueNight } from '@/data/venues';
import { isoDay } from '@/components/DayPicker';
import { useRefreshOnFocus } from '@/hooks/useRefresh';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

// The room's month: a grid, weeks from Monday, a dot on every day with a night (red when
// one is on top), the picked day's nights under it, and + on a free day opens the night
// form with that day and this room filled in.
export default function Calendar() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  const tick = useRefreshOnFocus();
  const { t, tx, up } = useLang();
  const [room, setRoom] = useState<MyVenue | null>(null);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [picked, setPicked] = useState<string>(() => isoDay(new Date()));
  const [nights, setNights] = useState<VenueNight[] | null>(null);
  useEffect(() => {
    if (!venue) return;
    myVenues().then((l) => setRoom(l.find((r) => r.id === venue) ?? null), () => {});
    const from = new Date(month.getFullYear(), month.getMonth() - 1, 1).toISOString();
    const to = new Date(month.getFullYear(), month.getMonth() + 2, 1).toISOString();
    venueNights(venue, from, to).then(setNights, () => setNights([]));
  }, [venue, month, tick]);

  const byDay = useMemo(() => {
    const m = new Map<string, VenueNight[]>();
    (nights ?? []).forEach((n) => {
      const k = isoDay(new Date(n.starts_at));
      m.set(k, [...(m.get(k) ?? []), n]);
    });
    return m;
  }, [nights]);

  // the cells: blanks before the first, then the days
  const first = (month.getDay() + 6) % 7;
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => isoDay(new Date(month.getFullYear(), month.getMonth(), i + 1)))];
  while (cells.length % 7) cells.push(null);
  const today = isoDay(new Date());
  const monthName = up(month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }));
  const onDay = byDay.get(picked) ?? [];
  const plan = () => room && router.push({ pathname: '/panel/night', params: { venue: room.id, city: room.city_slug, date: picked } });

  return (
    <StaffPage title={t('desk.calendar')}>
      <Text style={styles.who}>{up(room?.name ?? '…')}</Text>
      <View style={styles.head}>
        <Pressable onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} hitSlop={10} accessibilityRole="button" style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}>
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <Text style={styles.month}>{monthName}</Text>
        <Pressable onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} hitSlop={10} accessibilityRole="button" style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}>
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      </View>
      <View style={styles.week}>
        {DAYS.map((d) => (
          <Text key={d} style={styles.weekDay}>{up(tx('day.' + d, d))}</Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day, i) => {
          const list = day ? byDay.get(day) ?? [] : [];
          const on = day === picked;
          return (
            <Pressable key={i} disabled={!day} onPress={() => day && setPicked(day)} accessibilityRole="button" style={[styles.cell, on && styles.cellOn]}>
              {day ? <Text style={[styles.day, day === today && styles.today, on && styles.dayOn, day < today && styles.dayPast]}>{Number(day.slice(8, 10))}</Text> : null}
              <View style={styles.dots}>
                {list.slice(0, 3).map((n) => <View key={n.id} style={[styles.dot, n.featured_at && styles.dotTop, on && styles.dotOn]} />)}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Section title={`${t('desk.calendar.day')} · ${picked.slice(8, 10)}.${picked.slice(5, 7)}`} />
      {nights === null ? <Quiet text="…" /> : null}
      {onDay.length ? (
        <Panel>
          {onDay.map((n) => (
            <Row
              key={n.id}
              label={`${n.featured_at ? '★ ' : ''}${n.title.toLowerCase()}`}
              hint={`${n.starts_at.slice(11, 16)} · ${t('desk.night.counts', { kept: n.kept, going: n.going, tickets: n.tickets, comments: n.comments })}`}
              right={<Mark kind="more" />}
              onPress={() => (n.source === 'staff' || n.source === 'user' ? router.push({ pathname: '/panel/night', params: { id: n.id } }) : router.push(`/night/${n.slug}`))}
            />
          ))}
        </Panel>
      ) : nights ? (
        <Quiet text={t('desk.calendar.free')} />
      ) : null}
      {picked >= today ? (
        <Pressable onPress={plan} accessibilityRole="button" accessibilityLabel={t('desk.night.new')} style={({ pressed }) => [styles.plus, pressed && styles.pressed]}>
          <Text style={styles.plusText}>+ {t('desk.night.new')}</Text>
        </Pressable>
      ) : null}
    </StaffPage>
  );
}

const styles = StyleSheet.create({
  who: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.spotText, marginBottom: 14 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  month: { fontFamily: fonts.medium, fontSize: 15, letterSpacing: 1, color: colors.paper },
  arrow: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontFamily: fonts.regular, fontSize: 24, color: colors.paper },
  pressed: { opacity: 0.6 },
  week: { flexDirection: 'row' },
  weekDay: { width: `${100 / 7}%`, textAlign: 'center', fontFamily: fonts.jet, fontSize: 9, letterSpacing: 1, color: colors.meta, paddingBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderLeftWidth: 1, borderColor: colors.ink3 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.ink3, padding: 5, justifyContent: 'space-between' },
  cellOn: { backgroundColor: colors.paper },
  day: { fontFamily: fonts.medium, fontSize: 13, color: colors.paper, fontVariant: ['tabular-nums'] },
  dayPast: { color: colors.mute },
  today: { color: colors.spotText },
  dayOn: { color: colors.ink },
  dots: { flexDirection: 'row', gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.mute },
  dotTop: { backgroundColor: colors.spot },
  dotOn: { backgroundColor: colors.ink },
  plus: { marginTop: 16, height: 48, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  plusText: { fontFamily: fonts.medium, fontSize: 15, color: colors.paper },
});
