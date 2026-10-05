import { useCallback, useEffect, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { FRAME_MS, type Story } from '@/content/stories';
import { useLang } from '@/i18n';
import { colors, fonts } from '@/theme/tokens';

export type StoryItem = { story: Story; name: string; avatar?: ImageSourcePropType };
type Props = {
  items: StoryItem[]; // every story in the row, in its order
  start: number | null; // which one was tapped; null = closed
  onSeen: (dj: string) => void;
  onClose: () => void;
};

// DJ stories, full screen, one after another like the row: five seconds a frame with
// progress bars on top. Tap the right side for the next frame, the left for the
// previous; past a story's last frame the next DJ's story begins, past the last story
// the viewer closes. Tap the name or photo to open that DJ's page.
export default function StoryViewer({ items, start, onSeen, onClose }: Props) {
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
      {item ? <Frames key={item.story.dj} item={item} onEnd={() => move(1)} onBackPast={() => move(-1)} onClose={onClose} /> : null}
    </Modal>
  );
}

function Frames({ item, onEnd, onBackPast, onClose }: { item: StoryItem; onEnd: () => void; onBackPast: () => void; onClose: () => void }) {
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
  useEffect(() => {
    fill.set(0);
    fill.set(
      withTiming(1, { duration: FRAME_MS, easing: Easing.linear }, (done) => {
        if (done) runOnJS(step)(1);
      }),
    );
    return () => cancelAnimation(fill);
  }, [i, fill, step]);
  const running = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  const openDj = () => {
    onClose();
    router.push(`/dj/${story.dj}`);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Image source={frame.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient colors={['rgba(14,13,12,0.7)', 'rgba(14,13,12,0)', 'rgba(14,13,12,0)', 'rgba(14,13,12,0.85)']} locations={[0, 0.25, 0.6, 1]} style={StyleSheet.absoluteFill} />

      {/* tap zones: left third back, the rest forward */}
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.zones}>
          <Pressable style={styles.zoneBack} onPress={() => step(-1)} accessibilityLabel="‹" />
          <Pressable style={styles.zoneNext} onPress={() => step(1)} accessibilityLabel="›" />
        </View>
      </View>

      <View style={[styles.top, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
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
          <Pressable onPress={onClose} hitSlop={14} accessibilityRole="button" accessibilityLabel={t('story.close')} style={styles.close}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 32 }]} pointerEvents="none">
        <Text style={styles.caption}>{frame.caption}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  zones: { flex: 1, flexDirection: 'row' },
  zoneBack: { flex: 1 },
  zoneNext: { flex: 2 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 12 },
  bars: { flexDirection: 'row', gap: 4 },
  track: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(243,241,236,0.3)', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.paper },
  head: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingHorizontal: 4 },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pressed: { opacity: 0.7 },
  avatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: colors.paper },
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.paper },
  ago: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 0.8, color: colors.mute },
  close: { paddingHorizontal: 6 },
  closeText: { fontSize: 30, lineHeight: 32, color: colors.paper },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20 },
  caption: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 28, letterSpacing: -0.6, color: colors.paper },
});
