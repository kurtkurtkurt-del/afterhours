import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Scrim from '@/components/Scrim';
import { Image } from 'expo-image';
import KeyboardSafe from '@/components/KeyboardSafe';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '@/components/Avatar';
import Svg, { Path } from 'react-native-svg';
import Input from '@/components/Input';
import PillAction from '@/components/PillAction';
import { friendsLive, type LiveFriend } from '@/data/checkin';
import { dmSend, dmStart, why } from '@/data/dms';
import { friendsList, type FriendRow } from '@/data/friends';
import { friendPhotos } from '@/data/photo';
import { nightUrl } from '@/lib/share';
import { dayLabel } from '@/data/when';
import { useLang } from '@/i18n';
import { colors, fonts, radius, paperTint } from '@/theme/tokens';
import { brand } from '@/theme/layout';

type NightLike = { slug: string; title: string; starts_at: string | null; venue_name?: string | null; city_name?: string | null };

// Nudge a friend about a night (12.10.2026; redrawn 22.10.2026 — the owner wanted it to be
// the thing people reach for): the night as a line on top, then your friends as faces —
// their photo or their drawn face, a red ring on whoever is out right now — and one tap
// on a face sends them a direct message with the act, the day and the link (and the push a
// message brings). The face gets a tick and the sheet stays open, so a second and a third
// friend are one tap each. Under the faces, the exact words they get. A search field only
// once there are more faces than fit two rows. Nothing new in the database: it is a DM.
//
// The page that opens the sheet may hand over the faces it already has (`seed`), so the
// sheet is full-size from its first frame. Before that (26.10.2026) the faces arrived
// after the sheet had started sliding in; the slide aimed at the short, empty sheet, the
// sheet then grew, and its lower part stayed off-screen on the first open. The slide is
// also driven by hand now (from the Modal's onShow), not by a layout animation that
// measures once.
type Seed = { friends?: FriendRow[]; live?: LiveFriend[]; photos?: Map<string, string> };
export default function NudgeSheet({ open, night, onClose, onSent, seed }: { open: boolean; night: NightLike; onClose: () => void; onSent: (name: string) => void; seed?: Seed }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { t, up } = useLang();
  // read here when the sheet opens; until then, what the page handed over
  const [got, setFriends] = useState<FriendRow[] | null>(null);
  const [gotLive, setLive] = useState<LiveFriend[] | null>(null);
  const [gotPhotos, setPhotos] = useState<Map<string, string> | null>(null);
  const friends = got ?? seed?.friends ?? [];
  const live = gotLive ?? seed?.live ?? [];
  const photos = gotPhotos ?? seed?.photos ?? new Map<string, string>();
  // the slide: off the bottom while closed, up to its place once the Modal is on screen
  const slide = useSharedValue(height);
  const slideStyle = useAnimatedStyle(() => ({ transform: [{ translateY: slide.get() }] }));
  useEffect(() => {
    if (!open) slide.set(height);
  }, [open, slide, height]);
  const onShow = () => slide.set(withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) }));
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [said, setSaid] = useState<string | null>(null);
  // the friends are read when the sheet opens; what was typed before is cleared then
  useEffect(() => {
    if (!open) return;
    let alive = true;
    friendsList().then((l) => alive && setFriends(l.filter((f) => f.status === 'accepted')), () => {});
    friendsLive().then((l) => alive && setLive(l), () => {});
    friendPhotos().then((m) => alive && setPhotos(m), () => {});
    return () => {
      alive = false;
    };
  }, [open]);
  const close = () => {
    setQuery('');
    setSaid(null);
    setSent(new Set());
    onClose();
  };
  const q = query.trim().toLowerCase().replace(/^@/, '');
  const liveOf = (id: string) => live.find((l) => l.friend_id === id);
  // whoever is out right now first, then by name
  const shown = friends
    .filter((f) => !q || (f.handle ?? '').includes(q) || (f.display_name ?? '').toLowerCase().includes(q))
    .sort((a, b) => Number(!!liveOf(b.other_id)) - Number(!!liveOf(a.other_id)) || (a.display_name ?? a.handle ?? '').localeCompare(b.display_name ?? b.handle ?? ''));

  const d = night.starts_at ? new Date(night.starts_at) : null;
  const time = d && !isNaN(d.getTime()) ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : null;
  const when = [dayLabel(night.starts_at), time, (night.venue_name ?? night.city_name ?? '').toLowerCase() || null].filter(Boolean).join(' · ');
  const act = night.title.split(/\s+[-–:|]\s+/)[0].trim().toLowerCase() || night.title.toLowerCase();
  const words = t('night.nudge.text', { act, when });

  const pick = (f: FriendRow) => {
    if (!f.handle || busy || sent.has(f.other_id)) return;
    setBusy(f.other_id);
    setSaid(null);
    const name = (f.display_name ?? f.handle).toLowerCase();
    dmStart(f.handle)
      .then((thread) => dmSend(thread, `${words}\n${nightUrl(night.slug)}`))
      .then(() => {
        setSent((s) => new Set(s).add(f.other_id));
        onSent(name);
      })
      .catch((e) => setSaid(why(e)))
      .finally(() => setBusy(null));
  };

  return (
    <Modal visible={open} animationType="fade" transparent onRequestClose={close} onShow={onShow}>
      <KeyboardSafe style={styles.lift}>
        <Scrim onPress={close} />
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }, slideStyle]}>
          <View style={styles.grip} />
          <View style={styles.head}>
            <View style={styles.dot} />
            <Text style={styles.title}>{t('night.nudge')}</Text>
          </View>
          <View style={styles.night}>
            <Text style={styles.nightTitle} numberOfLines={1}>{night.title.toLowerCase()}</Text>
            <Text style={styles.nightWhen} numberOfLines={1}>{up(when)}</Text>
          </View>

          {friends.length > 8 ? <Input value={query} onChangeText={setQuery} placeholder={t('messages.new.who')} autoCapitalize="none" autoCorrect={false} /> : null}

          <ScrollView style={styles.list} contentContainerStyle={styles.faces} keyboardShouldPersistTaps="handled">
            {shown.map((f) => {
              const name = (f.display_name ?? f.handle ?? '').toLowerCase();
              const out = liveOf(f.other_id);
              const done = sent.has(f.other_id);
              const photo = photos.get(f.other_id);
              return (
                <Pressable key={f.other_id} onPress={() => pick(f)} accessibilityRole="button" accessibilityLabel={`${t('night.nudge.verb')} ${name}`} accessibilityState={{ disabled: done, busy: busy === f.other_id }} style={({ pressed }) => [styles.face, pressed && styles.pressed]}>
                  <View style={[styles.ringWrap, out && styles.ringLive, done && styles.ringDone]}>
                    <View style={styles.photo}>
                      {photo ? <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Avatar name={f.handle ?? name} size={FACE} />}
                    </View>
                    {done ? (
                      <View style={styles.tick}>
                        <Svg width={14} height={14} viewBox="0 0 14 14"><Path d="M2.5 7.5l3 3 6-6" stroke={colors.onSpot} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
                      </View>
                    ) : busy === f.other_id ? (
                      <View style={[styles.tick, styles.tickBusy]}>
                        <Text style={styles.tickText}>…</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.name, done && styles.nameDone]} numberOfLines={1}>{done ? t('night.nudge.sent') : name}</Text>
                  {out && !done ? <Text style={styles.live} numberOfLines={1}>{t('night.nudge.out')}</Text> : null}
                </Pressable>
              );
            })}
            {!shown.length ? <Text style={styles.note}>{friends.length ? t('messages.new.none') : t('messages.new.noFriends')}</Text> : null}
          </ScrollView>

          {/* the words they get */}
          <View style={styles.preview}>
            <Text style={styles.previewK}>{up(t('night.nudge.preview'))}</Text>
            <Text style={styles.previewText} numberOfLines={2}>{words}</Text>
          </View>
          {said ? <Text style={[styles.note, styles.bad]}>{said}</Text> : null}
          <View style={styles.foot}>
            <PillAction icon="close" label={sent.size ? t('word.done') : t('word.close')} onPress={close} />
          </View>
        </Animated.View>
      </KeyboardSafe>
    </Modal>
  );
}

