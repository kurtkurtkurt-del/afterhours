import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import Storage from 'expo-sqlite/kv-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLang, type Key } from '@/i18n';
import { colors, fonts, radius, ground, paperTint } from '@/theme/tokens';

// First visit to a page: one short tip over the page (since 12.10.2026 a single one;
// two pages were too many), then never again on that page. Settings → about →
// "show the tips again" clears them all (resetTips). Not on the web (owner, 22.10.2026):
// there the tips came up on every page, and the browser is for a look, not a lesson.
//
// Redrawn 26.10.2026 (owner: "the page deserves better"): a mono line names the page
// (01 · FLOW), the title in the app's big letters, and a stage that shows the page's
// own gesture — a fan of three photo cards with KEEP / LET GO stamps for the deck, a
// pulsing ring for a tap, two bubbles arriving for messages, squares lighting up on a
// grid for the map. The "got it" button sits above the page's own bar (bottom).

export type Motion = 'swipe' | 'tap' | 'chat' | 'pins';
export type Tip = { title: Key; body: Key; motion?: Motion };
export const TIP_PAGES = ['flow', 'people', 'yours', 'map', 'messages', 'account', 'panel', 'night', 'spark', 'group'] as const;
type Page = (typeof TIP_PAGES)[number];

const key = (page: Page) => `tip.${page}`;
const seen = (page: Page) => {
  if (Platform.OS === 'web') return true;
  try {
    return Storage.getItemSync(key(page)) === '1';
  } catch {
    return false;
  }
};
export function resetTips() {
  for (const p of TIP_PAGES) {
    try {
      Storage.removeItemSync(key(p));
    } catch {}
  }
}

// The title in the app's big letters: the last word red, with the dot of the logo.
function BigTitle({ text }: { text: string }) {
  const words = text.split(' ');
  const last = words.pop();
  return (
    <Text style={styles.big}>
      {words.length ? `${words.join(' ')}\n` : ''}
      <Text style={styles.bigRed}>{last}.</Text>
    </Text>
  );
}

