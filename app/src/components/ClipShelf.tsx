import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Vinyl from '@/components/Vinyl';
import { useTrack } from '@/audio/useTrack';
import type { Clip } from '@/content/clips';
import { clipTracks } from '@/content/soundtracks';
import type { Dj } from '@/content/djs';
import { upperData, useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

type Props = {
  clips: Clip[];
  djOf: (slug: string) => Dj | undefined;
  tonight: (slug: string) => { venue: string; time: string } | null;
};

// Clips shared by DJs: a large card on top plays the chosen clip with its waveform;
// a record rack underneath picks one (the record slides out of its sleeve and spins).
// Playing hushes the background music; leaving the tab stops it (audio/useTrack).
export default function ClipShelf({ clips, djOf, tonight }: Props) {
  const { t, tn, up } = useLang();
  const [featured, setFeatured] = useState<string | null>(null);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  // when a clip ends, the next one comes up on the big card and waits
  const next = useCallback(
    (ended: string) => {
      const i = clips.findIndex((c) => c.id === ended);
      if (clips.length) setFeatured(clips[(i + 1) % clips.length].id);
    },
    [clips],
  );
  const { playing, play: playTrack, elapsed, duration } = useTrack(next);
  const current = clips.find((c) => c.id === featured) ?? clips[0];
  const play = (clip: Clip) => {
    setFeatured(clip.id);
    playTrack(clip.id, clipTracks[clip.track % clipTracks.length]);
  };

  if (!current) return <Text style={styles.idle}>{up(t('clips.none'))}</Text>;

  const dj = djOf(current.dj);
  const on = playing === current.id;
  const progress = on && duration ? Math.min(1, elapsed / duration) : 0;
  const who = (liked[current.id] ? ['♥'] : []).concat(current.likes).slice(0, 3);
  const set = tonight(current.dj);
  const when = current.when;
  const whenText = when.day === 'own' ? t('clips.own') : [when.venue, when.day === 'daysAgo' ? t('clips.daysAgo', { n: when.n ?? 2 }) : t(when.day === 'lastNight' ? 'clips.lastNight' : 'clips.lastWeek'), when.time].filter(Boolean).join(' · ');

  return (
    <View>
      <View style={styles.feat}>
        {dj ? <Image source={photoOf(dj)} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
        <LinearGradient colors={['rgba(14,13,12,0)', 'rgba(14,13,12,0.94)']} locations={[0.25, 1]} style={StyleSheet.absoluteFill} />
        <Text style={styles.count}>{`${clips.indexOf(current) + 1} / ${clips.length}`}</Text>
        <Pressable onPress={() => setLiked((l) => ({ ...l, [current.id]: !l[current.id] }))} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('clips.like')} style={styles.heart}>
          <Text style={[styles.heartText, liked[current.id] && styles.heartOn]}>{liked[current.id] ? '♥' : '♡'}</Text>
        </Pressable>
        <View style={styles.featIn}>
          <Text style={styles.mono}>{upperData(whenText)}</Text>
          <View style={styles.featRow}>
            <View style={styles.flex}>
              <Text style={styles.featName} numberOfLines={1}>{dj?.name ?? current.dj}</Text>
              <Text style={styles.featTitle} numberOfLines={1}>{current.title}</Text>
            </View>
            <Pressable onPress={() => play(current)} accessibilityRole="button" accessibilityLabel={on ? t('clips.stop') : t('clips.play')} style={({ pressed }) => [styles.playBtn, on && styles.playOn, pressed && styles.pressed]}>
              <Text style={[styles.playText, on && styles.playTextOn]}>{on ? '❚❚' : '▶'}</Text>
            </Pressable>
          </View>
          <Wave id={current.id} progress={progress} />
          <View style={styles.foot}>
            {set ? <Text style={styles.tag}>{up(t('clips.tonight', { venue: set.venue, time: set.time }))}</Text> : null}
            {who.length ? (
              <View style={styles.sqs}>
                {who.map((w, i) => (
                  <View key={`${w}${i}`} style={styles.sq}>
                    <Text style={styles.sqText}>{w}</Text>
                  </View>
                ))}
                <Text style={styles.sqNote}>{tn('clips.liked', who.length)}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rack}>
        {clips.map((c) => {
          const d = djOf(c.dj);
          return <Sleeve key={c.id} clip={c} photo={d ? photoOf(d) : undefined} name={d?.name ?? c.dj} genre={d?.genre ?? c.sound} active={playing === c.id} onPress={() => play(c)} />;
        })}
      </ScrollView>
    </View>
  );
}

const photoOf = (dj: Dj): ImageSourcePropType => (dj.photoUrl ? { uri: dj.photoUrl } : dj.photo);

// A record in its sleeve; while its clip plays the record rises out and spins.
function Sleeve({ clip, photo, name, genre, active, onPress }: { clip: Clip; photo?: ImageSourcePropType; name: string; genre: string; active: boolean; onPress: () => void }) {
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.set(withTiming(active ? 1 : 0, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, [active, lift]);
  const disc = useAnimatedStyle(() => ({ transform: [{ translateY: -52 * lift.value }] }));
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${name} · ${clip.title}`} style={({ pressed }) => [styles.sleeve, pressed && styles.pressed]}>
      <Animated.View style={[styles.disc, disc]}>{photo ? <Vinyl size={104} label={photo} spinning={active} /> : null}</Animated.View>
      <View style={styles.cover}>
        {photo ? <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
        <Text style={styles.coverGenre}>{upperData(genre)}</Text>
      </View>
      <Text style={styles.sleeveName} numberOfLines={1}>{name}</Text>
      <Text style={styles.sleeveTitle} numberOfLines={1}>{clip.title}</Text>
    </Pressable>
  );
}

// A made-up but stable waveform per clip; played bars turn red.
const BARS = 46;
function waveHeights(id: string) {
  let seed = [...id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 233280, 7);
  const out: number[] = [];
  for (let i = 0; i < BARS; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const a = seed / 233280;
    seed = (seed * 9301 + 49297) % 233280;
    const b = seed / 233280;
    out.push(25 + 70 * Math.abs(Math.sin(i / 3.2 + a * 1.4)) * (0.55 + b * 0.45));
  }
  return out;
}
function Wave({ id, progress }: { id: string; progress: number }) {
  const heights = useMemo(() => waveHeights(id), [id]);
  const played = Math.floor(progress * BARS);
  return (
    <View style={styles.wave}>
      {heights.map((h, i) => (
        <View key={i} style={[styles.bar, { height: `${h}%` }, i < played && styles.barOn]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  idle: { fontFamily: fonts.regular, fontSize: 10, letterSpacing: 1.6, color: colors.meta, paddingHorizontal: brand.left },
  feat: { height: 262, marginHorizontal: 16, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.ink2 },
  count: { position: 'absolute', top: 14, left: 16, fontFamily: fonts.jet, fontSize: 9.5, letterSpacing: 1, color: colors.paper, backgroundColor: colors.ink, paddingVertical: 3, paddingHorizontal: 9, borderRadius: radius.pill, overflow: 'hidden' },
  heart: { position: 'absolute', top: 10, right: 16 },
  heartText: { fontSize: 22, color: colors.paper },
  heartOn: { color: colors.spot },
  featIn: { position: 'absolute', left: 16, right: 16, bottom: 14 },
  mono: { fontFamily: fonts.jet, fontSize: 9.5, letterSpacing: 0.8, color: colors.mute },
  featRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 3 },
  featName: { fontFamily: fonts.semibold, fontSize: 28, lineHeight: 30, letterSpacing: -0.8, color: colors.paper },
  featTitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.mute, marginTop: 2 },
  playBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  playOn: { backgroundColor: colors.spot },
  playText: { fontSize: 15, color: colors.ink },
  playTextOn: { color: colors.paper },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 26, marginTop: 10 },
  bar: { flex: 1, borderRadius: 2, backgroundColor: colors.ink3 },
  barOn: { backgroundColor: colors.spot },
  foot: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tag: { fontFamily: fonts.jet, fontSize: 9.5, letterSpacing: 0.8, color: colors.spotText, borderWidth: 1, borderColor: colors.spot, borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 9, overflow: 'hidden' },
  sqs: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sq: { width: 18, height: 18, borderRadius: radius.xs, borderWidth: 1.5, borderColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  sqText: { fontFamily: fonts.medium, fontSize: 9, color: colors.paper },
  sqNote: { fontFamily: fonts.regular, fontSize: 11, color: colors.meta, marginLeft: 4 },
  rack: { gap: 14, paddingHorizontal: brand.left, paddingTop: 60, paddingBottom: 8 },
  sleeve: { width: 118 },
  disc: { position: 'absolute', left: 7, top: 3 },
  cover: { width: 118, height: 118, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.ink2, justifyContent: 'flex-end', padding: 7 },
  coverGenre: { fontFamily: fonts.jet, fontSize: 8.5, letterSpacing: 1, color: colors.paper, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4 },
  sleeveName: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.paper, marginTop: 7 },
  sleeveTitle: { fontFamily: fonts.regular, fontSize: 11, color: colors.meta },
});
