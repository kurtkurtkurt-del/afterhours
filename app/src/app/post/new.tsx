import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { captureRef } from 'react-native-view-shot';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import KeyboardSafe from '@/components/KeyboardSafe';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { POSTS_ON } from '@/content/flags';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/Button';
import PickerSheet from '@/components/PickerSheet';
import StaffPage, { Quiet } from '@/components/StaffPage';
import { useAuth } from '@/auth/AuthContext';
import { kept } from '@/data/friends';
import type { Night } from '@/data/deck';
import { pickPostPhoto, postCreate } from '@/data/posts';
import { why } from '@/data/staff';
import { useLang } from '@/i18n';
import { colors, fonts, radius, ground, barStyle } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// A post, camera first (design 2A): the photo fills the screen, the words go on top
// of it at the bottom, the night is a chip at the top. Without a photo the screen
// is ink and the words stand alone. Friends see it in their yours tab.
// Posts are off (content/flags.ts): the route redirects before any of the screen runs —
// except a story (?story=1, the + on messages, 26.10.2026): a post with a photo, seen as a
// ring on top of messages for a day. The yours tab and the past feed stay off.
export default function NewPostGate() {
  const { story } = useLocalSearchParams<{ story?: string }>();
  return POSTS_ON || story ? <NewPost story={!!story} /> : <Redirect href="/flow" />;
}

