import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PickerSheet from '@/components/PickerSheet';
import SoundCorner from '@/components/SoundCorner';
import DeckViewer from '@/components/DeckViewer';
import { toDeckCard, type DeckCard } from '@/components/CardFace';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import { posterUrl, swipe } from '@/data/deck';
import { supabase } from '@/lib/supabase';
import { friendById as sampleFriendById, friends as sampleFriends, matches as sampleMatches, nights as sampleNights } from '@/content/friends';
import { useYours, type YoursFriend, type YoursMatch, type YoursNight } from '@/data/yours';
import { useAuth } from '@/auth/AuthContext';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

const fallbackPhoto = require('../../../assets/intro/concert.jpg');

// yours: büyük başlık, iki satır arkadaş karesi (canlı olan kırmızı dolgu), altında
// arkadaşların tuttuğu geceler (fotoğraf üstte, künye altta) ve eşleşmeler.
// alt köşeler: solda your deck, sağda friends' deck; ikisi de kart görünümünde açılır.
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
  const live = useMemo(() => new Set(friends.filter((f) => f.live).map((f) => f.name)), [friends]);
  const [meToo, setMeToo] = useState<Record<string, boolean>>({});
  const [asking, setAsking] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [deck, setDeck] = useState<'mine' | 'friends' | null>(null);
  const [keptNow, setKeptNow] = useState<Record<string, boolean>>({});
  // arkadaşların tuttuğu gecelerin bilet adresleri (friends_kept bunu taşımıyor)
  const [tickets, setTickets] = useState<Record<string, string | null>>({});
  const swipeIds = useMemo(() => [...new Set(real.swipes.map((k) => k.id))].sort().join(','), [real.swipes]);
  useEffect(() => {
    if (!swipeIds) return;
    let cancelled = false;
    supabase
      .from('events_public')
      .select('id,ticket_url')
      .in('id', swipeIds.split(','))
      .then(({ data }) => {
        if (cancelled || !data) return;
        const t: Record<string, string | null> = {};
        (data as { id: string; ticket_url: string | null }[]).forEach((r) => (t[r.id] = r.ticket_url));
        setTickets(t);
      });
    return () => {
      cancelled = true;
    };
  }, [swipeIds]);
  const closeDeck = () => setDeck(null);

  // friends' deck: arkadaşların sağa attıkları, gece başına bir kart, tutanlar karede
  const friendsCards = useMemo<DeckCard[]>(() => {
    const byId = new Map<string, DeckCard>();
    real.swipes.forEach((k) => {
      const name = k.friend.toLowerCase();
      const card: DeckCard = byId.get(k.id) ?? { key: k.id, slug: k.slug, title: k.title, venue: k.venue_name, city: k.city_slug, kind: k.type_name.toLowerCase(), source: tickets[k.id] ? 'ticket' : '', startsAt: k.starts_at, image: k.image_url, poster: k.image_url ? null : posterUrl({ poster_no: k.poster_no }), ticketUrl: tickets[k.id] ?? null, friends: [] };
      if (!card.friends.some((f) => f.name === name)) card.friends.push({ name, live: live.has(name) });
      byId.set(k.id, card);
    });
    return [...byId.values()];
  }, [real.swipes, live, tickets]);
  // your deck: benim sağa attıklarım; aynı geceyi tutan arkadaşlar da karede
  const mineCards = useMemo<DeckCard[]>(
    () =>
      real.mine.map((n) => {
        const names = [...new Set(real.swipes.filter((k) => k.id === n.id).map((k) => k.friend.toLowerCase()))];
        return toDeckCard(n, names.map((name) => ({ name, live: live.has(name) })));
      }),
    [real.mine, real.swipes, live],
  );
  const keptSlugs = useMemo(() => {
    const k: Record<string, boolean> = { ...keptNow };
    real.mine.forEach((n) => (k[n.slug] = true));
    return k;
  }, [real.mine, keptNow]);
  const keepCard = (c: DeckCard) => {
    setKeptNow((s) => ({ ...s, [c.slug]: true }));
    if (session && c.slug) swipe(c.slug, 'right').catch(() => {});
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
        <Text style={styles.title}>yours.</Text>
        <SoundCorner />
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: TAB_BAR_SPACE + insets.bottom + 60 }]} showsVerticalScrollIndicator={false}>
        {/* arkadaşlar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.people}>
          {cols.map((col, i) => (
            <View key={i} style={styles.col}>
              {col.map((f) => (
                <Pressable key={f.id} onPress={() => router.push(`/friend/${f.id}`)} style={({ pressed }) => [styles.person, pressed && styles.pressed]}>
                  <View style={[styles.initial, f.live && styles.initialLive, f.pending && styles.initialPending]}>
                    <Text style={[styles.initialText, f.live && styles.initialTextLive]}>{f.name.charAt(0)}</Text>
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

        {sample ? <Text style={styles.section}>sample · add friends to see yours</Text> : null}

        {feed.map((item, i) =>
          item.kind === 'night' ? (
            <View key={item.n.id} style={styles.card}>
              <View style={styles.cardRow}>
                <Image source={(item.n as YoursNight & { photo?: number }).photo ?? (item.n.image ? { uri: item.n.image } : fallbackPhoto)} style={styles.cardPhoto} />
                <View style={styles.cardText}>
                  <Text style={styles.cardMeta} numberOfLines={1}>{item.n.when} · {item.n.venue}</Text>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.n.title}</Text>
                </View>
              </View>
              <View style={styles.avatars}>
                {item.n.friends.map((name) => (
                  <View key={name} style={[styles.av, live.has(name) && styles.avLive]}>
                    <Text style={[styles.avText, live.has(name) && styles.avTextLive]}>{name.charAt(0)}</Text>
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
                  style={({ pressed }) => [meToo[item.n.id] ? styles.btnLine : styles.btnRed, pressed && styles.pressed]}
                >
                  <Text style={meToo[item.n.id] ? styles.btnTextLine : styles.btnTextRed}>{meToo[item.n.id] ? 'kept' : 'me too'}</Text>
                </Pressable>
                <Pressable onPress={() => setAsking(item.n.id)} style={({ pressed }) => [styles.btnLine, pressed && styles.pressed]}>
                  <Text style={styles.btnTextLine}>{answers[item.n.id] ? `you: ${answers[item.n.id]}` : "who's coming?"}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View key={`m${i}`} style={styles.match}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.matchLabel}>match</Text>
                <Text style={styles.matchText}>
                  you and {item.friend} both kept it.
                </Text>
                {nightById(item.night) ? <Text style={styles.matchNight} numberOfLines={1}>{nightById(item.night)?.title}</Text> : null}
              </View>
              <Pressable onPress={() => setAnswers((a) => ({ ...a, [item.night]: 'in' }))} style={({ pressed }) => [styles.btnRed, pressed && styles.pressed]}>
                <Text style={styles.btnTextRed}>{answers[item.night] === 'in' ? "you're in" : "say you're in"}</Text>
              </Pressable>
            </View>
          ),
        )}
      </ScrollView>

      <Pressable onPress={() => setDeck('mine')} style={({ pressed }) => [styles.fab, styles.fabLeft, { bottom: TAB_BAR_SPACE + insets.bottom - 6 }, pressed && styles.pressed]}>
        <Text style={styles.btnTextLine}>your deck{real.mine.length ? ` · ${real.mine.length}` : ''}</Text>
      </Pressable>
      <Pressable onPress={() => setDeck('friends')} style={({ pressed }) => [styles.fab, { bottom: TAB_BAR_SPACE + insets.bottom - 6 }, pressed && styles.pressed]}>
        <Text style={styles.btnTextRed}>friends&apos; deck{friendsCards.length ? ` · ${friendsCards.length}` : ''}</Text>
      </Pressable>

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

      {/* kart görünümü: alt menünün altında kalır, menü üstte yüzmeye devam eder */}
      {deck ? (
        <DeckViewer
          mode={deck}
          cards={deck === 'mine' ? mineCards : friendsCards}
          kept={keptSlugs}
          onKeep={keepCard}
          onClose={closeDeck}
          empty={
            deck === 'mine'
              ? session ? 'nothing here yet. swipe right in the deck.' : 'sign in and the cards you keep land here.'
              : real.friends.length ? 'your friends have not kept anything yet.' : 'add friends to see what they keep.'
          }
        />
      ) : null}
    </View>
  );
}

