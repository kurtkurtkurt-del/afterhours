import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import StaffPage, { Quiet, Said } from '@/components/StaffPage';
import SwipeStack, { type StackHandle } from '@/components/SwipeStack';
import { hidePost, postPhotoUrl, reportedPosts, type Reported as Item } from '@/data/posts';
import { why } from '@/data/staff';
import { useLang } from '@/i18n';
import { queueStyles as styles } from '@/components/QueueStyles';

// Posts someone reported (45_posts.sql), most reports first, as a pile (design 15B):
// left hides it, right keeps it. Either way the reports are settled.
export default function Reported() {
  const { t, up } = useLang();
  const stack = useRef<StackHandle>(null);
  const [list, setList] = useState<Item[] | null>(null);
  const [done, setDone] = useState(0);
  const [said, setSaid] = useState<string | null>(null);
  useEffect(() => {
    reportedPosts().then(setList, (e) => {
      setList([]);
      setSaid(why(e));
    });
  }, []);
  const decide = (p: Item, way: 'left' | 'right' | 'down') => {
    setDone((d) => d + 1);
    hidePost(p.id, way === 'left').catch((e) => setSaid(why(e)));
  };
  return (
    <StaffPage title={t('staff.reported')}>
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
              keyOf={(p) => p.id}
              stamps={{ right: t('staff.stamp.fine'), left: t('staff.stamp.hide') }}
              onSwipe={decide}
              empty={<Quiet text={t('staff.reported.none')} />}
              render={(p) => {
                const uri = postPhotoUrl(p.photo_path);
                return (
                  <View style={styles.card}>
                    {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
                    <LinearGradient colors={['rgba(14,13,12,0)', 'rgba(14,13,12,0.92)']} locations={[0.2, 0.7]} style={StyleSheet.absoluteFill} />
                    <View style={styles.cardText}>
                      <Text style={styles.meta}>{`@${p.author ?? '—'} · ${p.created_at.slice(0, 10)} · ${p.reports}×`}</Text>
                      {p.body ? <Text style={styles.title} numberOfLines={4}>{p.body}</Text> : null}
                      {p.reasons.length ? <Text style={styles.meta}>{p.reasons.map((r) => `“${r}”`).join('  ')}</Text> : null}
                    </View>
                  </View>
                );
              }}
            />
          </View>
          {done < list.length ? (
            <View style={styles.buttons}>
              <Pressable onPress={() => stack.current?.swipe('left')} style={styles.chip}><Text style={styles.chipText}>{`← ${t('staff.hide')}`}</Text></Pressable>
              <Pressable onPress={() => stack.current?.swipe('right')} style={[styles.chip, styles.chipOn]}><Text style={[styles.chipText, styles.chipTextOn]}>{`${t('staff.reported.keep')} →`}</Text></Pressable>
            </View>
          ) : null}
        </>
      ) : null}
    </StaffPage>
  );
}
