import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { Easing, cancelAnimation, interpolate, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import Button from '@/components/Button';
import LangRow from '@/components/LangRow';
import { upperData, useLang, useT } from '@/i18n';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

const photo = require('../../assets/intro/concert.jpg');

type Props = { onDone: () => void };

// tanıtım, seçenek 1 "üç adım"ın altı adımlı hali. sağa kaydır; her adımda canlı bir örnek.
export default function Onboarding({ onDone }: Props) {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const pager = useRef<ScrollView>(null);
  const t = useT();
  const steps = [
    { key: 'deck', demo: <DeckDemo />, h: t('onboarding.deck.h'), p: t('onboarding.deck.p') },
    { key: 'card', demo: <CardDemo />, h: t('onboarding.card.h'), p: t('onboarding.card.p') },
    { key: 'room', demo: <RoomDemo />, h: t('onboarding.room.h'), p: t('onboarding.room.p') },
    { key: 'friends', demo: <FriendsDemo />, h: t('onboarding.friends.h'), p: t('onboarding.friends.p') },
    { key: 'map', demo: <MapDemo />, h: t('onboarding.map.h'), p: t('onboarding.map.p') },
    { key: 'djs', demo: <DjsDemo />, h: t('onboarding.djs.h'), p: t('onboarding.djs.p') },
  ];
  const last = page === steps.length - 1;
  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <View style={styles.root}>
      <View style={styles.lang}>
        <LangRow />
      </View>
      <Pressable onPress={onDone} hitSlop={12} style={styles.skip}>
        <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
      </Pressable>
      <ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onEnd} style={styles.pager}>
        {steps.map((s) => (
          <View key={s.key} style={[styles.step, { width }]}>
            <View style={styles.demo}>{s.demo}</View>
            <Text style={styles.h}>{s.h}</Text>
            <Text style={styles.p}>{s.p}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {steps.map((s, i) => (
          <View key={s.key} style={[styles.dot, i === page && styles.dotOn]} />
        ))}
      </View>
      <View style={styles.cta}>
        <Button
          label={last ? t('onboarding.pick') : t('onboarding.next')}
          kind={last ? 'fill' : 'line'}
          onPress={() => {
            if (last) return onDone();
            pager.current?.scrollTo({ x: (page + 1) * width, animated: true });
            setPage(page + 1);
          }}
        />
      </View>
    </View>
  );
}

// 0 → 1 arasında sonsuz döngü; her örnek bunu kendi zamanlamasına çevirir
function useLoop(ms: number, delay = 0) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.set(withDelay(delay, withRepeat(withTiming(1, { duration: ms, easing: Easing.linear }), -1, false)));
    return () => cancelAnimation(v);
  }, [v, ms, delay]);
  return v;
}

function DeckDemo() {
  const { t: say, tx, up } = useLang();
  const t = useLoop(3000);
  const top = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(t.value, [0, 0.35, 0.55, 0.8, 1], [0, 0, 70, 320, 320]) },
      { rotate: `${interpolate(t.value, [0, 0.35, 0.55, 0.8, 1], [0, 0, 10, 25, 25])}deg` },
    ],
    opacity: interpolate(t.value, [0, 0.75, 0.85, 1], [1, 1, 0, 0]),
  }));
  const stamp = useAnimatedStyle(() => ({ opacity: interpolate(t.value, [0.4, 0.55, 0.75, 0.8], [0, 1, 1, 0]) }));
  const back = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(t.value, [0.35, 0.8], [0.94, 1]) }] }));
  return (
    <View style={styles.stage}>
      <Animated.View style={[styles.card, back]}>
        <Image source={photo} style={styles.cardPhoto} />
        <Text style={styles.cardTitle}>harry klein closing</Text>
        <Text style={styles.cardMeta}>{up(tx('type.club-night', 'club night'))} · 27.09</Text>
      </Animated.View>
      <Animated.View style={[styles.card, top]}>
        <Image source={photo} style={styles.cardPhoto} />
        <Animated.Text style={[styles.stampText, stamp]}>{up(say('word.keep'))}</Animated.Text>
        <Text style={styles.cardTitle}>blitz all night</Text>
        <Text style={styles.cardMeta}>{up(tx('type.rave', 'rave'))} · 26.09</Text>
      </Animated.View>
    </View>
  );
}

