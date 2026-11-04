import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Scrim from '@/components/Scrim';
import NightThumb from '@/components/NightThumb';
import { fromIso, isoDay, shortDay } from '@/components/DayPicker';
import { Quiet, Said } from '@/components/StaffPage';
import { cityPhotos, cityPhotosNow, type CityPhoto } from '@/data/cityPhotos';
import { groupLegNights, groupLegs, groupLegsSet, why, type Group, type Leg, type LegForm, type LegNight } from '@/data/groups';
import { allCities, type Place } from '@/data/staff';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// The passport of a travel group as ticket stubs (design/travel-5.html, flow 5 "the
// stubs", owner 03.11.2026): every city a paper stub, fanned in a wallet, the city
// large with the red dot, arrive and leave, a stamp (arrived · in n days · been there).
// Tap a stub and it slides out: its month, where the first day and then the last are
// tapped (the next city moves with it), the nights the group kept there, "swipe there",
// the photos stamp. The dashed stub at the end is the next city: type three letters,
// tap it, it starts the day the last one ends and takes two nights.

const PAPER = '#efe9dc';
const PAPER_INK = '#0E0D0C';
const PAPER_MUTE = '#6C6961';
const PAPER_RULE = '#d9d5cc';
const STAMP_BLUE = '#2c4a8a';
const NIGHTS = 2; // a new city's nights, until the days are tapped

type Props = { id: string; group: Group; top: number; onSwipe: () => void };

const today = () => isoDay(new Date());
const daysUntil = (iso: string) => Math.round((fromIso(iso).getTime() - fromIso(today()).getTime()) / 86_400_000);
const plus = (iso: string, n: number) => isoDay(new Date(fromIso(iso).getTime() + n * 86_400_000));
const toForm = (legs: Leg[]): LegForm[] => legs.map((l) => ({ city: l.city_slug, from: l.date_from, to: l.date_to }));

export default function Passport({ id, group, top, onSwipe }: Props) {
  const { t, up } = useLang();
  const insets = useSafeAreaInsets();
  const [legs, setLegs] = useState<Leg[] | null>(null);
  const [photos, setPhotos] = useState<Record<string, CityPhoto>>({});
  const [said, setSaid] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    groupLegs(id).then(
      (rows) => {
        setLegs(rows);
        const cities = rows.map((l) => ({ id: l.city_slug, name: l.city_name }));
        setPhotos(cityPhotosNow(cities));
        cityPhotos(cities).then((p) => setPhotos((old) => ({ ...old, ...p })), () => {});
      },
      (e) => setSaid(why(e)),
    );
  }, [id]);
  useEffect(load, [load]);

  // Every change writes the whole route (group_legs_set) and reads it back.
  const write = (next: LegForm[]) => groupLegsSet(id, next).then(load, (e) => setSaid(why(e)));
  const setDays = (leg: Leg, from: string, to: string) => {
    if (!legs) return;
    // the cities after this one keep their nights and move with its last day
    let cursor = to;
    const next = legs.map((l) => {
      if (l.leg_no < leg.leg_no) return { city: l.city_slug, from: l.date_from, to: l.date_to };
      if (l.id === leg.id) return { city: l.city_slug, from, to };
      const nights = Math.max(0, Math.round((fromIso(l.date_to).getTime() - fromIso(l.date_from).getTime()) / 86_400_000));
      const f = cursor;
      cursor = plus(f, nights);
      return { city: l.city_slug, from: f, to: cursor };
    });
    setLegs(legs.map((l) => (l.id === leg.id ? { ...l, date_from: from, date_to: to } : l)));
    write(next);
  };
  const addCity = (slug: string) => {
    const last = legs?.[legs.length - 1];
    const from = last ? last.date_to : today();
    setAdding(false);
    write([...toForm(legs ?? []), { city: slug, from, to: plus(from, NIGHTS) }]);
  };
  const remove = (leg: Leg) =>
    Alert.alert(t('trip.remove'), t('trip.remove.sure', { city: leg.city_name.toLowerCase() }), [
      { text: t('staff.delete.keep'), style: 'cancel' },
      { text: t('trip.remove'), style: 'destructive', onPress: () => write(toForm((legs ?? []).filter((l) => l.id !== leg.id))) },
    ]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingTop: top + 10, paddingHorizontal: brand.left, paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
        <Said text={said} bad />
        {legs === null ? <Quiet text="…" /> : null}
        {legs?.map((leg, i) => (
          <Stub
            key={leg.id}
            leg={leg}
            n={i + 1}
            first={i === 0}
            photo={photos[leg.city_slug]}
            open={open === leg.id}
            onOpen={() => setOpen(open === leg.id ? null : leg.id)}
            onDays={(from, to) => setDays(leg, from, to)}
            onSwipe={onSwipe}
            onPhotos={() => router.push({ pathname: '/groups/memories', params: { id: group.id } })}
            onRemove={() => remove(leg)}
            groupId={group.id}
          />
        ))}
        <Pressable onPress={() => setAdding(true)} style={({ pressed }) => [styles.next, pressed && styles.pressed]} accessibilityRole="button">
          <Text style={styles.nextTitle}>+ {t('trip.next')}</Text>
          <Text style={styles.nextHint}>{t(legs?.length ? 'trip.next.hint' : 'trip.first.hint')}</Text>
        </Pressable>
        <Text style={styles.travelling}>{up(t('trip.travelling', { n: group.members.length }))}</Text>
      </ScrollView>
      {adding ? <CitySheet open taken={(legs ?? []).map((l) => l.city_slug)} onPick={addCity} onClose={() => setAdding(false)} /> : null}
    </View>
  );
}

