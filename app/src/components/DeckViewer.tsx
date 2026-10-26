import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Extrapolation, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import BigPicker from '@/components/BigPicker';
import WhenPicker from '@/components/WhenPicker';
import { useEventTypes } from '@/data/types';
import { dayLabel, filterWhen, type When } from '@/data/when';
import { useCities } from '@/data/cities';
import type { Night } from '@/data/deck';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Deck, { isCard, type CardEntry, type DeckEntry, type DeckHandle } from '@/components/Deck';
import type { DeckCard } from '@/components/CardFace';
import SoundCorner from '@/components/SoundCorner';
import { useTabBarSpace } from '@/components/TabBar';
import { useLang } from '@/i18n';
import { colors, fonts, radius, ground } from '@/theme/tokens';
import { brand } from '@/theme/layout';
import MotifField from '@/components/Motifs';
import type { Special } from '@/content/specials';

type Props = {
  cards: DeckCard[];
  // friends: nights friends kept · mine: nights you kept
  // wave2 / wave3: friends of friends; behave like friends
  // special: one occasion (halloween…), behaves like friends, in its own room of motifs
  mode: 'friends' | 'mine' | 'wave2' | 'wave3' | 'special';
  special?: Special;
  sample?: boolean; // sample cards: noted in the top label
  onKeep: (card: DeckCard) => void;   // swiped right (not in your own deck)
  onLetGo: (card: DeckCard) => void;  // swiped left (not in your own deck)
  onUndo: (card: DeckCard) => void;   // a swipe taken back
  onClose: () => void;
  empty: string;
  // the decks of connect as tabs on top (design 4 of prototypes/deck-head.html, 26.10.2026);
  // a tap opens that deck in place. A special deck shows its own name instead.
  tabs?: { id: 'friends' | 'mine' | 'wave2' | 'wave3'; label: string; count: number }[];
  onTab?: (id: 'friends' | 'mine' | 'wave2' | 'wave3') => void;
};

const two = (n: number) => String(n).padStart(2, '0');

