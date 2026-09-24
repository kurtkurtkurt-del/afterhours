import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from '@/components/BackButton';
import Vinyl from '@/components/Vinyl';
import { useAmbient } from '@/audio/AmbientContext';
import { djs as localDjs, sets as localSets, tracksFor, type Dj, type DjSet } from '@/content/djs';
import { isFollowing, loadDjs, setFollow } from '@/data/djs';
import { useAuth } from '@/auth/AuthContext';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

const GAP = 12;

// dj sayfası: büyük fotoğraf ve künye, küçük fotoğraf şeridi, iki sütun plaklı set listesi.
export default function DjScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const ambient = useAmbient();
  const [following, setFollowing] = useState(false);
  const [playing, setPlaying] = useState<number | null>(null);
  const { session } = useAuth();
  const [data, setData] = useState<{ djs: Dj[]; sets: DjSet[] }>({ djs: localDjs, sets: localSets() });
  useEffect(() => {
    let cancelled = false;
    loadDjs().then((d) => !cancelled && setData({ djs: d.djs, sets: d.sets })).catch(() => {});
    if (session && id) isFollowing(id).then((f) => !cancelled && setFollowing(f)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id, session]);

  const dj = data.djs.find((d) => d.id === id) ?? localDjs.find((d) => d.id === id) ?? localDjs[0];
  const tracks = tracksFor(dj);
  const photos = localDjs.filter((d) => d.id !== dj.id).slice(0, 4).map((d) => d.photo); // yer tutucu: gecelerin fotoğrafları
  const next = data.sets.find((s) => s.dj === dj.id);
  const toggleFollow = () => {
    const on = !following;
    setFollowing(on);
    if (session) setFollow(dj.id, on).catch(() => setFollowing(!on));
  };
  const tile = (width - brand.left * 2 - GAP) / 2;
  const disc = tile - 24;

  const play = (i: number) => {
    if (playing === i) {
      setPlaying(null);
      if (ambient.on) ambient.toggle();
      return;
    }
    setPlaying(i);
    ambient.setGenre(dj.sound); // şimdilik dj'nin türündeki müzik çalar
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.band}>
        <BackButton />
        <Pressable onPress={toggleFollow} hitSlop={12} style={styles.follow}>
          <Text style={[styles.followText, following && styles.followOn]}>{following ? 'following' : 'follow'}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        {/* kapak */}
        <View style={[styles.hero, { height: width * 1.05 }]}>
          <Image source={dj.photoUrl ? { uri: dj.photoUrl } : dj.photo} style={styles.heroPhoto} />
          <View style={styles.heroShade} />
          <View style={styles.heroText}>
            <Text style={styles.mono}>{dj.genre}{next ? ` · ${next.venue} resident` : ''}</Text>
            <Text style={styles.name}>{dj.name}</Text>
            <Text style={styles.mono}>{dj.city} · since {dj.since} · {dj.followers} followers</Text>
          </View>
        </View>

        {/* küçük fotoğraflar */}
        <View style={styles.strip}>
          {photos.map((p, i) => (
            <Image key={i} source={p} style={styles.small} />
          ))}
        </View>

        {/* setler: iki sütun, her biri bir plak */}
        <View style={styles.head}>
          <Text style={styles.mono}>sets</Text>
          <Text style={styles.mono}>{tracks.length} recorded</Text>
        </View>
        <View style={styles.gridWrap}>
          {tracks.map((t, i) => {
            const on = playing === i;
            return (
              <Pressable key={t.title + i} onPress={() => play(i)} style={({ pressed }) => [styles.tile, { width: tile }, pressed && styles.pressed]}>
                <View style={styles.discBox}>
                  <Vinyl size={disc} label={dj.photo} spinning={on} />
                </View>
                <Text style={[styles.trackTitle, on && styles.trackOn]} numberOfLines={1}>{t.title}</Text>
                <Text style={styles.mono}>{t.date} · {t.length}</Text>
              </Pressable>
            );
          })}
        </View>

        {next && (
          <>
            <View style={styles.head}>
              <Text style={styles.mono}>next</Text>
            </View>
            <View style={styles.nextRow}>
              <Text style={styles.nextVenue}>{next.venue}</Text>
              <Text style={styles.mono}>{next.startsAt.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: '2-digit' }).toLowerCase()}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 36, zIndex: 2 },
  follow: { position: 'absolute', top: brand.top, right: brand.left, zIndex: 1 },
  followText: { fontFamily: fonts.regular, fontSize: 13, letterSpacing: 0.2, color: colors.paper },
  followOn: { color: colors.spot },
  hero: { backgroundColor: colors.ink2, overflow: 'hidden' },
  heroPhoto: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  heroShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 150, backgroundColor: colors.ink, opacity: 0.75 },
  heroText: { position: 'absolute', left: brand.left, right: brand.left, bottom: 18, gap: 5 },
  name: { fontFamily: fonts.medium, fontSize: 40, lineHeight: 42, letterSpacing: -1.4, color: colors.paper },
  mono: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.mute },
  strip: { flexDirection: 'row', gap: 4, paddingHorizontal: brand.left, marginTop: 4 },
  small: { flex: 1, aspectRatio: 1, backgroundColor: colors.ink2 },
  head: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: brand.left, marginTop: 28, marginBottom: 10 },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingHorizontal: brand.left },
  tile: { gap: 4 },
  pressed: { opacity: 0.7 },
  discBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8, backgroundColor: colors.ink2, marginBottom: 6 },
  trackTitle: { fontFamily: fonts.medium, fontSize: 14, letterSpacing: -0.2, color: colors.paper },
  trackOn: { color: colors.spot },
  nextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: brand.left, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.ink3, marginHorizontal: brand.left },
  nextVenue: { fontFamily: fonts.medium, fontSize: 18, letterSpacing: -0.3, color: colors.paper },
});