function Stub({ leg, n, first, photo, open, onOpen, onDays, onSwipe, onPhotos, onRemove, groupId }: { leg: Leg; n: number; first: boolean; photo?: CityPhoto; open: boolean; onOpen: () => void; onDays: (from: string, to: string) => void; onSwipe: () => void; onPhotos: () => void; onRemove: () => void; groupId: string }) {
  const { t, tn, up } = useLang();
  const now = today();
  const stamp = leg.date_to < now ? t('trip.been') : leg.date_from <= now ? t('trip.arrived', { d: shortDay(leg.date_from) }) : tn('trip.inDays', daysUntil(leg.date_from));
  const stampColor = leg.date_from <= now ? STAMP_BLUE : PAPER_MUTE;
  const nights = Math.max(1, Math.round((fromIso(leg.date_to).getTime() - fromIso(leg.date_from).getTime()) / 86_400_000));
  const [kept, setKept] = useState<LegNight[] | null>(null);
  useEffect(() => {
    if (open && kept === null) groupLegNights(groupId, leg.id).then(setKept, () => setKept([]));
  }, [open, kept, groupId, leg.id]);
  return (
    <Pressable onPress={onOpen} style={[styles.stub, !first && styles.stubBehind, open && styles.stubOpen]} accessibilityRole="button" accessibilityState={{ expanded: open }}>
      {photo ? <Image source={{ uri: photo.uri }} style={styles.watermark} contentFit="cover" cachePolicy="memory-disk" /> : null}
      {!first ? <View style={styles.perf} /> : null}
      <View style={styles.hd}>
        <Text style={styles.mono}>{up(`${t('trip.leg', { n })} · ${leg.country_slug ?? ''}`)}</Text>
        <Text style={styles.mono}>{up(tn('trip.nights', nights))}</Text>
      </View>
      <Text style={styles.city} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {leg.city_name.toLowerCase()}
        <Text style={styles.cityDot}>.</Text>
      </Text>
      <View style={[styles.stamp, { borderColor: stampColor }]}>
        <Text style={[styles.stampText, { color: stampColor }]}>{up(stamp)}</Text>
      </View>
      <View style={styles.dd}>
        <View>
          <Text style={styles.ddLabel}>{up(t('groups.route.arrive'))}</Text>
          <Text style={styles.ddValue}>{shortDay(leg.date_from)}</Text>
        </View>
        <View>
          <Text style={styles.ddLabel}>{up(t('groups.route.leave'))}</Text>
          <Text style={styles.ddValue}>{shortDay(leg.date_to)}</Text>
        </View>
        {open ? (
          <Pressable onPress={onSwipe} style={({ pressed }) => [styles.swipeThere, pressed && styles.pressed]} accessibilityRole="button">
            <Text style={styles.swipeThereText}>{t('trip.swipeThere')} ›</Text>
          </Pressable>
        ) : null}
      </View>
      {open ? (
        <View onStartShouldSetResponder={() => true}>
          <Month from={leg.date_from} to={leg.date_to} onDays={onDays} />
          <View style={styles.rule} />
          <Text style={styles.mono}>{up(t('trip.kept', { n: kept?.length ?? leg.kept }))}</Text>
          {kept && !kept.length ? <Text style={styles.none}>{t('trip.kept.none')}</Text> : null}
          {kept?.map((x) => (
            <Pressable key={x.id} onPress={() => router.push({ pathname: '/night/[slug]', params: { slug: x.slug } })} style={({ pressed }) => [styles.night, pressed && styles.pressed]} accessibilityRole="button">
              <View style={styles.poster}><NightThumb night={x} /></View>
              <View style={styles.nightText}>
                <Text style={styles.nightTitle} numberOfLines={1}>{x.title.toLowerCase()}</Text>
                <Text style={styles.nightMeta} numberOfLines={1}>{[x.starts_at ? shortDay(x.starts_at.slice(0, 10)) : null, x.venue_name?.toLowerCase()].filter(Boolean).join(' · ')}</Text>
              </View>
              <Text style={[styles.nightIn, x.status === 'match' && styles.nightInAll]}>{up(t('trip.in', { n: x.yes, of: x.members }))}</Text>
            </Pressable>
          ))}
          <View style={styles.rule} />
          <View style={styles.bottomRow}>
            <Pressable onPress={onRemove} hitSlop={8} accessibilityRole="button">
              <Text style={styles.remove}>{t('trip.remove')}</Text>
            </Pressable>
            <Pressable onPress={onPhotos} style={[styles.stamp, styles.stampRed]} accessibilityRole="button">
              <Text style={[styles.stampText, { color: colors.spot }]}>{up(t('trip.photos', { n: leg.photos }))}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

// One month on the stub, weeks from Monday: tap the first day, then the last. The
// range is drawn as it stands; the second tap writes it.
function Month({ from, to, onDays }: { from: string; to: string; onDays: (from: string, to: string) => void }) {
  const { t, lang, up } = useLang();
  const [month, setMonth] = useState(() => {
    const d = fromIso(from);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [start, setStart] = useState<string | null>(null); // the first day, waiting for the last
  const cells = useMemo(() => {
    const lead = (month.getDay() + 6) % 7;
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const out: (string | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= days; d++) out.push(isoDay(new Date(month.getFullYear(), month.getMonth(), d)));
    while (out.length % 7) out.push(null);
    return out;
  }, [month]);
  const locale = lang === 'tr' ? 'tr-TR' : lang === 'de' ? 'de-DE' : 'en-GB';
  const monthName = month.toLocaleDateString(locale, { month: 'long', year: 'numeric' }).toLowerCase();
  const weekdays = useMemo(() => {
    const monday = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * 86_400_000).toLocaleDateString(locale, { weekday: 'short' }).slice(0, 1).toLowerCase());
  }, [locale]);
  const step = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const tap = (day: string) => {
    if (!start) {
      setStart(day);
      return;
    }
    const [a, b] = day < start ? [day, start] : [start, day];
    setStart(null);
    onDays(a, b);
  };
  const lo = start ?? from;
  const hi = start ? start : to;
  return (
    <View style={styles.month}>
      <View style={styles.monthRow}>
        <Pressable onPress={() => step(-1)} hitSlop={12} accessibilityRole="button"><Text style={styles.arrow}>‹</Text></Pressable>
        <Text style={styles.mono}>{up(`${monthName} · ${start ? t('groups.when.to') : t('trip.pick')}`)}</Text>
        <Pressable onPress={() => step(1)} hitSlop={12} accessibilityRole="button"><Text style={styles.arrow}>›</Text></Pressable>
      </View>
      <View style={styles.week}>
        {weekdays.map((w, i) => (
          <Text key={i} style={styles.weekday}>{w}</Text>
        ))}
      </View>
      <View style={styles.cells}>
        {cells.map((day, i) => {
          if (!day) return <View key={i} style={styles.cell} />;
          const edge = day === lo || day === hi;
          const inside = day > lo && day < hi;
          return (
            <Pressable key={day} onPress={() => tap(day)} style={[styles.cell, inside && styles.cellIn, edge && styles.cellEdge]} accessibilityRole="button" accessibilityState={{ selected: edge }}>
              <Text style={[styles.cellText, edge && styles.cellTextEdge]}>{day.slice(8, 10).replace(/^0/, '')}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// The next city: a sheet with a field; the cities the app has nights in, narrowed as
// you type; a tap adds it.
function CitySheet({ open, taken, onPick, onClose }: { open: boolean; taken: string[]; onPick: (slug: string) => void; onClose: () => void }) {
  const { t, up } = useLang();
  const insets = useSafeAreaInsets();
  const [cities, setCities] = useState<Place[]>([]);
  const [q, setQ] = useState('');
  useEffect(() => {
    allCities().then(setCities, () => {});
  }, []);
  const needle = q.trim().toLowerCase();
  const hits = cities.filter((c) => !taken.includes(c.slug) && (!needle || c.name.toLowerCase().includes(needle) || c.slug.includes(needle))).slice(0, 12);
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Scrim onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.grab} />
        <Text style={styles.sheetTitle}>{t('trip.next')}</Text>
        <TextInput value={q} onChangeText={setQ} placeholder={t('groups.route.city')} placeholderTextColor={colors.mute} autoFocus autoCorrect={false} autoCapitalize="none" style={styles.field} />
        <Text style={styles.sheetLabel}>{up(t('groups.where.city'))}</Text>
        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          {hits.map((c) => (
            <Pressable key={c.slug} onPress={() => onPick(c.slug)} style={({ pressed }) => [styles.hit, pressed && styles.pressed]} accessibilityRole="button">
              <Text style={styles.hitText}>{c.name.toLowerCase()}</Text>
              <Text style={styles.hitAdd}>{t('groups.route.add')}</Text>
            </Pressable>
          ))}
          {cities.length && !hits.length ? <Text style={styles.noCity}>{t('trip.noCity')}</Text> : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  stub: { backgroundColor: PAPER, borderRadius: radius.md, padding: 16, paddingBottom: 18, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: -6 }, elevation: 6 },
  stubBehind: { marginTop: -14 },
  stubOpen: { paddingBottom: 18 },
  watermark: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.12 },
  perf: { position: 'absolute', top: 0, left: 0, right: 0, borderTopWidth: 2, borderStyle: 'dashed', borderColor: PAPER_RULE },
  hd: { flexDirection: 'row', justifyContent: 'space-between' },
  mono: { fontFamily: fonts.jet, fontSize: 9.5, letterSpacing: 1.6, color: PAPER_MUTE },
  city: { fontFamily: fonts.logo, fontSize: 44, lineHeight: 46, letterSpacing: -1, color: PAPER_INK, marginTop: 10 },
  cityDot: { color: colors.spot },
  stamp: { position: 'absolute', right: 14, top: 34, borderWidth: 2, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5, transform: [{ rotate: '-8deg' }] },
  stampRed: { position: 'relative', right: undefined, top: undefined, borderColor: colors.spot, transform: [{ rotate: '6deg' }] },
  stampText: { fontFamily: fonts.jet, fontSize: 9.5, letterSpacing: 1.6 },
  dd: { flexDirection: 'row', alignItems: 'flex-end', gap: 18, marginTop: 8 },
  ddLabel: { fontFamily: fonts.jet, fontSize: 8.5, letterSpacing: 1.3, color: PAPER_MUTE },
  ddValue: { fontFamily: fonts.medium, fontSize: 14, color: PAPER_INK, marginTop: 2 },
  swipeThere: { marginLeft: 'auto', height: 32, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: PAPER_INK, justifyContent: 'center' },
  swipeThereText: { fontFamily: fonts.medium, fontSize: 12.5, color: PAPER_INK },
  rule: { height: 1, backgroundColor: PAPER_RULE, marginVertical: 14 },
  none: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: PAPER_MUTE, marginTop: 8 },
  night: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  poster: { width: 36, height: 46, borderRadius: 6, backgroundColor: PAPER_RULE, overflow: 'hidden' },
  nightText: { flex: 1, minWidth: 0 },
  nightTitle: { fontFamily: fonts.medium, fontSize: 13.5, color: PAPER_INK },
  nightMeta: { fontFamily: fonts.regular, fontSize: 11, color: PAPER_MUTE, marginTop: 2 },
  nightIn: { fontFamily: fonts.jet, fontSize: 8.5, letterSpacing: 1.2, color: PAPER_MUTE },
  nightInAll: { color: colors.spot },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  remove: { fontFamily: fonts.regular, fontSize: 12.5, color: PAPER_MUTE, textDecorationLine: 'underline' },
  month: { marginTop: 14 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  arrow: { fontFamily: fonts.medium, fontSize: 20, color: PAPER_INK, paddingHorizontal: 6 },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontFamily: fonts.jet, fontSize: 8.5, letterSpacing: 1, color: PAPER_MUTE },
  cells: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  cell: { width: `${100 / 7}%`, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  cellIn: { backgroundColor: 'rgba(44,74,138,0.14)' },
  cellEdge: { backgroundColor: PAPER_INK },
  cellText: { fontFamily: fonts.regular, fontSize: 13, color: PAPER_INK },
  cellTextEdge: { color: PAPER, fontFamily: fonts.medium },
  next: { marginTop: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.mute, borderRadius: radius.md, padding: 18, alignItems: 'center', gap: 4 },
  nextTitle: { fontFamily: fonts.medium, fontSize: 16, color: colors.paper },
  nextHint: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.mute, textAlign: 'center' },
  travelling: { fontFamily: fonts.jet, fontSize: 9, letterSpacing: 1.4, color: colors.meta, textAlign: 'center', marginTop: 18 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '80%', backgroundColor: colors.ink, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: brand.left, paddingTop: 10 },
  grab: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: colors.ink3, marginBottom: 14 },
  sheetTitle: { fontFamily: fonts.semibold, fontSize: 19, letterSpacing: -0.4, color: colors.paper, marginBottom: 12 },
  field: { height: 50, borderRadius: radius.md, borderWidth: 1, borderColor: colors.edge, paddingHorizontal: 16, fontFamily: fonts.medium, fontSize: 17, color: colors.paper },
  sheetLabel: { fontFamily: fonts.regular, fontSize: 10.5, letterSpacing: 1.5, color: colors.meta, marginTop: 18, marginBottom: 4 },
  list: { flexGrow: 0 },
  hit: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.ink3 },
  hitText: { fontFamily: fonts.medium, fontSize: 18, letterSpacing: -0.2, color: colors.paper },
  hitAdd: { fontFamily: fonts.regular, fontSize: 12, color: colors.meta },
  noCity: { fontFamily: fonts.regular, fontSize: 13, color: colors.mute, paddingVertical: 14 },
});
