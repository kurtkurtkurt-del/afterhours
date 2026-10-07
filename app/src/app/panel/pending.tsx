import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CodeSheet from '@/components/CodeSheet';
import StaffPage, { Quiet, Said } from '@/components/StaffPage';
import SwipeStack, { type StackHandle } from '@/components/SwipeStack';
import { pendingNights, reviewNight, why, type Pending as Item } from '@/data/staff';
import { dayLabel } from '@/data/when';
import { useRefreshOnFocus } from '@/hooks/useRefresh';
import { useLang } from '@/i18n';
import { queueStyles as styles } from '@/components/QueueStyles';

const fallback = require('../../../assets/intro/concert.jpg');

// Nights people sent in (43_event_submit.sql), oldest first, as a pile to swipe
// (design 15B): right lets it through, left turns it down (with a line the sender
// sees), down opens it to fix first. The buttons under the pile do the same.
export default function Pending() {
  const { t, up } = useLang();
  const insets = useSafeAreaInsets();
  const tick = useRefreshOnFocus();
  const stack = useRef<StackHandle>(null);
  const [list, setList] = useState<Item[] | null>(null);
  const [done, setDone] = useState(0);
  const [turning, setTurning] = useState<Item | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  useEffect(() => {
    pendingNights().then((l) => {
      setDone(0);
      setList(l);
    }, (e) => setSaid(why(e)));
  }, [tick]);

  const decide = (n: Item, way: 'left' | 'right' | 'down') => {
    setDone((d) => d + 1);
    if (way === 'right') reviewNight(n.id, true, null).catch((e) => setSaid(why(e)));
    else if (way === 'left') setTurning(n);
    else router.push({ pathname: '/panel/night', params: { id: n.id } });
  };

  return (
    <StaffPage title={t('staff.pending')}>
      <Said text={said} bad />
      {list === null ? <Quiet text="…" /> : null}
      {list && !list.length ? <Quiet text={t('staff.pending.none')} /> : null}
      {list?.length ? (
        <>
          <Text style={styles.count}>{up(`${Math.min(done + 1, list.length)} / ${list.length}`)}</Text>
          <View style={styles.pile}>
            <SwipeStack
              ref={stack}
              items={list}
              keyOf={(n) => n.id}
              stamps={{ right: t('staff.stamp.ok'), left: t('staff.stamp.no'), down: t('staff.stamp.edit') }}
              onSwipe={decide}
              empty={<Quiet text={t('staff.pending.none')} />}
              render={(n) => (
                <View style={styles.card}>
                  <Image source={n.image_url ? { uri: n.image_url } : fallback} style={StyleSheet.absoluteFill} contentFit="cover" />
                  <LinearGradient colors={['rgba(14,13,12,0)', 'rgba(14,13,12,0.92)']} locations={[0.25, 0.75]} style={StyleSheet.absoluteFill} />
                  <View style={styles.cardText}>
                    <Text style={styles.title} numberOfLines={2}>{n.title.toLowerCase()}</Text>
                    <Text style={styles.meta}>{[up(dayLabel(n.starts_at)), n.starts_at.slice(11, 16), n.venue_name, n.city_slug, n.type_slug].filter(Boolean).join(' · ')}</Text>
                    {n.body ? <Text style={styles.body} numberOfLines={3}>{n.body}</Text> : null}
                    {n.ticket_url ? (
                      <Text style={styles.link} numberOfLines={1} onPress={() => Linking.openURL(n.ticket_url!).catch(() => {})}>
                        {n.ticket_url}
                      </Text>
                    ) : null}
                    <Text style={styles.meta}>{`${t('staff.sentin')}: ${n.handle ? '@' + n.handle : (n.maker ?? '—')}`}</Text>
                  </View>
                </View>
              )}
            />
          </View>
          {done < list.length ? (
            <View style={styles.buttons}>
              <Pressable onPress={() => stack.current?.swipe('left')} style={styles.chip}><Text style={styles.chipText}>{`← ${t('staff.reject')}`}</Text></Pressable>
              <Pressable onPress={() => stack.current?.swipe('down')} style={styles.chip}><Text style={styles.chipText}>{`${t('staff.night.edit')} ↓`}</Text></Pressable>
              <Pressable onPress={() => stack.current?.swipe('right')} style={[styles.chip, styles.chipOn]}><Text style={[styles.chipText, styles.chipTextOn]}>{`${t('staff.approve')} →`}</Text></Pressable>
            </View>
          ) : null}
          <View style={{ height: insets.bottom }} />
        </>
      ) : null}
      <CodeSheet
        key={turning?.id ?? 'none'}
        open={turning !== null}
        title={t('staff.reject.why')}
        go={t('staff.reject')}
        error={null}
        onSubmit={(note) => {
          if (turning) reviewNight(turning.id, false, note).catch((e) => setSaid(why(e)));
          setTurning(null);
        }}
        onClose={() => {
          // closed without a reason: still turned down, without a line
          if (turning) reviewNight(turning.id, false, null).catch((e) => setSaid(why(e)));
          setTurning(null);
        }}
      />
    </StaffPage>
  );
}

