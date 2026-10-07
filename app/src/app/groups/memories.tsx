import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from '@/components/BackButton';
import PickerSheet from '@/components/PickerSheet';
import { Quiet, Said } from '@/components/StaffPage';
import { useAuth } from '@/auth/AuthContext';
import { albumAdd, groupGet, groupNights, groupPlan, groupStats, groupWall, photoUrl, why, type GroupNight, type GroupStats, type WallPhoto } from '@/data/groups';
import { dayLabel } from '@/data/when';
import { useRefreshOnFocus } from '@/hooks/useRefresh';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

const two = (n: number) => String(n).padStart(2, '0');
// photo heights cycle, so the two columns do not line up like a grid
const HEIGHTS = [210, 150, 180, 240, 160];

type Tile = { kind: 'night'; night: GroupNight } | { kind: 'photo'; photo: WallPhoto; h: number };

// Our nights, photos first (design 11E): a two-column wall of every photo the group
// added, newest night first, with each night's name dropped in as a card before its
// photos (red when all of you were there). One line of vibe and numbers on top.
// + adds a photo to one of the nights (or the plan).
export default function Memories() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, up } = useLang();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const tick = useRefreshOnFocus();
  const [name, setName] = useState('');
  const [nights, setNights] = useState<GroupNight[] | null>(null);
  const [wall, setWall] = useState<WallPhoto[]>([]);
  const [stats, setStats] = useState<GroupStats | null>(null);
  const [plan, setPlan] = useState<{ id: string; title: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const load = useCallback(() => {
    groupNights(id).then(setNights, (e) => {
      setNights([]);
      setSaid(why(e));
    });
    groupWall(id).then(setWall, () => {});
  }, [id]);
  useEffect(() => {
    groupGet(id).then((g) => setName(g.name), () => {});
    groupStats(id).then(setStats, () => {});
    groupPlan(id).then((p) => setPlan(p.plan ? { id: p.plan.id, title: p.plan.title } : null), () => {});
    load();
  }, [id, tick, load]);

  // night cards and their photos, in the order of the nights
  const tiles: Tile[] = [];
  let k = 0;
  for (const n of nights ?? []) {
    tiles.push({ kind: 'night', night: n });
    for (const p of wall.filter((w) => w.event_id === n.id)) tiles.push({ kind: 'photo', photo: p, h: HEIGHTS[k++ % HEIGHTS.length] });
  }
  // two columns, each tile into the shorter one
  const cols: Tile[][] = [[], []];
  const heights = [0, 0];
  for (const tile of tiles) {
    const c = heights[0] <= heights[1] ? 0 : 1;
    cols[c].push(tile);
    heights[c] += tile.kind === 'photo' ? tile.h : 90;
  }

  const vibe = stats
    ? [stats.kinds.length ? stats.kinds.map((x) => x.toLowerCase()).join(' & ') : null, stats.hour !== null ? `${two(stats.hour)}:00` : null, stats.room?.toLowerCase(), t('groups.wall.count', { nights: stats.nights, photos: stats.photos })]
        .filter(Boolean)
        .join(' · ')
    : '';
  const choices = [...(plan ? [{ id: plan.id, label: `${t('groups.plan.title')} · ${plan.title.toLowerCase()}` }] : []), ...(nights ?? []).map((n) => ({ id: n.id, label: n.title.toLowerCase() }))];
  const add = (event: string) => {
    if (!session) return;
    setSaid(null);
    albumAdd(id, event, session.user.id).then((ok) => ok && load(), (e) => setSaid(why(e)));
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={[styles.body, { paddingTop: Math.max(insets.top, 20) + 16, paddingBottom: insets.bottom + 110 }]}>
        <Text style={styles.title}>{name.toLowerCase()}</Text>
        <Text style={styles.vibe}>{up(`${t('groups.vibe')} · ${vibe}`)}</Text>
        <Said text={said} bad />
        {nights && !nights.length ? <Quiet text={t('groups.memories.none')} /> : null}
        <View style={styles.wall}>
          {cols.map((col, c) => (
            <View key={c} style={styles.col}>
              {col.map((tile) =>
                tile.kind === 'night' ? (
                  <Pressable
                    key={`n-${tile.night.id}`}
                    onPress={() => router.push({ pathname: '/groups/album', params: { id, event: tile.night.id } })}
                    style={[styles.label, tile.night.all_of_us && styles.labelAll]}
                  >
                    <Text style={styles.labelMono}>{up(dayLabel(tile.night.starts_at))}</Text>
                    <Text style={styles.labelTitle} numberOfLines={2}>{tile.night.title.toLowerCase()}</Text>
                    <Text style={styles.labelMeta} numberOfLines={1}>
                      {tile.night.all_of_us ? t('groups.allOfUs') : tile.night.people.map((p) => (p.name ?? '').toLowerCase()).join(', ')}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable key={`p-${tile.photo.id}`} onPress={() => router.push({ pathname: '/groups/album', params: { id, event: tile.photo.event_id } })}>
                    <Image source={{ uri: photoUrl(tile.photo.path) ?? undefined }} style={[styles.photo, { height: tile.h }]} contentFit="cover" />
                  </Pressable>
                ),
              )}
            </View>
          ))}
        </View>
      </ScrollView>
      {choices.length ? (
        <Pressable onPress={() => setAdding(true)} style={({ pressed }) => [styles.plus, { bottom: insets.bottom + 24 }, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={t('groups.album.add')}>
          <Text style={styles.plusText}>+</Text>
        </Pressable>
      ) : null}
      <BackButton />
      <PickerSheet open={adding} title={t('groups.album.add')} options={choices} selected={null} onSelect={add} onClose={() => setAdding(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  body: { paddingHorizontal: 8 },
  title: { fontFamily: fonts.logo, fontSize: 36, lineHeight: 38, color: colors.paper, paddingHorizontal: brand.left - 8 },
  vibe: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.3, lineHeight: 15, color: colors.mute, paddingHorizontal: brand.left - 8, marginTop: 6, marginBottom: 14 },
  wall: { flexDirection: 'row', gap: 6 },
  col: { flex: 1, gap: 6 },
  photo: { width: '100%', borderRadius: radius.sm, backgroundColor: colors.ink3 },
  label: { borderRadius: radius.sm, borderWidth: 1, borderColor: colors.ink3, padding: 12, gap: 3 },
  labelAll: { backgroundColor: colors.spot, borderColor: colors.spot },
  labelMono: { fontFamily: fonts.jet, fontSize: 9, letterSpacing: 1.2, color: colors.paper, opacity: 0.8 },
  labelTitle: { fontFamily: fonts.medium, fontSize: 16, letterSpacing: -0.3, color: colors.paper },
  labelMeta: { fontFamily: fonts.regular, fontSize: 11, color: colors.paper, opacity: 0.8 },
  plus: { position: 'absolute', right: brand.left, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  plusText: { fontFamily: fonts.medium, fontSize: 30, color: colors.ink, marginTop: -2 },
  pressed: { opacity: 0.6 },
});
