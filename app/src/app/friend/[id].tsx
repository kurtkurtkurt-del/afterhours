import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Avatar from '@/components/Avatar';
import { useProfileExtra } from '@/data/profile';
import { LINKS } from '@/content/links';
import { dayLabel } from '@/data/when';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import Input from '@/components/Input';
import PullDownScroll from '@/components/PullDownScroll';
import SoundCorner from '@/components/SoundCorner';
import { friends, nights } from '@/content/friends';
import { friendAccept, friendRemove, friendRequest } from '@/data/friends';
import { useYours } from '@/data/yours';
import { upperData, useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// Friend page, in the account page's language: their photo (or drawn face) full-bleed
// with the name large, then on paper their kept nights as photo cards, their text and
// links, nights together, accept / remove. id "add" shows the add form.
const fallback = require('../../../assets/intro/concert.jpg');
export default function FriendScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { t, tx, up } = useLang();
  const [handle, setHandle] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  // sent: a server code or error text, resolved at render time
  const said = sent ? tx('friend.result.' + sent, sent) : null;
  const real = useYours();
  const rf = real.friends.find((x) => x.id === id);
  const f = rf ? { id: rf.id, name: rf.name, handle: rf.handle ?? '', live: rf.live, kept: rf.kept, seen: '' } : friends.find((x) => x.id === id);
  const face = rf?.photo;
  const { width, height } = useWindowDimensions();
  // sample friends have no account: nothing to ask for (null would mean you)
  const extra = useProfileExtra(rf?.handle ?? null, 0, !rf?.handle);

  if (id === 'add') {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        {/* Pulling down from the top closes it, like the other cards. */}
        <PullDownScroll
          header={
            <View style={styles.band}>
              <BackButton />
              <SoundCorner />
            </View>
          }
          contentContainerStyle={[styles.body, styles.addBody, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.big}>{t('friend.add')}</Text>
          <Text style={styles.note}>{t('friend.add.note')}</Text>
          <Input value={handle} onChangeText={(v) => setHandle(v.toLowerCase())} placeholder={t('friend.placeholder')} autoCapitalize="none" />
          <View style={{ marginTop: 16 }}>
            <Button
              label={said ?? t('friend.send')}
              onPress={() =>
                handle &&
                friendRequest(handle.replace(/^@/, ''))
                  .then((r) => setSent(r))
                  .catch((e) => setSent(String(e.message).toLowerCase()))
              }
            />
          </View>
          <Text style={[styles.note, { marginTop: 24 }]}>{t('friend.qr')}</Text>
        </PullDownScroll>
      </View>
    );
  }

  if (!f) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <View style={styles.band}>
          <BackButton />
          <SoundCorner />
        </View>
        <View style={styles.body}>
          <Text style={styles.big}>{t('friend.none')}</Text>
        </View>
      </View>
    );
  }

  // Their nights: what they kept, with photos (the friends' deck holds their swipes).
  type Kept = { id: string; slug: string; title: string; venue: string; when: string; image: string | null; photo?: number };
  const theirs: Kept[] = rf
    ? real.swipes
        .filter((k) => k.friend.toLowerCase() === rf.name)
        .map((k) => ({ id: k.id, slug: k.slug, title: k.title.toLowerCase(), venue: k.venue_name ?? k.city_slug, when: dayLabel(k.starts_at), image: k.image_url }))
    : nights.filter((n) => n.friends.includes(f.id)).map((n) => ({ id: n.id, slug: '', title: n.title, venue: n.venue, when: n.when, image: null, photo: n.photo }));
  const together = rf ? real.nights.filter((n) => n.friends.includes(rf.name) && real.mine.some((m) => m.id === n.id)).length : Math.max(0, f.kept - 1);
  const status = f.live ? up(t('friend.at', { venue: upperData(f.live) })) : f.seen ? up(t('friend.seen', { when: upperData(f.seen) })) : null;
  const meta = [f.handle ? `@${upperData(f.handle)}` : null, status].filter(Boolean).join(' · ');
  const links = LINKS.filter((l) => extra?.links[l.kind]);
  const cardW = Math.round(width * 0.36);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} style={{ flex: 1 }}>
        {/* Poster: their photo (or their drawn face) full-bleed, the name set large. */}
        <View style={[styles.poster, { height: Math.round(height * 0.62) }]}>
          {face ? <Image source={{ uri: face }} style={StyleSheet.absoluteFill} contentFit="cover" /> : (
            <View style={StyleSheet.absoluteFill}>
              <Avatar name={f.handle || f.name} size={Math.max(width, height * 0.62)} />
            </View>
          )}
          <LinearGradient colors={['rgba(14,13,12,0.55)', 'rgba(14,13,12,0)']} style={styles.shadeTop} pointerEvents="none" />
          <LinearGradient colors={['rgba(14,13,12,0)', 'rgba(14,13,12,0.92)']} style={styles.shadeBottom} pointerEvents="none" />
          <View style={styles.who} pointerEvents="none">
            {f.live ? (
              <View style={styles.liveRow}>
                <View style={styles.liveDot} />
                <Text style={styles.liveWord}>{up(t('yours.live'))}</Text>
              </View>
            ) : null}
            <Text style={styles.name} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>{f.name}</Text>
            {meta ? <Text style={styles.meta} numberOfLines={2}>{meta}</Text> : null}
          </View>
          <View style={styles.band}>
            <BackButton />
            <SoundCorner />
          </View>
        </View>

        {/* Paper: their nights as cards, then the rest of them. */}
        <View style={styles.paper}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.title}>{t('friend.kept', { n: theirs.length })}</Text>
              <View style={styles.dot} />
            </View>
          </View>
          {theirs.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
              {theirs.map((n) => (
                <Pressable key={n.id} onPress={() => n.slug && router.push(`/night/${n.slug}`)} style={({ pressed }) => [styles.card, { width: cardW, height: cardW * 1.45 }, pressed && styles.pressed]}>
                  <Image source={n.photo ?? (n.image ? { uri: n.image } : fallback)} style={StyleSheet.absoluteFill} contentFit="cover" />
                  <LinearGradient colors={['rgba(14,13,12,0)', 'rgba(14,13,12,0.9)']} locations={[0.35, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle} numberOfLines={3}>{n.title}</Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>{up(n.when)}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <Text style={[styles.prompt, styles.pad]}>{t('friend.nothing')}</Text>
          )}

          {extra?.about || links.length ? (
            <View style={styles.section}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.title}>{t('account.about')}</Text>
                  <View style={styles.dot} />
                </View>
              </View>
              <View style={styles.sectionBody}>
                {extra?.about ? <Text style={styles.about}>{extra.about}</Text> : null}
                {links.map((l) => {
                  const v = extra!.links[l.kind]!;
                  return (
                    <Pressable key={l.kind} onPress={() => Linking.openURL(l.url(v)).catch(() => {})} style={({ pressed }) => [styles.line, pressed && styles.pressed]}>
                      <Text style={styles.lineKey}>{l.label}</Text>
                      <Text style={styles.lineValue} numberOfLines={1}>{l.kind === 'website' ? v.replace(/^https?:\/\//, '') : `${l.prefix}${v}`} ↗</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.title}>{t('friend.together')}</Text>
                <View style={styles.dot} />
              </View>
            </View>
            <View style={styles.sectionBody}>
              <View style={styles.line}>
                <Text style={styles.lineKey}>{t('friend.nights')}</Text>
                <Text style={styles.lineValue}>{together}</Text>
              </View>
              <View style={styles.line}>
                <Text style={styles.lineKey}>{t('yours.keptN', { n: f.kept })}</Text>
                <Text style={styles.lineValue}> </Text>
              </View>
              {said ? <Text style={styles.prompt}>{said}</Text> : null}
              <View style={styles.actions}>
                {rf?.pending === 'incoming' ? (
                  <Pressable onPress={() => friendAccept(rf.id).then(() => router.back()).catch((e) => setSent(String(e.message).toLowerCase()))} style={({ pressed }) => [styles.accept, pressed && styles.pressed]}>
                    <Text style={styles.acceptText}>{t('friend.accept')}</Text>
                  </Pressable>
                ) : null}
                {rf ? (
                  <Pressable hitSlop={8} onPress={() => friendRemove(rf.id).then(() => router.back()).catch((e) => setSent(String(e.message).toLowerCase()))}>
                    <Text style={styles.remove}>{rf.pending === 'outgoing' ? t('friend.cancel') : t('friend.remove')}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 36, backgroundColor: colors.ink, zIndex: 2 },
  body: { paddingTop: brand.top + 48, paddingHorizontal: brand.left },
  addBody: { flexGrow: 1 },
  initial: { width: 64, height: 64, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.paper, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  initialFace: { width: 96, height: 96, borderRadius: radius.lg },
  face: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  initialLive: { borderColor: colors.spot },
  initialText: { fontFamily: fonts.medium, fontSize: 30, color: colors.paper },
  liveText: { color: colors.spot },
  big: { fontFamily: fonts.medium, fontSize: 30, lineHeight: 32, letterSpacing: -0.9, color: colors.paper },
  mono: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.mute, marginTop: 6 },
  note: { fontFamily: fonts.regular, fontSize: 14, color: colors.mute, marginTop: 8, marginBottom: 16 },
  remove: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink2, textDecorationLine: 'underline' },
  pressed: { opacity: 0.7 },
  // the profile, in the account page's language: poster on top, paper below
  poster: { backgroundColor: colors.ink, overflow: 'hidden' },
  shadeTop: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 60 },
  shadeBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 210 },
  who: { position: 'absolute', left: brand.left, right: brand.left, bottom: 22 + radius.lg },
  name: { fontFamily: fonts.semibold, fontSize: 54, lineHeight: 56, letterSpacing: -2, color: colors.paper },
  meta: { fontFamily: fonts.regular, fontSize: 12, letterSpacing: 1.4, color: colors.paper, marginTop: 8 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.spot },
  liveWord: { fontFamily: fonts.jet, fontSize: 10.5, letterSpacing: 1.4, color: colors.spotText },
  paper: { backgroundColor: colors.paper, paddingTop: 22, paddingBottom: 24, marginTop: -radius.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, minHeight: 320 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: brand.left },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: fonts.medium, fontSize: 15, letterSpacing: -0.2, color: colors.ink },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.spot },
  strip: { paddingHorizontal: brand.left, gap: 10, paddingTop: 12 },
  card: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.ink2 },
  cardText: { position: 'absolute', left: 10, right: 10, bottom: 10, gap: 3 },
  cardTitle: { fontFamily: fonts.logo, fontSize: 18, lineHeight: 18, color: colors.spotText },
  cardMeta: { fontFamily: fonts.jet, fontSize: 9, letterSpacing: 1, color: colors.paper },
  pad: { paddingHorizontal: brand.left, marginTop: 10 },
  prompt: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.ink2 },
  section: { marginTop: 22, paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.rule },
  sectionBody: { paddingHorizontal: brand.left, marginTop: 12, gap: 2 },
  about: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, color: colors.ink2, marginBottom: 6 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.rule },
  lineKey: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink2 },
  lineValue: { flexShrink: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 18 },
  accept: { backgroundColor: colors.spot, paddingVertical: 11, paddingHorizontal: 20, borderRadius: radius.pill },
  acceptText: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
});
