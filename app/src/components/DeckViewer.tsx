import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Deck, { isCard, type CardEntry, type DeckEntry, type DeckHandle } from '@/components/Deck';
import type { DeckCard } from '@/components/CardFace';
import SoundCorner from '@/components/SoundCorner';
import { useTabBarSpace } from '@/components/TabBar';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';
import PillAction from '@/components/PillAction';

type Props = {
  cards: DeckCard[];
  // friends: nights friends kept · mine: nights you kept
  // wave2 / wave3: friends of friends; behave like friends
  mode: 'friends' | 'mine' | 'wave2' | 'wave3';
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
// With no cards, tapping the centre text closes it.
export default function DeckViewer({ cards, mode, onKeep, onLetGo, onUndo, onClose, empty, sample }: Props) {
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const { t, up } = useLang();
  const deck = useRef<DeckHandle>(null);
  const [swiped, setSwiped] = useState(0);
  const [deal, setDeal] = useState(0);
  const [headBottom, setHeadBottom] = useState(0);
  const entries = useMemo<CardEntry[]>(() => cards.map((card) => ({ id: card.key, card })), [cards]);
  const writes = mode !== 'mine';

  // Android back closes the deck.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  const total = cards.length;
  const at = Math.min(swiped, total - 1);
  const city = (cards[at]?.city ?? '').slice(0, 3);
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
    <View style={[StyleSheet.absoluteFill, styles.layer]}>
      <View style={styles.root}>
        {total === 0 ? (
          <Pressable onPress={onClose} style={[styles.empty, { paddingBottom: tabSpace }]} accessibilityRole="button" accessibilityLabel={t('word.close')}>
            <Text style={styles.emptyText}>{empty}</Text>
            <Text style={styles.emptyHint}>{t('deck.tapBack')}</Text>
          </Pressable>
        ) : (
          <Deck
            ref={deck}
            key={`${mode}/${deal}`}
            nights={entries}
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

        {/* Top: which deck · position, undo, close; sound on the right. */}
        <View style={[styles.top, { top }]} pointerEvents="box-none" onLayout={(e) => setHeadBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
          <View style={styles.chip}>
            <Text style={styles.chipText} numberOfLines={1}>
              {[
                mode === 'wave2' ? up(t('deck.wave2')) : mode === 'wave3' ? up(t('deck.wave3')) : mode === 'mine' ? t('deck.yours') : t('deck.friends'),
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
          <PillAction small icon="close" label={t('word.close')} onPress={onClose} />
        </View>
        <SoundCorner />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { zIndex: 10, elevation: 10 },
  root: { flex: 1, backgroundColor: colors.ink },
  top: { position: 'absolute', left: brand.left, right: 96, flexDirection: 'row', alignItems: 'center', gap: 10 },
  chip: { flexShrink: 1, height: 32, justifyContent: 'center', backgroundColor: 'rgba(14,13,12,0.82)', borderWidth: 1, borderColor: colors.ink3, paddingHorizontal: 12, borderRadius: radius.pill },
  chipText: { fontFamily: fonts.jet, fontSize: 10.5, letterSpacing: 0.8, color: colors.paper },
  undo: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: 'rgba(14,13,12,0.82)' },
  undoText: { fontFamily: fonts.medium, fontSize: 13, color: colors.paper },
  pressed: { opacity: 0.6 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
  emptyText: { fontFamily: fonts.medium, fontSize: 18, letterSpacing: -0.4, color: colors.paper, textAlign: 'center' },
  emptyHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.meta, textDecorationLine: 'underline' },
});
