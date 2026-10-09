import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import StaffPage, { Quiet, Said } from '@/components/StaffPage';
import SwipeStack, { type StackHandle } from '@/components/SwipeStack';
import { settleReport, staffReports, type OpenReport as Item } from '@/data/safety';
import { banAuthor, why } from '@/data/staff';
import { useLang } from '@/i18n';
import { queueStyles as styles } from '@/components/QueueStyles';

// Everything reported but posts (51_safety.sql): comments, room and group messages,
// profiles, groups, sparks. Most reported first, as a pile like reported posts:
// left removes it, right keeps it; either way the reports are settled and logged.
// The terms promise a look within 24 hours.
export default function Reports() {
  const { t, tx, up } = useLang();
  const stack = useRef<StackHandle>(null);
  const [list, setList] = useState<Item[] | null>(null);
  const [done, setDone] = useState(0);
  const [said, setSaid] = useState<string | null>(null);
  useEffect(() => {
    staffReports().then(setList, (e) => {
      setList([]);
      setSaid(why(e));
    });
  }, []);
  const decide = (r: Item, way: 'left' | 'right' | 'down') => {
    setDone((d) => d + 1);
    // down: remove it and close the account behind it (52_bans.sql)
    (way === 'down' ? banAuthor(r.kind, r.target, null) : settleReport(r.kind, r.target, way === 'left')).catch((e) => setSaid(why(e)));
  };
  return (
    <StaffPage title={t('staff.reports')}>
      <Said text={said} bad />
      {list === null ? <Quiet text="…" /> : null}
      {list && !list.length ? <Quiet text={t('staff.reported.none')} /> : null}
      {list?.length ? (
        <>
          <Text style={styles.count}>{up(`${Math.min(done + 1, list.length)} / ${list.length}`)}</Text>
          <View style={styles.pile}>
            <SwipeStack
              ref={stack}
              items={list}
              keyOf={(r) => `${r.kind}:${r.target}`}
              stamps={{ right: t('staff.stamp.fine'), left: t('staff.stamp.remove'), down: t('staff.stamp.ban') }}
              onSwipe={decide}
              empty={<Quiet text={t('staff.reported.none')} />}
              render={(r) => (
                <View style={styles.card}>
                  <View style={styles.cardText}>
                    <Text style={styles.meta}>{up(tx('staff.reports.kind.' + r.kind, r.kind))}</Text>
                    <Text style={styles.meta}>{`@${r.author ?? '—'} · ${r.first_at.slice(0, 16).replace('T', ' ')} · ${r.reports}×`}</Text>
                    <Text style={styles.title} numberOfLines={6}>{r.preview ?? t('staff.reports.gone')}</Text>
                    {r.reasons.length ? <Text style={styles.meta}>{r.reasons.map((x) => `“${x}”`).join('  ')}</Text> : null}
                    <Text style={styles.body}>{r.kind === 'comment' ? t('staff.reports.what.hide') : r.kind === 'profile' ? t('staff.reports.what.clear') : t('staff.reports.what.delete')}</Text>
                  </View>
                </View>
              )}
            />
          </View>
          {done < list.length ? (
            <View style={styles.buttons}>
              <Pressable onPress={() => stack.current?.swipe('left')} style={styles.chip}><Text style={styles.chipText}>{`← ${t('staff.stamp.remove')}`}</Text></Pressable>
              <Pressable onPress={() => stack.current?.swipe('down')} style={styles.chip}><Text style={styles.chipText}>{`↓ ${t('staff.stamp.ban')}`}</Text></Pressable>
              <Pressable onPress={() => stack.current?.swipe('right')} style={[styles.chip, styles.chipOn]}><Text style={[styles.chipText, styles.chipTextOn]}>{`${t('staff.reported.keep')} →`}</Text></Pressable>
            </View>
          ) : null}
        </>
      ) : null}
    </StaffPage>
  );
}