function CardDemo() {
  const { t: say, tx, up } = useLang();
  const t = useLoop(3200);
  // ön yüz daralıp kaybolur, kâğıt arka yüz genişler: bir çevrilme
  const front = useAnimatedStyle(() => ({
    transform: [{ scaleX: interpolate(t.value, [0, 0.3, 0.5, 0.8, 1], [1, 1, 0, 0, 0]) }],
    opacity: t.value < 0.5 ? 1 : 0,
  }));
  const backSide = useAnimatedStyle(() => ({
    transform: [{ scaleX: interpolate(t.value, [0, 0.5, 0.7, 1], [0, 0, 1, 1]) }],
    opacity: t.value >= 0.5 ? 1 : 0,
  }));
  return (
    <View style={styles.stage}>
      <Animated.View style={[styles.card, front]}>
        <Image source={photo} style={styles.cardPhoto} />
        <Text style={styles.cardTitle}>blitz all night</Text>
        <Text style={styles.cardMeta}>{up(say('onboarding.demo.kept'))} · 26.09</Text>
      </Animated.View>
      <Animated.View style={[styles.card, styles.cardPaper, backSide]}>
        <Text style={styles.paperMono}>{up(tx('type.rave', 'rave'))} · {up(say('onboarding.demo.checkedin'))}</Text>
        <Text style={styles.paperTitle}>BLITZ</Text>
        <Text style={styles.paperMono}>26.09.26 · {upperData('museumsinsel')} · 00:20</Text>
        <View style={styles.paperRule} />
        <Text style={styles.paperMono}>{up(say('onboarding.demo.whowas'))} · {upperData('j l m k')} +11</Text>
      </Animated.View>
    </View>
  );
}

function RoomDemo() {
  const { t: say, up } = useLang();
  const t = useLoop(4000);
  const l1 = useAnimatedStyle(() => ({ opacity: interpolate(t.value, [0.05, 0.15], [0, 1]) }));
  const l2 = useAnimatedStyle(() => ({ opacity: interpolate(t.value, [0.35, 0.45], [0, 1]) }));
  const cnt = useAnimatedStyle(() => ({ opacity: interpolate(t.value, [0.7, 0.8, 0.9, 1], [1, 0.3, 1, 1]) }));
  return (
    <View style={styles.stage}>
      <View style={styles.room}>
        <Text style={styles.paperMonoDark}>{up(say('onboarding.demo.thenight'))} · {upperData('blitz')}</Text>
        <Animated.Text style={[styles.roomLine, l1]}>02:14 · b: the ferry horn came through the wall</Animated.Text>
        <Animated.Text style={[styles.roomLine, l2]}>04:31 · e: where do you get simit at this hour</Animated.Text>
        <Animated.Text style={[styles.roomCount, cnt]}>{up(say('onboarding.demo.left'))}</Animated.Text>
      </View>
    </View>
  );
}

function FriendsDemo() {
  const { t: say, up } = useLang();
  const t = useLoop(3600);
  const a = ['l', 'e', 'm'].map((c, i) => ({ c, i }));
  const boxes = a.map(({ i }) => ({ i, delay: 0.1 + i * 0.12 }));
  const match = useAnimatedStyle(() => ({ opacity: interpolate(t.value, [0.6, 0.7, 0.95, 1], [0, 1, 1, 0]) }));
  return (
    <View style={styles.stage}>
      <View style={styles.night}>
        <Text style={styles.paperMono}>{up(say('when.tonight'))} · {upperData('blitz')}</Text>
        <Text style={styles.nightTitle}>blitz all night</Text>
        <View style={styles.avRow}>
          {boxes.map(({ i, delay }) => (
            <FriendBox key={i} t={t} delay={delay} c={a[i].c} />
          ))}
          <Text style={styles.avNote}>{say('onboarding.demo.friends')}</Text>
        </View>
      </View>
      <Animated.View style={[styles.matchBox, match]}>
        <Text style={styles.matchLabel}>{up(say('onboarding.demo.match'))}</Text>
        <Text style={styles.matchText}>{say('onboarding.demo.both')}</Text>
      </Animated.View>
    </View>
  );
}