const AV = 18;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 44, backgroundColor: colors.ink, zIndex: 2 },
  title: { position: 'absolute', top: brand.top - 8, left: brand.left, fontFamily: fonts.semibold, fontSize: 30, lineHeight: 32, letterSpacing: -0.9, color: colors.paper },
  body: { paddingTop: brand.top + 56 },
  people: { paddingHorizontal: brand.left, gap: 12 },
  col: { gap: 14 },
  person: { width: 50, alignItems: 'center', gap: 5 },
  pressed: { opacity: 0.6 },
  initial: { width: 46, height: 46, borderWidth: 1.5, borderColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  initialLive: { backgroundColor: colors.spot, borderColor: colors.spot },
  initialPending: { borderStyle: 'dashed', borderColor: colors.mute },
  initialAdd: { borderStyle: 'dashed', borderColor: colors.mute },
  initialText: { fontFamily: fonts.medium, fontSize: 18, color: colors.paper },
  initialTextLive: { color: colors.ink },
  liveText: { color: colors.spotText },
  personLabel: { fontFamily: fonts.regular, fontSize: 9, color: colors.meta, letterSpacing: 0.2 },
  section: { fontFamily: fonts.regular, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.meta, marginTop: 26, paddingHorizontal: brand.left },
  card: { marginHorizontal: brand.left, marginTop: 22, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.ink3, gap: 8 },
  cardRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  cardPhoto: { width: 72, height: 72, backgroundColor: colors.ink2, filter: [{ grayscale: 1 }] },
  cardText: { flex: 1, gap: 3 },
  cardMeta: { fontFamily: fonts.regular, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.spotText },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 22, letterSpacing: -0.5, color: colors.paper },
  avatars: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  av: { width: AV, height: AV, borderWidth: 1.5, borderColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  avLive: { backgroundColor: colors.spot, borderColor: colors.spot },
  avText: { fontFamily: fonts.medium, fontSize: 10, color: colors.paper },
  avTextLive: { color: colors.ink },
  avNote: { fontFamily: fonts.regular, fontSize: 11, color: colors.mute, marginLeft: 6 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  btnRed: { paddingVertical: 9, paddingHorizontal: 13, backgroundColor: colors.spot },
  btnLine: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.paper, backgroundColor: colors.ink },
  btnTextRed: { fontFamily: fonts.medium, fontSize: 13, letterSpacing: -0.1, color: colors.ink },
  btnTextLine: { fontFamily: fonts.medium, fontSize: 13, letterSpacing: -0.1, color: colors.paper },
  match: { marginHorizontal: brand.left, marginTop: 26, padding: 14, borderWidth: 1, borderColor: colors.spot, flexDirection: 'row', alignItems: 'center', gap: 12 },
  matchLabel: { fontFamily: fonts.regular, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.spotText },
  matchText: { fontFamily: fonts.regular, fontSize: 15, color: colors.paper },
  matchNight: { fontFamily: fonts.regular, fontSize: 12, color: colors.meta },
  fab: { position: 'absolute', right: brand.left, backgroundColor: colors.spot, paddingVertical: 10, paddingHorizontal: 14 },
  fabLeft: { right: undefined, left: brand.left, backgroundColor: colors.ink, borderWidth: 1, borderColor: colors.paper },
});
