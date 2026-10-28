import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PeopleMap, { ISLAND, type PeopleMapHandle } from '@/components/PeopleMap';
import { openPerson } from '@/components/People';
import { peopleMap, type MapData } from '@/data/peopleMap';
import { friendPhotos, usePhoto } from '@/data/photo';
import { friendsLive } from '@/data/checkin';
import { dmStart } from '@/data/dms';
import { friendAccept, friendsList, type FriendRow } from '@/data/friends';
import Avatar from '@/components/Avatar';
import Svg, { Path } from 'react-native-svg';
import { chain, layout, narrow, type Placed, type Shape } from '@/lib/islands';
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
  // friend requests waiting for you (they lived in the row on messages before the map took its place)
  const [requests, setRequests] = useState<FriendRow[]>([]);
  const loadRequests = () => friendsList().then((l) => setRequests(l.filter((f) => f.status === 'pending' && f.direction === 'incoming')), () => {});
  const map = useRef<PeopleMapHandle>(null);
  useEffect(() => {
    peopleMap().then(setData, () => setFailed(true));
    friendPhotos().then(setPhotos, () => {});
    friendsLive().then((l) => setLive(new Set(l.map((x) => x.friend_id))), () => {});
    loadRequests();
  }, []);
  const accept = (f: FriendRow) => friendAccept(f.other_id).then(() => { loadRequests(); peopleMap().then(setData, () => {}); }, () => {});
  // the filters on top: how far out, and which city; each reshapes the map its own way
  const [wave, setWave] = useState<0 | 1 | 2 | 3>(0);
  const [city, setCity] = useState<string | null>(null);
  const cities = useMemo(() => {
    const count = new Map<string, { name: string; n: number }>();
    for (const n of data?.nodes ?? []) if (n.w >= 1 && n.c) count.set(n.c, { name: n.cn ?? n.c, n: (count.get(n.c)?.n ?? 0) + 1 });
    return [...count].sort((a, b) => b[1].n - a[1].n).map(([slug, v]) => ({ slug, ...v }));
  }, [data]);
  const shape: Shape = wave === 1 ? 'ring' : wave === 2 ? 'petals' : wave === 3 ? 'orbits' : 'islands';
  const view = useMemo(() => (data ? narrow(data, wave, city) : null), [data, wave, city]);
  const lay = useMemo(() => (view && view.data.nodes.length > 1 ? layout(view.data, shape, view.dim) : null), [view, shape]);
  const friends = view?.data.nodes.filter((n) => n.w === 1 && !view.dim.has(n.id)).length ?? 0;
  const crowd = view?.data.nodes.filter((n) => n.w >= 2 && !view.dim.has(n.id)).length ?? 0;

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
        <PeopleMap key={`${wave}/${city ?? ''}`} ref={map} layout={lay} width={width} height={height} photos={photos} live={live} myPhoto={photo} onTap={tapped} />
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

      <View style={[styles.head, { top: insets.top + 10 }]} pointerEvents="box-none">
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/messages'))} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('pmap.back')} style={({ pressed }) => [styles.round, pressed && styles.pressed]}>
          <Svg width={18} height={18} viewBox="0 0 18 18"><Path d="M11.5 3.5 6 9l5.5 5.5" stroke={colors.paper} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
        </Pressable>
        <View style={styles.headText} pointerEvents="none">
          <Text style={styles.title}>{t('pmap.title')}</Text>
          {data ? <Text style={styles.sub}>{up(t('pmap.line', { n: friends, m: crowd }))}</Text> : null}
        </View>
        <Pressable onPress={() => router.push('/friend/add')} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('pmap.add')} style={({ pressed }) => [styles.round, styles.roundRed, pressed && styles.pressed]}>
          <Svg width={16} height={16} viewBox="0 0 16 16"><Path d="M8 2.5v11M2.5 8h11" stroke={colors.onSpot} strokeWidth={2} strokeLinecap="round" /></Svg>
        </Pressable>
      </View>

      {data && data.nodes.length > 1 ? (
        <View style={[styles.filters, { top: insets.top + 62 }]} pointerEvents="box-none">
          <View style={styles.chips}>
            {([0, 1, 2, 3] as const).map((x) => (
              <Pressable key={x} onPress={() => setWave(x)} style={[styles.chip, wave === x && styles.chipOn]} accessibilityRole="tab" accessibilityState={{ selected: wave === x }}>
                <Text style={[styles.chipText, wave === x && styles.chipTextOn]} numberOfLines={1}>{t(x === 0 ? 'fmap.all' : x === 1 ? 'fmap.friends' : x === 2 ? 'fmap.w2' : 'fmap.w3')}</Text>
              </Pressable>
            ))}
          </View>
          {cities.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cityRow}>
              <Pressable onPress={() => setCity(null)} style={[styles.cityChip, !city && styles.chipOn]} accessibilityRole="button">
                <Text style={[styles.chipText, !city && styles.chipTextOn]}>{t('pmap.allCities')}</Text>
              </Pressable>
              {cities.map((c) => (
                <Pressable key={c.slug} onPress={() => setCity(city === c.slug ? null : c.slug)} style={[styles.cityChip, city === c.slug && styles.chipOn]} accessibilityRole="button">
                  <Text style={[styles.chipText, city === c.slug && styles.chipTextOn]}>{c.name.toLowerCase()}<Text style={styles.chipCount}> {c.n}</Text></Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </View>
      ) : null}

      {requests.length ? (
        <View style={[styles.requests, { top: insets.top + (cities.length ? 150 : 110) }]}>
          {requests.slice(0, 3).map((f) => (
            <View key={f.other_id} style={styles.request}>
              <Pressable onPress={() => f.handle && openPerson(f.handle)} style={styles.requestWho} accessibilityRole="button">
                <View style={styles.requestFace}><Avatar name={f.handle ?? f.display_name ?? '?'} size={30} /></View>
                <View style={styles.requestText}>
                  <Text style={styles.requestName} numberOfLines={1}>{(f.display_name ?? f.handle ?? '').toLowerCase()}</Text>
                  <Text style={styles.requestLine} numberOfLines={1}>{up(t('pmap.wants'))}</Text>
                </View>
              </Pressable>
              <Pressable onPress={() => accept(f)} style={({ pressed }) => [styles.acceptBtn, pressed && styles.pressed]} accessibilityRole="button">
                <Text style={styles.acceptText}>{t('people.accept')}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {lay ? (
        <>
          <View style={[styles.hint, { bottom: insets.bottom + 22 }]} pointerEvents="none">
            <Text style={styles.hintText}>{up(t('pmap.hint'))}</Text>
          </View>
          <View style={[styles.zoom, { bottom: insets.bottom + 70 }]}>
            <Pressable onPress={() => map.current?.zoom(1.4)} hitSlop={6} style={({ pressed }) => [styles.zoomBtn, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={t('pmap.zoomIn')}>
              <Svg width={16} height={16} viewBox="0 0 16 16"><Path d="M8 2.5v11M2.5 8h11" stroke={colors.paper} strokeWidth={2} strokeLinecap="round" /></Svg>
            </Pressable>
            <View style={styles.zoomRule} />
            <Pressable onPress={() => map.current?.zoom(1 / 1.4)} hitSlop={6} style={({ pressed }) => [styles.zoomBtn, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={t('pmap.zoomOut')}>
              <Svg width={16} height={16} viewBox="0 0 16 16"><Path d="M2.5 8h11" stroke={colors.paper} strokeWidth={2} strokeLinecap="round" /></Svg>
            </Pressable>
            <View style={styles.zoomRule} />
            <Pressable onPress={() => map.current?.home()} hitSlop={6} style={({ pressed }) => [styles.zoomBtn, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={t('pmap.home')}>
              <View style={styles.homeDot} />
            </Pressable>
          </View>
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
  head: { position: 'absolute', left: brand.left, right: brand.left, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headText: { flex: 1, paddingTop: 1 },
  round: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  roundRed: { backgroundColor: colors.spot },
  requests: { position: 'absolute', left: brand.left, right: brand.left, gap: 8 },
  filters: { position: 'absolute', left: 0, right: 0, gap: 8 },
  chips: { flexDirection: 'row', gap: 6, paddingHorizontal: brand.left },
  chip: { flex: 1, alignItems: 'center', borderRadius: radius.pill, paddingVertical: 8, backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  chipOn: { backgroundColor: colors.paper },
  chipText: { fontFamily: fonts.semibold, fontSize: 11.5, color: colors.mute },
  chipTextOn: { color: colors.ink },
  chipCount: { fontFamily: fonts.jet, fontSize: 10 },
  cityRow: { gap: 6, paddingHorizontal: brand.left },
  cityChip: { borderRadius: radius.pill, paddingVertical: 7, paddingHorizontal: 12, backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  request: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 18, paddingVertical: 8, paddingLeft: 10, paddingRight: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  requestWho: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  requestFace: { width: 30, height: 30, borderRadius: 15, overflow: 'hidden' },
  requestText: { flex: 1 },
  requestName: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.paper },
  requestLine: { fontFamily: fonts.jet, fontSize: 8.5, letterSpacing: 1, color: colors.spotText, marginTop: 1 },
  acceptBtn: { backgroundColor: colors.spot, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  acceptText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.onSpot },
  zoom: { position: 'absolute', right: brand.left, backgroundColor: colors.card, borderRadius: 22, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, elevation: 4 },
  zoomBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  zoomRule: { width: 22, height: 1, backgroundColor: colors.ink3 },
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
  homeDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.paper },
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
