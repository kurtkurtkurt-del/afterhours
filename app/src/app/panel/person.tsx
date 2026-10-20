import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import StaffPage, { Quiet, Said } from '@/components/StaffPage';
import { personFile, why, type PersonFile } from '@/data/staff';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';

// The file on one person (86_person_file.sql): who they are and who closed them,
// what they were reported for (with the copies of 84), what they reported, their
// objections (85) and the staff log on them. Read only; the actions stay on people.
export default function Person() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, tx, up } = useLang();
  const [f, setF] = useState<PersonFile | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  useEffect(() => {
    if (id) personFile(id).then(setF, (e) => setSaid(why(e)));
  }, [id]);
  const when = (s: string) => s.slice(0, 16).replace('T', ' ');
  const name = (f?.who.name ?? f?.who.handle ?? '—').toLowerCase();
  return (
    <StaffPage title={f ? name : '…'}>
      <Said text={said} bad />
      {!f && !said ? <Quiet text="…" /> : null}
      {f ? (
        <>
          <Text style={styles.meta}>{up(`@${f.who.handle ?? '—'} · ${f.who.role} · ${t('staff.file.since', { at: f.who.created_at.slice(0, 10) })}`)}</Text>
          {f.who.banned_at ? (
            <View style={[styles.card, styles.cardRed]}>
              <Text style={styles.body}>{t('staff.file.closed', { at: f.who.banned_at.slice(0, 10), by: f.who.banned_by ?? '—', reason: f.who.banned_reason ?? '—' })}</Text>
              {f.who.banned_by_admin ? <Text style={styles.meta}>{up(t('staff.file.admin.only'))}</Text> : null}
            </View>
          ) : null}

          <Text style={styles.head}>{up(t('staff.file.about', { n: f.reports_about.length }))}</Text>
          {f.reports_about.length ? f.reports_about.map((r, i) => (
            <View key={i} style={styles.card}>
              <Text style={styles.meta}>{up(`${tx('staff.reports.kind.' + r.kind, r.kind)} · ${when(r.at)} · ${r.handled ? t('staff.file.settled') : t('staff.file.open')}`)}</Text>
              <Text style={styles.body} numberOfLines={4}>{r.text ?? t('staff.reports.gone')}</Text>
              {r.reason ? <Text style={styles.meta}>“{r.reason}”</Text> : null}
            </View>
          )) : <Quiet text={t('staff.file.none')} />}

          <Text style={styles.head}>{up(t('staff.file.appeals', { n: f.appeals.length }))}</Text>
          {f.appeals.length ? f.appeals.map((a, i) => (
            <View key={i} style={styles.card}>
              <Text style={styles.meta}>{up(`${when(a.at)} · ${a.outcome ? tx('staff.file.outcome.' + a.outcome, a.outcome) : t('staff.file.open')}`)}</Text>
              <Text style={styles.body}>{a.body}</Text>
            </View>
          )) : <Quiet text={t('staff.file.none')} />}

          <Text style={styles.head}>{up(t('staff.file.made', { n: f.reports_made.length }))}</Text>
          {f.reports_made.length ? f.reports_made.map((r, i) => (
            <Text key={i} style={styles.line}>{`${when(r.at)} · ${tx('staff.reports.kind.' + r.kind, r.kind)}${r.reason ? ` · “${r.reason}”` : ''}`}</Text>
          )) : <Quiet text={t('staff.file.none')} />}

          <Text style={styles.head}>{up(t('staff.file.log', { n: f.log.length }))}</Text>
          {f.log.length ? f.log.map((l, i) => (
            <Text key={i} style={styles.line}>{`${when(l.at)} · ${l.action} · @${l.by ?? '—'}${l.note ? ` · ${l.note}` : ''}`}</Text>
          )) : <Quiet text={t('staff.file.none')} />}
          <View style={{ height: 40 }} />
        </>
      ) : null}
    </StaffPage>
  );
}

const styles = StyleSheet.create({
  head: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.mute, marginTop: 28, marginBottom: 6 },
  card: { marginTop: 10, padding: 14, gap: 6, backgroundColor: colors.ink2, borderRadius: radius.md },
  cardRed: { borderWidth: 1, borderColor: colors.spot },
  meta: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.mute, marginTop: 6 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.paper },
  line: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.paper, marginTop: 6 },
});
