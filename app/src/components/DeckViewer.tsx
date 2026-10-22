import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Extrapolation, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Pill from '@/components/Pill';
import BigPicker from '@/components/BigPicker';
import WhenPicker from '@/components/WhenPicker';
import { useEventTypes } from '@/data/types';
import { filterWhen, whenName, type When } from '@/data/when';
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
};

const two = (n: number) => String(n).padStart(2, '0');

// The decks on yours, played exactly like the flow: the card flies off to the right
// (keep) or the left (let go), up opens the ticket, down the night page, and undo
// brings the last one back. Your own deck only browses: swiping there changes nothing.
// With no cards, tapping the centre text closes it. Since 22.10.2026 the head is the
// flow's: what · when pills narrow the deck, and the page closes by pulling its head
// down (a handle on top says so) — no close button.
const CLOSE = 110;
export default function DeckViewer({ cards, mode, special, onKeep, onLetGo, onUndo, onClose, empty, sample }: Props) {
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
  const typeLabel = type ? tx('type.' + type, types.find((ty) => ty.id === type)?.label ?? type) : t('type.all');
  const whenLabel = when ? whenName(when, (k, f) => tx(k, f)) : t('when.any');
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
  const city = (shown[at]?.city ?? '').slice(0, 3);
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
          <View style={styles.row}>
          <View style={styles.chip}>
            <Text style={styles.chipText} numberOfLines={1}>
              {[
                special ? t(special.label) : mode === 'wave2' ? up(t('deck.wave2')) : mode === 'wave3' ? up(t('deck.wave3')) : mode === 'mine' ? t('deck.yours') : t('deck.friends'),
                total ? `${city} · ${two(Math.min(swiped + 1, total))}/${two(total)}` : null,
                sample ? up(t('deck.sample')) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          {swiped > 0 ? (
            <Pressable onPress={() => deck.current?.undo()} hitSlop={8} accessibilityRole="button" style={({ pressed }) => [styles.undo, pressed && styles.pressed]}>
              <Svg width={14} height={14} viewBox="0 0 14 14">
                <Path d="M5 3 2 6l3 3M2 6h6.5a3.5 3.5 0 0 1 0 7H6" stroke={colors.paper} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </Svg>
              <Text style={styles.undoText}>{t('flow.undo')}</Text>
            </Pressable>
          ) : null}
          </View>
          <View style={styles.pills}>
            <Pill label={typeLabel} active={!!type} onPress={() => setSheet('type')} a11y={t('filter.what')} />
            <Pill label={whenLabel} active={!!when} onPress={() => setSheet('when')} a11y={t('filter.when')} />
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 84 },
  pills: { flexDirection: 'row', gap: 8 },
  handleWrap: { alignItems: 'center', gap: 2 },
  handle: { height: 5, borderRadius: 3, backgroundColor: colors.paper },
  chevron: { marginTop: 1 },
  chip: { flexShrink: 1, height: 32, justifyContent: 'center', backgroundColor: ground(0.82), borderWidth: 1, borderColor: colors.ink3, paddingHorizontal: 12, borderRadius: radius.pill },
  chipText: { fontFamily: fonts.jet, fontSize: 10.5, letterSpacing: 0.8, color: colors.paper },
  undo: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: ground(0.82) },
  undoText: { fontFamily: fonts.medium, fontSize: 13, color: colors.paper },
  pressed: { opacity: 0.6 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
  emptyText: { fontFamily: fonts.medium, fontSize: 18, letterSpacing: -0.4, color: colors.paper, textAlign: 'center' },
  emptyHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.meta, textDecorationLine: 'underline' },
});