// bottom: how much of the screen's foot the page's own bar covers (the tab bar, the
// action buttons). The button sits above that; until 26.10.2026 the value was ignored
// and the button sat 56 px from the edge, under the tab bar on the first open.
export default function Tips({ page, tip, bottom = 0 }: { page: Page; tip: Tip; bottom?: number }) {
  const { t, up } = useLang();
  const insets = useSafeAreaInsets();
  const [on, setOn] = useState(false);
  // A short wait, so the page is there before the demo comes.
  useEffect(() => {
    if (seen(page)) return;
    const id = setTimeout(() => setOn(true), 900);
    return () => clearTimeout(id);
  }, [page]);
  if (!on) return null;
  const close = () => {
    try {
      Storage.setItemSync(key(page), '1');
    } catch {}
    setOn(false);
  };
  const no = String(TIP_PAGES.indexOf(page) + 1).padStart(2, '0');
  const pageKey: Key = page === 'messages' ? 'tab.chat' : page === 'night' || page === 'spark' || page === 'group' ? `tips.page.${page}` : `tab.${page}`;
  // no exit fade: a fading tip stayed full screen for a moment, and on Android an exiting view
  // can be left behind see-through, catching the page's taps (owner, 28.10.2026)
  return (
    <Animated.View entering={FadeIn.duration(260)} style={[styles.screen, { paddingTop: insets.top + 24 }]}>
      <View style={styles.head}>
        <View style={styles.dot} />
        <Text style={styles.kicker}>{up(`${no} · ${t(pageKey)}`)}</Text>
      </View>
      <View style={styles.stage}>
        <Scene kind={tip.motion ?? 'tap'} />
      </View>
      <Animated.View entering={FadeInDown.delay(120).duration(420).easing(Easing.out(Easing.cubic))} style={styles.words}>
        <BigTitle text={t(tip.title)} />
        <Text style={styles.body}>{t(tip.body)}</Text>
      </Animated.View>
      <View style={[styles.foot, { marginBottom: Math.max(36, bottom + insets.bottom + 16) }]}>
        <Pressable onPress={close} accessibilityRole="button" style={({ pressed }) => [styles.next, pressed && styles.pressed]}>
          <Text style={styles.nextText}>{t('tips.done')}</Text>
          <Text style={styles.nextMark}>→</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const PHOTOS = [require('../../assets/intro/concert.jpg'), require('../../assets/feed/f2.jpg'), require('../../assets/feed/t3.jpg')];

// The deck: three cards fanned out, the top one swings right (KEEP, red) and left (LET GO).
function SwipeScene() {
  const { up, t } = useLang();
  const v = useSharedValue(0);
  useEffect(() => {
    v.set(withRepeat(withSequence(withDelay(500, withTiming(1, { duration: 620, easing: Easing.inOut(Easing.cubic) })), withDelay(300, withTiming(0, { duration: 420 })), withDelay(300, withTiming(-1, { duration: 620, easing: Easing.inOut(Easing.cubic) })), withDelay(300, withTiming(0, { duration: 420 }))), -1));
  }, [v]);
  const top = useAnimatedStyle(() => ({ transform: [{ translateX: v.value * 70 }, { rotate: `${v.value * 14}deg` }] }));
  const keep = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, v.value * 1.6)) }));
  const drop = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, -v.value * 1.6)) }));
  const edge = useAnimatedStyle(() => ({ opacity: Math.max(0, v.value) }));
  return (
    <View style={styles.deck}>
      <View style={[styles.card, styles.cardBack2]}>
        <Image source={PHOTOS[2]} style={StyleSheet.absoluteFill} contentFit="cover" />
      </View>
      <View style={[styles.card, styles.cardBack1]}>
        <Image source={PHOTOS[1]} style={StyleSheet.absoluteFill} contentFit="cover" />
      </View>
      <Animated.View style={[styles.card, top]}>
        <Image source={PHOTOS[0]} style={StyleSheet.absoluteFill} contentFit="cover" />
        <Animated.View style={[StyleSheet.absoluteFill, styles.cardEdge, edge]} />
        <View style={styles.cardFoot}>
          <Text style={styles.cardMono}>{up('fri 31.10 · 23:00')}</Text>
          <Text style={styles.cardTitle} numberOfLines={1}>{up(t('tips.card.title'))}</Text>
        </View>
        <Animated.View style={[styles.stamp, styles.stampKeep, keep]}>
          <Text style={[styles.stampText, styles.stampKeepText]}>{up(t('word.keep'))}</Text>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.stampDrop, drop]}>
          <Text style={styles.stampText}>{up(t('word.letgo'))}</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// A tap: a finger with a ring that pulses outwards, on a small poster.
function TapScene() {
  const v = useSharedValue(0);
  useEffect(() => {
    v.set(withRepeat(withSequence(withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }), withTiming(0, { duration: 0 }), withDelay(300, withTiming(0, { duration: 0 }))), -1));
  }, [v]);
  const ring = useAnimatedStyle(() => ({ opacity: 1 - v.value, transform: [{ scale: 0.5 + v.value * 1.1 }] }));
  const ring2 = useAnimatedStyle(() => ({ opacity: Math.max(0, 0.6 - v.value), transform: [{ scale: 0.5 + v.value * 0.7 }] }));
  const finger = useAnimatedStyle(() => ({ transform: [{ scale: v.value < 0.12 ? 0.86 : 1 }] }));
  return (
    <View style={styles.tapWrap}>
      <View style={styles.tapPoster}>
        <Image source={PHOTOS[1]} style={StyleSheet.absoluteFill} contentFit="cover" />
        <View style={styles.tapVeil} />
      </View>
      <Animated.View style={[styles.ring, ring]} />
      <Animated.View style={[styles.ring, styles.ring2, ring2]} />
      <Animated.View style={[styles.finger, finger]} />
    </View>
  );
}

