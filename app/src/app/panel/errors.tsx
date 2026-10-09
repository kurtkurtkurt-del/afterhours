import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import StaffPage, { Quiet, Said } from '@/components/StaffPage';
import { Panel, Row } from '@/components/Row';
import { adminErrors, clearErrors, type ClientError } from '@/data/safety';
import { why } from '@/data/staff';
import { useLang } from '@/i18n';
import PillAction from '@/components/PillAction';

// What crashed on people's phones (client_errors, 51_safety.sql), newest first. A tap
// shows the stack. Kept for 30 days; "clear" empties it once something is fixed.
export default function Errors() {
  const { t } = useLang();
  const [list, setList] = useState<ClientError[] | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  useEffect(() => {
    adminErrors().then(setList, (e) => {
      setList([]);
      setSaid(why(e));
    });
  }, []);
  const clear = () =>
    Alert.alert(t('staff.errors.clear'), undefined, [
      { text: t('staff.delete.keep'), style: 'cancel' },
      { text: t('staff.errors.clear'), style: 'destructive', onPress: () => clearErrors().then(() => setList([]), (e) => setSaid(why(e))) },
    ]);
  return (
    <StaffPage title={t('staff.errors')}>
      <Said text={said} bad />
      {list === null ? <Quiet text="…" /> : null}
      {list && !list.length ? <Quiet text={t('staff.errors.none')} /> : null}
      {list?.length ? (
        <>
          <Panel>
            {list.map((e) => (
              <Row
                key={e.id}
                label={`${e.fatal ? '● ' : ''}${e.message}`}
                hint={[e.at.slice(0, 16).replace('T', ' '), e.platform, e.version, e.where_, e.who ? `@${e.who}` : null].filter(Boolean).join(' · ')}
                onPress={() => Alert.alert(e.message, (e.stack ?? '').slice(0, 1500))}
              />
            ))}
          </Panel>
          <View style={{ marginTop: 18 }}>
            <PillAction tone="danger" icon="trash" label={t('staff.errors.clear')} onPress={clear} />
          </View>
        </>
      ) : null}
    </StaffPage>
  );
}
