import { useEffect, useState } from 'react';
import { missingSql, staffReports } from '@/data/safety';
import { djsWaiting } from '@/data/staff';
import { StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import StaffPage, { Quiet } from '@/components/StaffPage';
import Tips from '@/components/Tips';
import { useTabBarSpace } from '@/components/TabBar';
import { Mark, Panel, Row, Section, Value } from '@/components/Row';
import { overview, useRole, isStaff, type Overview } from '@/data/staff';
import { useRefreshOnFocus } from '@/hooks/useRefresh';
import { useLang, type Key } from '@/i18n';
import { colors, fonts } from '@/theme/tokens';

// The panel tab: only there for an admin or a community manager (tabs/_layout.tsx).
// Numbers on top, then what to make, what to look after, and the admin's own rows.
export default function PanelScreen() {
  const role = useRole();
  const tick = useRefreshOnFocus();
  const { t, up } = useLang();
  const tabSpace = useTabBarSpace();
  const [o, setO] = useState<Overview | null>(null);
  // Open reports other than posts (51_safety.sql), counted on the row.
  const [reports, setReports] = useState(0);
  const [djs, setDjs] = useState(0);
  // The admin sees whether the live database is behind the app (null: unknown).
  const [missing, setMissing] = useState<string[] | null>(null);
  useEffect(() => {
    if (!isStaff(role)) return;
    overview().then(setO, () => {});
    staffReports().then((l) => setReports(l.length), () => {});
    djsWaiting().then((l) => setDjs(l.length), () => {});
    missingSql().then(setMissing, () => {});
  }, [role, tick]);

  if (!isStaff(role)) {
    return (
      <StaffPage title={t('staff.title')} back={false}>
        <Quiet text="…" />
      </StaffPage>
    );
  }
  const admin = role === 'admin';
  const go = (href: Href) => () => router.push(href);
  const numbers: [Key, number | null | undefined][] = [
    ['staff.n.people', o?.people],
    ['staff.n.week', o?.people_week],
    ['staff.n.pending', o?.pending],
    ['staff.n.reported', o?.reported],
    ['staff.n.ahead', o?.nights_ahead],
    ['staff.n.ours', o?.nights_staff],
    ['staff.n.venues', o?.venues],
    ['staff.n.comments', o?.comments_week],
    ...(admin
      ? ([
          ['staff.n.managers', o?.managers],
          ['staff.n.djs', o?.djs],
          ['staff.n.feedback', o?.feedback_open],
        ] as [Key, number | null | undefined][])
      : []),
  ];

  return (
    <View style={styles.fill}>
    <StaffPage title={t('staff.title')} back={false}>
      <Text style={styles.who}>{up(admin ? t('staff.you.admin') : t('staff.you.cm'))}</Text>
      <View style={styles.grid}>
        {numbers.map(([k, n]) => (
          <View key={k} style={styles.cell}>
            <Text style={styles.n}>{n ?? '–'}</Text>
            <Text style={styles.nLabel}>{t(k)}</Text>
          </View>
        ))}
      </View>

      <Section title={t('staff.make')} />
      <Panel>
        <Row label={t('staff.night.new')} hint={t('staff.night.new.hint')} right={<Mark kind="more" />} onPress={go('/panel/night')} />
        <Row label={t('staff.venue.new')} hint={t('staff.venue.new.hint')} right={<Mark kind="more" />} onPress={go('/panel/venue')} />
        <Row label={t('staff.dj.new')} hint={t('staff.dj.new.hint')} right={<Mark kind="more" />} onPress={go('/panel/dj')} />
      </Panel>

      <Section title={t('staff.watch')} />
      <Panel>
        <Row label={t('staff.pending')} hint={t('staff.pending.hint')} right={o?.pending ? <Value text={String(o.pending)} more /> : <Mark kind="more" />} onPress={go('/panel/pending')} />
        <Row label={t('staff.nights')} hint={t('staff.nights.hint')} right={<Mark kind="more" />} onPress={go('/panel/nights')} />
        <Row label={t('staff.reported')} hint={t('staff.reported.hint')} right={o?.reported ? <Value text={String(o.reported)} more /> : <Mark kind="more" />} onPress={go('/panel/reported')} />
        <Row label={t('staff.reports')} hint={t('staff.reports.hint')} right={reports ? <Value text={String(reports)} more /> : <Mark kind="more" />} onPress={go('/panel/reports')} />
        <Row label={t('staff.djs.waiting')} hint={t('staff.djs.waiting.hint')} right={djs ? <Value text={String(djs)} more /> : <Mark kind="more" />} onPress={go('/panel/djs')} />
        <Row label={t('staff.comments')} hint={t('staff.comments.hint')} right={<Mark kind="more" />} onPress={go('/panel/comments')} />
      </Panel>

      {admin ? (
        <>
          <Section title={t('staff.admin')} />
          <Panel>
            <Row label={t('staff.people')} hint={t('staff.people.hint')} right={<Mark kind="more" />} onPress={go('/panel/people')} />
            <Row label={t('staff.feedback')} hint={t('staff.feedback.hint')} right={<Mark kind="more" />} onPress={go('/panel/feedback')} />
            <Row label={t('staff.log')} hint={t('staff.log.hint')} right={<Mark kind="more" />} onPress={go('/panel/log')} />
            <Row
              label={t('staff.db')}
              hint={missing === null ? '…' : missing.length ? t('staff.db.behind', { files: missing.join(', ') }) : t('staff.db.ok')}
              right={missing?.length ? <Value text={String(missing.length)} /> : undefined}
            />
            <Row label={t('staff.errors')} hint={t('staff.errors.hint')} right={<Mark kind="more" />} onPress={go('/panel/errors')} />
          </Panel>
        </>
      ) : null}
    </StaffPage>
      <Tips page="panel" tips={[{ title: 'tips.panel.1.t', body: 'tips.panel.1.b' }, { title: 'tips.panel.2.t', body: 'tips.panel.2.b', motion: 'tap' }]} bottom={tabSpace + 12} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  who: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.spotText, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderLeftWidth: 1, borderColor: colors.ink3 },
  cell: { width: '33.333%', paddingVertical: 14, paddingHorizontal: 10, borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.ink3, gap: 4 },
  n: { fontFamily: fonts.medium, fontSize: 24, letterSpacing: -0.5, color: colors.paper, fontVariant: ['tabular-nums'] },
  nLabel: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 14, color: colors.mute },
});