// Messages: a bubble from them slides in, three dots think, your reply slides in.
function ChatScene() {
  const { t } = useLang();
  const v = useSharedValue(0);
  useEffect(() => {
    v.set(withRepeat(withSequence(withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }), withDelay(700, withTiming(2, { duration: 500, easing: Easing.out(Easing.cubic) })), withDelay(900, withTiming(3, { duration: 500, easing: Easing.out(Easing.cubic) })), withDelay(1600, withTiming(0, { duration: 300 }))), -1));
  }, [v]);
  const a = useAnimatedStyle(() => ({ opacity: Math.min(1, v.value), transform: [{ translateY: (1 - Math.min(1, v.value)) * 16 }] }));
  const dots = useAnimatedStyle(() => ({ opacity: v.value >= 1 && v.value < 3 ? Math.min(1, v.value - 1) : 0 }));
  const b = useAnimatedStyle(() => ({ opacity: Math.max(0, Math.min(1, v.value - 2)), transform: [{ translateY: (1 - Math.max(0, Math.min(1, v.value - 2))) * 16 }] }));
  return (
    <View style={styles.chat}>
      <Animated.View style={[styles.bubble, styles.bubbleThem, a]}>
        <Text style={styles.bubbleText}>{t('tips.chat.them')}</Text>
      </Animated.View>
      <Animated.View style={[styles.bubble, styles.bubbleThem, styles.bubbleDots, dots]}>
        <View style={styles.dotSmall} />
        <View style={styles.dotSmall} />
        <View style={styles.dotSmall} />
      </Animated.View>
      <Animated.View style={[styles.bubble, styles.bubbleMe, b]}>
        <Text style={[styles.bubbleText, styles.bubbleMeText]}>{t('tips.chat.me')}</Text>
      </Animated.View>
    </View>
  );
}

// A square that lights up once the clock passes `from`.
function useLit(v: SharedValue<number>, from: number) {
  return useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, (v.value - from) * 4)), transform: [{ scale: 0.4 + Math.min(1, Math.max(0, (v.value - from) * 4)) * 0.6 }] }));
}

// The map: a faint grid, squares that light up one after another, one red (a friend kept it),
// a gold diamond (a spark).
function PinsScene() {
  const v = useSharedValue(0);
  useEffect(() => {
    v.set(withRepeat(withSequence(withTiming(1, { duration: 2200, easing: Easing.linear }), withDelay(600, withTiming(0, { duration: 400 }))), -1));
  }, [v]);
  const p1 = useLit(v, 0.05), p2 = useLit(v, 0.25), p3 = useLit(v, 0.45), p4 = useLit(v, 0.65), p5 = useLit(v, 0.8);
  const pulse = useAnimatedStyle(() => ({ opacity: 0.8 - ((v.value * 3) % 1) * 0.8, transform: [{ scale: 1 + ((v.value * 3) % 1) * 1.4 }] }));
  return (
    <View style={styles.map}>
      {[0, 1, 2, 3, 4].map((i) => <View key={'h' + i} style={[styles.gridLine, { top: 20 + i * 40 }]} />)}
      {[0, 1, 2, 3, 4].map((i) => <View key={'v' + i} style={[styles.gridLineV, { left: 20 + i * 40 }]} />)}
      <Animated.View style={[styles.square, { left: 44, top: 38 }, p1]} />
      <Animated.View style={[styles.square, { left: 118, top: 70 }, p2]} />
      <Animated.View style={[styles.square, styles.squareRed, { left: 86, top: 118 }, p3]}>
        <Animated.View style={[styles.squarePulse, pulse]} />
      </Animated.View>
      <Animated.View style={[styles.square, { left: 150, top: 142 }, p4]} />
      <Animated.View style={[styles.diamond, { left: 54, top: 160 }, p5]} />
      <View style={styles.you} />
    </View>
  );
}

function Scene({ kind }: { kind: Motion }) {
  if (kind === 'swipe') return <SwipeScene />;
  if (kind === 'chat') return <ChatScene />;
  if (kind === 'pins') return <PinsScene />;
  return <TapScene />;
}

