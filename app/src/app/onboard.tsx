import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import Storage from 'expo-sqlite/kv-store';
import Avatar from '@/components/Avatar';
import { setFlowView, type FlowView } from '@/components/FlowViews';
import { friendRequest, peopleSuggested, type Suggested } from '@/data/friends';
import { sparkOf } from '@/content/sparks';
import { useEventTypes } from '@/data/types';
import { useLang } from '@/i18n';
import { barStyle, colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// Right after sign up (owner, 28.10.2026; design C of prototypes/onboard-feed.html): afterhours
// writes to you as a chat. First the kinds of nights you go out for, up to three: only kept on the
// phone (onboard.types), nothing uses them yet (owner, 28.10.2026). Then add a friend (adding someone puts you on their map
// and them on yours), then how you want to look through nights: swipe, poster or classic,
// each shown small before you take it. The answers stay on the phone: the friend requests
// go out, the look becomes the flow's (flow.view). Skippable at every step. Design E of the
// same page (bubbles and stickers) is kept as a note for later: design/onboarding-e.md.

type Msg = { id: number; me?: boolean; text: string; look?: FlowView };
type Step = 'types' | 'friends' | 'look' | 'confirm';
// the chat sits between two lines typed big across the screen: welcome in, and you are ready
type Phase = 'hello' | 'chat' | 'ready';
const LOOKS: FlowView[] = ['swipe', 'poster', 'classic'];
const PICS = [require('../../assets/intro/concert.jpg'), sparkOf('rooftop').thumb, sparkOf('grill').thumb];

export const ONBOARD_DONE = 'onboard.done';
export const ONBOARD_TYPES = 'onboard.types';
export const onboarded = () => {
  try {
    return Storage.getItemSync(ONBOARD_DONE) === '1';
  } catch {
    return true;
  }
};

export default function OnboardScreen() {
  const insets = useSafeAreaInsets();
  const { t, tx } = useLang();
  const types = useEventTypes();
  const [kinds, setKinds] = useState<string[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [step, setStep] = useState<Step | null>(null);
  const [phase, setPhase] = useState<Phase>('hello');
  const [people, setPeople] = useState<Suggested[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [look, setLook] = useState<FlowView | null>(null);
  const scroll = useRef<ScrollView>(null);
  const n = useRef(0);
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const add = (m: Omit<Msg, 'id'>) => setMsgs((list) => [...list, { ...m, id: n.current++ }]);
  // afterhours "types" for a moment, then the line writes itself out (Typed below)
  const say = async (text: string, extra: Partial<Msg> = {}) => {
    setTyping(true);
    await wait(420);
    if (!alive.current) return;
    setTyping(false);
    add({ text, ...extra });
    await wait(Math.min(2200, text.length * CHAR_MS) + 150);
  };

  useEffect(() => {
    peopleSuggested(6).then((r) => alive.current && setPeople(r), () => {});
  }, []);
  const startChat = async () => {
    setPhase('chat');
    await wait(350);
    await say(t('onboard.hi'));
    await say(t('onboard.typesQ'));
    setStep('types');
  };
  const typeName = (id: string) => tx('type.' + id, types.find((x) => x.id === id)?.label ?? id);
  // kept only, for later: nothing in the flow reads it yet
  const typesDone = async () => {
    setStep(null);
    try {
      Storage.setItemSync(ONBOARD_TYPES, JSON.stringify(kinds));
    } catch {}
    add({ me: true, text: kinds.length ? kinds.map(typeName).join(' · ') : t('onboard.later') });
    await say(t('onboard.friendQ'));
    setStep('friends');
  };
  useEffect(() => {
    const id = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [msgs, typing, step]);

  const friendsDone = async () => {
    const names = people.filter((p) => picked.includes(p.handle)).map((p) => (p.display_name ?? p.handle).toLowerCase());
    setStep(null);
    add({ me: true, text: names.length ? t('onboard.adding', { names: names.join(', ') }) : t('onboard.later') });
    picked.forEach((h) => friendRequest(h).catch(() => {}));
    if (names.length) await say(t('onboard.added'));
    await say(t('onboard.lookQ'));
    setStep('look');
  };
  const pickLook = async (v: FlowView) => {
    setStep(null);
    setLook(v);
    add({ me: true, text: t(`flow.view.${v}`) });
    await say(t('onboard.thisIs', { look: t(`flow.view.${v}`) }), { look: v });
    setStep('confirm');
  };
  const finish = async () => {
    if (look) setFlowView(look);
    setStep(null);
    add({ me: true, text: t('onboard.yes') });
    await say(t('onboard.done'));
    await wait(500);
    setPhase('ready');
  };
  const leave = () => {
    try {
      Storage.setItemSync(ONBOARD_DONE, '1');
    } catch {}
    router.replace('/flow');
  };

  if (phase !== 'chat') {
    return (
      <Animated.View key={phase} entering={FadeIn.duration(400)} exiting={FadeOut.duration(300)} style={[styles.root, styles.stage]}>
        <StatusBar style={barStyle} />
        <Pressable style={StyleSheet.absoluteFill} onPress={phase === 'hello' ? startChat : leave} accessibilityRole="button" />
        <View pointerEvents="none">
          <Typed big text={t(phase === 'hello' ? 'onboard.welcome' : 'onboard.ready')} onDone={() => setTimeout(phase === 'hello' ? startChat : leave, phase === 'hello' ? 900 : 1300)} />
          {phase === 'ready' ? <Animated.Text entering={FadeIn.delay(1400).duration(500)} style={styles.stageSub}>{t('onboard.readySub')}</Animated.Text> : null}
        </View>
      </Animated.View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <StatusBar style={barStyle} />
      <View style={styles.who}>
        <View style={styles.badge}><Text style={styles.badgeText}>a.</Text></View>
        <View style={styles.whoText}>
          <Text style={styles.whoName}>afterhours</Text>
          <Text style={styles.whoOn}>● {t('onboard.online')}</Text>
        </View>
        <Pressable onPress={leave} hitSlop={12} accessibilityRole="button">
          <Text style={styles.skip}>{t('onboard.skip')}</Text>
        </Pressable>
      </View>

      <ScrollView ref={scroll} style={styles.chat} contentContainerStyle={styles.chatIn} showsVerticalScrollIndicator={false}>
        {msgs.map((m) => (
          <Animated.View key={m.id} entering={FadeInDown.duration(260)} style={[styles.bub, m.me ? styles.me : styles.them]}>
            {m.me ? <Text style={styles.meText}>{m.text}</Text> : <Typed text={m.text} />}
            {m.look ? <MiniLook look={m.look} /> : null}
          </Animated.View>
        ))}
        {typing ? (
          <View style={[styles.bub, styles.them, styles.typing]}>
            <Text style={styles.themText}>• • •</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.quick, { paddingBottom: insets.bottom + 14 }]}>
        {step === 'types' ? (
          <>
            {types.map((ty) => {
              const on = kinds.includes(ty.id);
              return (
                <Pressable key={ty.id} onPress={() => setKinds((l) => (on ? l.filter((x) => x !== ty.id) : l.length < 3 ? [...l, ty.id] : l))} style={[styles.chip, on && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{typeName(ty.id)}</Text>
                </Pressable>
              );
            })}
            <Pressable onPress={typesDone} style={[styles.chip, styles.chipDark]} accessibilityRole="button">
              <Text style={styles.chipDarkText}>{kinds.length ? t('onboard.typesDone', { n: kinds.length }) : t('onboard.later')}</Text>
            </Pressable>
          </>
        ) : step === 'friends' ? (
          <>
            {people.map((p) => {
              const on = picked.includes(p.handle);
              return (
                <Pressable key={p.handle} onPress={() => setPicked((l) => (on ? l.filter((x) => x !== p.handle) : [...l, p.handle]))} style={[styles.chip, styles.person, on && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                  <View style={styles.face}><Avatar name={p.handle} size={22} /></View>
                  <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>{(p.display_name ?? p.handle).toLowerCase()}{p.mutual ? ` · ${p.mutual}` : ''}</Text>
                </Pressable>
              );
            })}
            <Pressable onPress={() => router.push('/friend/add')} style={styles.chip} accessibilityRole="button">
              <Text style={styles.chipText}>{t('onboard.byName')}</Text>
            </Pressable>
            <Pressable onPress={friendsDone} style={[styles.chip, styles.chipDark]} accessibilityRole="button">
              <Text style={styles.chipDarkText}>{picked.length ? t('onboard.addThem', { n: picked.length }) : t('onboard.later')}</Text>
            </Pressable>
          </>
        ) : step === 'look' ? (
          LOOKS.map((v) => (
            <Pressable key={v} onPress={() => pickLook(v)} style={styles.chip} accessibilityRole="button">
              <Text style={styles.chipText}>{t(`flow.view.${v}`)}</Text>
            </Pressable>
          ))
        ) : step === 'confirm' ? (
          <>
            <Pressable onPress={finish} style={[styles.chip, styles.chipOn]} accessibilityRole="button">
              <Text style={[styles.chipText, styles.chipTextOn]}>{t('onboard.yes')}</Text>
            </Pressable>
            <Pressable onPress={() => { add({ me: true, text: t('onboard.another') }); setStep('look'); }} style={[styles.chip, styles.chipDark]} accessibilityRole="button">
              <Text style={styles.chipDarkText}>{t('onboard.another')}</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
  );
}

// A line that writes itself out, a letter at a time, with a caret while it goes. big: the
// two lines across the whole screen (the logo face, the last letter red).
const CHAR_MS = 24;
const BIG_MS = 70;
function Typed({ text, big, onDone }: { text: string; big?: boolean; onDone?: () => void }) {
  const [n, setN] = useState(0);
  const [blink, setBlink] = useState(true);
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setN(i);
      if (i >= text.length) {
        clearInterval(id);
        onDone?.();
      }
    }, big ? BIG_MS : CHAR_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  useEffect(() => {
    const id = setInterval(() => setBlink((b) => !b), 450);
    return () => clearInterval(id);
  }, []);
  const shown = text.slice(0, n);
  const typing = n < text.length;
  if (big) {
    const last = shown.slice(-1), head = shown.slice(0, -1);
    const end = !typing && (last === '.' || last === '!');
    return (
      <Text style={styles.big}>
        {end ? head : shown}
        {end ? <Text style={styles.bigDot}>{last}</Text> : null}
        <Text style={[styles.caret, { opacity: blink ? 1 : 0 }]}>{typing || !end ? '▍' : ''}</Text>
      </Text>
    );
  }
  return (
    <Text style={styles.themText}>
      {shown}
      {typing ? <Text style={styles.themCaret}>▍</Text> : null}
    </Text>
  );
}

// a small look at each of the three, in the bubble
function MiniLook({ look }: { look: FlowView }) {
  return (
    <View style={styles.mini}>
      {look === 'swipe' ? (
        <View style={styles.fan}>
          {[1, 2, 0].map((i) => (
            <View key={i} style={[styles.fanCard, { transform: [{ rotate: `${i === 0 ? 0 : i === 1 ? -9 : 9}deg` }, { translateX: i === 0 ? 0 : i === 1 ? -28 : 28 }] }, i !== 0 && { opacity: 0.7 }]}>
              <Image source={PICS[i]} style={StyleSheet.absoluteFill} contentFit="cover" />
            </View>
          ))}
        </View>
      ) : look === 'classic' ? (
        <View style={styles.rows}>
          {PICS.map((p, i) => (
            <View key={i} style={styles.miniRow}>
              <View style={styles.miniThumb}><Image source={p} style={StyleSheet.absoluteFill} contentFit="cover" /></View>
              <View style={styles.miniBar} />
              <View style={styles.miniHeart} />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.wall}>
          <View style={[styles.tile, styles.tileTall]}><Image source={PICS[0]} style={StyleSheet.absoluteFill} contentFit="cover" /></View>
          <View style={styles.wallCol}>
            <View style={styles.tile}><Image source={PICS[1]} style={StyleSheet.absoluteFill} contentFit="cover" /></View>
            <View style={styles.tile}><Image source={PICS[2]} style={StyleSheet.absoluteFill} contentFit="cover" /></View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  stage: { justifyContent: 'center', paddingHorizontal: brand.left + 6, backgroundColor: colors.poster },
  big: { fontFamily: fonts.logo, fontSize: 46, lineHeight: 50, letterSpacing: -1.4, color: colors.onPhoto },
  bigDot: { color: colors.spot },
  caret: { color: colors.spot },
  stageSub: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.onPhotoMute, marginTop: 18 },
  themCaret: { color: colors.spot },
  who: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: brand.left, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.ink3 },
  badge: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.poster, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: fonts.logo, fontSize: 17, color: colors.spot },
  whoText: { flex: 1 },
  whoName: { fontFamily: fonts.semibold, fontSize: 16, color: colors.paper },
  whoOn: { fontFamily: fonts.regular, fontSize: 11, color: '#1E9E57', marginTop: 1 },
  skip: { fontFamily: fonts.medium, fontSize: 13, color: colors.mute },
  chat: { flex: 1 },
  chatIn: { padding: brand.left, gap: 8 },
  bub: { maxWidth: '84%', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  them: { alignSelf: 'flex-start', backgroundColor: colors.paper, borderBottomLeftRadius: 6 },
  me: { alignSelf: 'flex-end', backgroundColor: colors.spot, borderBottomRightRadius: 6 },
  typing: { paddingVertical: 8 },
  themText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.ink },
  meText: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.onSpot },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: brand.left, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.ink3 },
  chip: { borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.spot, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: colors.card },
  person: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingLeft: 6 },
  face: { width: 22, height: 22, borderRadius: 11, overflow: 'hidden' },
  chipOn: { backgroundColor: colors.spot },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.spotText },
  chipTextOn: { color: colors.onSpot },
  chipDark: { borderColor: colors.paper, backgroundColor: colors.paper },
  chipDarkText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  mini: { width: 220, height: 112, borderRadius: 14, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 8 },
  fan: { flex: 1, alignItems: 'center', paddingTop: 8 },
  fanCard: { position: 'absolute', top: 8, width: 66, height: 94, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.ink3 },
  rows: { flex: 1, padding: 10, gap: 8, justifyContent: 'center' },
  miniRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniThumb: { width: 22, height: 22, borderRadius: 6, overflow: 'hidden' },
  miniBar: { flex: 1, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.35)' },
  miniHeart: { width: 13, height: 13, borderRadius: 7, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
  wall: { flex: 1, flexDirection: 'row', gap: 6, padding: 7 },
  wallCol: { flex: 1, gap: 6 },
  tile: { flex: 1, borderRadius: 8, overflow: 'hidden' },
  tileTall: { flex: 1 },
});
