import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PickerSheet from '@/components/PickerSheet';
import SoundCorner from '@/components/SoundCorner';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import { swipe } from '@/data/deck';
import { friendById as sampleFriendById, friends as sampleFriends, matches as sampleMatches, nights as sampleNights } from '@/content/friends';
import { useYours, type YoursFriend, type YoursMatch, type YoursNight } from '@/data/yours';
import { useAuth } from '@/auth/AuthContext';
import { dayLabel } from '@/data/when';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

const fallbackPhoto = require('../../../assets/intro/concert.jpg');

// yours: üstte iki satır kayan arkadaşlar, altında bu gecenin kartları ve eşleşmeler.
export default function YoursScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const real = useYours();
  // arkadaş yoksa örnek veri, üstünde "sample" notu; olunca gerçek
  const sample = real.ready && real.friends.length === 0;
  const friends: YoursFriend[] = sample
    ? sampleFriends.map((f) => ({ id: f.id, name: f.name, handle: f.handle, live: f.live, kept: f.kept }))
    : real.friends;
  const nights: YoursNight[] = sample
    ? sampleNights.map((n) => ({ id: n.id, slug: '', title: n.title, venue: n.venue, when: n.when, image: null, friends: n.friends.map((id) => sampleFriendById(id).name), photo: n.photo } as YoursNight & { photo: number }))
    : real.nights;
  const matches: YoursMatch[] = sample ? sampleMatches.map((m) => ({ friend: sampleFriendById(m.friend).name, night: m.night })) : real.matches;
  const nightById = (id: string) => nights.find((n) => n.id === id);
  const [meToo, setMeToo] = useState<Record<string, boolean>>({});
  const [asking, setAsking] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // alt köşeler: solda benim sağa kaydırdıklarım, sağda arkadaşlarımınkiler
  const [deck, setDeck] = useState<'mine' | 'friends' | null>(null);
  const openNight = (slug: string) => {
    setDeck(null);
    if (slug) router.push(`/night/${slug}`);
  };

  // iki satır: arkadaşlar sütun sütun dizilir, sütunlar sağa akar
  const cols: (typeof friends)[] = [];
  for (let i = 0; i < friends.length; i += 2) cols.push(friends.slice(i, i + 2));

  // kartlar ve eşleşmeler karışık: her ikinci karttan sonra bir eşleşme
  const feed: ({ kind: 'night'; n: YoursNight } | { kind: 'match'; friend: string; night: string })[] = [];
  let m = 0;
  nights.forEach((n, i) => {
    feed.push({ kind: 'night', n });
    if (i % 2 === 0 && m < matches.length) {
      feed.push({ kind: 'match', ...matches[m] });
      m += 1;
    }
  });

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.band}>
        <Text style={styles.title}>yours</Text>
        <SoundCorner />
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: TAB_BAR_SPACE + insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        {/* arkadaşlar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.people}>
          {cols.map((col, i) => (
            <View key={i} style={styles.col}>
              {col.map((f) => (
                <Pressable key={f.id} onPress={() => router.push(`/friend/${f.id}`)} style={({ pressed }) => [styles.person, pressed && styles.pressed]}>
                  <View style={[styles.initial, f.live && styles.initialLive, f.pending && styles.initialPending]}>
                    <Text style={[styles.initialText, f.live && styles.liveText]}>{f.name.charAt(0)}</Text>
                  </View>
                  <Text style={[styles.personLabel, f.live && styles.liveText]} numberOfLines={1}>
                    {f.pending ? (f.pending === 'incoming' ? 'wants in' : 'asked') : f.live ? f.live : f.kept ? `kept ${f.kept}` : f.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))}
          <View style={styles.col}>
            <Pressable onPress={() => router.push('/friend/add')} style={({ pressed }) => [styles.person, pressed && styles.pressed]}>
              <View style={[styles.initial, styles.initialAdd]}>
                <Text style={styles.initialText}>+</Text>
              </View>
              <Text style={styles.personLabel}>add</Text>
            </Pressable>
          </View>
        </ScrollView>

        <Text style={styles.section}>
          {sample ? 'sample · add friends to see yours' : `${nights.length} nights your friends kept`}
        </Text>

        {feed.map((item, i) =>
          item.kind === 'night' ? (
            <View key={item.n.id} style={styles.card}>
              <Image source={(item.n as YoursNight & { photo?: number }).photo ?? (item.n.image ? { uri: item.n.image } : fallbackPhoto)} style={styles.cardPhoto} />
              <View style={styles.cardShade} />
              <View style={styles.cardText}>
                <Text style={styles.mono}>{item.n.when} · {item.n.venue}</Text>
                <Text style={styles.cardTitle}>{item.n.title}</Text>
                <View style={styles.avatars}>
                  {item.n.friends.map((name) => (
                    <View key={name} style={styles.av}>
                      <Text style={styles.avText}>{name.charAt(0)}</Text>
                    </View>
                  ))}
                  <Text style={styles.avNote}>
                    {item.n.friends.length} {item.n.friends.length === 1 ? 'friend' : 'friends'} kept it
                  </Text>
                </View>
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => {
                      setMeToo((s) => ({ ...s, [item.n.id]: !s[item.n.id] }));
                      if (!sample && session && item.n.slug && !meToo[item.n.id]) swipe(item.n.slug, 'right').catch(() => {});
                    }}
                    style={[styles.btn, meToo[item.n.id] && styles.btnOn]}
                  >
                    <Text style={[styles.btnText, meToo[item.n.id] && styles.btnTextOn]}>{meToo[item.n.id] ? 'kept' : 'me too'}</Text>
                  </Pressable>
                  <Pressable onPress={() => setAsking(item.n.id)} style={[styles.btn, styles.btnLine]}>
                    <Text style={[styles.btnText, styles.btnTextLine]}>{answers[item.n.id] ? `you: ${answers[item.n.id]}` : "who's coming?"}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : (
            <View key={`m${i}`} style={styles.match}>
              <Text style={[styles.mono, styles.matchLabel]}>match</Text>
              <Text style={styles.matchText}>
                you and <Text style={styles.strong}>{item.friend}.</Text> both kept{' '}
                <Text style={styles.strong}>{nightById(item.night)?.title}</Text>
              </Text>
              <Pressable onPress={() => setAnswers((a) => ({ ...a, [item.night]: 'in' }))} style={[styles.btn, styles.btnSpot]}>
                <Text style={styles.btnText}>{answers[item.night] === 'in' ? "you're in" : "say you're in"}</Text>
              </Pressable>
            </View>
          ),
        )}
      </ScrollView>

      <Pressable onPress={() => setDeck('mine')} style={({ pressed }) => [styles.fab, styles.fabLeft, { bottom: TAB_BAR_SPACE + insets.bottom - 6 }, pressed && styles.pressed]}>
        <Text style={styles.fabTextLine}>your deck{real.mine.length ? ` · ${real.mine.length}` : ''}</Text>
      </Pressable>
      <Pressable onPress={() => setDeck('friends')} style={({ pressed }) => [styles.fab, { bottom: TAB_BAR_SPACE + insets.bottom - 6 }, pressed && styles.pressed]}>
        <Text style={styles.fabText}>friends&apos; deck{real.swipes.length ? ` · ${real.swipes.length}` : ''}</Text>
      </Pressable>

      {/* your deck: sağa kaydırdığım geceler, en yeni önce; satıra dokununca gece sayfası */}
      <PickerSheet
        open={deck === 'mine'}
        title="your deck"
        options={real.mine.map((n) => ({ id: n.id, label: n.title.toLowerCase(), extra: `${dayLabel(n.starts_at)} · ${(n.venue_name ?? n.city_name).toLowerCase()}` }))}
        selected={null}
        onSelect={(id) => openNight(real.mine.find((n) => n.id === id)?.slug ?? '')}
        onClose={() => setDeck(null)}
        note={real.mine.length ? 'everything you swiped right' : session ? 'nothing here yet · swipe right in the deck' : 'sign in and the cards you keep land here'}
      />
      {/* friends' deck: arkadaşlarımın sağa kaydırdıkları, tek tek, kim kaydırdıysa adıyla */}
      <PickerSheet
        open={deck === 'friends'}
        title="friends' deck"
        options={real.swipes.map((k, i) => ({ id: `${k.id}-${k.friend}-${i}`, label: k.title.toLowerCase(), extra: `${k.friend.toLowerCase()} · ${dayLabel(k.starts_at)}` }))}
        selected={null}
        onSelect={(id) => openNight(real.swipes[Number(id.split('-').pop())]?.slug ?? '')}
        onClose={() => setDeck(null)}
        note={real.swipes.length ? 'what your friends swiped right' : real.friends.length ? 'your friends have not kept anything yet' : 'add friends to see what they keep'}
      />

      <PickerSheet
        open={asking !== null}
        title="who's coming?"
        options={[
          { id: 'in', label: "i'm in", extra: asking ? `${nightById(asking)?.friends.length ?? 0} kept it` : undefined },
          { id: 'maybe', label: 'maybe' },
          { id: 'out', label: 'not tonight' },
        ]}
        selected={asking ? (answers[asking] ?? null) : null}
        onSelect={(id) => asking && setAnswers((a) => ({ ...a, [asking]: id }))}
        onClose={() => setAsking(null)}
        note="your friends see only what you answer"
      />
    </View>
  );
}