const CARD_W = 140;
const CARD_H = 196;

const styles = StyleSheet.create({
  screen: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, backgroundColor: ground(0.94), paddingHorizontal: 28 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.spot },
  kicker: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.8, color: colors.mute },
  stage: { flex: 1, minHeight: 120, alignItems: 'center', justifyContent: 'center' },
  words: { paddingBottom: 22 },
  big: { fontFamily: fonts.logo, fontSize: 48, lineHeight: 46, letterSpacing: -0.5, color: colors.paper },
  bigRed: { color: colors.spotText },
  body: { fontFamily: fonts.regular, fontSize: 15.5, lineHeight: 22, color: colors.mute, marginTop: 14, maxWidth: 320 },
  foot: { alignItems: 'center' },
  next: { alignSelf: 'stretch', height: 52, borderRadius: radius.pill, backgroundColor: colors.paper, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  nextText: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  nextMark: { fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
  pressed: { opacity: 0.6 },

  // the deck
  deck: { width: CARD_W + 80, height: CARD_H + 30, alignItems: 'center', justifyContent: 'center' },
  card: { position: 'absolute', width: CARD_W, height: CARD_H, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.ink3, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  cardBack1: { transform: [{ rotate: '-7deg' }, { translateX: -16 }], opacity: 0.7 },
  cardBack2: { transform: [{ rotate: '8deg' }, { translateX: 18 }], opacity: 0.45 },
  cardEdge: { borderWidth: 3, borderColor: colors.spot, borderRadius: radius.md },
  cardFoot: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 10, backgroundColor: ground(0.55), gap: 2 },
  cardMono: { fontFamily: fonts.jet, fontSize: 8.5, letterSpacing: 1.2, color: '#ddd' },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 13, letterSpacing: -0.2, color: '#F3F1EC' },
  stamp: { position: 'absolute', top: 14, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 2, borderRadius: 4 },
  stampKeep: { left: 12, borderColor: colors.spot, transform: [{ rotate: '-12deg' }] },
  stampDrop: { right: 12, borderColor: '#F3F1EC', transform: [{ rotate: '12deg' }] },
  stampText: { fontFamily: fonts.jet, fontSize: 11, letterSpacing: 1.6, color: '#F3F1EC' },
  stampKeepText: { color: colors.onPhotoSpot },

  // a tap
  tapWrap: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  tapPoster: { position: 'absolute', width: 130, height: 170, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.ink3 },
  tapVeil: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: ground(0.35) },
  ring: { position: 'absolute', width: 110, height: 110, borderRadius: 55, borderWidth: 2.5, borderColor: colors.spot },
  ring2: { borderWidth: 1.5 },
  finger: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.paper, borderWidth: 3, borderColor: colors.spot },

  // messages
  chat: { width: 260, gap: 10 },
  bubble: { maxWidth: 210, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleThem: { alignSelf: 'flex-start', backgroundColor: paperTint(0.1), borderBottomLeftRadius: 4 },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: colors.spot, borderBottomRightRadius: 4 },
  bubbleDots: { flexDirection: 'row', gap: 4, paddingVertical: 12 },
  bubbleText: { fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 19, color: colors.paper },
  bubbleMeText: { color: colors.onSpot },
  dotSmall: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.mute },

  // the map
  map: { width: 220, height: 220, borderRadius: radius.md, overflow: 'hidden', backgroundColor: paperTint(0.04), borderWidth: 1, borderColor: colors.ink3 },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: paperTint(0.06) },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: paperTint(0.06) },
  square: { position: 'absolute', width: 18, height: 18, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  squareRed: { backgroundColor: colors.spot },
  squarePulse: { position: 'absolute', width: 18, height: 18, borderWidth: 1.5, borderColor: colors.spot },
  diamond: { position: 'absolute', width: 16, height: 16, backgroundColor: '#E5B000', transform: [{ rotate: '45deg' }] },
  you: { position: 'absolute', left: 100, top: 100, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.spot, borderWidth: 2, borderColor: colors.paper },
});
