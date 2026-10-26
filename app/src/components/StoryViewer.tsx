import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { FRAME_MS, type Story } from '@/content/stories';
import { useLang } from '@/i18n';
import { colors, fonts } from '@/theme/tokens';

export type StoryItem = { story: Story; name: string; avatar?: ImageSourcePropType; mine?: boolean };
type Props = {
  items: StoryItem[]; // every story in the row, in its order
  start: number | null; // which one was tapped; null = closed
  onSeen: (dj: string) => void;
  onClose: () => void;
  // your own story: the bin in the head deletes the frame on screen (its post)
  onDelete?: (postId: string) => Promise<void>;
};

// DJ stories, full screen, one after another like the row: five seconds a frame with
// progress bars on top. Tap the right side for the next frame, the left for the
// previous; past a story's last frame the next DJ's story begins, past the last story
// the viewer closes. Tap the name or photo to open that DJ's page.
export default function StoryViewer({ items, start, onSeen, onClose, onDelete }: Props) {
  const [at, setAt] = useState(start ?? 0);
  const [opened, setOpened] = useState(start);
  if (start !== opened) {
    // opened again from the row: start where it was tapped
    setOpened(start);
    if (start !== null) setAt(start);
  }
  const item = start !== null ? items[at] : undefined;

  useEffect(() => {
    if (item) onSeen(item.story.dj);
  }, [item, onSeen]);

  const move = useCallback(
    (by: number) => {
      const next = at + by;
      if (next < 0) return;
      if (next >= items.length) onClose();
      else setAt(next);
    },
    [at, items.length, onClose],
  );

  return (
    <Modal visible={!!item} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {item ? <Frames key={item.story.dj} item={item} onEnd={() => move(1)} onBackPast={() => move(-1)} onClose={onClose} onDelete={onDelete} /> : null}
    </Modal>
  );
}