// The decks on yours, played exactly like the flow: the card flies off to the right
// (keep) or the left (let go), up opens the ticket, down the night page, and undo
// brings the last one back. Your own deck only browses: swiping there changes nothing.
// With no cards, tapping the centre text closes it. Since 22.10.2026 the head is the
// flow's: what · when pills narrow the deck, and the page closes by pulling its head
// down (a handle on top says so) — no close button.
const CLOSE = 110;
export default function DeckViewer({ cards, mode, special, onKeep, onLetGo, onUndo, onClose, empty, sample, tabs, onTab }: Props) {
  const { cities } = useCities();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const { t, tx, up } = useLang();
  const deck = useRef<DeckHandle>(null);
  // the flow's filters, on this deck
  const types = useEventTypes();
  const [type, setType] = useState<string | null>(null);
  const [when, setWhen] = useState<When | null>(null);
  const [sheet, setSheet] = useState<'type' | 'when' | null>(null);
  const asRows = (list: DeckCard[]) => list.map((c) => ({ starts_at: c.startsAt })) as unknown as Night[];
  const shown = useMemo(() => {
    const byType = type ? cards.filter((c) => c.kind === (types.find((ty) => ty.id === type)?.label ?? type).toLowerCase()) : cards;
    if (!when) return byType;
    const keep = new Set(filterWhen(asRows(byType), when).map((r) => r.starts_at));
    return byType.filter((c) => keep.has(c.startsAt as string | null));
  }, [cards, type, when, types]);
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    cards.forEach((c) => {
      const ty = types.find((x) => x.label.toLowerCase() === c.kind);
      if (ty) m[ty.id] = (m[ty.id] ?? 0) + 1;
    });
    return m;
  }, [cards, types]);
  // pulling the head down closes the page, like every pushed page
  const drag = useSharedValue(0);
  const pull = Gesture.Pan()
    .activeOffsetY(6)
    .failOffsetX([-14, 14])
    .onUpdate((e) => {
      drag.set(Math.max(0, e.translationY * 0.85));
    })
    .onEnd((e) => {
      if (drag.value > CLOSE || (drag.value > 24 && e.velocityY > 900)) {
        drag.set(withTiming(height, { duration: 220 }, () => runOnJS(onClose)()));
      } else {
        drag.set(withSpring(0, { damping: 18, stiffness: 180 }));
      }
    });
  const move = useAnimatedStyle(() => ({ transform: [{ translateY: drag.value }] }));
  const ready = useAnimatedStyle(() => ({ width: interpolate(drag.value, [0, CLOSE], [44, 64], Extrapolation.CLAMP), backgroundColor: drag.value > CLOSE ? colors.spot : colors.paper }));
  const [swiped, setSwiped] = useState(0);
  const [deal, setDeal] = useState(0);
  const [headBottom, setHeadBottom] = useState(0);
  const entries = useMemo<CardEntry[]>(() => shown.map((card) => ({ id: card.key, card })), [shown]);
  const writes = mode !== 'mine';

  // Android back closes the deck.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  const total = shown.length;
  const at = Math.min(swiped, total - 1);
  // the line under the tabs: the city in full, the day of the card on top, where you are
  const front = shown[Math.max(0, at)];
  const city = front ? (cities.find((c) => c.id === front.city)?.name ?? front.city).toLowerCase() : '';
  const day = front?.startsAt ? dayLabel(front.startsAt) : null;
  const ink = special ? special.ink : colors.paper;
  const top = Math.max(brand.top, insets.top + 24);

  const swipe = (entry: DeckEntry, direction: 'left' | 'right') => {
    setSwiped((n) => n + 1);
    if (!writes || !isCard(entry)) return;
    if (direction === 'right') onKeep(entry.card);
    else onLetGo(entry.card);
  };
  const undo = (entry: DeckEntry) => {
    setSwiped((n) => Math.max(0, n - 1));
    if (writes && isCard(entry)) onUndo(entry.card);
  };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.layer, move]}>
      <View style={[styles.root, special && { backgroundColor: special.deep }]}>
        {special ? <MotifField special={special} width={width} height={height} kind="room" /> : null}
        {total === 0 ? (
          <Pressable onPress={onClose} style={[styles.empty, { paddingBottom: tabSpace }]} accessibilityRole="button" accessibilityLabel={t('word.close')}>
            <Text style={[styles.emptyText, special && { color: special.ink }]}>{empty}</Text>
            <Text style={styles.emptyHint}>{t('deck.tapBack')}</Text>
          </Pressable>
        ) : (
          <Deck
            ref={deck}
            key={`${mode}/${deal}/${type}/${when}`}
            nights={entries}
            room={!!special}
            bottom={tabSpace + 4}
            top={(headBottom || top + 30) + 14}
            onSwipe={swipe}
            onUndo={undo}
            onReset={() => {
              setSwiped(0);
              setDeal((n) => n + 1);
            }}
          />
        )}

        {/* The head: the handle, which deck · position, undo; under it what · when. Pull it down to close. */}
        <GestureDetector gesture={pull}>
        <View style={[styles.top, { top: top - 22 }]} onLayout={(e) => setHeadBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
          <View style={styles.handleWrap} pointerEvents="none">
            <Animated.View style={[styles.handle, special && { backgroundColor: special.ink }, ready]} />
            <Svg width={18} height={10} viewBox="0 0 18 10" style={styles.chevron}>
              <Path d="M2 2l7 6 7-6" stroke={special ? special.ink : colors.paper} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
          </View>
          {/* the decks as tabs; a special deck: its own name */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabsWrap, special && { borderBottomColor: special.ink + '33' }]} contentContainerStyle={styles.tabs}>
            {special || !tabs ? (
              <View style={[styles.tab, styles.tabOn, special && { borderBottomColor: special.ink }]}>
                <Text style={[styles.tabText, styles.tabTextOn, { color: ink }]} numberOfLines={1}>
                  {special ? t(special.label) : mode === 'wave2' ? t('deck.wave2') : mode === 'wave3' ? t('deck.wave3') : mode === 'mine' ? t('deck.yours') : t('deck.friends')}
                </Text>
                <Text style={[styles.tabCount, { color: ink }]}>{total}</Text>
              </View>
            ) : (
              tabs.map((tb) => {
                const on = tb.id === mode;
                return (
                  <Pressable key={tb.id} onPress={() => !on && onTab?.(tb.id)} hitSlop={6} accessibilityRole="tab" accessibilityState={{ selected: on }} style={({ pressed }) => [styles.tab, on && styles.tabOn, pressed && styles.pressed]}>
                    <Text style={[styles.tabText, on && styles.tabTextOn]} numberOfLines={1}>{tb.label}</Text>
                    <Text style={[styles.tabCount, on && styles.tabCountOn]}>{tb.count}</Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
          {/* where and when: the city, the day of the card on top, which card of how many; the filters as two round marks */}
          <View style={styles.line}>
            <View style={styles.where}>
              {city ? (
                <>
                  <Svg width={10} height={13} viewBox="0 0 14 18">
                    <Path d="M7 17s6-5.6 6-10A6 6 0 0 0 1 7c0 4.4 6 10 6 10Z" fill={colors.spot} />
                  </Svg>
                  <Text style={[styles.city, { color: ink }]} numberOfLines={1}>{city}</Text>
                </>
              ) : null}
              {day ? <Text style={styles.day} numberOfLines={1}>{day}</Text> : null}
              {total ? (
                <Text style={[styles.pos, { color: ink }]}>
                  {two(Math.min(swiped + 1, total))}
                  <Text style={styles.posAll}> / {two(total)}</Text>
                </Text>
              ) : null}
              {sample ? <Text style={styles.sample}>{up(t('deck.sample'))}</Text> : null}
            </View>
            <View style={styles.marks}>
              {swiped > 0 ? (
                <Pressable onPress={() => deck.current?.undo()} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('flow.undo')} style={({ pressed }) => [styles.mark, pressed && styles.pressed]}>
                  <Svg width={14} height={14} viewBox="0 0 14 14">
                    <Path d="M5 3 2 6l3 3M2 6h6.5a3.5 3.5 0 0 1 0 7H6" stroke={colors.paper} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </Svg>
                </Pressable>
              ) : null}
              <Pressable onPress={() => setSheet('type')} hitSlop={6} accessibilityRole="button" accessibilityLabel={t('filter.what')} style={({ pressed }) => [styles.mark, pressed && styles.pressed]}>
                <Svg width={14} height={14} viewBox="0 0 14 14">
                  <Path d="M2 3h10l-4 5v3l-2 1V8z" stroke={colors.paper} strokeWidth={1.5} strokeLinejoin="round" fill="none" />
                </Svg>
                {type ? <View style={styles.markOn} /> : null}
              </Pressable>
              <Pressable onPress={() => setSheet('when')} hitSlop={6} accessibilityRole="button" accessibilityLabel={t('filter.when')} style={({ pressed }) => [styles.mark, pressed && styles.pressed]}>
                <Svg width={14} height={14} viewBox="0 0 14 14">
                  <Path d="M2.5 3.5h9v8h-9z" stroke={colors.paper} strokeWidth={1.4} strokeLinejoin="round" fill="none" />
                  <Path d="M2.5 6h9M5 2v2.5M9 2v2.5" stroke={colors.paper} strokeWidth={1.4} strokeLinecap="round" />
                </Svg>
                {when ? <View style={styles.markOn} /> : null}
              </Pressable>
            </View>
          </View>
        </View>
        </GestureDetector>
        <SoundCorner tone={special ? 'photo' : undefined} />
        <BigPicker
          open={sheet === 'type'}
          title={t('filter.what')}
          options={[
            { id: '*', label: t('type.all'), count: cards.length },
            ...types.filter((ty) => counts[ty.id]).map((ty) => ({ id: ty.id, label: tx('type.' + ty.id, ty.label), count: counts[ty.id] })),
          ]}
          selected={type ?? '*'}
          onSelect={(id) => {
            setType(id === '*' ? null : id);
            setSwiped(0);
          }}
          onClose={() => setSheet(null)}
        />
        <WhenPicker
          open={sheet === 'when'}
          rows={asRows(cards)}
          selected={when}
          onSelect={(w) => {
            setWhen(w);
            setSwiped(0);
          }}
          onClose={() => setSheet(null)}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { zIndex: 10, elevation: 10 },
  root: { flex: 1, backgroundColor: colors.ink },
  top: { position: 'absolute', left: brand.left, right: brand.left, gap: 10 },
  // design 4: the decks as tabs, a hairline under them; the active one ink with an accent rule
  tabsWrap: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.ink3, marginRight: 64 },
  tabs: { flexDirection: 'row', gap: 18 },
  tab: { flexDirection: 'row', alignItems: 'flex-start', gap: 3, paddingBottom: 9, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1 },
  tabOn: { borderBottomColor: colors.spot },
  tabText: { fontFamily: fonts.medium, fontSize: 14.5, letterSpacing: -0.2, color: colors.mute },
  tabTextOn: { color: colors.paper },
  tabCount: { fontFamily: fonts.jet, fontSize: 9, color: colors.meta, marginTop: 1 },
  tabCountOn: { color: colors.spotText },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  where: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 },
  city: { fontFamily: fonts.semibold, fontSize: 15, letterSpacing: -0.3, flexShrink: 1 },
  day: { fontFamily: fonts.logo, fontSize: 14, color: colors.spotText, letterSpacing: -0.2 },
  pos: { fontFamily: fonts.medium, fontSize: 13, fontVariant: ['tabular-nums'] },
  posAll: { color: colors.meta, fontFamily: fonts.regular },
  sample: { fontFamily: fonts.jet, fontSize: 8.5, letterSpacing: 1.2, color: colors.meta, borderWidth: 1, borderColor: colors.ink3, borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  marks: { flexDirection: 'row', gap: 8 },
  mark: { width: 32, height: 32, borderRadius: 16, backgroundColor: ground(0.82), borderWidth: 1, borderColor: colors.ink3, alignItems: 'center', justifyContent: 'center' },
  markOn: { position: 'absolute', top: 1, right: 1, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.spot, borderWidth: 1.5, borderColor: colors.ink },
  handleWrap: { alignItems: 'center', gap: 2 },
  handle: { height: 5, borderRadius: 3, backgroundColor: colors.paper },
  chevron: { marginTop: 1 },
  pressed: { opacity: 0.6 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
  emptyText: { fontFamily: fonts.medium, fontSize: 18, letterSpacing: -0.4, color: colors.paper, textAlign: 'center' },
  emptyHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.meta, textDecorationLine: 'underline' },
});
