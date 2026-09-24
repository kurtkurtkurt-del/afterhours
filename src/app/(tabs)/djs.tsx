import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SoundCorner from '@/components/SoundCorner';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import { djs as localDjs, sets as localSets, type Dj, type DjSet } from '@/content/djs';
import { loadDjs } from '@/data/djs';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

const H = 3600_000;
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const dayName = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'short' }).toLowerCase();

// seçenek 6, "şimdi / sonra": en üstte çalan, altında bu gece, sonra bu hafta.
export default function DjsScreen() {
  const insets = useSafeAreaInsets();
  const now = useMemo(() => new Date(), []);
  const [data, setData] = useState<{ djs: Dj[]; sets: DjSet[] }>({ djs: localDjs, sets: localSets(now) });
  useEffect(() => {
    let cancelled = false;
    loadDjs().then((d) => !cancelled && setData({ djs: d.djs, sets: d.sets })).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const all = data.sets;
  const djById = (id: string) => data.djs.find((d) => d.id === id) ?? localDjs[0];

  const live = all.find((s) => s.startsAt <= now && s.startsAt.getTime() + s.hours * H > now.getTime());
  const nightEnd = new Date(now);
  nightEnd.setHours(8, 0, 0, 0);
  if (nightEnd <= now) nightEnd.setDate(nightEnd.getDate() + 1);
  const tonight = all.filter((s) => s !== live && s.startsAt > now && s.startsAt <= nightEnd);
  const week = all.filter((s) => s.startsAt > nightEnd);
  const next = tonight[0] ?? week[0] ?? all[0];

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.band}>
        <Text style={styles.title}>djs</Text>
        <SoundCorner />
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: TAB_BAR_SPACE + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {!next ? <Text style={styles.mono}>no sets listed yet</Text> : null}
        {/* şimdi */}
        {next ? (
        <Pressable style={styles.hero} onPress={() => router.push(`/dj/${(live ?? next).dj}`)}>
          <Image source={djById((live ?? next).dj).photoUrl ? { uri: djById((live ?? next).dj).photoUrl! } : djById((live ?? next).dj).photo} style={styles.heroPhoto} />
          <View style={styles.heroShade} />
          <View style={styles.heroText}>
            <Text style={[styles.mono, live ? styles.live : null]}>
              {live ? `live now · ${live.venue}` : `next up · ${next.venue} · ${hhmm(next.startsAt)}`}
            </Text>
            <Text style={styles.heroName}>{djById((live ?? next).dj).name}</Text>
            <Text style={styles.mono}>
              {djById((live ?? next).dj).genre}
              {live ? ` · until ${hhmm(new Date(live.startsAt.getTime() + live.hours * H))}` : ''}
            </Text>
          </View>
        </Pressable>
        ) : null}

        {tonight.length > 0 && (
          <>
            <Text style={styles.section}>later tonight</Text>
            {tonight.map((s) => (
              <Row key={s.dj + s.startsAt.toISOString()} set={s} dj={djById(s.dj)} right={hhmm(s.startsAt)} />
            ))}
          </>
        )}

        <Text style={styles.section}>this week</Text>
        {week.map((s) => (
          <Row key={s.dj + s.startsAt.toISOString()} set={s} dj={djById(s.dj)} right={`${dayName(s.startsAt)} · ${hhmm(s.startsAt)}`} />
        ))}
      </ScrollView>
    </View>
  );
}

function Row({ set, dj, right }: { set: DjSet; dj: Dj; right: string }) {
  return (
    <Pressable onPress={() => router.push(`/dj/${set.dj}`)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Image source={dj.photoUrl ? { uri: dj.photoUrl } : dj.photo} style={styles.sq} />
      <View style={styles.rowText}>
        <Text style={styles.name}>{dj.name}</Text>
        <Text style={styles.mono}>{dj.genre} · {set.venue}</Text>
      </View>
      <Text style={styles.when}>{right}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 36, backgroundColor: colors.ink, zIndex: 2 },
  title: { position: 'absolute', top: brand.top, left: brand.left, fontFamily: fonts.medium, fontSize: brand.smallSize, letterSpacing: -0.3, color: colors.paper },
  body: { paddingTop: brand.top + 48, paddingHorizontal: brand.left },
  hero: { height: 240, backgroundColor: colors.ink2, overflow: 'hidden' },
  heroPhoto: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  heroShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 110, backgroundColor: colors.ink, opacity: 0.72 },
  heroText: { position: 'absolute', left: 16, right: 16, bottom: 14, gap: 4 },
  heroName: { fontFamily: fonts.medium, fontSize: 34, lineHeight: 36, letterSpacing: -1, color: colors.paper },
  mono: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.mute },
  live: { color: colors.spot },
  section: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.mute, marginTop: 26, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.ink3 },
  pressed: { opacity: 0.6 },
  sq: { width: 48, height: 48, backgroundColor: colors.ink2 },
  rowText: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.medium, fontSize: 17, letterSpacing: -0.3, color: colors.paper },
  when: { fontFamily: fonts.regular, fontSize: 13, color: colors.mute, fontVariant: ['tabular-nums'] },
});
