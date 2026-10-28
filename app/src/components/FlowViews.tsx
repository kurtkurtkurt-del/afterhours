import { useMemo } from 'react';
import { FlatList, Pressable, SectionList, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import NightThumb from '@/components/NightThumb';
import Avatar from '@/components/Avatar';
import type { DeckFriend } from '@/components/CardFace';
import type { Night } from '@/data/deck';
import { dayLabel } from '@/data/when';
import { upperData, useLang } from '@/i18n';
import { colors, fonts, radius, scrim } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// The flow's other two ways to look (owner, 28.10.2026; prototypes/flow-classic.html):
//   classic  A, the nights by day: a day heading that stays on top while its nights pass under
//            it, each night a row (picture, name, venue · time, who of your friends kept it, keep)
//   poster   B, a wall of posters in two columns, tall and short in turn, the day on a tag
// The same nights as the swipe deck, the same filters. A tap opens the night; the heart keeps it
// (as a swipe right) and a second tap takes that back.

// One row of either list: a night, or a spark (gold; its picture is the spark's own photo).
export type ViewRow = {
  id: string;
  title: string;
  place: string | null;
  startsAt: string | null;
  night?: Night;
  local?: ImageSourcePropType;
  meta: string;
  friends: DeckFriend[];
  gold?: boolean;
  kept: boolean;
  open: () => void;
  keep: () => void;
};
type Props = { rows: ViewRow[]; top: number; bottom: number };
const GOLD = '#E8B04B'; // sparks, as on the map and the deck

const time = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const dayKey = (iso: string | null) => {
  if (!iso) return 'tba';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? 'tba' : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

function Heart({ on, onPress, small, onPhoto, gold }: { on: boolean; onPress: () => void; small?: boolean; onPhoto?: boolean; gold?: boolean }) {
  const size = small ? 26 : 34;
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.heart, { width: size, height: size, borderRadius: size / 2 }, onPhoto && styles.heartPhoto, on && (gold ? styles.heartGold : styles.heartOn)]}>
      <Svg width={small ? 12 : 15} height={small ? 12 : 15} viewBox="0 0 24 24">
        <Path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" fill={on || onPhoto ? colors.onSpot : colors.meta} />
      </Svg>
    </Pressable>
  );
}