function NewPost({ story }: { story: boolean }) {
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const { session, isAnonymous } = useAuth();
  const uid = session?.user.id;
  const [photo, setPhoto] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [night, setNight] = useState<Night | null>(null);
  const [nights, setNights] = useState<Night[]>([]);
  const [choosing, setChoosing] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // a story's picture: fill the screen, or fit it whole with soft edges over its own blur,
  // as small as you like (owner, 26.10.2026); what is shared is the picture as framed here
  const [fit, setFit] = useState<'fill' | 'fit'>('fill');
  const [scale, setScale] = useState(1);
  const [ratio, setRatio] = useState<number | null>(null);
  const frame = useRef<View>(null);
  const { width: W, height: H } = useWindowDimensions();
  useEffect(() => {
    kept().then(setNights, () => {});
  }, []);

  if (!uid || isAnonymous) {
    return (
      <StaffPage title={story ? t('stories.add') : t('posts.new')}>
        <Quiet text={t('posts.account')} />
        <View style={styles.gap}>
          <Button label={t('word.signup')} onPress={() => router.push('/signup')} />
        </View>
      </StaffPage>
    );
  }
  // a story always ends on messages (owner, 26.10.2026: back() left a blank page after the gallery)
  const leave = () => (story ? router.dismissTo('/messages') : router.back());
  const pick = () =>
    pickPostPhoto().then(
      (u) => {
        if (!u) return;
        setPhoto(u);
        setRatio(null);
        setScale(1);
      },
      (e) => setSaid(why(e)),
    );
  const share = () => {
    if (story && !photo) return setSaid(t('stories.photoFirst'));
    setBusy(true);
    setSaid(null);
    // fitted: the framed picture is what goes (blur, soft edges and size baked in)
    const framed = story && photo && fit === 'fit' && frame.current ? captureRef(frame, { format: 'jpg', quality: 0.88, result: 'tmpfile', width: 1080 }) : Promise.resolve(photo);
    framed
      .then((file) => postCreate(uid, body, file, night?.id ?? null))
      .then(leave)
      .catch((e) => setSaid(why(e)))
      .finally(() => setBusy(false));
  };

  return (
    <View style={styles.root}>
      <StatusBar style={barStyle} />
      {photo && story ? (
        <View ref={frame} collapsable={false} style={StyleSheet.absoluteFill}>
          <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={fit === 'fit' ? 40 : 0} onLoad={(e) => setRatio(e.source.width / e.source.height)} />
          {fit === 'fit' ? <View style={[StyleSheet.absoluteFill, styles.fitDim]} /> : null}
          {fit === 'fit' && ratio ? <Fitted uri={photo} ratio={ratio} scale={scale} W={W} H={H} /> : null}
        </View>
      ) : photo ? (
        <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : null}
      <LinearGradient colors={[ground(0.55), ground(0.0), ground(0.2), ground(0.9)]} locations={[0, 0.2, 0.5, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />

      <View style={[styles.top, { top: Math.max(insets.top, 20) + 8 }]}>
        <Pressable onPress={leave} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('word.back')}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
        {story && photo ? (
          <View style={styles.seg}>
            {(['fill', 'fit'] as const).map((m) => (
              <Pressable key={m} onPress={() => setFit(m)} style={[styles.segItem, fit === m && styles.segOn]} accessibilityRole="button" accessibilityState={{ selected: fit === m }}>
                <Text style={[styles.segText, fit === m && styles.segTextOn]}>{t(m === 'fill' ? 'stories.fill' : 'stories.fit')}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Pressable onPress={() => setChoosing(true)} style={({ pressed }) => [styles.chip, night && styles.chipOn, pressed && styles.pressed]} accessibilityRole="button">
          <Text style={[styles.chipText, night && styles.chipTextOn]} numberOfLines={1}>
            {night ? `↗ ${night.title.toLowerCase()}` : t('posts.night')}
          </Text>
        </Pressable>
      </View>

      {!photo && story ? (
        // a story: one clear first step (owner, 26.10.2026: the gallery opening by itself left people lost)
        <View style={styles.empty}>
          <Pressable onPress={pick} style={({ pressed }) => [styles.choose, pressed && styles.pressed]} accessibilityRole="button">
            <Text style={styles.chooseIcon}>+</Text>
            <Text style={[styles.chooseText, styles.onSpot]}>{t('stories.choose')}</Text>
          </Pressable>
          <Text style={styles.emptyText}>{t('stories.chooseHint')}</Text>
        </View>
      ) : !photo ? (
        <Pressable onPress={pick} style={styles.empty} accessibilityRole="button">
          <Text style={styles.plus}>+</Text>
          <Text style={styles.emptyText}>{t('posts.photo')}</Text>
        </Pressable>
      ) : null}

      <KeyboardSafe style={styles.bottomWrap} pointerEvents="box-none">
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
          {story && photo && fit === 'fit' ? <SizeBar value={scale} onChange={setScale} label={t('stories.size')} /> : null}
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder={t('posts.body')}
            placeholderTextColor="rgba(243,241,236,0.55)"
            selectionColor={colors.spot}
            multiline
            maxLength={500}
            style={styles.words}
          />
          {said ? <Text style={styles.bad}>{said}</Text> : null}
          <View style={styles.buttons}>
            {!story || photo ? (
              <Pressable onPress={pick} style={({ pressed }) => [styles.line, pressed && styles.pressed]} accessibilityRole="button">
                <Text style={styles.lineText}>{photo ? t('posts.photo.change') : t('posts.photo')}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={busy ? undefined : share} style={({ pressed }) => [styles.share, pressed && styles.pressed]} accessibilityRole="button">
              <Text style={[styles.shareText, styles.onSpot]}>{busy ? '…' : t('posts.share')}</Text>
            </Pressable>
          </View>
          <Text style={styles.who}>{story ? t('stories.who') : t('posts.who')}</Text>
        </View>
      </KeyboardSafe>

      <PickerSheet
        open={choosing}
        title={t('posts.night')}
        options={[{ id: 'none', label: t('posts.night.none') }, ...nights.map((n) => ({ id: n.id, label: n.title.toLowerCase() }))]}
        selected={night?.id ?? 'none'}
        onSelect={(id) => setNight(nights.find((n) => n.id === id) ?? null)}
        onClose={() => setChoosing(false)}
      />
    </View>
  );
}

// The picture whole, as large as the screen allows at its own shape times the size, its
// edges melting into the blur behind: two masks, one fading top and bottom, one the sides.
function Fitted({ uri, ratio, scale, W, H }: { uri: string; ratio: number; scale: number; W: number; H: number }) {
  const boxW = Math.min(W, H * ratio) * scale;
  const boxH = boxW / ratio;
  const fade = (horizontal: boolean) => (
    <LinearGradient
      colors={['transparent', '#000', '#000', 'transparent']}
      locations={[0, 0.1, 0.9, 1]}
      start={horizontal ? { x: 0, y: 0.5 } : { x: 0.5, y: 0 }}
      end={horizontal ? { x: 1, y: 0.5 } : { x: 0.5, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
  return (
    <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
      <MaskedView style={{ width: boxW, height: boxH }} maskElement={fade(false)}>
        <MaskedView style={{ width: boxW, height: boxH }} maskElement={fade(true)}>
          <Image source={{ uri }} style={{ width: boxW, height: boxH }} contentFit="cover" />
        </MaskedView>
      </MaskedView>
    </View>
  );
}

// The size, from the whole width down to just over half: drag along the line.
function SizeBar({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const MIN = 0.55;
  const [w, setW] = useState(1);
  const set = (x: number) => onChange(Math.round((MIN + Math.min(1, Math.max(0, x / w)) * (1 - MIN)) * 100) / 100);
  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => runOnJS(set)(e.x))
    .onUpdate((e) => runOnJS(set)(e.x));
  const at = (value - MIN) / (1 - MIN);
  return (
    <View style={styles.size}>
      <Text style={styles.sizeLabel}>{label}</Text>
      <GestureDetector gesture={pan}>
        <View style={styles.sizeTrack} onLayout={(e) => setW(e.nativeEvent.layout.width)} hitSlop={{ top: 14, bottom: 14 }}>
          <View style={[styles.sizeFill, { width: `${at * 100}%` }]} />
          <View style={[styles.sizeKnob, { left: `${at * 100}%` }]} />
        </View>
      </GestureDetector>
      <Text style={styles.sizeLabel}>{Math.round(value * 100)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fitDim: { backgroundColor: 'rgba(14,13,12,0.28)' },
  center: { alignItems: 'center', justifyContent: 'center' },
  seg: { flexDirection: 'row', height: 32, padding: 3, borderRadius: radius.pill, backgroundColor: 'rgba(14,13,12,0.45)', borderWidth: 1, borderColor: 'rgba(243,241,236,0.35)' },
  segItem: { paddingHorizontal: 12, borderRadius: radius.pill, justifyContent: 'center' },
  segOn: { backgroundColor: colors.onPhoto },
  segText: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.onPhoto },
  segTextOn: { color: '#1F1D1A' },
  size: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sizeLabel: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1, color: colors.onPhoto, minWidth: 34 },
  sizeTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(243,241,236,0.3)', justifyContent: 'center' },
  sizeFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 2, backgroundColor: colors.onPhoto },
  sizeKnob: { position: 'absolute', width: 20, height: 20, marginLeft: -10, borderRadius: 10, backgroundColor: colors.onPhoto, borderWidth: 3, borderColor: colors.spot },
  // words on a red fill stay light whatever the ground does (try/light)
  onSpot: { color: colors.onSpot },
  root: { flex: 1, backgroundColor: colors.ink },
  gap: { marginTop: 24 },
  top: { position: 'absolute', left: brand.left, right: brand.left, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 2, gap: 16 },
  close: { fontFamily: fonts.medium, fontSize: 22, color: colors.paper },
  chip: { flexShrink: 1, height: 32, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(243,241,236,0.45)', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.paper, borderColor: colors.paper },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.paper },
  chipTextOn: { color: colors.ink },
  pressed: { opacity: 0.6 },
  empty: { position: 'absolute', top: '22%', left: 0, right: 0, alignItems: 'center', gap: 6 },
  plus: { fontFamily: fonts.medium, fontSize: 56, color: colors.paper },
  emptyText: { fontFamily: fonts.regular, fontSize: 14, color: colors.mute, textAlign: 'center', paddingHorizontal: 40 },
  choose: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 54, paddingHorizontal: 26, borderRadius: radius.pill, backgroundColor: colors.spot, marginBottom: 8 },
  chooseIcon: { fontFamily: fonts.medium, fontSize: 24, lineHeight: 26, color: colors.onSpot },
  chooseText: { fontFamily: fonts.semibold, fontSize: 17, letterSpacing: -0.2 },
  bottomWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bottom: { paddingHorizontal: brand.left, gap: 12 },
  words: { fontFamily: fonts.medium, fontSize: 24, lineHeight: 30, letterSpacing: -0.4, color: colors.paper, maxHeight: 180, paddingVertical: 0 },
  bad: { fontFamily: fonts.regular, fontSize: 13, color: colors.spotText },
  buttons: { flexDirection: 'row', gap: 10 },
  line: { flex: 1, height: 46, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(243,241,236,0.45)', alignItems: 'center', justifyContent: 'center' },
  lineText: { fontFamily: fonts.medium, fontSize: 15, color: colors.paper },
  share: { flex: 1, height: 46, borderRadius: radius.pill, backgroundColor: colors.spot, alignItems: 'center', justifyContent: 'center' },
  shareText: { fontFamily: fonts.medium, fontSize: 15, color: colors.paper },
  who: { fontFamily: fonts.regular, fontSize: 11, color: colors.mute, textAlign: 'center' },
});
