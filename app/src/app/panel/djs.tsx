import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import StaffPage, { Quiet, Said } from '@/components/StaffPage';
import SwipeStack, { type StackHandle } from '@/components/SwipeStack';
import { djsWaiting, verifyDj, why, type WaitingDj as Item } from '@/data/staff';
import { useLang } from '@/i18n';
import { queueStyles as styles } from '@/components/QueueStyles';

// Dj pages people made for themselves (53_trust.sql), oldest first, as a pile: right
// lets the page through (everyone sees it), left turns it down. Check the name is
// really theirs: anyone can type "dj" as the code.
export default function DjsWaiting() {
  const { t, up } = useLang();
  const stack = useRef<StackHandle>(null);
  const [list, setList] = useState<Item[] | null>(null);
  const [done, setDone] = useState(0);
  const [said, setSaid] = useState<string | null>(null);
  useEffect(() => {
    djsWaiting().then(setList, (e) => {
      setList([]);
      setSaid(why(e));
    });
  }, []);
  const decide = (d: Item, way: 'left' | 'right' | 'down') => {
    setDone((n) => n + 1);
    verifyDj(d.id, way === 'right').catch((e) => setSaid(why(e)));
  };
  return (
    <StaffPage title={t('staff.djs.waiting')}>
      <Said text={said} bad />
      <Quiet text={t('staff.djs.waiting.note')} />
      {list === null ? <Quiet text="…" /> : null}
      {list && !list.length ? <Quiet text={t('staff.djs.waiting.none')} /> : null}
      {list?.length ? (
        <>
          <Text style={styles.count}>{up(`${Math.min(done + 1, list.length)} / ${list.length}`)}</Text>
          <View style={styles.pile}>
            <SwipeStack
              ref={stack}
              items={list}
              keyOf={(d) => d.id}
              stamps={{ right: t('staff.stamp.ok'), left: t('staff.stamp.no') }}
              onSwipe={decide}
              empty={<Quiet text={t('staff.djs.waiting.none')} />}
              render={(d) => (
                <View style={styles.card}>
                  {d.photo_url ? <Image source={{ uri: d.photo_url }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
                  <LinearGradient colors={['rgba(14,13,12,0)', 'rgba(14,13,12,0.92)']} locations={[0.2, 0.7]} style={StyleSheet.absoluteFill} />
                  <View style={styles.cardText}>
                    <Text style={styles.meta}>{`@${d.owner ?? '—'} · ${d.created_at.slice(0, 10)}`}</Text>
                    <Text style={styles.title}>{d.name}</Text>
                    {d.genre ? <Text style={styles.meta}>{d.genre}</Text> : null}
                    {d.bio ? <Text style={styles.body} numberOfLines={5}>{d.bio}</Text> : null}
                  </View>
                </View>
              )}
            />
          </View>
          {done < list.length ? (
            <View style={styles.buttons}>
              <Pressable onPress={() => stack.current?.swipe('left')} style={styles.chip}><Text style={styles.chipText}>{`← ${t('staff.djs.no')}`}</Text></Pressable>
              <Pressable onPress={() => stack.current?.swipe('right')} style={[styles.chip, styles.chipOn]}><Text style={[styles.chipText, styles.chipTextOn]}>{`${t('staff.djs.ok')} →`}</Text></Pressable>
            </View>
          ) : null}
        </>
      ) : null}
    </StaffPage>
  );
}
