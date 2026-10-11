import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shortDay } from '@/components/DayPicker';
import { Quiet } from '@/components/StaffPage';
import { cityPhotos, cityPhotosNow, type CityPhoto } from '@/data/cityPhotos';
import { friendPhotos } from '@/data/photo';
import { groupLegNights, groupLegs, why, type Group, type Leg, type LegNight } from '@/data/groups';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// The passport of a travel group (design A, prototypes/travel.html, 12.10.2026): one
// paper page per leg of the route, swiped sideways. On a page: PAGE n / N and the
// country, the city large with the red dot, its days, a blue stamp (arrived · in n
// days · been there), the nights the group kept there with who is in, the travellers,
// and a red stamp with the number of photos from there (it opens the memories).
// The photo of the city (the place picker's) lies under the page like a watermark.

const PAPER = '#efe9dc';
const PAPER_INK = '#0E0D0C';
const PAPER_MUTE = '#6C6961';
const PAPER_RULE = '#d9d5cc';
const STAMP_BLUE = '#2c4a8a';

type Props = { id: string; group: Group; top: number; onSwipe: () => void };

export default function Passport({ id, group, top, onSwipe }: Props) {
  const { t, up } = useLang();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [legs, setLegs] = useState<Leg[] | null>(null);
  const [photos, setPhotos] = useState<Record<string, CityPhoto>>({});
  const [faces, setFaces] = useState<Map<string, string>>(new Map());
  const [said, setSaid] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const list = useRef<FlatList<Leg>>(null);

  const load = useCallback(() => {
    groupLegs(id).then(
      (rows) => {
        setLegs(rows);
        const cities = rows.map((l) => ({ id: l.city_slug, name: l.city_name }));
        setPhotos(cityPhotosNow(cities));
        cityPhotos(cities).then((p) => setPhotos((old) => ({ ...old, ...p })), () => {});
      },
      (e) => setSaid(why(e)),
    );
    friendPhotos().then(setFaces, () => {});
  }, [id]);
  useEffect(load, [load]);

  const pageW = width;
  const inner = width - brand.left * 2;

  if (said) return <Quiet text={said} />;
  if (legs && !legs.length) {
    return (
      <View style={{ paddingTop: top + 24, paddingHorizontal: brand.left }}>
        <Quiet text={t('trip.route.none')} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: top + 10 }}>
      <FlatList
        ref={list}
        data={legs ?? []}
        keyExtractor={(l) => l.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / pageW))}
        getItemLayout={(_, i) => ({ length: pageW, offset: pageW * i, index: i })}
        renderItem={({ item, index }) => (
          <View style={{ width: pageW, paddingHorizontal: brand.left }}>
            <Page leg={item} n={index + 1} of={legs?.length ?? 0} group={group} photo={photos[item.city_slug]} faces={faces} width={inner} bottom={insets.bottom} onSwipe={onSwipe} />
          </View>
        )}
      />
      {legs && legs.length > 1 ? (
        <View style={[styles.foot, { paddingBottom: insets.bottom + 92 }]}>
          <View style={styles.dots}>
            {legs.map((l, i) => (
              <View key={l.id} style={[styles.dot, i === page && styles.dotOn]} />
            ))}
          </View>
          <View style={styles.neighbours}>
            <Pressable onPress={page > 0 ? () => list.current?.scrollToIndex({ index: page - 1 }) : undefined} hitSlop={8}>
              <Text style={styles.neighbour}>{page > 0 ? `‹ ${legs[page - 1].city_name.toLowerCase()}` : ''}</Text>
            </Pressable>
            <Text style={styles.neighbourDot}>{up(t('trip.page', { n: page + 1, of: legs.length }))}</Text>
            <Pressable onPress={page < legs.length - 1 ? () => list.current?.scrollToIndex({ index: page + 1 }) : undefined} hitSlop={8}>
              <Text style={styles.neighbour}>{page < legs.length - 1 ? `${legs[page + 1].city_name.toLowerCase()} ›` : ''}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const daysUntil = (iso: string) => Math.round((new Date(iso).getTime() - new Date(today()).getTime()) / 86_400_000);

function Page({ leg, n, of, group, photo, faces, width, bottom, onSwipe }: { leg: Leg; n: number; of: number; group: Group; photo?: CityPhoto; faces: Map<string, string>; width: number; bottom: number; onSwipe: () => void }) {
  const { t, tn, up } = useLang();
  const [nights, setNights] = useState<LegNight[] | null>(null);
  useEffect(() => {
    groupLegNights(group.id, leg.id).then(setNights, () => setNights([]));
  }, [group.id, leg.id]);
  const now = today();
  const nightsCount = Math.max(1, Math.round((new Date(leg.date_to).getTime() - new Date(leg.date_from).getTime()) / 86_400_000) + 1);
  const stamp = leg.date_to < now ? t('trip.been') : leg.date_from <= now ? t('trip.arrived', { d: shortDay(leg.date_from) }) : tn('trip.inDays', daysUntil(leg.date_from));
  const stampColor = leg.date_from <= now ? STAMP_BLUE : PAPER_MUTE;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottom + 150 }}>
      <View style={[styles.page, { width }]}>
        {photo ? <Image source={{ uri: photo.uri }} style={styles.watermark} contentFit="cover" cachePolicy="memory-disk" /> : null}
        <View style={styles.pageTop}>
          <Text style={styles.pageMono}>{up(t('trip.page', { n, of }))}</Text>
          <Text style={styles.pageMono}>{(leg.country_slug ?? '').toUpperCase()}</Text>
        </View>
        <Text style={styles.city} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {leg.city_name.toLowerCase()}
          <Text style={styles.cityDot}>.</Text>
        </Text>
        <Text style={styles.days}>{`${shortDay(leg.date_from)} – ${shortDay(leg.date_to)} · ${tn('trip.nights', nightsCount)}`}</Text>
        <View style={[styles.stamp, { borderColor: stampColor, transform: [{ rotate: '-8deg' }] }]}>
          <Text style={[styles.stampText, { color: stampColor }]}>{up(stamp)}</Text>
        </View>

        <View style={styles.rule} />
        <Text style={styles.pageMono}>{up(t('trip.kept', { n: nights?.length ?? leg.kept }))}</Text>
        {nights && !nights.length ? (
          <>
            <Text style={styles.none}>{t('trip.kept.none')}</Text>
            <Pressable onPress={onSwipe} style={({ pressed }) => [styles.find, pressed && styles.pressed]} accessibilityRole="button">
              <Text style={styles.findText}>{t('trip.swipe')}</Text>
            </Pressable>
          </>
        ) : null}
        {nights?.map((x) => (
          <Pressable key={x.id} onPress={() => router.push({ pathname: '/night/[slug]', params: { slug: x.slug } })} style={({ pressed }) => [styles.night, pressed && styles.pressed]} accessibilityRole="button">
            <View style={styles.poster}>{x.image_url ? <Image source={{ uri: x.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}</View>
            <View style={styles.nightText}>
              <Text style={styles.nightTitle} numberOfLines={1}>{x.title.toLowerCase()}</Text>
              <Text style={styles.nightMeta} numberOfLines={1}>{[x.starts_at ? shortDay(x.starts_at.slice(0, 10)) : null, x.venue_name?.toLowerCase()].filter(Boolean).join(' · ')}</Text>
            </View>
            <Text style={[styles.nightIn, x.status === 'match' && styles.nightInAll]}>{up(t('trip.in', { n: x.yes, of: x.members }))}</Text>
          </Pressable>
        ))}

        <View style={styles.rule} />
        <View style={styles.bottomRow}>
          <Pressable onPress={() => router.push({ pathname: '/groups/new', params: { id: group.id } })} style={styles.faces} accessibilityRole="button" accessibilityLabel={t('groups.add')}>
            {group.members.slice(0, 5).map((m) => {
              const uri = faces.get(m.id);
              return (
                <View key={m.id} style={styles.face}>
                  {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Text style={styles.faceLetter}>{(m.name ?? m.handle ?? '?').charAt(0).toUpperCase()}</Text>}
                </View>
              );
            })}
            <View style={[styles.face, styles.faceAdd]}>
              <Text style={styles.faceAddText}>+</Text>
            </View>
            <Text style={styles.travelling}>{t('trip.travelling', { n: group.members.length })}</Text>
          </Pressable>
          <Pressable onPress={() => router.push({ pathname: '/groups/memories', params: { id: group.id } })} style={[styles.stamp, styles.stampRed, { transform: [{ rotate: '6deg' }] }]} accessibilityRole="button">
            <Text style={[styles.stampText, { color: colors.spot }]}>{up(t('trip.photos', { n: leg.photos }))}</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: PAPER, borderRadius: radius.md, padding: 16, paddingTop: 14, overflow: 'hidden', minHeight: 440, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  watermark: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.16 },
  pageTop: { flexDirection: 'row', justifyContent: 'space-between' },
  pageMono: { fontFamily: fonts.jet, fontSize: 9.5, letterSpacing: 1.6, color: PAPER_MUTE },
  city: { fontFamily: fonts.logo, fontSize: 48, lineHeight: 50, letterSpacing: -1.2, color: PAPER_INK, marginTop: 16 },
  cityDot: { color: colors.spot },
  days: { fontFamily: fonts.regular, fontSize: 13, color: '#3a3632', marginTop: 4 },
  stamp: { alignSelf: 'flex-start', borderWidth: 2, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5, marginTop: 12 },
  stampRed: { borderColor: colors.spot, marginTop: 0 },
  stampText: { fontFamily: fonts.jet, fontSize: 9.5, letterSpacing: 1.6 },
  rule: { height: 1, backgroundColor: PAPER_RULE, marginVertical: 14 },
  none: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: PAPER_MUTE, marginTop: 8 },
  find: { alignSelf: 'flex-start', marginTop: 10, height: 34, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: PAPER_INK, justifyContent: 'center' },
  findText: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.paper },
  night: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  poster: { width: 36, height: 46, borderRadius: 6, backgroundColor: PAPER_RULE, overflow: 'hidden' },
  nightText: { flex: 1, minWidth: 0 },
  nightTitle: { fontFamily: fonts.medium, fontSize: 13.5, color: PAPER_INK },
  nightMeta: { fontFamily: fonts.regular, fontSize: 11, color: PAPER_MUTE, marginTop: 2 },
  nightIn: { fontFamily: fonts.jet, fontSize: 8.5, letterSpacing: 1.2, color: PAPER_MUTE },
  nightInAll: { color: colors.spot },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  faces: { flexDirection: 'row', alignItems: 'center' },
  face: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#8a857b', borderWidth: 1.5, borderColor: PAPER, marginLeft: -7, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  faceLetter: { fontFamily: fonts.semibold, fontSize: 11, color: colors.paper },
  faceAdd: { backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'dashed', borderColor: PAPER_MUTE },
  faceAddText: { fontFamily: fonts.medium, fontSize: 13, color: PAPER_MUTE },
  travelling: { fontFamily: fonts.regular, fontSize: 11.5, color: '#3a3632', marginLeft: 8 },
  foot: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', gap: 8 },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#3a3632' },
  dotOn: { width: 14, backgroundColor: colors.spot },
  neighbours: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: brand.left },
  neighbour: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute, minWidth: 80 },
  neighbourDot: { fontFamily: fonts.jet, fontSize: 9, letterSpacing: 1.4, color: colors.meta },
  pressed: { opacity: 0.7 },
});