function Faces({ list }: { list: DeckFriend[] }) {
  return (
    <View style={styles.faces}>
      {list.slice(0, 3).map((f, i) => (
        <View key={f.name} style={[styles.face, i > 0 && styles.faceOver, f.live && styles.faceLive]}>
          {f.photo ? <Image source={{ uri: f.photo }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Avatar name={f.name} size={18} />}
        </View>
      ))}
    </View>
  );
}

const Pic = ({ r }: { r: ViewRow }) => (r.night ? <NightThumb night={r.night} /> : r.local ? <Image source={r.local} style={StyleSheet.absoluteFill} contentFit="cover" /> : null);

export function FlowClassic({ rows, top, bottom }: Props) {
  const { t, tn, up } = useLang();
  const sections = useMemo(() => {
    const out: { key: string; title: string; data: ViewRow[] }[] = [];
    for (const n of rows) {
      const k = dayKey(n.startsAt);
      let s = out.find((x) => x.key === k);
      if (!s) out.push((s = { key: k, title: dayLabel(n.startsAt), data: [] }));
      s.data.push(n);
    }
    return out;
  }, [rows]);
  return (
    <SectionList
      sections={sections}
      keyExtractor={(n) => n.id}
      stickySectionHeadersEnabled
      initialNumToRender={14}
      contentContainerStyle={{ paddingTop: top, paddingBottom: bottom }}
      showsVerticalScrollIndicator={false}
      renderSectionHeader={({ section }) => (
        <View style={styles.day}>
          <Text style={styles.dayTitle}>{section.title}</Text>
          <Text style={styles.mono}>{up(tn('special.nights', section.data.length))}</Text>
        </View>
      )}
      renderItem={({ item: n }) => {
        const fr = n.friends;
        return (
          <Pressable onPress={n.open} style={({ pressed }) => [styles.row, pressed && styles.pressed]} accessibilityRole="button">
            <View style={[styles.thumb, n.gold && styles.thumbGold]}><Pic r={n} /></View>
            <View style={styles.text}>
              <Text style={[styles.name, n.gold && styles.goldText]} numberOfLines={1}>{n.title.toLowerCase()}</Text>
              <Text style={styles.line} numberOfLines={1}>{[n.place?.toLowerCase(), time(n.startsAt)].filter(Boolean).join(' · ')}</Text>
              <View style={styles.meta}>
                {fr.length ? <Faces list={fr} /> : null}
                <Text style={[styles.mono, fr.length > 0 && styles.red, n.gold && styles.goldText]} numberOfLines={1}>
                  {fr.length ? up(tn('yours.friendsKept', fr.length)) : upperData(n.meta)}
                </Text>
              </View>
            </View>
            <Heart on={n.kept} onPress={n.keep} gold={n.gold} />
          </Pressable>
        );
      }}
      ListEmptyComponent={<Text style={styles.empty}>{up(t('flow.view.empty'))}</Text>}
    />
  );
}

export function FlowPosters({ rows, top, bottom }: Props) {
  const { up } = useLang();
  // two columns, tall and short in turn, so the wall does not read as a grid
  const cols = useMemo(() => {
    const l: { n: ViewRow; h: number }[] = [], r: { n: ViewRow; h: number }[] = [];
    rows.forEach((n, i) => (i % 2 ? r : l).push({ n, h: i % 3 === 0 ? 230 : 180 }));
    return [l, r];
  }, [rows]);
  const card = ({ n, h }: { n: ViewRow; h: number }) => {
    const fr = n.friends;
    return (
      <Pressable key={n.id} onPress={n.open} style={({ pressed }) => [styles.post, { height: h }, n.gold && styles.postGold, pressed && styles.pressed]} accessibilityRole="button">
        <Pic r={n} />
        <LinearGradient colors={[scrim(0.3), scrim(0), scrim(0.85)]} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={[styles.postDate, n.gold && styles.postDateGold]}><Text style={styles.postDateText}>{dayLabel(n.startsAt)}</Text></View>
        <View style={styles.postHeart}><Heart small onPhoto on={n.kept} onPress={n.keep} gold={n.gold} /></View>
        <View style={styles.postText}>
          <Text style={[styles.postName, n.gold && styles.goldText]} numberOfLines={3}>{n.title.toLowerCase()}</Text>
          <Text style={styles.postLine} numberOfLines={1}>{up([n.place ?? '', time(n.startsAt), fr.length ? `${fr.length} ♥` : ''].filter(Boolean).join(' · '))}</Text>
        </View>
      </Pressable>
    );
  };
  // a FlatList of one row keeps the same scrolling as the classic list
  return (
    <FlatList
      data={[0]}
      keyExtractor={() => 'wall'}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: top, paddingBottom: bottom }}
      renderItem={() => (
        <View style={styles.wall}>
          {cols.map((c, i) => <View key={i} style={styles.col}>{c.map(card)}</View>)}
        </View>
      )}
    />
  );
}

