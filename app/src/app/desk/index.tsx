import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import StaffPage, { Quiet } from '@/components/StaffPage';
import { Mark, Panel, Row, Section, Value } from '@/components/Row';
import { isStaff, useRole } from '@/data/staff';
import { myVenues, type MyVenue } from '@/data/venues';
import { useRefreshOnFocus } from '@/hooks/useRefresh';
import { useLang } from '@/i18n';
import { colors, fonts } from '@/theme/tokens';

// The venue desk (97_venue_desk.sql, owner 26.10.2026): what a community manager sees
// instead of the staff panel. Their rooms with this month's numbers; under them what to
// make, and the other rooms to talk to. The admin reaches it from the panel.
export default function Desk() {
  const role = useRole();
  const tick = useRefreshOnFocus();
  const { t, up } = useLang();
  const [rooms, setRooms] = useState<MyVenue[] | null>(null);
  useEffect(() => {
    if (!isStaff(role)) return;
    myVenues().then(setRooms, () => setRooms([]));
  }, [role, tick]);
  if (!isStaff(role)) {
    return (
      <StaffPage title={t('desk.title')}>
        <Quiet text="…" />
      </StaffPage>
    );
  }
  const admin = role === 'admin';
  const featured = rooms?.reduce((a, r) => a + r.featured, 0) ?? 0;
  return (
    <StaffPage title={t('desk.title')}>
      <Text style={styles.who}>{up(admin ? t('staff.you.admin') : t('desk.you'))}</Text>
      {rooms === null ? <Quiet text="…" /> : null}
      {rooms && !rooms.length ? <Quiet text={t('desk.none')} /> : null}
      {rooms?.length ? (
        <>
          <Section title={t('desk.rooms')} />
          <Panel>
            {rooms.map((r) => (
              <Row
                key={r.id}
                label={r.name.toLowerCase()}
                hint={`${r.city_name.toLowerCase()} · ${t('desk.room.hint', { ahead: r.nights_ahead, kept: r.kept_30, checkins: r.checkins_30 })}`}
                right={r.featured ? <Value text={`★ ${r.featured}`} more /> : <Mark kind="more" />}
                onPress={() => router.push({ pathname: '/desk/[venue]', params: { venue: r.id } })}
              />
            ))}
          </Panel>
          {featured ? <Text style={styles.note}>{t('desk.featured.hint')}</Text> : null}
        </>
      ) : null}

      <Section title={t('desk.make')} />
      <Panel>
        <Row label={t('desk.night.new')} hint={t('desk.night.new.hint')} right={<Mark kind="more" />} onPress={() => router.push(rooms?.length === 1 ? { pathname: '/panel/night', params: { venue: rooms[0].id, city: rooms[0].city_slug } } : '/panel/night')} />
        <Row label={t('desk.venue.new')} hint={t('desk.venue.new.hint')} right={<Mark kind="more" />} onPress={() => router.push('/panel/venue')} />
      </Panel>

      <Section title={t('desk.talk')} />
      <Panel>
        <Row label={t('desk.people')} hint={t('desk.people.hint')} right={<Mark kind="more" />} onPress={() => router.push('/desk/people')} />
      </Panel>

      {admin ? (
        <>
          <Section title={t('staff.admin')} />
          <Panel>
            <Row label={t('desk.staff')} hint={t('desk.staff.hint')} right={<Mark kind="more" />} onPress={() => router.push('/panel')} />
          </Panel>
        </>
      ) : null}
      <View style={styles.pad} />
    </StaffPage>
  );
}

const styles = StyleSheet.create({
  who: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.spotText, marginBottom: 14 },
  note: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute, marginTop: 8 },
  pad: { height: 20 },
});
