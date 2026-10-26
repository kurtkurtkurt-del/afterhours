import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, RadialGradient, Stop } from 'react-native-svg';
import Avatar from '@/components/Avatar';
import MotifField from '@/components/Motifs';
import type { DeckCard } from '@/components/CardFace';
import { coverSource, GROUP_COLORS, type GroupRow, type Plan, type Round } from '@/data/groups';
import { nextDate, type Special, type SpecialId } from '@/content/specials';
import { dayLabel } from '@/data/when';
import { usePhoto } from '@/data/photo';
import { useLang } from '@/i18n';
import { colors, fonts, radius, scrim } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// Connect as a dial (owner, 27.10.2026; prototypes/sunrise.html, the right one): you at
// the foot like a rising sun, the four parts of the page as small planets on an arc
// around you, and the one you pick grows into the big card on top. It opens on what
// is most pressing: an open vote, else a group out now, else what your people are up to.
// Tap a planet to switch, swipe the big card sideways for the next, hold a planet for
// its whole list. The classic page is one tap away in the band (connect.view).

type Photo = number | { uri: string };
type DeckId = 'mine' | 'friends' | 'wave2' | 'wave3';
type Props = {
  top: number;
  bottom: number;
  groups: GroupRow[];
  plans: { g: GroupRow; plan: Plan | null; round: Round | null; members: number }[];
  slideCount: number;
  slidePhoto: Photo;
  renderSlide: (i: number, w: number, h: number) => ReactNode;
  occasions: Special[];
  specialCount: (id: SpecialId) => number | undefined;
  decks: { id: DeckId; label: string; cards: DeckCard[]; red?: boolean }[];
  onDeck: (id: DeckId | SpecialId) => void;
  out: { name: string; photo?: string }[];
  fallback: number;
};

const CHIP = 60;
const ANG = [-162, -118, -62, -18];