// the switch: three marks, swipe · classic · poster
export type FlowView = 'swipe' | 'classic' | 'poster';
export function ViewSwitch({ value, onChange }: { value: FlowView; onChange: (v: FlowView) => void }) {
  const { t } = useLang();
  const mark = (v: FlowView, on: boolean) => {
    const c = on ? colors.ink : colors.mute;
    if (v === 'swipe') return <Svg width={16} height={16} viewBox="0 0 16 16"><Path d="M4 2.5h7a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 11 14.5H4A1.5 1.5 0 0 1 2.5 13V4A1.5 1.5 0 0 1 4 2.5Z" stroke={c} strokeWidth={1.6} fill="none" transform="rotate(-8 8 8)" /></Svg>;
    if (v === 'classic') return <Svg width={16} height={16} viewBox="0 0 16 16"><Path d="M2.5 4h2M7 4h6.5M2.5 8h2M7 8h6.5M2.5 12h2M7 12h6.5" stroke={c} strokeWidth={1.6} strokeLinecap="round" /></Svg>;
    return <Svg width={16} height={16} viewBox="0 0 16 16"><Path d="M2.5 2.5h4.5v6h-4.5zM9 2.5h4.5v4h-4.5zM2.5 10.5h4.5v3h-4.5zM9 8.5h4.5v5h-4.5z" stroke={c} strokeWidth={1.4} strokeLinejoin="round" fill="none" /></Svg>;
  };
  return (
    <View style={styles.switch} accessibilityRole="tablist">
      {(['swipe', 'classic', 'poster'] as const).map((v) => (
        <Pressable key={v} onPress={() => onChange(v)} hitSlop={4} accessibilityRole="tab" accessibilityLabel={t(`flow.view.${v}`)} accessibilityState={{ selected: value === v }} style={[styles.switchBtn, value === v && styles.switchOn]}>
          {mark(v, value === v)}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  mono: { fontFamily: fonts.jet, fontSize: 9, letterSpacing: 1, color: colors.meta },
  red: { color: colors.spotText },
  empty: { fontFamily: fonts.jet, fontSize: 11, letterSpacing: 1.4, color: colors.mute, textAlign: 'center', marginTop: 40 },
  day: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: brand.left, paddingTop: 12, paddingBottom: 8, backgroundColor: colors.ink },
  dayTitle: { fontFamily: fonts.semibold, fontSize: 18, letterSpacing: -0.5, color: colors.paper },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: brand.left, paddingVertical: 8 },
  thumb: { width: 62, height: 62, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.ink3 },
  text: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.semibold, fontSize: 14.5, letterSpacing: -0.3, color: colors.paper },
  line: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute, marginTop: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  faces: { flexDirection: 'row' },
  face: { width: 18, height: 18, borderRadius: 9, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.ink, backgroundColor: colors.ink3 },
  faceOver: { marginLeft: -6 },
  faceLive: { borderColor: colors.spot },
  heart: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.ink3 },
  heartPhoto: { borderWidth: 0, backgroundColor: 'rgba(0,0,0,0.38)' },
  heartOn: { backgroundColor: colors.spot, borderColor: colors.spot },
  heartGold: { backgroundColor: GOLD, borderColor: GOLD },
  goldText: { color: GOLD },
  thumbGold: { borderWidth: 1.5, borderColor: GOLD },
  postGold: { borderWidth: 1.5, borderColor: GOLD },
  postDateGold: { backgroundColor: GOLD },
  wall: { flexDirection: 'row', gap: 10, paddingHorizontal: brand.left - 4 },
  col: { flex: 1, gap: 10 },
  post: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.poster },
  postDate: { position: 'absolute', left: 8, top: 8, backgroundColor: colors.onPhoto, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  postDateText: { fontFamily: fonts.logo, fontSize: 11, color: colors.poster },
  postHeart: { position: 'absolute', right: 7, top: 7 },
  postText: { position: 'absolute', left: 10, right: 10, bottom: 10 },
  postName: { fontFamily: fonts.semibold, fontSize: 13.5, lineHeight: 16, letterSpacing: -0.2, color: colors.onPhoto },
  postLine: { fontFamily: fonts.jet, fontSize: 8, letterSpacing: 0.8, color: colors.onPhotoMute, marginTop: 4 },
  switch: { flexDirection: 'row', height: 34, padding: 3, borderRadius: radius.pill, backgroundColor: colors.ink3, marginLeft: 'auto' },
  switchBtn: { width: 34, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  switchOn: { backgroundColor: colors.paper },
});
