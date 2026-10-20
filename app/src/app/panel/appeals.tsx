import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import StaffPage, { Quiet, Said } from '@/components/StaffPage';
import PillAction, { PillRow } from '@/components/PillAction';
import { settleAppeal, staffAppeals, type OpenAppeal } from '@/data/safety';
import { why } from '@/data/staff';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';

// Closed accounts that object (85_appeals.sql), oldest first. "open again" lifts the
// ban and tells them; "stays closed" tells them too. Either way it leaves the list.
export default function Appeals() {
  const { t, up } = useLang();
  const [list, setList] = useState<OpenAppeal[] | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  useEffect(() => {
    staffAppeals().then(setList, (e) => {
      setList([]);
      setSaid(why(e));
    });
  }, []);
  const decide = (a: OpenAppeal, unban: boolean) => {
    setList((l) => (l ?? []).filter((x) => x.id !== a.id));
    settleAppeal(a.id, unban).catch((e) => setSaid(why(e)));
  };
  return (
    <StaffPage title={t('staff.appeals')}>
      <Said text={said} bad />
      {list === null ? <Quiet text="…" /> : null}
      {list && !list.length ? <Quiet text={t('staff.appeals.none')} /> : null}
      {list?.map((a) => (
        <View key={a.id} style={styles.card}>
          <Text style={styles.meta}>{up(`@${a.handle ?? '—'} · ${a.created_at.slice(0, 16).replace('T', ' ')}`)}</Text>
          <Text style={styles.meta}>{t('staff.appeal.closed', { at: a.banned_at.slice(0, 10), reason: a.reason ?? '—' })}</Text>
          <Text style={styles.body}>{a.body}</Text>
          <PillRow>
            <PillAction icon="link" label={t('staff.appeal.unban')} onPress={() => decide(a, true)} />
            <PillAction icon="out" label={t('staff.appeal.keep')} onPress={() => decide(a, false)} />
          </PillRow>
        </View>
      ))}
    </StaffPage>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 18, padding: 16, gap: 8, backgroundColor: colors.ink2, borderRadius: radius.md },
  meta: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.mute },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.paper, marginBottom: 6 },
});