export default function ConnectDial({ top, bottom, groups, plans, slideCount, slidePhoto, renderSlide, occasions, specialCount, decks, onDeck, out, fallback }: Props) {
  const { t, tn, up } = useLang();
  const { width, height } = useWindowDimensions();
  const { photo } = usePhoto();
  const living = useMemo(() => groups.filter((g) => !g.archived), [groups]);
  // the favourite: the group most out right now, then one with a vote or a plan, then the first
  const fav = useMemo(() => {
    const score = (g: GroupRow) => g.live * 10 + (plans.some((p) => p.g.id === g.id && p.round) ? 5 : 0) + (plans.some((p) => p.g.id === g.id && p.plan) ? 2 : 0);
    return [...living].sort((a, b) => score(b) - score(a))[0];
  }, [living, plans]);
  const vote = plans.some((p) => p.round);
  const auto = vote ? 2 : fav?.live ? 1 : slideCount ? 2 : 0;
  const [picked, setPicked] = useState<number | null>(null);
  const sel = picked ?? auto;
  const [tab, setTab] = useState(0);

  // geometry: the sun at the foot, the arc around it, the card fills what is left on top
  const avail = height - top - bottom;
  const R = Math.min(150, width * 0.38);
  const sunY = avail - 78;
  const cx = width / 2;
  const pos = ANG.map((a) => ({ x: cx + Math.cos((a * Math.PI) / 180) * R, y: sunY + Math.sin((a * Math.PI) / 180) * R }));
  const heroW = width - brand.left * 2;
  const heroH = Math.max(200, Math.min(heroW * 1.08, Math.min(...pos.map((p) => p.y)) - CHIP / 2 - 26));
  const chip = pos[sel];

  // the people card slides on by itself, as the gallery did
  const list = useRef<FlatList<number>>(null);
  const [slide, setSlide] = useState(0);
  const [touched, setTouched] = useState(0);
  useFocusEffect(
    useCallback(() => {
      if (sel !== 2 || slideCount < 2) return;
      const id = setInterval(() => {
        setSlide((i) => {
          const next = (i + 1) % slideCount;
          list.current?.scrollToOffset({ offset: next * heroW, animated: true });
          return next;
        });
      }, 6000);
      return () => clearInterval(id);
      // a finger on the card restarts the count
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sel, slideCount, heroW, touched]),
  );

  const swipeX = useRef(0);
  const pick = (i: number) => {
    setPicked((i + 4) % 4);
    setSlide(0);
  };
  const o = occasions[0];
  const deck = decks[tab] ?? decks[0];

  const lines = [
    { name: t('special.title'), line: o ? t(o.label) : '' },
    { name: t('groups.entry'), line: fav?.live ? t('groups.liveNow', { n: living.reduce((a, g) => a + g.live, 0) }) : t('connect.group.people', { n: living.length }) },
    { name: t('yours.withPeople'), line: vote ? t('connect.dial.vote') : String(slideCount) },
    { name: t('yours.decks'), line: `${decks[0]?.cards.length ?? 0} · ${decks[0]?.label ?? ''}` },
  ];
  const hold = [
    () => o && onDeck(o.id),
    () => router.push('/groups'),
    () => {},
    () => onDeck('friends'),
  ];

  const thumb = (c?: DeckCard): Photo => (c?.image ? { uri: c.image } : fallback);
  const groupPhoto = (g?: GroupRow) => (g ? coverSource(g.cover_path) : null);

  const hero = () => {
    if (sel === 0) {
      if (!o) return null;
      const n = specialCount(o.id);
      return (
        <Pressable onPress={() => onDeck(o.id)} style={StyleSheet.absoluteFill}>
          <LinearGradient colors={[o.ground, o.deep]} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={StyleSheet.absoluteFill} />
          <MotifField special={o} width={heroW} height={heroH} kind="cover" />
          <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)']} locations={[0.35, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <Text style={[s.kk, { color: o.ink }]}>{up(t('connect.dial.nextSpecial'))}</Text>
          <View style={s.bot}>
            <Text style={[s.big, { color: o.ink }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>{t(o.label)}<Text style={{ color: o.accents[0] }}>.</Text></Text>
            <Text style={[s.sub, { color: o.ink }]}>{[n ? tn('special.nights', n) : null, dayLabel(nextDate(o).toISOString())].filter(Boolean).join(' · ')}</Text>
            <View style={s.row}>
              <View style={s.pill}><Text style={s.pillText}>{t('connect.dial.openDeck')}</Text></View>
              <View style={s.ghosts}>
                {occasions.slice(1, 3).map((x) => (
                  <Pressable key={x.id} onPress={() => onDeck(x.id)} hitSlop={6} style={s.ghost}>
                    <Text style={s.ghostText} numberOfLines={1}>{t(x.label)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </Pressable>
      );
    }
    if (sel === 1) {
      if (!fav) {
        return (
          <Pressable onPress={() => router.push('/groups/new')} style={[StyleSheet.absoluteFill, s.empty]}>
            <Text style={s.emptyPlus}>+</Text>
            <Text style={s.emptyText}>{t('connect.groups.none')}</Text>
          </Pressable>
        );
      }
      const st = plans.find((p) => p.g.id === fav.id);
      const line = fav.live ? t('groups.liveNow', { n: fav.live }) : st?.round ? t('groups.card.closes', { at: dayLabel(st.round.closes_at) }) : st?.plan ? st.plan.title.toLowerCase() : fav.kind === 'travel' ? t('connect.group.travel', { n: fav.members }) : t('connect.group.people', { n: fav.members });
      const others = living.filter((g) => g.id !== fav.id);
      const cover = groupPhoto(fav);
      return (
        <Pressable onPress={() => router.push({ pathname: '/groups/[id]', params: { id: fav.id } })} style={StyleSheet.absoluteFill}>
          {cover ? <Image source={cover} style={StyleSheet.absoluteFill} contentFit="cover" /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: GROUP_COLORS[fav.color] }]} />}
          <LinearGradient colors={[scrim(0.45), scrim(0), scrim(0.88)]} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <Text style={s.kk}>★ {up(t('connect.dial.favourite'))}</Text>
          <View style={s.bot}>
            <Text style={s.big} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>{fav.name.toLowerCase()}</Text>
            <Text style={[s.sub, (fav.live > 0 || !!st?.round) && s.subRed]} numberOfLines={1}>{line}</Text>
            <View style={s.row}>
              <View style={s.pill}><Text style={s.pillText}>{t('connect.dial.openGroup')}</Text></View>
              <Pressable onPress={() => router.push('/groups')} hitSlop={8} style={s.thumbs}>
                {others.slice(0, 3).map((g) => {
                  const c = groupPhoto(g);
                  return <View key={g.id} style={[s.thumb, { backgroundColor: GROUP_COLORS[g.color] }]}>{c ? <Image source={c} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}</View>;
                })}
                <Text style={s.thumbMore}>{others.length > 3 ? `+${others.length - 3}` : t('connect.groups.all')} ›</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      );
    }
    if (sel === 2) {
      if (!slideCount) {
        return (
          <View style={[StyleSheet.absoluteFill, s.empty]}>
            <Text style={s.emptyText}>{t('connect.dial.quiet')}</Text>
          </View>
        );
      }
      return (
        <>
          <FlatList
            ref={list}
            data={Array.from({ length: slideCount }, (_, i) => i)}
            keyExtractor={(i) => String(i)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialNumToRender={2}
            windowSize={3}
            getItemLayout={(_, i) => ({ length: heroW, offset: heroW * i, index: i })}
            onScrollBeginDrag={() => setTouched((n) => n + 1)}
            onMomentumScrollEnd={(e) => setSlide(Math.round(e.nativeEvent.contentOffset.x / heroW))}
            renderItem={({ item }) => <View style={{ width: heroW, height: heroH }}>{renderSlide(item, heroW, heroH)}</View>}
          />
          {slideCount > 1 ? (
            <View style={s.bars} pointerEvents="none">
              {Array.from({ length: Math.min(slideCount, 8) }, (_, i) => (
                <View key={i} style={[s.bar, i <= slide && s.barOn]} />
              ))}
            </View>
          ) : null}
        </>
      );
    }
    return (
      <View style={[StyleSheet.absoluteFill, s.deckCard]}>
        <Text style={[s.kk, s.kkDark]}>{up(`${deck.label} · ${deck.cards.length}`)}</Text>
        <Pressable onPress={() => onDeck(deck.id)} style={s.fanWrap}>
          {[1, 2, 0].map((k) => {
            const w = Math.min(124, heroW * 0.38);
            const c = deck.cards[k];
            return (
              <View key={k} style={[s.fan, { width: w, height: w * 1.34, marginLeft: -w / 2, transform: [{ rotate: `${k === 0 ? 0 : k === 1 ? -13 : 12}deg` }, { translateX: k === 0 ? 0 : k === 1 ? -w * 0.3 : w * 0.3 }] }, k === 0 && deck.red && s.fanRed]}>
                {c ? <Image source={thumb(c)} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
              </View>
            );
          })}
        </Pressable>
        <View style={s.tabs}>
          {decks.map((d, i) => (
            <Pressable key={d.id} onPress={() => setTab(i)} style={[s.tab, i === tab && s.tabOn]}>
              <Text style={[s.tabText, i === tab && s.tabTextOn]} numberOfLines={1}>{d.label}<Text style={s.tabCount}> {d.cards.length}</Text></Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  };

  const chipImage = (i: number) => {
    if (i === 0) return o ? <><LinearGradient colors={[o.ground, o.deep]} style={StyleSheet.absoluteFill} /><MotifField special={o} width={CHIP} height={CHIP} kind="cover" /></> : null;
    if (i === 1) { const c = groupPhoto(fav); return c ? <Image source={c} style={StyleSheet.absoluteFill} contentFit="cover" /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: fav ? GROUP_COLORS[fav.color] : colors.ink3 }]} />; }
    if (i === 2) return <Image source={slidePhoto} style={StyleSheet.absoluteFill} contentFit="cover" />;
    return <Image source={thumb(decks[0]?.cards[0])} style={StyleSheet.absoluteFill} contentFit="cover" />;
  };

  return (
    <View style={[s.root, { top, height: avail }]}>
      <Svg width={width} height={avail} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="glow" cx={cx} cy={sunY} r={R * 1.9} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={colors.spot} stopOpacity={0.2} />
            <Stop offset="1" stopColor={colors.spot} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={cx} cy={sunY} r={R * 1.9} fill="url(#glow)" />
        <Circle cx={cx} cy={sunY} r={R} stroke={colors.rule} strokeWidth={1} strokeDasharray="4 5" fill="none" />
        <Circle cx={cx} cy={sunY} r={R * 0.5} stroke={colors.spot} strokeOpacity={0.3} strokeWidth={1} fill="none" />
        <Line x1={cx} y1={sunY} x2={chip.x} y2={chip.y} stroke={colors.spot} strokeOpacity={0.55} strokeWidth={1.5} strokeDasharray="3 4" />
        <Line x1={chip.x} y1={chip.y} x2={cx} y2={heroH} stroke={colors.spot} strokeOpacity={0.4} strokeWidth={1.5} strokeDasharray="3 4" />
      </Svg>

      <View
        style={[s.hero, { width: heroW, height: heroH, left: brand.left }, sel === 3 && s.heroLight]}
        onTouchStart={(e) => (swipeX.current = e.nativeEvent.pageX)}
        onTouchEnd={(e) => {
          if (sel === 2) return; // the people card pages its own slides
          const dx = e.nativeEvent.pageX - swipeX.current;
          if (Math.abs(dx) > 50) pick(sel + (dx < 0 ? 1 : -1));
        }}
      >
        <Animated.View key={sel} entering={FadeIn.duration(260)} style={StyleSheet.absoluteFill}>
          {hero()}
        </Animated.View>
      </View>

      {pos.map((p, i) => (
        <View key={i}>
          <Pressable
            onPress={() => pick(i)}
            onLongPress={hold[i]}
            accessibilityRole="button"
            accessibilityLabel={lines[i].name}
            style={[s.chip, i >= 2 && s.chipSquare, { left: p.x - CHIP / 2, top: p.y - CHIP / 2 }, i === sel ? s.chipOn : s.chipOff]}
          >
            <View style={[StyleSheet.absoluteFill, s.chipClip, i >= 2 && s.chipSquare]}>{chipImage(i)}</View>
          </Pressable>
          <View style={[s.chipLab, { left: p.x - 60, top: p.y + CHIP / 2 + 6 }]} pointerEvents="none">
            <Text style={[s.chipName, i === sel && s.chipNameOn]} numberOfLines={1}>{lines[i].name}</Text>
            <Text style={s.chipLine} numberOfLines={1}>{up(lines[i].line)}</Text>
          </View>
        </View>
      ))}

      {out.slice(0, 2).map((f, i) => {
        const a = ((i === 0 ? -140 : -40) * Math.PI) / 180;
        return (
          <View key={f.name} style={[s.face, { left: cx + Math.cos(a) * 66 - 13, top: sunY + Math.sin(a) * 66 - 13 }]}>
            {f.photo ? <Image source={{ uri: f.photo }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Avatar name={f.name} size={26} />}
          </View>
        );
      })}
      <Pressable onPress={() => router.push('/messages')} style={[s.sun, { left: cx - 46, top: sunY - 46 }]} accessibilityRole="button">
        <View style={[StyleSheet.absoluteFill, s.sunClip]}>{photo ? <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Avatar name="you" size={92} />}</View>
      </Pressable>
      <View style={[s.sunLab, { top: sunY + 52 }]} pointerEvents="none">
        <Text style={s.sunName}>{t('connect.dial.you')}</Text>
        <Text style={s.sunLine}>{up(out.length ? tn('connect.dial.out', out.length) : t('connect.dial.home'))}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { position: 'absolute', left: 0, right: 0 },
  hero: { position: 'absolute', top: 0, borderRadius: 26, overflow: 'hidden', backgroundColor: colors.poster },
  heroLight: { backgroundColor: colors.card },
  kk: { position: 'absolute', left: 16, top: 16, fontFamily: fonts.jet, fontSize: 9.5, letterSpacing: 1.3, color: colors.onPhoto },
  kkDark: { color: colors.meta },
  bot: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  big: { fontFamily: fonts.logo, fontSize: 38, lineHeight: 38, letterSpacing: -1, color: colors.onPhoto },
  sub: { fontFamily: fonts.regular, fontSize: 13, color: colors.onPhoto, marginTop: 6, opacity: 0.92 },
  subRed: { color: colors.onPhotoSpot, opacity: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, gap: 8 },
  pill: { backgroundColor: colors.spot, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  pillText: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.onSpot },
  ghosts: { flexDirection: 'row', gap: 6, flexShrink: 1 },
  ghost: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 7, flexShrink: 1 },
  ghostText: { fontFamily: fonts.medium, fontSize: 11, color: colors.onPhoto },
  thumbs: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  thumb: { width: 30, height: 30, borderRadius: 9, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.onPhotoRule },
  thumbMore: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.onPhoto, marginLeft: 3 },
  empty: { backgroundColor: colors.ink3, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 },
  emptyPlus: { fontFamily: fonts.medium, fontSize: 34, color: colors.mute },
  emptyText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.mute, textAlign: 'center' },
  bars: { position: 'absolute', left: 14, right: 14, top: 7, flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 2.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  barOn: { backgroundColor: colors.onPhoto },
  deckCard: { backgroundColor: colors.card },
  fanWrap: { position: 'absolute', left: 0, right: 0, top: 46, bottom: 64, alignItems: 'center' },
  fan: { position: 'absolute', left: '50%', top: 0, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.ink3, borderWidth: 1, borderColor: colors.ink3 },
  fanRed: { borderColor: colors.spot, borderWidth: 2 },
  tabs: { position: 'absolute', left: 12, right: 12, bottom: 14, flexDirection: 'row', gap: 5 },
  tab: { flex: 1, alignItems: 'center', borderRadius: radius.pill, paddingVertical: 8, backgroundColor: colors.ink3 },
  tabOn: { backgroundColor: colors.paper },
  tabText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.mute },
  tabTextOn: { color: colors.ink },
  tabCount: { fontFamily: fonts.jet, fontSize: 9.5 },
  chip: { position: 'absolute', width: CHIP, height: CHIP, borderRadius: CHIP / 2, backgroundColor: colors.ink3, borderWidth: 3, borderColor: colors.ink },
  chipSquare: { borderRadius: 18 },
  chipClip: { overflow: 'hidden', borderRadius: CHIP / 2 },
  chipOn: { transform: [{ scale: 1.14 }], borderColor: colors.spot, shadowColor: colors.spot, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  chipOff: { opacity: 0.82 },
  chipLab: { position: 'absolute', width: 120, alignItems: 'center' },
  chipName: { fontFamily: fonts.semibold, fontSize: 12, color: colors.mute },
  chipNameOn: { color: colors.paper },
  chipLine: { fontFamily: fonts.jet, fontSize: 8.5, letterSpacing: 0.8, color: colors.spotText, marginTop: 2 },
  face: { position: 'absolute', width: 26, height: 26, borderRadius: 13, overflow: 'hidden', borderWidth: 2, borderColor: colors.spot, zIndex: 2 },
  sun: { position: 'absolute', width: 92, height: 92, borderRadius: 46, borderWidth: 2, borderColor: colors.spot, padding: 4, backgroundColor: colors.ink, shadowColor: colors.spot, shadowOpacity: 0.3, shadowRadius: 18, elevation: 8 },
  sunClip: { margin: 4, borderRadius: 42, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  sunLab: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  sunName: { fontFamily: fonts.semibold, fontSize: 14, color: colors.paper },
  sunLine: { fontFamily: fonts.jet, fontSize: 9, letterSpacing: 1, color: colors.spotText, marginTop: 2 },
});