function Frames({ item, onEnd, onBackPast, onClose, onDelete }: { item: StoryItem; onEnd: () => void; onBackPast: () => void; onClose: () => void; onDelete?: (postId: string) => Promise<void> }) {
  const insets = useSafeAreaInsets();
  const { t, up } = useLang();
  const { story, name, avatar } = item;
  const [i, setI] = useState(0);
  const fill = useSharedValue(0);
  const last = story.frames.length - 1;
  const frame = story.frames[Math.min(Math.max(i, 0), last)];
  const step = useCallback((by: number) => setI((x) => x + by), []);

  // past either end of this story: on to the neighbouring story
  useEffect(() => {
    if (i > last) onEnd();
    else if (i < 0) onBackPast();
  }, [i, last, onEnd, onBackPast]);

  // each frame runs for FRAME_MS, then moves on by itself
  const run = useCallback(
    (from: number) => {
      fill.set(from);
      fill.set(
        withTiming(1, { duration: Math.max(0, (1 - from) * FRAME_MS), easing: Easing.linear }, (done) => {
          if (done) runOnJS(step)(1);
        }),
      );
    },
    [fill, step],
  );
  useEffect(() => {
    run(0);
    return () => cancelAnimation(fill);
  }, [i, fill, run]);
  const running = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  // Hold anywhere to stop (owner, 26.10.2026): the bar freezes, the words and the head
  // fade so the picture is seen; letting go goes on from there. A hold is not a tap.
  const [held, setHeld] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasHeld = useRef(false);
  const pressIn = () => {
    wasHeld.current = false;
    holdTimer.current = setTimeout(() => {
      wasHeld.current = true;
      cancelAnimation(fill);
      setHeld(true);
    }, 180);
  };
  const pressOut = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (wasHeld.current) {
      setHeld(false);
      run(fill.get());
    }
  };
  // your own frame: stop and ask here, inside the viewer (the app's own dialog sheet sits
  // under this Modal and was never seen, 26.10.2026); deleted, the viewer closes, back on messages
  const [asking, setAsking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);
  const remove = () => {
    if (!frame?.postId || !onDelete) return;
    cancelAnimation(fill);
    setFailed(false);
    setAsking(true);
  };
  const keep = () => {
    setAsking(false);
    run(fill.get());
  };
  const confirm = () => {
    const id = frame?.postId;
    if (!id || !onDelete || deleting) return;
    setDeleting(true);
    onDelete(id)
      .then(() => onClose())
      .catch(() => setFailed(true))
      .finally(() => setDeleting(false));
  };
  const tap = (by: number) => {
    if (wasHeld.current) return; // the end of a hold, not a tap
    step(by);
  };

  const openDj = () => {
    onClose();
    router.push(`/dj/${story.dj}`);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Image source={frame.image} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient colors={['rgba(14,13,12,0.7)', 'rgba(14,13,12,0)', 'rgba(14,13,12,0)', 'rgba(14,13,12,0.85)']} locations={[0, 0.25, 0.6, 1]} style={StyleSheet.absoluteFill} />

      {/* tap zones: left third back, the rest forward */}
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.zones}>
          <Pressable style={styles.zoneBack} onPressIn={pressIn} onPressOut={pressOut} onPress={() => tap(-1)} accessibilityLabel="‹" />
          <Pressable style={styles.zoneNext} onPressIn={pressIn} onPressOut={pressOut} onPress={() => tap(1)} accessibilityLabel="›" />
        </View>
      </View>

      <View style={[styles.top, { paddingTop: insets.top + 10 }, held && styles.hush]} pointerEvents="box-none">
        <View style={styles.bars}>
          {story.frames.map((_, k) => (
            <View key={k} style={styles.track}>
              {k < i ? <View style={[styles.fill, { width: '100%' }]} /> : k === i ? <Animated.View style={[styles.fill, running]} /> : null}
            </View>
          ))}
        </View>
        <View style={styles.head}>
          <Pressable onPress={openDj} hitSlop={8} accessibilityRole="button" accessibilityLabel={name} style={({ pressed }) => [styles.who, pressed && styles.pressed]}>
            {avatar ? <Image source={avatar} style={styles.avatar} /> : null}
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.ago}>{up(t('story.hours', { n: story.hoursAgo }))}</Text>
          </Pressable>
          {item.mine && frame?.postId && onDelete ? (
            <Pressable onPress={remove} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('stories.delete')} style={styles.bin}>
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6" stroke="#F6F4EF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </Svg>
            </Pressable>
          ) : null}
          <Pressable onPress={onClose} hitSlop={14} accessibilityRole="button" accessibilityLabel={t('story.close')} style={styles.close}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 32 }, (held || asking) && styles.hush]} pointerEvents="none">
        <Text style={styles.caption}>{frame.caption}</Text>
      </View>

      {asking ? (
        <View style={styles.ask}>
          <Pressable style={StyleSheet.absoluteFill} onPress={keep} accessibilityRole="button" accessibilityLabel={t('word.cancel')} />
          <View style={[styles.askSheet, { paddingBottom: insets.bottom + 18 }]}>
            <Text style={styles.askText}>{failed ? t('stories.delete.failed') : t('stories.delete.sure')}</Text>
            <Pressable onPress={confirm} style={({ pressed }) => [styles.askDelete, pressed && styles.pressed]} accessibilityRole="button">
              <Text style={styles.askDeleteText}>{deleting ? '…' : t('stories.delete')}</Text>
            </Pressable>
            <Pressable onPress={keep} style={({ pressed }) => [styles.askKeep, pressed && styles.pressed]} accessibilityRole="button">
              <Text style={styles.askKeepText}>{t('word.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.poster },
  zones: { flex: 1, flexDirection: 'row' },
  hush: { opacity: 0 },
  ask: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', backgroundColor: 'rgba(14,13,12,0.45)' },
  askSheet: { backgroundColor: '#1A1816', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 22, paddingHorizontal: 20, gap: 10 },
  askText: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.onPhoto, marginBottom: 6 },
  askDelete: { height: 50, borderRadius: 25, backgroundColor: colors.spot, alignItems: 'center', justifyContent: 'center' },
  askDeleteText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.onSpot },
  askKeep: { height: 50, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(246,244,239,0.35)', alignItems: 'center', justifyContent: 'center' },
  askKeepText: { fontFamily: fonts.medium, fontSize: 16, color: colors.onPhoto },
  bin: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(14,13,12,0.35)', marginRight: 8 },
  zoneBack: { flex: 1 },
  zoneNext: { flex: 2 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 12 },
  bars: { flexDirection: 'row', gap: 4 },
  track: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(243,241,236,0.3)', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.onPhoto },
  head: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingHorizontal: 4 },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pressed: { opacity: 0.7 },
  avatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: colors.paper },
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.onPhoto },
  ago: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 0.8, color: colors.onPhotoMute },
  close: { paddingHorizontal: 6 },
  closeText: { fontSize: 30, lineHeight: 32, color: colors.onPhoto },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20 },
  caption: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 28, letterSpacing: -0.6, color: colors.onPhoto },
});
