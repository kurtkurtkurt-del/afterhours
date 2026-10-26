import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import StaffPage, { Quiet, Said } from '@/components/StaffPage';
import CodeSheet from '@/components/CodeSheet';
import { Mark, Panel, Row, Section, Value } from '@/components/Row';
import { useRole } from '@/data/staff';
import { assignVenue, featureNight, myVenues, venueManagers, venueNights, venueStats, type Manager, type MyVenue, type VenueNight, type VenueStats } from '@/data/venues';
import { serverText } from '@/lib/serverText';
import { dayLabel } from '@/data/when';
import { useRefreshOnFocus } from '@/hooks/useRefresh';
import { useLang } from '@/i18n';
import { colors, fonts } from '@/theme/tokens';

// One room on the desk: the numbers of the last 30 days against the 30 before, the nights
// on top, the nights ahead (a tap edits, the star puts one on top), the past ones with
// what they gathered, and the doors to the calendar, the word to your people and the
// comments. The admin hands the room to someone here.
export default function VenuePage() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  const role = useRole();
  const tick = useRefreshOnFocus();
  const { t, up } = useLang();
  const [room, setRoom] = useState<MyVenue | null>(null);
  const [stats, setStats] = useState<VenueStats | null>(null);
  const [nights, setNights] = useState<VenueNight[] | null>(null);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [said, setSaid] = useState<string | null>(null);
  const [handing, setHanding] = useState(false);
  const load = useCallback(() => {
    if (!venue) return;
    myVenues().then((l) => setRoom(l.find((r) => r.id === venue) ?? null), () => {});
    venueStats(venue).then(setStats, (e) => setSaid(serverText(e)));
    venueNights(venue).then(setNights, () => setNights([]));
    venueManagers(venue).then(setManagers, () => {});
  }, [venue]);
  useEffect(load, [load, tick]);

  // the clock, read when the nights arrive (a render stays pure)
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (nights) setNow(Date.now()); // eslint-disable-line react-hooks/set-state-in-effect -- one read per load
  }, [nights]);
  const ahead = (nights ?? []).filter((n) => Date.parse(n.starts_at) > now - 8 * 3600_000);
  const past = (nights ?? []).filter((n) => Date.parse(n.starts_at) <= now - 8 * 3600_000).reverse();
  const onTop = ahead.filter((n) => n.featured_at);

  const star = (n: VenueNight) =>
    featureNight(n.id, !n.featured_at)
      .then(load)
      .catch((e) => setSaid(serverText(e)));
  const open = (n: VenueNight) => {
    if (n.source === 'staff' || n.source === 'user') return router.push({ pathname: '/panel/night', params: { id: n.id } });
    router.push(`/night/${n.slug}`);
  };
  const hand = (handle: string) =>
    assignVenue(venue!, handle.replace(/^@/, ''), true)
      .then(load)
      .catch((e) => setSaid(serverText(e)));
  const takeBack = (m: Manager) =>
    Alert.alert(t('desk.managers.remove'), `@${m.handle}`, [
      { text: t('word.cancel'), style: 'cancel' },
      { text: t('desk.managers.remove'), style: 'destructive', onPress: () => m.handle && assignVenue(venue!, m.handle, false).then(load).catch((e) => setSaid(serverText(e))) },
    ]);

  const trend = (now30: number, prev: number) => (prev ? ` · ${t('desk.prev', { n: prev })}` : '');
  const numbers: [string, number | undefined, string][] = stats
    ? [
        [t('desk.n.ahead'), stats.nights_ahead, ''],
        [t('desk.n.kept'), stats.kept_30, trend(stats.kept_30, stats.kept_prev)],
        [t('desk.n.checkins'), stats.checkins_30, trend(stats.checkins_30, stats.checkins_prev)],
        [t('desk.n.tickets'), stats.tickets_30, ''],
        [t('desk.n.going'), stats.going, ''],
        [t('desk.n.reach'), stats.reach, ''],
        [t('desk.n.nights'), stats.nights_30, trend(stats.nights_30, stats.nights_prev)],
        [t('desk.n.letgo'), stats.letgo_30, ''],
        [t('desk.n.comments'), stats.comments_30, ''],
      ]
    : [];
  const counts = (n: VenueNight, isPast: boolean) =>
    isPast ? t('desk.night.past', { kept: n.kept, checkins: n.checkins, comments: n.comments }) : t('desk.night.counts', { kept: n.kept, going: n.going, tickets: n.tickets, comments: n.comments });

  return (
    <StaffPage title={room ? room.name.toLowerCase() : '…'}>
      {room ? <Text style={styles.who}>{up(room.city_name)}</Text> : null}
      <Said text={said} bad />
      <View style={styles.grid}>
        {numbers.map(([label, n, more]) => (
          <View key={label} style={styles.cell}>
            <Text style={styles.n}>{n ?? '–'}</Text>
            <Text style={styles.nLabel}>{label}{more}</Text>
          </View>
        ))}
      </View>

      <Section title={t('desk.make')} />
      <Panel>
        <Row label={t('desk.night.new')} hint={t('desk.night.new.hint')} right={<Mark kind="more" />} onPress={() => room && router.push({ pathname: '/panel/night', params: { venue: room.id, city: room.city_slug } })} />
        <Row label={t('desk.calendar')} hint={t('desk.calendar.hint')} right={<Mark kind="more" />} onPress={() => router.push({ pathname: '/desk/calendar', params: { venue } })} />
        <Row label={t('desk.say')} hint={t('desk.say.hint')} right={stats ? <Value text={t('desk.say.who', { n: stats.reach })} more /> : <Mark kind="more" />} onPress={() => router.push({ pathname: '/desk/say', params: { venue } })} />
        <Row label={t('desk.comments')} hint={t('desk.comments.hint')} right={stats?.comments_30 ? <Value text={String(stats.comments_30)} more /> : <Mark kind="more" />} onPress={() => router.push({ pathname: '/desk/comments', params: { venue } })} />
      </Panel>

      <Section title={`${t('desk.nights')} · ${ahead.length}${onTop.length ? ` · ★ ${onTop.length}/3` : ''}`} />
      {nights === null ? <Quiet text="…" /> : null}
      {nights && !ahead.length ? <Quiet text={t('desk.nights.none')} /> : null}
      {ahead.length ? (
        <Panel>
          {ahead.map((n) => (
            <Row
              key={n.id}
              label={n.title.toLowerCase()}
              hint={[dayLabel(n.starts_at), counts(n, false), n.review === 'pending' ? t('submit.pending') : !n.is_published ? t('staff.hidden') : null, n.source === 'ticketmaster' ? t('desk.night.sync') : null].filter(Boolean).join(' · ')}
              right={
                <Pressable onPress={() => star(n)} hitSlop={12} accessibilityRole="button" accessibilityLabel={n.featured_at ? t('desk.unfeature') : t('desk.feature')} style={({ pressed }) => pressed && styles.pressed}>
                  <Text style={[styles.star, !n.featured_at && styles.starOff]}>{n.featured_at ? '★' : '☆'}</Text>
                </Pressable>
              }
              onPress={() => open(n)}
            />
          ))}
        </Panel>
      ) : null}
      {ahead.length ? <Text style={styles.note}>{t('desk.featured.hint')}</Text> : null}

      {past.length ? (
        <>
          <Section title={`${t('yours.past')} · ${past.length}`} />
          <Panel>
            {past.slice(0, 30).map((n) => (
              <Row key={n.id} label={n.title.toLowerCase()} hint={`${dayLabel(n.starts_at)} · ${counts(n, true)}`} right={<Mark kind="more" />} onPress={() => router.push(`/night/${n.slug}`)} />
            ))}
          </Panel>
        </>
      ) : null}

      <Section title={t('desk.managers')} />
      <Panel>
        {managers.map((m) => (
          <Row key={m.user_id} label={`@${m.handle ?? '?'}`} hint={(m.display_name ?? '').toLowerCase()} right={role === 'admin' ? <Value text={t('desk.managers.remove')} /> : undefined} onPress={role === 'admin' ? () => takeBack(m) : undefined} />
        ))}
        {role === 'admin' ? <Row label={t('desk.managers.add')} right={<Mark kind="more" />} onPress={() => setHanding(true)} /> : null}
        {room ? <Row label={t('desk.edit')} hint={room.lat ? `${room.lat.toFixed(4)}, ${room.lng?.toFixed(4)}` : undefined} right={<Mark kind="more" />} onPress={() => router.push({ pathname: '/panel/venue', params: { id: room.id } })} /> : null}
      </Panel>
      <CodeSheet open={handing} title={t('desk.managers.add')} go={t('word.ok')} error={null} onSubmit={(h) => { setHanding(false); hand(h); }} onClose={() => setHanding(false)} />
    </StaffPage>
  );
}

const styles = StyleSheet.create({
  who: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.spotText, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderLeftWidth: 1, borderColor: colors.ink3 },
  cell: { width: '33.333%', paddingVertical: 14, paddingHorizontal: 10, borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.ink3, gap: 4 },
  n: { fontFamily: fonts.medium, fontSize: 24, letterSpacing: -0.5, color: colors.paper, fontVariant: ['tabular-nums'] },
  nLabel: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 14, color: colors.mute },
  note: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute, marginTop: 8 },
  star: { fontFamily: fonts.regular, fontSize: 22, color: colors.spotText, paddingHorizontal: 6 },
  starOff: { color: colors.mute },
  pressed: { opacity: 0.6 },
});
