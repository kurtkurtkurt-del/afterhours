import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from '@/components/BackButton';
import PeopleMap, { ISLAND, type PeopleMapHandle } from '@/components/PeopleMap';
import { openPerson } from '@/components/People';
import { peopleMap, type MapData } from '@/data/peopleMap';
import { friendPhotos, usePhoto } from '@/data/photo';
import { friendsLive } from '@/data/checkin';
import { dmStart } from '@/data/dms';
import { chain, layout, type Placed } from '@/lib/islands';
import { useLang } from '@/i18n';
import { barStyle, colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// Your people as a map (messages → the your people card; owner, 28.10.2026). You in the
// middle, your friends around you, their circles as islands and the people beyond them
// blurred. A friend opens their profile; a blurred one says who they are to you and offers
// to ask the friend in between for an intro. Nobody in the crowd is ever named (101).
export default function PeopleMapScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t, up } = useLang();
  const { photo } = usePhoto();
  const [data, setData] = useState<MapData | null>(null);
  const [failed, setFailed] = useState(false);
  const [photos, setPhotos] = useState<Map<string, string>>(new Map());
  const [live, setLive] = useState<Set<string>>(new Set());
  const [who, setWho] = useState<Placed | null>(null);
  const [asking, setAsking] = useState(false);
  const map = useRef<PeopleMapHandle>(null);
  useEffect(() => {
    peopleMap().then(setData, () => setFailed(true));
    friendPhotos().then(setPhotos, () => {});
    friendsLive().then((l) => setLive(new Set(l.map((x) => x.friend_id))), () => {});
  }, []);
  const lay = useMemo(() => (data && data.nodes.length > 1 ? layout(data) : null), [data]);
  const friends = data?.nodes.filter((n) => n.w === 1).length ?? 0;
  const crowd = data?.nodes.filter((n) => n.w >= 2).length ?? 0;

  const tapped = (n: Placed) => {
    if (n.w === 0) return;
    if (n.w === 1) return n.h ? openPerson(n.h) : undefined; // a friend: straight to the profile
    setWho(n);
  };
  const via = who && lay ? [...(lay.neighbours.get(who.id) ?? [])].map((id) => lay.byId.get(id)!).filter((x) => x?.w === 1) : [];
  const path = who && lay ? chain(lay, who.id) : [];
  const door = via[0] ?? path[0];
  const intro = () => {
    if (!door?.h) return;
    setAsking(true);
    dmStart(door.h)
      .then((id) => {
        setWho(null);
        router.push({ pathname: '/dm/[id]', params: { id, name: (door.n ?? door.h ?? '').toLowerCase() } });
      })
      .catch(() => {})
      .finally(() => setAsking(false));
  };

  return (
    <View style={styles.root}>
      <StatusBar style={barStyle} />
      {lay ? (
        <PeopleMap ref={map} layout={lay} width={width} height={height} photos={photos} live={live} myPhoto={photo} onTap={tapped} />
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{failed ? t('offline.empty') : data ? t('pmap.empty') : up(t('person.loading'))}</Text>
          {data && !failed ? (
            <Pressable onPress={() => router.push('/friend/add')} style={({ pressed }) => [styles.pill, pressed && styles.pressed]} accessibilityRole="button">
              <Text style={styles.pillText}>{t('pmap.add')}</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      <View style={[styles.head, { top: brand.top - 8 }]} pointerEvents="box-none">
        <BackButton />
        <View style={styles.headText} pointerEvents="none">
          <Text style={styles.title}>{t('pmap.title')}</Text>
          {data ? <Text style={styles.sub}>{up(t('pmap.line', { n: friends, m: crowd }))}</Text> : null}
        </View>
      </View>

      {lay ? (
        <>
          <View style={[styles.hint, { bottom: insets.bottom + 22 }]} pointerEvents="none">
            <Text style={styles.hintText}>{up(t('pmap.hint'))}</Text>
          </View>
          <Pressable onPress={() => map.current?.home()} style={[styles.home, { bottom: insets.bottom + 70 }]} accessibilityRole="button" accessibilityLabel={t('pmap.home')}>
            <View style={styles.homeDot} />
          </Pressable>
        </>
      ) : null}

      {who ? (
        <>
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.scrim}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setWho(null)} />
          </Animated.View>
          <Animated.View entering={SlideInDown.duration(300)} exiting={SlideOutDown.duration(240)} style={[styles.sheet, { paddingBottom: insets.bottom + 22 }]}>
            <View style={styles.grab} />
            <View style={styles.whoRow}>
              <View style={[styles.blur, { backgroundColor: ISLAND[who.island % ISLAND.length] }]}>
                <View style={styles.blurIn} />
              </View>
              <View style={styles.whoText}>
                <Text style={styles.whoTitle}>{t('pmap.who')}</Text>
                <Text style={styles.whoLine}>
                  {via.length ? t('pmap.via', { names: via.slice(0, 3).map((v) => (v.n ?? v.h ?? '').toLowerCase()).join(', ') }) : t('pmap.steps', { n: who.w })}
                  {' · '}
                  {t('pmap.stays')}
                </Text>
              </View>
            </View>
            <Text style={styles.chain}>{up([t('pmap.you'), ...path.map((p) => (p.w === 1 ? (p.n ?? p.h ?? '').toLowerCase() : '·'))].join(' → ').replace(/·$/, '?'))}</Text>
            {door?.h ? (
              <Pressable onPress={intro} disabled={asking} style={({ pressed }) => [styles.pill, styles.pillWide, (pressed || asking) && styles.pressed]} accessibilityRole="button">
                <Text style={styles.pillText}>{t('pmap.intro', { name: (door.n ?? door.h).toLowerCase() })}</Text>
              </Pressable>
            ) : null}
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  head: { position: 'absolute', left: brand.left, right: brand.left, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  headText: { marginLeft: 44, paddingTop: 2 },
  title: { fontFamily: fonts.semibold, fontSize: 26, letterSpacing: -0.9, color: colors.paper },
  sub: { fontFamily: fonts.jet, fontSize: 9.5, letterSpacing: 1.1, color: colors.meta, marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 36, gap: 18 },
  emptyText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.mute, textAlign: 'center' },
  pill: { backgroundColor: colors.spot, borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 11, alignItems: 'center' },
  pillWide: { marginTop: 16 },
  pillText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.onSpot },
  pressed: { opacity: 0.6 },
  hint: { position: 'absolute', alignSelf: 'center', backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  hintText: { fontFamily: fonts.jet, fontSize: 9, letterSpacing: 1.1, color: colors.mute },
  home: { position: 'absolute', right: brand.left, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  homeDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.ink },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(14,13,12,0.38)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.ink, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 22, paddingTop: 10 },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.ink3, marginBottom: 16 },
  whoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  blur: { width: 64, height: 64, borderRadius: 32, opacity: 0.45, alignItems: 'center', justifyContent: 'center' },
  blurIn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.45)' },
  whoText: { flex: 1 },
  whoTitle: { fontFamily: fonts.semibold, fontSize: 20, letterSpacing: -0.5, color: colors.paper },
  whoLine: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.mute, marginTop: 3 },
  chain: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.1, color: colors.spotText, marginTop: 16 },
});
