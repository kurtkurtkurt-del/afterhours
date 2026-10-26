import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import StaffPage, { Quiet, Said } from '@/components/StaffPage';
import { Panel, Row, Section, Value } from '@/components/Row';
import { dmStart, why } from '@/data/dms';
import { venuePeople, type VenuePerson } from '@/data/venues';
import { useRefreshOnFocus } from '@/hooks/useRefresh';
import { useLang } from '@/i18n';

// The phone book of the rooms: every room with a manager, by city; a tap opens a direct
// message with them (59_dms.sql), so one room talks to another without a middleman.
export default function People() {
  const tick = useRefreshOnFocus();
  const { t } = useLang();
  const [list, setList] = useState<VenuePerson[] | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  useEffect(() => {
    venuePeople().then(setList, (e) => setSaid(why(e)));
  }, [tick]);
  const write = (p: VenuePerson) => {
    if (!p.handle) return;
    dmStart(p.handle)
      .then((id) => router.push({ pathname: '/dm/[id]', params: { id, name: (p.display_name ?? p.handle ?? '').toLowerCase() } }))
      .catch((e) => setSaid(why(e)));
  };
  const others = (list ?? []).filter((p) => !p.mine);
  const cities = [...new Set(others.map((p) => p.city_name))];
  return (
    <StaffPage title={t('desk.people')}>
      <Quiet text={t('desk.people.hint')} />
      <Said text={said} bad />
      {list && !others.length ? <Quiet text={t('desk.people.none')} /> : null}
      {cities.map((city) => (
        <View key={city}>
          <Section title={city} />
          <Panel>
            {others
              .filter((p) => p.city_name === city)
              .map((p) => (
                <Row key={p.venue_id + p.user_id} label={p.venue.toLowerCase()} hint={`@${p.handle}${p.display_name ? ` · ${p.display_name.toLowerCase()}` : ''}`} right={<Value text={t('desk.people.write')} more />} onPress={() => write(p)} />
              ))}
          </Panel>
        </View>
      ))}
      {list === null && !said ? <Quiet text="…" /> : null}
    </StaffPage>
  );
}