const FACE = 60;

const styles = StyleSheet.create({
  lift: { flex: 1 },
  sheet: { backgroundColor: colors.ink, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderTopWidth: 1, borderColor: colors.ink3, paddingHorizontal: brand.left, paddingTop: 10, flexShrink: 1, gap: 12 },
  grip: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.ink3, marginBottom: 6 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.spot },
  title: { fontFamily: fonts.medium, fontSize: 22, letterSpacing: -0.6, color: colors.paper },
  night: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: paperTint(0.05), gap: 3 },
  nightTitle: { fontFamily: fonts.semibold, fontSize: 15, letterSpacing: -0.2, color: colors.paper },
  nightWhen: { fontFamily: fonts.jet, fontSize: 9.5, letterSpacing: 1.2, color: colors.mute },
  list: { flexShrink: 1, maxHeight: 2 * (FACE + 44) + 8 },
  faces: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 4 },
  face: { width: 72, alignItems: 'center', gap: 6 },
  pressed: { opacity: 0.6 },
  ringWrap: { width: FACE + 8, height: FACE + 8, borderRadius: (FACE + 8) / 2, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  ringLive: { borderColor: colors.spot },
  ringDone: { borderColor: colors.paper },
  photo: { width: FACE, height: FACE, borderRadius: FACE / 2, overflow: 'hidden', backgroundColor: colors.ink3 },
  tick: { position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.spot, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  tickBusy: { backgroundColor: colors.ink3 },
  tickText: { fontFamily: fonts.medium, fontSize: 12, color: colors.paper, lineHeight: 14 },
  name: { fontFamily: fonts.medium, fontSize: 12, letterSpacing: -0.1, color: colors.paper, maxWidth: 72, textAlign: 'center' },
  nameDone: { color: colors.mute },
  live: { fontFamily: fonts.jet, fontSize: 8.5, letterSpacing: 1, color: colors.spotText },
  preview: { gap: 4, borderTopWidth: 1, borderTopColor: colors.ink3, paddingTop: 10 },
  previewK: { fontFamily: fonts.jet, fontSize: 9, letterSpacing: 1.2, color: colors.meta },
  previewText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.mute },
  note: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.mute, marginTop: 10 },
  bad: { color: colors.spotText },
  foot: { flexDirection: 'row', justifyContent: 'flex-end' },
});