function FriendBox({ t, delay, c }: { t: SharedValue<number>; delay: number; c: string }) {
  const s = useAnimatedStyle(() => ({ opacity: interpolate(t.value, [delay, delay + 0.08, 0.95, 1], [0, 1, 1, 0]) }));
  return (
    <Animated.View style={[styles.av, s]}>
      <Text style={styles.avText}>{c}</Text>
    </Animated.View>
  );
}

function MapDemo() {
  const t = useLoop(3600);
  const pins = [
    [30, 40],
    [62, 28],
    [48, 66],
    [76, 58],
  ];
  const me = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(t.value, [0, 0.5, 1], [1, 1.5, 1]) }], opacity: interpolate(t.value, [0, 0.5, 1], [1, 0.5, 1]) }));
  return (
    <View style={styles.stage}>
      <View style={styles.map}>
        {[18, 44, 70].map((y) => (
          <View key={`h${y}`} style={[styles.street, { top: `${y}%`, left: 0, right: 0, height: 1 }]} />
        ))}
        {[22, 55, 80].map((x) => (
          <View key={`v${x}`} style={[styles.street, { left: `${x}%`, top: 0, bottom: 0, width: 1 }]} />
        ))}
        {pins.map(([x, y], i) => (
          <MapPin key={i} t={t} delay={0.15 + i * 0.12} x={x} y={y} code={['rv', 'cn', 'kz', 'rv'][i]} />
        ))}
        <Animated.View style={[styles.meDot, me]} />
      </View>
    </View>
  );
}

function MapPin({ t, delay, x, y, code }: { t: SharedValue<number>; delay: number; x: number; y: number; code: string }) {
  const s = useAnimatedStyle(() => ({ opacity: interpolate(t.value, [delay, delay + 0.08, 0.95, 1], [0, 1, 1, 0]) }));
  return (
    <Animated.View style={[styles.pin, { left: `${x}%`, top: `${y}%` }, s]}>
      <Text style={styles.pinText}>{code}</Text>
    </Animated.View>
  );
}

function DjsDemo() {
  const { t: say, up } = useLang();
  const t = useLoop(2000);
  const blink = useAnimatedStyle(() => ({ opacity: interpolate(t.value, [0, 0.5, 1], [1, 0.2, 1]) }));
  return (
    <View style={styles.stage}>
      <View style={styles.djBlock}>
        <Image source={photo} style={styles.djPhoto} />
        <View style={styles.djShade} />
        <View style={styles.djText}>
          <View style={styles.liveRow}>
            <Animated.View style={[styles.liveDot, blink]} />
            <Text style={styles.liveText}>{up(say('onboarding.demo.live'))} · {upperData('harry klein')}</Text>
          </View>
          <Text style={styles.djName}>levent ok</Text>
          <Text style={styles.paperMono}>{upperData('house')} · {up(say('onboarding.demo.until', { time: '02:00' }))}</Text>
        </View>
      </View>
      <View style={styles.djRow}>
        <Text style={styles.djRowName}>mara volt</Text>
        <Text style={styles.paperMono}>{upperData('blitz')} · 01:00</Text>
      </View>
    </View>
  );
}

