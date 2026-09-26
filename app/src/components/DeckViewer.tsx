import { useEffect, useState } from 'react';
import { BackHandler, FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Extrapolation, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CardFace, { Hint, openDetails, openTicket, type DeckCard } from '@/components/CardFace';
import SoundCorner from '@/components/SoundCorner';
import { useTabBarSpace } from '@/components/TabBar';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

export type { DeckCard, DeckFriend } from '@/components/CardFace';

type Props = {
  cards: DeckCard[];
  // friends: arkadaşların sağa attıkları (şerit: keep) · mine: benim sağa attıklarım (şerit: ticket)
  mode: 'friends' | 'mine';
  kept: Record<string, boolean>;
  onKeep: (card: DeckCard) => void;
  onClose: () => void;
  empty: string;
};

const PULL = 90; // yukarı ya da aşağı bu kadar çekilince karar verilmiş sayılır
const two = (n: number) => String(n).padStart(2, '0');

// desteyi gezmek: kart yüzü (CardFace), yana kaydırınca sonraki kart, yukarı bilet, aşağı gece sayfası.
// kart yoksa ortadaki yazıya dokununca kapanır.
export default function DeckViewer({ cards, mode, kept, onKeep, onClose, empty }: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const [index, setIndex] = useState(0);

  // android geri tuşu desteyi kapatır
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  const total = cards.length;
  const city = (cards[index]?.city ?? '').slice(0, 3);

  return (
    <View style={[StyleSheet.absoluteFill, styles.layer]}>
      <View style={styles.root}>
        {total === 0 ? (
          <Pressable onPress={onClose} style={[styles.empty, { paddingBottom: tabSpace }]} accessibilityRole="button" accessibilityLabel="close">
            <Text style={styles.emptyText}>{empty}</Text>
            <Text style={styles.emptyHint}>tap to go back</Text>
          </Pressable>
        ) : (
          <FlatList
            data={cards}
            keyExtractor={(c) => c.key}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setIndex(Math.max(0, Math.round(e.nativeEvent.contentOffset.x / width)))}
            renderItem={({ item }) => (
              <Card card={item} mode={mode} isKept={mode === 'friends' && !!kept[item.slug]} onKeep={onKeep} width={width} bottom={tabSpace + 4} />
            )}
          />
        )}

        {/* üst: şehir · sıra, sağda ses */}
        <View style={[styles.top, { top: Math.max(brand.top, insets.top + 24) }]} pointerEvents="box-none">
          <View style={styles.chip}>
            <Text style={styles.chipText}>{total ? `${city} · ${two(index + 1)}/${two(total)}` : mode === 'mine' ? 'your deck' : "friends' deck"}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
            <Text style={styles.closeText}>close</Text>
          </Pressable>
        </View>
        <SoundCorner />
      </View>
    </View>
  );
}

function Card({ card, mode, isKept, onKeep, width, bottom }: { card: DeckCard; mode: 'friends' | 'mine'; isKept: boolean; onKeep: (c: DeckCard) => void; width: number; bottom: number }) {
  const y = useSharedValue(0);
  const ticket = () => openTicket(card);
  const details = () => openDetails(card);

  // dikey çekme: yukarı bilet, aşağı ayrıntılar. yana hareket kartlar arası kaydırmaya gider.
  const pan = Gesture.Pan()
    .activeOffsetY([-14, 14])
    .failOffsetX([-14, 14])
    .onUpdate((e) => {
      y.set(e.translationY * 0.6);
    })
    .onEnd((e) => {
      const d = e.translationY;
      if (d < -PULL || e.velocityY < -900) runOnJS(ticket)();
      else if (d > PULL || e.velocityY > 900) runOnJS(details)();
      y.set(withSpring(0, { damping: 18, stiffness: 180 }));
    });
  const move = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const upHint = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [-PULL * 0.6, -10], [1, 0], Extrapolation.CLAMP) }));
  const downHint = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [10, PULL * 0.6], [0, 1], Extrapolation.CLAMP) }));

  const rightLabel = mode === 'mine' ? (card.ticketUrl ? 'ticket ↑' : 'open ↑') : isKept ? 'kept' : 'keep';
  const rightPress = () => (mode === 'mine' ? ticket() : isKept ? undefined : onKeep(card));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ width, flex: 1 }, move]}>
        <CardFace card={card} bottom={bottom} rightLabel={rightLabel} rightDone={mode === 'friends' && isKept} onRight={rightPress} />
        <Animated.View style={[styles.hint, styles.hintUp, upHint]} pointerEvents="none">
          <Hint label={card.ticketUrl ? 'ticket ↑' : 'open ↑'} />
        </Animated.View>
        <Animated.View style={[styles.hint, { bottom: bottom + 8 }, downHint]} pointerEvents="none">
          <Hint label="details ↓" />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  layer: { zIndex: 10, elevation: 10 },
  root: { flex: 1, backgroundColor: colors.ink },
  hint: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  hintUp: { top: '38%' },
  top: { position: 'absolute', left: brand.left, right: 120, flexDirection: 'row', alignItems: 'center', gap: 14 },
  chip: { backgroundColor: colors.ink, paddingVertical: 5, paddingHorizontal: 8 },
  chipText: { fontFamily: fonts.jet, fontSize: 10.5, letterSpacing: 0.8, color: colors.paper },
  close: { paddingVertical: 4 },
  closeText: { fontFamily: fonts.regular, fontSize: 12, color: colors.paper, textDecorationLine: 'underline' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
  emptyText: { fontFamily: fonts.medium, fontSize: 18, letterSpacing: -0.4, color: colors.paper, textAlign: 'center' },
  emptyHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.meta, textDecorationLine: 'underline' },
});
