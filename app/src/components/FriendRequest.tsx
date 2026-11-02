import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '@/components/Avatar';
import BackButton from '@/components/BackButton';
import SoundCorner from '@/components/SoundCorner';
import { confirmBlock } from '@/components/People';
import { usePullRefresh } from '@/components/Refresh';
import { friendAccept, friendRemove, person, personKept, type Found, type PersonCard } from '@/data/friends';
import { personPhoto } from '@/data/photo';
import type { Night } from '@/data/deck';
import { dayLabel } from '@/data/when';
import type { YoursFriend } from '@/data/yours';
import { useShelf } from '@/lib/offline';
import { upperData, useLang } from '@/i18n';
import { colors, fonts, radius, scrim } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// An incoming friend request, design 3 of design/friend-request-5.html (owner, 03.11.2026):
// a round portrait in a spot ring with "wants to add you", the name, how many people you
// both know, their bio, up to three nights they kept (when they show them), and two round
// answers like picking up a call. Opened from the friend page and from the requests list.
export default function FriendRequest({ rf }: { rf: YoursFriend }) {
  const insets = useSafeAreaInsets();
  const { t, up } = useLang();
  const refresh = usePullRefresh();
  const fresh = useShelf('personCards', 'personKept', 'photos');
  const [card, setCard] = useState<PersonCard | null>(null);
  const [found, setFound] = useState<Found | null>(null);
  const [nights, setNights] = useState<Night[]>([]);
  const [photo, setPhoto] = useState<string | null>(rf.photo ?? null);
  const [said, setSaid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!rf.handle) return;
    let live = true;
    person(rf.handle).then((p) => live && p && (setCard(p.card), setFound(p.found))).catch(() => {});
    personKept(rf.handle).then((l) => live && setNights(l.slice(0, 3))).catch(() => {});
    if (!rf.photo) personPhoto(rf.handle).then((u) => live && u && setPhoto(u));
    return () => {
      live = false;
    };
  }, [rf.handle, rf.photo, fresh]);

  const name = (card?.display_name ?? rf.name ?? rf.handle ?? '').toLowerCase();
  const meta = [rf.handle ? `@${upperData(rf.handle)}` : null, card?.city_name ? upperData(card.city_name) : null, card?.kept_count ? up(t('friend.req.kept', { n: card.kept_count })) : null]
    .filter(Boolean)
    .join(' · ');
  const mutual = found?.mutual ?? 0;
  const mutualLine = mutual > 1 ? t('friend.req.mutual', { n: mutual }) : mutual === 1 ? t('friend.req.mutual.one') : t('friend.req.mutual.none');

  const answer = (yes: boolean) => {
    if (busy) return;
    setBusy(true);
    (yes ? friendAccept(rf.id) : friendRemove(rf.id))
      .then(() => router.back())
      .catch((e) => {
        setBusy(false);
        setSaid(String(e?.message ?? e).toLowerCase());
      });
  };

  return (
    <View style={styles.root}>
      <View style={[styles.band, { height: brand.top + 36 }]}>
        <BackButton />
        <Pressable onPress={() => confirmBlock({ id: rf.id, name: rf.name }, t, () => router.back())} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('block.do')} style={({ pressed }) => [styles.more, { top: Math.max(brand.top, insets.top + 24) - 2 }, pressed && styles.pressed]}>
          <Text style={styles.moreText}>···</Text>
        </Pressable>
        <SoundCorner />
      </View>
      <ScrollView refreshControl={refresh} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}>
        {/* the portrait in its ring, with the tag across its foot */}
        <View style={styles.ring}>
          <View style={styles.portrait}>
            {photo ? <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" onError={() => setPhoto(null)} /> : <Avatar name={rf.handle || rf.name} size={186} />}
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{up(t('friend.req.tag'))}</Text>
          </View>
        </View>

        <Text style={styles.name} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>{name}</Text>
        {meta ? <Text style={styles.meta} numberOfLines={1}>{meta}</Text> : null}
        {card?.bio ? <Text style={styles.bio}>{card.bio}</Text> : null}

        <View style={styles.mutualRow}>
          {mutual > 0 ? (
            <View style={styles.faces}>
              {Array.from({ length: Math.min(mutual, 4) }, (_, i) => (
                <View key={i} style={[styles.faceDot, i > 0 && { marginLeft: -8 }]} />
              ))}
            </View>
          ) : null}
          <Text style={styles.mutualText}>{mutualLine}</Text>
        </View>

        {nights.length ? (
          <View style={styles.tiles}>
            {nights.map((n) => (
              <Pressable key={n.id} onPress={() => router.push(`/night/${n.slug}`)} style={({ pressed }) => [styles.tileWrap, pressed && styles.pressed]}>
                <View style={styles.tile}>
                  {n.image_url ? <Image source={{ uri: n.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
                  <LinearGradient colors={[scrim(0), scrim(0.85)]} locations={[0.3, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
                  <Text style={styles.tileTitle} numberOfLines={3}>{n.title.toLowerCase()}</Text>
                </View>
                <Text style={styles.tileWhen} numberOfLines={1}>{dayLabel(n.starts_at)}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {said ? <Text style={styles.said}>{said}</Text> : null}

        {/* two round answers, like a call */}
        <View style={styles.call}>
          <View style={styles.callItem}>
            <Pressable onPress={() => answer(false)} disabled={busy} accessibilityRole="button" accessibilityLabel={t('friend.decline')} style={({ pressed }) => [styles.round, styles.no, pressed && styles.pressed]}>
              <Svg width={26} height={26} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6L6 18" stroke={colors.paper} strokeWidth={2} strokeLinecap="round" fill="none" /></Svg>
            </Pressable>
            <Text style={styles.callWord}>{t('friend.decline')}</Text>
          </View>
          <View style={styles.callItem}>
            <Pressable onPress={() => answer(true)} disabled={busy} accessibilityRole="button" accessibilityLabel={t('friend.accept')} style={({ pressed }) => [styles.round, styles.yes, pressed && styles.pressed]}>
              <Svg width={26} height={26} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7" stroke={colors.onPhoto} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
            </Pressable>
            <Text style={styles.callWord}>{t('friend.accept')}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  band: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: colors.ink, zIndex: 2 },
  more: { position: 'absolute', right: brand.left + 48, paddingHorizontal: 6, zIndex: 2 },
  moreText: { fontFamily: fonts.medium, fontSize: 18, letterSpacing: 1, color: colors.paper },
  body: { paddingTop: brand.top + 56, paddingHorizontal: brand.left, alignItems: 'center' },
  ring: { width: 206, height: 206, borderRadius: 103, padding: 5, borderWidth: 2.5, borderColor: colors.spot, marginTop: 8 },
  portrait: { flex: 1, borderRadius: 100, overflow: 'hidden', backgroundColor: colors.ink3, alignItems: 'center', justifyContent: 'center' },
  tag: { position: 'absolute', bottom: -12, alignSelf: 'center', backgroundColor: colors.spot, borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 11 },
  tagText: { fontFamily: fonts.medium, fontSize: 10, letterSpacing: 1.4, color: colors.onPhoto },
  name: { fontFamily: fonts.semibold, fontSize: 40, lineHeight: 44, letterSpacing: -1.6, color: colors.paper, marginTop: 30, textAlign: 'center' },
  meta: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.meta, marginTop: 7, textAlign: 'center' },
  bio: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.mute, marginTop: 12, textAlign: 'center', maxWidth: 300 },
  mutualRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16 },
  faces: { flexDirection: 'row' },
  faceDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: colors.ink, backgroundColor: colors.ink3 },
  mutualText: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.mute },
  tiles: { flexDirection: 'row', gap: 10, marginTop: 22, alignSelf: 'stretch' },
  tileWrap: { flex: 1 },
  tile: { height: 104, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.ink2, justifyContent: 'flex-end', padding: 9 },
  tileTitle: { fontFamily: fonts.logo, fontSize: 16, lineHeight: 16, color: colors.onPhotoSpot },
  tileWhen: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute, marginTop: 6 },
  said: { fontFamily: fonts.regular, fontSize: 14, color: colors.spotText, marginTop: 18, textAlign: 'center' },
  call: { flexDirection: 'row', justifyContent: 'center', gap: 64, marginTop: 28 },
  callItem: { alignItems: 'center' },
  round: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center' },
  no: { borderWidth: 1.5, borderColor: colors.paper },
  yes: { backgroundColor: colors.spot },
  callWord: { fontFamily: fonts.medium, fontSize: 13, color: colors.paper, marginTop: 8 },
  pressed: { opacity: 0.7 },
});