const CARD_W = 150;
const CARD_H = 200;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  skip: { position: 'absolute', top: brand.top, right: brand.left, zIndex: 2 },
  // geri tuşu altta; sol üst boş. skip ile aynı hizada
  lang: { position: 'absolute', top: brand.top, left: brand.left, zIndex: 2 },
  skipText: { fontFamily: fonts.regular, fontSize: 13, letterSpacing: 0.2, color: colors.mute },
  pager: { flex: 1, marginTop: brand.top + 30 },
  step: { paddingHorizontal: brand.left, paddingTop: 10 },
  demo: { height: 280, alignItems: 'center', justifyContent: 'center', marginBottom: 26 },
  h: { fontFamily: fonts.medium, fontSize: 30, lineHeight: 32, letterSpacing: -0.9, color: colors.paper },
  p: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.mute, marginTop: 10 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 18 },
  dot: { width: 6, height: 6, backgroundColor: colors.ink3 },
  dotOn: { backgroundColor: colors.paper },
  cta: { paddingHorizontal: brand.left, paddingBottom: 28 },

  stage: { width: 280, height: 280, alignItems: 'center', justifyContent: 'center' },
  card: { position: 'absolute', width: CARD_W, height: CARD_H, backgroundColor: colors.ink2, overflow: 'hidden', justifyContent: 'flex-end', padding: 10 },
  cardPhoto: { position: 'absolute', top: 0, left: 0, width: CARD_W, height: CARD_H, opacity: 0.5 },
  cardTitle: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 16, letterSpacing: -0.3, color: colors.paper },
  cardMeta: { fontFamily: fonts.regular, fontSize: 9, letterSpacing: 1.2, color: colors.mute, marginTop: 4 },
  stampText: { position: 'absolute', top: 10, right: 10, fontFamily: fonts.medium, fontSize: 10, letterSpacing: 1.6, color: colors.spot, borderWidth: 1.5, borderColor: colors.spot, paddingVertical: 3, paddingHorizontal: 6, transform: [{ rotate: '-8deg' }] },
  cardPaper: { backgroundColor: colors.paper, justifyContent: 'flex-end', gap: 4 },
  paperTitle: { fontFamily: fonts.medium, fontSize: 24, letterSpacing: -0.8, color: colors.ink },
  paperMono: { fontFamily: fonts.regular, fontSize: 9, letterSpacing: 1.2, color: colors.mute },
  paperMonoDark: { fontFamily: fonts.regular, fontSize: 9, letterSpacing: 1.2, color: colors.mute },
  paperRule: { borderTopWidth: 1, borderTopColor: colors.ink, marginVertical: 6 },
  room: { width: 240, borderWidth: 1, borderColor: colors.paper, padding: 14, gap: 10 },
  roomLine: { fontFamily: fonts.regular, fontSize: 12, color: colors.paper2 },
  roomCount: { fontFamily: fonts.regular, fontSize: 9, letterSpacing: 1.4, color: colors.spot, marginTop: 4 },
  night: { width: 240, backgroundColor: colors.ink2, padding: 14, gap: 6 },
  nightTitle: { fontFamily: fonts.medium, fontSize: 18, letterSpacing: -0.4, color: colors.paper },
  avRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  av: { width: 22, height: 22, borderWidth: 1, borderColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  avText: { fontFamily: fonts.medium, fontSize: 11, color: colors.paper },
  avNote: { fontFamily: fonts.regular, fontSize: 11, color: colors.mute, marginLeft: 6 },
  matchBox: { width: 240, borderWidth: 1, borderColor: colors.spot, padding: 12, marginTop: 10 },
  matchLabel: { fontFamily: fonts.regular, fontSize: 9, letterSpacing: 1.4, color: colors.spot },
  matchText: { fontFamily: fonts.regular, fontSize: 14, color: colors.paper, marginTop: 2 },
  map: { width: 240, height: 240, backgroundColor: '#1c1b18', overflow: 'hidden' },
  street: { position: 'absolute', backgroundColor: colors.ink3 },
  pin: { position: 'absolute', backgroundColor: colors.paper, paddingVertical: 3, paddingHorizontal: 5 },
  pinText: { fontFamily: fonts.medium, fontSize: 9, letterSpacing: 0.5, color: colors.ink },
  meDot: { position: 'absolute', left: '50%', top: '50%', width: 12, height: 12, marginLeft: -6, marginTop: -6, borderRadius: 6, backgroundColor: colors.spot, borderWidth: 2, borderColor: colors.paper },
  djBlock: { width: 240, height: 150, backgroundColor: colors.ink2, overflow: 'hidden' },
  djPhoto: { position: 'absolute', top: 0, left: 0, width: 240, height: 150, opacity: 0.6 },
  djShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 90, backgroundColor: colors.ink, opacity: 0.7 },
  djText: { position: 'absolute', left: 12, right: 12, bottom: 10, gap: 3 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.spot },
  liveText: { fontFamily: fonts.regular, fontSize: 9, letterSpacing: 1.2, color: colors.spot },
  djName: { fontFamily: fonts.medium, fontSize: 22, letterSpacing: -0.6, color: colors.paper },
  djRow: { width: 240, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.ink3 },
  djRowName: { fontFamily: fonts.medium, fontSize: 15, color: colors.paper },
});