const AV = 22;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 36, backgroundColor: colors.ink, zIndex: 2 },
  title: { position: 'absolute', top: brand.top, left: brand.left, fontFamily: fonts.medium, fontSize: brand.smallSize, letterSpacing: -0.3, color: colors.paper },
  body: { paddingTop: brand.top + 44 },
  people: { paddingHorizontal: brand.left, gap: 10 },
  col: { gap: 12 },
  person: { width: 56, alignItems: 'center', gap: 4 },
  pressed: { opacity: 0.6 },
  initial: { width: 44, height: 44, borderWidth: 1.5, borderColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  initialLive: { borderColor: colors.spot },
  initialPending: { borderStyle: 'dashed', borderColor: colors.mute },
  initialAdd: { borderStyle: 'dashed', borderColor: colors.mute },
  initialText: { fontFamily: fonts.medium, fontSize: 18, color: colors.paper },
  liveText: { color: colors.spot },
  personLabel: { fontFamily: fonts.regular, fontSize: 9, color: colors.mute, letterSpacing: 0.2 },
  section: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.mute, marginTop: 26, marginBottom: 10, paddingHorizontal: brand.left },
  card: { height: 210, marginHorizontal: brand.left, marginBottom: 12, backgroundColor: colors.ink2, overflow: 'hidden' },
  cardPhoto: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', opacity: 0.6 },
  cardShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 130, backgroundColor: colors.ink, opacity: 0.7 },
  cardText: { position: 'absolute', left: 14, right: 14, bottom: 12, gap: 6 },
  cardTitle: { fontFamily: fonts.medium, fontSize: 24, lineHeight: 26, letterSpacing: -0.7, color: colors.paper },
  mono: { fontFamily: fonts.regular, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.mute },
  avatars: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  av: { width: AV, height: AV, borderWidth: 1, borderColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  avText: { fontFamily: fonts.medium, fontSize: 11, color: colors.paper },
  avNote: { fontFamily: fonts.regular, fontSize: 11, color: colors.mute, marginLeft: 6 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  btn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.paper },
  btnOn: { backgroundColor: colors.spot },
  btnLine: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.paper },
  btnSpot: { backgroundColor: colors.spot, alignSelf: 'flex-start', marginTop: 8 },
  btnText: { fontFamily: fonts.medium, fontSize: 13, letterSpacing: -0.1, color: colors.ink },
  btnTextOn: { color: colors.paper },
  btnTextLine: { color: colors.paper },
  match: { marginHorizontal: brand.left, marginBottom: 12, padding: 14, borderWidth: 1, borderColor: colors.spot },
  matchLabel: { color: colors.spot },
  matchText: { fontFamily: fonts.regular, fontSize: 16, color: colors.paper, marginTop: 4 },
  strong: { fontFamily: fonts.medium },
  fab: { position: 'absolute', right: brand.left, backgroundColor: colors.paper, paddingVertical: 10, paddingHorizontal: 14 },
  fabLeft: { right: undefined, left: brand.left, backgroundColor: colors.ink, borderWidth: 1, borderColor: colors.paper },
  fabTextLine: { fontFamily: fonts.medium, fontSize: 13, color: colors.paper },
  fabText: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
});
