import { useCallback, useEffect, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { FRAME_MS, type Story } from '@/content/stories';
import { upperData, useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';

type Props = {
  story: Story | null;
  name: string;
  avatar?: ImageSourcePropType;
  onClose: () => void;
};

// A DJ's story, full screen: one frame every five seconds with progress bars on top.
// Tap the right side for the next frame, the left side for the previous one.
export default function StoryViewer({ story, name, avatar, onClose }: Props) {
  return (
    <Modal visible={!!story} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {story ? <Frames key={story.dj} story={story} name={name} avatar={avatar} onClose={onClose} /> : null}
    </Modal>
  );
}

function Frames({ story, name, avatar, onClose }: { story: Story; name: string; avatar?: ImageSourcePropType; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { t, up } = useLang();
  const [i, setI] = useState(0);
  const fill = useSharedValue(0);
  const last = story.frames.length - 1;
  const frame = story.frames[Math.min(i, last)];
  const step = useCallback((by: number) => setI((x) => Math.max(0, x + by)), []);

  // past the last frame: the story is over
  useEffect(() => {
    if (i > last) onClose();
  }, [i, last, onClose]);

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
  const next = () => step(1);
  const prev = () => step(-1);
  const running = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Image source={frame.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient colors={['rgba(14,13,12,0.7)', 'rgba(14,13,12,0)', 'rgba(14,13,12,0)', 'rgba(14,13,12,0.85)']} locations={[0, 0.25, 0.6, 1]} style={StyleSheet.absoluteFill} />

      {/* tap zones: left third back, the rest forward */}
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.zones}>
          <Pressable style={styles.zoneBack} onPress={prev} accessibilityLabel="‹" />
          <Pressable style={styles.zoneNext} onPress={next} accessibilityLabel="›" />
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
          {avatar ? <Image source={avatar} style={styles.avatar} /> : null}
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.ago}>{up(t('story.hours', { n: story.hoursAgo }))}</Text>
          <Pressable onPress={onClose} hitSlop={14} accessibilityRole="button" accessibilityLabel={t('story.close')} style={styles.close}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]} pointerEvents="box-none">
        <Text style={styles.caption}>{frame.caption}</Text>
        <Pressable
          onPress={() => {
            onClose();
            router.push(`/dj/${story.dj}`);
          }}
          accessibilityRole="button"
          style={({ pressed }) => [styles.page, pressed && styles.pressed]}
        >
          <Text style={styles.pageText}>{upperData(t('story.page'))} ›</Text>
        </Pressable>
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
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, paddingHorizontal: 4 },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.paper },
  ago: { flex: 1, fontFamily: fonts.jet, fontSize: 10, letterSpacing: 0.8, color: colors.mute },
  close: { paddingHorizontal: 6 },
  closeText: { fontSize: 30, lineHeight: 32, color: colors.paper },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, gap: 14 },
  caption: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 28, letterSpacing: -0.6, color: colors.paper },
  page: { alignSelf: 'flex-start', paddingVertical: 9, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.paper },
  pageText: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  pressed: { opacity: 0.7 },
});
