import { memo, useEffect, useMemo, useRef, useState } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgUri } from 'react-native-svg';
import Icon from '@/components/Icon';
import WhoSheet from '@/components/WhoSheet';
import { PeopleResults, PeopleSearch, SuggestedInRow } from '@/components/People';
import SoundCorner from '@/components/SoundCorner';
import DeckViewer from '@/components/DeckViewer';
import { toDeckCard, type DeckCard } from '@/components/CardFace';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import { myCards } from '@/data/checkin';
import { fetchDeck, posterUrl, swipe, unswipe, type Night } from '@/data/deck';
import { supabase } from '@/lib/supabase';
import { friendById as sampleFriendById, friends as sampleFriends, matches as sampleMatches, nights as sampleNights, sampleText } from '@/content/friends';
import { useYours, type YoursFriend, type YoursMatch, type YoursNight } from '@/data/yours';
import { wave2 as sampleWave2, wave3 as sampleWave3 } from '@/content/waves';
import { waveCards, wavesKept, type WaveKept } from '@/data/waves';
import { useAuth } from '@/auth/AuthContext';
import { useTabReset } from '@/hooks/useTabReset';
import { dayLabel } from '@/data/when';
import { sparkInbox, type SparkInvite } from '@/data/sparks';
import { pastFeed, type PastNight } from '@/data/feed';
import { rsvpFor, rsvpSet, type Answer, type Rsvp } from '@/data/rsvp';
import SamplePost from '@/components/SamplePost';
import Avatar from '@/components/Avatar';
import { SAMPLE_POSTS, type SamplePost as SamplePostData } from '@/content/posts';
import { useHere } from '@/data/here';
import { sparkOf } from '@/content/sparks';
import { upperData, useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

const fallbackPhoto = require('../../../assets/intro/concert.jpg');

// Yours, the hub. Top to bottom: "with your people", a gallery of the nights your
// friends kept (most keepers first) and the sparks waiting for your answer, one full
// photo each, sliding by itself every 6 s; the decks as card stacks (a tap opens the
// viewer); your people (faces, a red ring for whoever is out right now, what each is
// up to); and then an endless feed of photos from past nights, like a timeline.
export default function YoursScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const real = useYours();
  const { t, tn, tx, up } = useLang();
  // Is a room open? Drives the dot on the chat icon.
  const [roomOpen, setRoomOpen] = useState(false);
  const uid = session?.user.id;
  useEffect(() => {
    if (!uid) return;
    let live = true;
    myCards()
      .then((cards) => live && setRoomOpen(cards.some((c) => !c.frozen)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [uid, real.ready]);
  // Samples fill whatever is still empty, each with a "sample" note: the friend row
  // until you have friends (a pending request counts), the feed until a friend keeps
  // a night. A first friend request no longer empties the whole screen.
  const sampleRow = real.ready && real.friends.length === 0;
  const sample = real.ready && real.nights.length === 0;
  const friends: YoursFriend[] = sampleRow
    ? sampleFriends.map((f) => ({ id: f.id, name: f.name, handle: f.handle, live: f.live, kept: f.kept }))
    : real.friends;
  // Samples are real nights coming up in your city (so a tap opens the night) with
  // sample friends on them; the drawn sample nights only while those load or offline.
  const here = useHere();
  const feedCity = here.city ?? 'munchen';
  const [upcoming, setUpcoming] = useState<Night[]>([]);
  useEffect(() => {
    if (!sample) return;
    let live = true;
    fetchDeck(feedCity, null, 12)
      .then((rows) => live && setUpcoming(rows.filter((n) => n.image_url).slice(0, 8)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [sample, feedCity]);
  const nights: YoursNight[] = sample && upcoming.length
    ? upcoming.map((n, i) => ({
        id: n.id,
        slug: n.slug,
        title: n.title.toLowerCase(),
        venue: n.venue_name ?? n.city_name,
        when: dayLabel(n.starts_at),
        startsAt: n.starts_at,
        image: n.image_url,
        friends: sampleFriends.slice(i % 5, (i % 5) + 2 + (i % 3)).map((f) => f.name),
      }))
    : sample
    ? sampleNights.map((n) => ({ id: n.id, slug: '', title: n.title, venue: sampleText(n.venue, tx), when: sampleText(n.when, tx), image: null, friends: n.friends.map((id) => sampleFriendById(id).name), photo: n.photo } as YoursNight & { photo: number }))
    : real.nights;
  const matches: YoursMatch[] = sample ? sampleMatches.map((m) => ({ friend: sampleFriendById(m.friend).name, night: m.night })) : real.matches;
  const nightById = (id: string) => nights.find((n) => n.id === id);
  // Live names for the feed's squares: sample friends go with the sample feed.
  const live = useMemo(
    () => new Set((sample ? sampleFriends : friends).filter((f) => f.live).map((f) => f.name)),
    [sample, friends],
  );
  const [meToo, setMeToo] = useState<Record<string, boolean>>({});
  const [asking, setAsking] = useState<string | null>(null);
  // Who is coming: your answers (stored, friends see them) and your friends' (32_rsvp.sql).
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [theirAnswers, setTheirAnswers] = useState<Rsvp[]>([]);
  // Friend search: while typing, results replace the feed.
  const [query, setQuery] = useState('');
  const [deck, setDeck] = useState<'mine' | 'friends' | 'wave2' | 'wave3' | null>(null);
  const scroll = useRef<ScrollView>(null);
  const people = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  // Sparks friends (and their waves) started that you have not answered.
  const [sparkAsks, setSparkAsks] = useState<SparkInvite[]>([]);
  useEffect(() => {
    if (!uid) return;
    let live = true;
    sparkInbox().then((list) => live && setSparkAsks(list));
    return () => {
      live = false;
    };
  }, [uid, real.ready]);
  useTabReset('yours', () => {
    setDeck(null);
    setQuery('');
    setAsking(null);
    people.current?.scrollTo({ x: 0, animated: true });
    scroll.current?.scrollTo({ y: 0, animated: true });
  });
  // Ticket URLs for friends' kept nights (friends_kept does not carry them).
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
        const urls: Record<string, string | null> = {};
        (data as { id: string; ticket_url: string | null }[]).forEach((r) => (urls[r.id] = r.ticket_url));
        setTickets(urls);
      });
    return () => {
      cancelled = true;
    };
  }, [swipeIds]);
  const closeDeck = () => setDeck(null);

  // The waves (33_waves.sql): nights kept by friends of friends and one step further.
  // Until anyone out there keeps something, the sample cards stand in, marked sample.
  const [waveRows, setWaveRows] = useState<WaveKept[]>([]);
  useEffect(() => {
    if (!uid) return;
    let live = true;
    wavesKept()
      .then((list) => live && setWaveRows(list))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [uid, real.ready]);
  const realWave2 = useMemo(() => waveCards(waveRows, 2), [waveRows]);
  const realWave3 = useMemo(() => waveCards(waveRows, 3), [waveRows]);
  const wave2 = realWave2.length ? realWave2 : sampleWave2;
  const wave3 = realWave3.length ? realWave3 : sampleWave3;
  const waveSample = (deck === 'wave2' && !realWave2.length) || (deck === 'wave3' && !realWave3.length);

  // Friends' deck: nights friends kept, one card per night, keepers as squares.
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
  // Until a friend keeps something: a sample friends' deck of real nights coming up
  // here, with sample friends on them (keeping one keeps the real night).
  const friendsDeck = useMemo<DeckCard[]>(
    () =>
      friendsCards.length
        ? friendsCards
        : upcoming.map((n, i) => toDeckCard(n, sampleFriends.slice(i % 6, (i % 6) + 1 + (i % 3)).map((f) => ({ name: f.name, live: !!f.live })))),
    [friendsCards, upcoming],
  );
  const friendsSample = !friendsCards.length && friendsDeck.length > 0;
  // Your deck: nights you kept, with friends who kept the same night.
  const mineCards = useMemo<DeckCard[]>(
    () =>
      real.mine.map((n) => {
        const names = [...new Set(real.swipes.filter((k) => k.id === n.id).map((k) => k.friend.toLowerCase()))];
        return toDeckCard(n, names.map((name) => ({ name, live: live.has(name) })));
      }),
    [real.mine, real.swipes, live],
  );
  // Swiped right in a deck: keep (sample cards have no night, so nothing is written).
  const keepCard = (c: DeckCard) => {
    if (session && c.slug) swipe(c.slug, 'right').catch(() => {});
  };
  // Swiped left in a deck: let go, as in the flow (the night leaves your flow deck too).
  const letGoCard = (c: DeckCard) => {
    if (session && c.slug) swipe(c.slug, 'left').catch(() => {});
  };
  // Undo in a deck: the swipe is taken back.
  const undoCard = (c: DeckCard) => {
    if (session && c.slug) unswipe(c.key, c.slug).catch(() => {});
  };

  // The gallery: nights friends kept (most keepers first, then the soonest) and the
  // sparks waiting for your answer, one full photo each.
  const ranked = [...nights].sort((a, b) => b.friends.length - a.friends.length || String(a.startsAt ?? '').localeCompare(String(b.startsAt ?? '')));
  const matched = new Set(matches.map((mt) => mt.night));
  type Slide = { kind: 'night'; key: string; n: YoursNight } | { kind: 'spark'; key: string; s: SparkInvite };
  const slides: Slide[] = [
    ...ranked.slice(0, 8).map((n): Slide => ({ kind: 'night', key: n.id, n })),
    ...sparkAsks.map((sp): Slide => ({ kind: 'spark', key: `s${sp.id}`, s: sp })),
  ];
  const galleryIds = slides.filter((sl) => sl.kind === 'night').map((sl) => (sl as { n: YoursNight }).n.id).filter((id) => /^[0-9a-f-]{36}$/.test(id)).join(',');
  useEffect(() => {
    if (!uid || !galleryIds) return;
    let live = true;
    rsvpFor(galleryIds.split(',')).then((list) => {
      if (!live) return;
      setTheirAnswers(list.filter((r) => !r.mine));
      setAnswers((a) => {
        const next = { ...a };
        list.filter((r) => r.mine).forEach((r) => (next[r.event_id] = r.answer));
        return next;
      });
    });
    return () => {
      live = false;
    };
  }, [uid, galleryIds]);
  const answer = (nightId: string, a: Answer) => {
    const again = answers[nightId] === a; // the same answer twice takes it back
    setAnswers((s) => {
      const next = { ...s };
      if (again) delete next[nightId];
      else next[nightId] = a;
      return next;
    });
    if (uid && /^[0-9a-f-]{36}$/.test(nightId)) rsvpSet(nightId, again ? null : a).catch(() => {});
  };
  const comingTo = (nightId: string) => theirAnswers.filter((r) => r.event_id === nightId && r.answer === 'in').length + (answers[nightId] === 'in' ? 1 : 0);
  // Each page is the full screen width with the photo inset inside it, so paging always
  // lands on a whole photo (a snap interval plus side padding stopped halfway).
  const slideW = width - brand.left * 2;
  const step = width;

  // Slides on by itself every 6 s; a finger on it restarts the count.
  const gallery = useRef<FlatList<Slide>>(null);
  const [slide, setSlide] = useState(0);
  const [touched, setTouched] = useState(0);
  const count = slides.length;
  useEffect(() => {
    if (count < 2 || query.trim() || deck) return;
    const timer = setInterval(() => {
      setSlide((i) => {
        const next = (i + 1) % count;
        gallery.current?.scrollToOffset({ offset: next * step, animated: true });
        return next;
      });
    }, 6000);
    return () => clearInterval(timer);
  }, [count, step, touched, query, deck]);

  // The past feed: a page at a time, the next one asked for near the bottom.
  const [past, setPast] = useState<PastNight[]>([]);
  const [pastState, setPastState] = useState<'idle' | 'loading' | 'end'>('idle');
  const loading = useRef(false);
  const loadPast = (reset = false) => {
    if (loading.current || (!reset && pastState === 'end')) return;
    loading.current = true;
    setPastState('loading');
    const after = reset ? null : (past[past.length - 1] ?? null);
    pastFeed(feedCity, after, 10)
      .then((page) => {
        setPast((list) => (reset ? page : [...list, ...page]));
        setPastState(page.length < 10 ? 'end' : 'idle');
      })
      .catch(() => setPastState('idle'))
      .finally(() => {
        loading.current = false;
      });
  };
  useEffect(() => {
    loadPast(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedCity, uid]);
  const nearBottom = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y > contentSize.height - 900) loadPast();
  };

  // The feed mixes the sample posts (photos people took, with comments) into the past
  // nights: one sample after every two nights, the rest at the end.
  type FeedItem = { kind: 'night'; p: PastNight } | { kind: 'sample'; p: SamplePostData };
  const feed: FeedItem[] = [];
  let si = 0;
  past.forEach((p, i) => {
    if (i % 2 === 0 && si < SAMPLE_POSTS.length) feed.push({ kind: 'sample', p: SAMPLE_POSTS[si++] });
    feed.push({ kind: 'night', p });
  });
  if (pastState === 'end' || past.length === 0) SAMPLE_POSTS.slice(si).forEach((p) => feed.push({ kind: 'sample', p }));

  const decks: { id: 'mine' | 'friends' | 'wave2' | 'wave3'; label: string; cards: DeckCard[]; red?: boolean }[] = [
    { id: 'friends', label: t('deck.friends'), cards: friendsDeck, red: true },
    { id: 'mine', label: t('deck.yours'), cards: mineCards },
    { id: 'wave2', label: t('deck.wave2'), cards: wave2 },
    { id: 'wave3', label: t('deck.wave3'), cards: wave3 },
  ];
  // Out right now first, then whoever asked you, then the rest.
  const faces = [...friends].sort((a, b) => Number(!!b.live) - Number(!!a.live) || Number(b.pending === 'incoming') - Number(a.pending === 'incoming'));

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.band}>
        <Text style={styles.title}>{t('yours.title')}</Text>
        {/* Afterhours rooms; a red dot when one is open. */}
        <Pressable onPress={() => router.push('/rooms')} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('rooms.a11y')} style={({ pressed }) => [styles.chat, pressed && styles.pressed]}>
          <Icon name="chat" size={21} color={colors.paper} />
          {roomOpen ? <View style={styles.chatDot} /> : null}
        </Pressable>
        <SoundCorner />
      </View>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.body, { paddingBottom: TAB_BAR_SPACE + insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
        onScroll={query.trim() ? undefined : nearBottom}
        scrollEventThrottle={250}
      >
        <PeopleSearch value={query} onChange={setQuery} />
        {query.trim() ? (
          <PeopleResults query={query} />
        ) : (
          <>
            {/* With your people: the gallery. */}
            {count ? (
              <>
                <Head label={t('yours.withPeople')} note={sample ? up(t('yours.sample')) : `${two(slide + 1)}/${two(count)}`} />
                <FlatList
                  ref={gallery}
                  data={slides}
                  keyExtractor={(sl) => sl.key}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  pagingEnabled
                  decelerationRate="fast"
                  onScrollBeginDrag={() => setTouched((n) => n + 1)}
                  onMomentumScrollEnd={(e) => setSlide(Math.max(0, Math.min(count - 1, Math.round(e.nativeEvent.contentOffset.x / step))))}
                  getItemLayout={(_, i) => ({ length: step, offset: step * i, index: i })}
                  renderItem={({ item }) => (
                    <View style={[styles.page, { width }]}>
                      {item.kind === 'night' ? (
                        <Pressable onPress={() => item.n.slug && router.push(`/night/${item.n.slug}`)} style={[styles.hero, { width: slideW, height: slideW * 1.08 }]}>
                          <Image source={(item.n as YoursNight & { photo?: number }).photo ?? (item.n.image ? { uri: item.n.image } : fallbackPhoto)} style={StyleSheet.absoluteFill} resizeMode="cover" />
                          <LinearGradient colors={['rgba(14,13,12,0)', 'rgba(14,13,12,0.55)', colors.ink]} locations={[0.3, 0.6, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
                          {matched.has(item.n.id) ? (
                            <View style={styles.badge}>
                              <Text style={styles.badgeText}>{up(t('yours.match'))}</Text>
                            </View>
                          ) : null}
                          <View style={styles.heroText}>
                            <Text style={styles.heroMeta} numberOfLines={1}>{item.n.startsAt !== undefined ? up(dayLabel(item.n.startsAt)) : upperData(item.n.when)} · {upperData(item.n.venue)}</Text>
                            <Text style={styles.heroTitle} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>{item.n.title}</Text>
                            {/* Who kept it: the point of the card. Their faces, their names; a tap shows who's coming. */}
                            <Pressable onPress={() => setAsking(item.n.id)} style={({ pressed }) => [styles.kept, pressed && styles.pressed]}>
                              <View style={styles.keptFaces}>
                                {item.n.friends.slice(0, 4).map((name, i) => {
                                  const f = friends.find((x) => x.name === name);
                                  return (
                                    <View key={name} style={[styles.keptFace, i > 0 && styles.keptOverlap, live.has(name) && styles.keptLive]}>
                                      {f?.photo ? <Image source={{ uri: f.photo }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Avatar name={f?.handle ?? name} size={KEPT} />}
                                    </View>
                                  );
                                })}
                                {item.n.friends.length > 4 ? (
                                  <View style={[styles.keptFace, styles.keptOverlap, styles.keptMore]}>
                                    <Text style={styles.keptMoreText}>+{item.n.friends.length - 4}</Text>
                                  </View>
                                ) : null}
                              </View>
                              <View style={styles.keptText}>
                                <Text style={styles.keptNames} numberOfLines={1}>{names(item.n.friends)}</Text>
                                <Text style={styles.keptWord} numberOfLines={1}>
                                  {up(tn('yours.friendsKept', item.n.friends.length))}
                                  {comingTo(item.n.id) ? ` · ${up(tn('yours.coming', comingTo(item.n.id)))}` : ''}
                                  {item.n.friends.some((n) => live.has(n)) ? ` · ${up(t('yours.live'))}` : ''}
                                </Text>
                              </View>
                            </Pressable>
                            <View style={styles.actions}>
                              <Pressable
                                onPress={() => {
                                  setMeToo((st) => ({ ...st, [item.n.id]: !st[item.n.id] }));
                                  if (!sample && session && item.n.slug && !meToo[item.n.id]) swipe(item.n.slug, 'right').catch(() => {});
                                }}
                                style={({ pressed }) => [meToo[item.n.id] ? styles.btnLine : styles.btnRed, pressed && styles.pressed]}
                              >
                                <Text style={meToo[item.n.id] ? styles.btnTextLine : styles.btnTextRed}>{meToo[item.n.id] ? t('deck.kept') : t('yours.meToo')}</Text>
                              </Pressable>
                              <Pressable onPress={() => setAsking(item.n.id)} style={({ pressed }) => [styles.btnLine, pressed && styles.pressed]}>
                                <Text style={styles.btnTextLine}>{answers[item.n.id] ? t('yours.you', { answer: tx('yours.answer.' + answers[item.n.id], answers[item.n.id]) }) : t('who.coming')}</Text>
                              </Pressable>
                            </View>
                          </View>
                        </Pressable>
                      ) : (
                        <Pressable onPress={() => router.push(`/spark/${item.s.kind}?invite=${item.s.id}`)} style={[styles.hero, styles.heroGold, { width: slideW, height: slideW * 1.08 }]}>
                          <Image source={sparkOf(item.s.kind).photo} style={StyleSheet.absoluteFill} resizeMode="cover" />
                          <LinearGradient colors={['rgba(14,13,12,0)', 'rgba(14,13,12,0.55)', colors.ink]} locations={[0.3, 0.6, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
                          <View style={[styles.badge, styles.badgeGold]}>
                            <Text style={styles.badgeText}>{upperData('spark')}</Text>
                          </View>
                          <View style={styles.heroText}>
                            <Text style={[styles.heroMeta, styles.goldText]} numberOfLines={1}>{up(t('yours.sparkFrom', { name: (item.s.host_name ?? item.s.host_handle ?? '').toLowerCase() }))}</Text>
                            <Text style={[styles.heroTitle, styles.goldText]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>{item.s.title.toLowerCase()}</Text>
                            <Text style={styles.avNote} numberOfLines={1}>{up(dayLabel(item.s.starts_at))}{item.s.place ? ` · ${item.s.place}` : ''} · {t('spark.going', { n: item.s.going })}</Text>
                          </View>
                        </Pressable>
                      )}
                    </View>
                  )}
                />
                {count > 1 ? (
                  <View style={styles.dots}>
                    {slides.map((sl, i) => (
                      <View key={sl.key} style={[styles.dotSmall, i === slide && styles.dotOn]} />
                    ))}
                  </View>
                ) : null}
              </>
            ) : null}

            {/* Decks as stacks of cards. */}
            <Head label={t('yours.decks')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
              {decks.map((d) => (
                <Pressable key={d.id} onPress={() => setDeck(d.id)} style={({ pressed }) => [styles.stack, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={d.label}>
                  <View style={styles.stackCards}>
                    {[2, 1, 0].map((k) => {
                      const c = d.cards[k];
                      return (
                        <View key={k} style={[styles.stackCard, { transform: [{ rotate: `${(k - 1) * -6}deg` }, { translateX: (1 - k) * 6 }] }, k === 0 && d.red && styles.stackRed]}>
                          <StackThumb card={c} />
                        </View>
                      );
                    })}
                  </View>
                  <Text style={[styles.stackLabel, d.red && styles.redText]} numberOfLines={1}>{d.label}</Text>
                  <Text style={styles.stackCount}>{d.cards.length}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Your people: faces with what each is up to; out right now first, ringed red. */}
            <Head label={t('yours.people')} note={sampleRow ? up(t('deck.sample')) : friends.length ? String(friends.length) : undefined} />
            <ScrollView ref={people} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
              {faces.map((f) => (
                <Pressable key={f.id} onPress={() => router.push(`/friend/${f.id}`)} style={({ pressed }) => [styles.person, pressed && styles.pressed]}>
                  <View style={[styles.face, f.live && styles.faceLive, f.pending && styles.facePending]}>
                    {f.photo ? <Image source={{ uri: f.photo }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Avatar name={f.handle ?? f.name} size={FACE} />}
                  </View>
                  <Text style={styles.personName} numberOfLines={1}>{f.name}</Text>
                  {f.live ? (
                    <View style={styles.liveRow}>
                      <Pulse />
                      <Text style={[styles.personState, styles.redText]} numberOfLines={1}>{f.live}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.personState, f.pending === 'incoming' && styles.redText]} numberOfLines={1}>
                      {f.pending ? (f.pending === 'incoming' ? t('yours.wantsIn') : t('yours.asked')) : f.kept ? t('yours.keptN', { n: f.kept }) : ' '}
                    </Text>
                  )}
                </Pressable>
              ))}
              <Pressable onPress={() => router.push('/friend/add')} style={({ pressed }) => [styles.person, pressed && styles.pressed]}>
                <View style={[styles.face, styles.faceAdd]}>
                  <Text style={styles.faceText}>+</Text>
                </View>
                <Text style={styles.personName}>{t('yours.add')}</Text>
                <Text style={styles.personState}> </Text>
              </Pressable>
              <SuggestedInRow />
            </ScrollView>

            {/* From past nights: an endless feed of photos, newest first. */}
            {feed.length ? <Head label={t('yours.past')} /> : null}
            {feed.map(({ kind, p: item }) => kind === 'sample' ? (
              <SamplePost key={item.id} post={item as SamplePostData} />
            ) : (
              <PastPost key={item.id} p={item as PastNight} names={names} />
            ))}
            {past.length && pastState === 'end' ? <Text style={styles.feedEnd}>{up(t('yours.pastEnd'))}</Text> : null}
            {pastState === 'loading' ? <Text style={styles.feedEnd}>{up(t('word.moment'))}</Text> : null}
          </>
        )}
      </ScrollView>

      <WhoSheet
        open={asking !== null}
        title={asking ? (nightById(asking)?.title ?? '') : ''}
        people={(() => {
          if (!asking) return [];
          const kept = nightById(asking)?.friends ?? [];
          const said = theirAnswers.filter((r) => r.event_id === asking);
          const all = [...new Set([...said.map((r) => r.name), ...kept])];
          const rank = (a?: string) => (a === 'in' ? 0 : a === 'maybe' ? 1 : a === 'out' ? 3 : 2);
          return all
            .map((name) => {
              const f = friends.find((x) => x.name === name || x.handle === name);
              return { name: f?.name ?? name, photo: f?.photo, live: f?.live, handle: f?.handle, kept: kept.includes(name), answer: said.find((r) => r.name === name)?.answer ?? null };
            })
            .sort((a, b) => rank(a.answer ?? undefined) - rank(b.answer ?? undefined));
        })()}
        answer={asking ? (answers[asking] ?? null) : null}
        onAnswer={(id) => asking && answer(asking, id)}
        onPerson={(p) => {
          const f = friends.find((x) => x.name === p.name);
          if (!f) return;
          setAsking(null);
          setTimeout(() => router.push(`/friend/${f.id}`), 250);
        }}
        onClose={() => setAsking(null)}
      />

      {/* Card viewer: sits under the tab bar, which keeps floating on top. */}
      {deck ? (
        <DeckViewer
          mode={deck}
          cards={deck === 'mine' ? mineCards : deck === 'wave2' ? wave2 : deck === 'wave3' ? wave3 : friendsDeck}
          sample={waveSample || (deck === 'friends' && friendsSample)}
          onKeep={keepCard}
          onLetGo={letGoCard}
          onUndo={undoCard}
          onClose={closeDeck}
          empty={
            deck === 'mine'
              ? session ? t('yours.emptyMine') : t('yours.emptyMineGuest')
              : deck === 'wave2' || deck === 'wave3'
                ? t('deck.waveEmpty')
                : real.friends.length ? t('yours.emptyFriends') : t('yours.emptyNoFriends')
          }
        />
      ) : null}
    </View>
  );
}

const two = (n: number) => String(n).padStart(2, '0');

// One card of a deck stack: its photo, else its drawn poster, else the stock photo
// (an empty or broken picture left blank cards before).
function StackThumb({ card }: { card: DeckCard | undefined }) {
  const [broken, setBroken] = useState(false);
  if (card?.image && !broken) return <Image source={{ uri: card.image }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setBroken(true)} />;
  if (card?.poster && !broken) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.stackPoster]}>
        <SvgUri uri={card.poster} width="100%" height="100%" onError={() => setBroken(true)} />
      </View>
    );
  }
  return (
    <>
      <Image source={fallbackPhoto} style={[StyleSheet.absoluteFill, styles.stackDim]} resizeMode="cover" />
      {card ? <Text style={styles.stackTitle} numberOfLines={3}>{card.title.toLowerCase()}</Text> : null}
    </>
  );
}

// A past night in the feed: venue and date, the photo, who of yours was there.
const names = (list: string[]) => (list.length > 2 ? `${list.slice(0, 2).join(', ')} +${list.length - 2}` : list.join(', '));

// memo: the gallery above re-renders yours every six seconds; a post only changes with its night.
const PastPost = memo(function PastPost({ p, names }: { p: PastNight; names: (list: string[]) => string }) {
  const { width } = useWindowDimensions();
  const { t, tx, up } = useLang();
  return (
    <View key={p.id} style={styles.post}>
      <View style={styles.postHead}>
        <View style={[styles.postMark, (p.mine || p.people.length > 0) && styles.postMarkOn]}>
          <Text style={[styles.postMarkText, (p.mine || p.people.length > 0) && styles.postMarkTextOn]}>{(p.venue_name ?? p.city_name).charAt(0).toLowerCase()}</Text>
        </View>
        <View style={styles.postWho}>
          <Text style={styles.postVenue} numberOfLines={1}>{(p.venue_name ?? p.city_name).toLowerCase()}</Text>
          <Text style={styles.postMeta} numberOfLines={1}>{up(dayLabel(p.starts_at))} · {upperData(p.city_name)} · {tx('type.' + p.type_slug, '') ? up(tx('type.' + p.type_slug, '')) : upperData(p.type_name)}</Text>
        </View>
      </View>
      <Image source={{ uri: p.image_url }} style={[styles.postPhoto, { height: width }]} resizeMode="cover" />
      <View style={styles.postBody}>
        {p.mine || p.people.length ? (
          <Text style={styles.postThere} numberOfLines={2}>
            {p.mine ? t('yours.youWereThere') : t('yours.wereThere', { names: names(p.people) })}
            {p.mine && p.people.length ? ` · ${t('yours.wereThere', { names: names(p.people) })}` : ''}
          </Text>
        ) : null}
        <Text style={styles.postTitle} numberOfLines={2}>{p.title.toLowerCase()}</Text>
      </View>
    </View>
  );
});

// A section heading: the words, an optional count or note on the right.
function Head({ label, note, red }: { label: string; note?: string; red?: boolean }) {
  return (
    <View style={styles.head}>
      <View style={styles.headLeft}>
        <Text style={styles.headText}>{label}</Text>
        <View style={[styles.headDot, red && styles.headDotRed]} />
      </View>
      {note ? <Text style={styles.headNote}>{note}</Text> : null}
    </View>
  );
}

// The red dot of someone out right now, breathing.
function Pulse() {
  const o = useSharedValue(1);
  useEffect(() => {
    o.set(withRepeat(withTiming(0.25, { duration: 900 }), -1, true));
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[styles.pulse, style]} />;
}

const KEPT = 36; // the faces of who kept a night, on the gallery card
const FACE = 62;
const GOLD = '#E8B04B'; // sparks (as on the map)

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 44, backgroundColor: colors.ink, zIndex: 2 },
  title: { position: 'absolute', top: brand.top - 8, left: brand.left, fontFamily: fonts.semibold, fontSize: 30, lineHeight: 32, letterSpacing: -0.9, color: colors.paper },
  chat: { position: 'absolute', top: brand.top - 3, right: brand.left + 84 },
  chatDot: { position: 'absolute', top: -2, right: -3, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.spot },
  body: { paddingTop: brand.top + 56 },
  pressed: { opacity: 0.6 },
  redText: { color: colors.spotText },
  goldText: { color: GOLD },

  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: brand.left, marginTop: 30, marginBottom: 12 },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headText: { fontFamily: fonts.medium, fontSize: 17, letterSpacing: -0.3, color: colors.paper },
  headDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.ink3 },
  headDotRed: { backgroundColor: colors.spot },
  headNote: { fontFamily: fonts.jet, fontSize: 10.5, letterSpacing: 1, color: colors.meta },
  rail: { paddingHorizontal: brand.left, gap: 12 },

  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: FACE + 6 },
  pulse: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.spot },
  person: { width: FACE + 6, alignItems: 'center', gap: 4 },
  face: { width: FACE, height: FACE, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  faceLive: { borderColor: colors.spot, borderWidth: 2.5 },
  facePending: { borderStyle: 'dashed', borderColor: colors.mute },
  faceAdd: { borderStyle: 'dashed', borderColor: colors.mute },
  faceText: { fontFamily: fonts.medium, fontSize: 24, color: colors.paper },
  faceTextLive: { color: colors.spotText },
  personName: { fontFamily: fonts.medium, fontSize: 12, color: colors.paper, marginTop: 2 },
  personState: { fontFamily: fonts.regular, fontSize: 10, color: colors.meta },

  stack: { width: 104, gap: 3 },
  stackCards: { width: 104, height: 138, marginBottom: 8 },
  stackCard: { position: 'absolute', left: 10, top: 4, width: 84, height: 126, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.ink2, borderWidth: 1, borderColor: colors.ink3, padding: 8, justifyContent: 'flex-end' },
  stackRed: { borderColor: colors.spot, borderWidth: 1.5 },
  stackPoster: { backgroundColor: colors.ink2 },
  stackDim: { opacity: 0.45 },
  stackTitle: { fontFamily: fonts.logo, fontSize: 15, lineHeight: 15, color: colors.spotText },
  stackLabel: { fontFamily: fonts.medium, fontSize: 13, letterSpacing: -0.2, color: colors.paper },
  stackCount: { fontFamily: fonts.jet, fontSize: 10.5, letterSpacing: 1, color: colors.meta },

  // the page around it already leaves the side margins
  hero: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.ink2 },
  heroText: { position: 'absolute', left: 16, right: 16, bottom: 16, gap: 6 },
  heroMeta: { fontFamily: fonts.jet, fontSize: 10.5, letterSpacing: 1.2, color: colors.paper },
  heroTitle: { fontFamily: fonts.logo, fontSize: 44, lineHeight: 40, letterSpacing: -1, color: colors.spotText, marginBottom: 4 },
  kept: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, marginBottom: 2 },
  keptFaces: { flexDirection: 'row', alignItems: 'center' },
  keptFace: { width: KEPT + 4, height: KEPT + 4, borderRadius: radius.sm, overflow: 'hidden', borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink2 },
  keptOverlap: { marginLeft: -12 },
  keptLive: { borderColor: colors.spot },
  keptMore: { backgroundColor: colors.paper },
  keptMoreText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  keptText: { flex: 1, gap: 2 },
  keptNames: { fontFamily: fonts.semibold, fontSize: 18, letterSpacing: -0.4, color: colors.paper },
  keptWord: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.2, color: colors.spotText },
  avNote: { flexShrink: 1, fontFamily: fonts.regular, fontSize: 12, color: colors.paper, marginLeft: 6 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btnRed: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: colors.spot, borderRadius: radius.pill },
  btnLine: { paddingVertical: 9, paddingHorizontal: 15, borderWidth: 1, borderColor: colors.paper, backgroundColor: 'rgba(14,13,12,0.6)', borderRadius: radius.pill },
  btnSmall: { paddingVertical: 7, paddingHorizontal: 12 },
  btnTextRed: { fontFamily: fonts.medium, fontSize: 13, letterSpacing: -0.1, color: colors.ink },
  btnTextLine: { fontFamily: fonts.medium, fontSize: 13, letterSpacing: -0.1, color: colors.paper },

  page: { paddingHorizontal: brand.left },
  heroGold: { borderWidth: 1.5, borderColor: GOLD },
  badge: { position: 'absolute', top: 14, left: 14, backgroundColor: colors.spot, paddingVertical: 4, paddingHorizontal: 9, borderRadius: radius.pill },
  badgeGold: { backgroundColor: GOLD },
  badgeText: { fontFamily: fonts.jet, fontSize: 9.5, letterSpacing: 1.2, color: colors.ink },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
  dotSmall: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.ink3 },
  dotOn: { width: 16, backgroundColor: colors.paper },

  post: { marginTop: 26 },
  postHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: brand.left, marginBottom: 10 },
  postMark: { width: 34, height: 34, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.ink3, alignItems: 'center', justifyContent: 'center' },
  postMarkOn: { borderColor: colors.spot },
  postMarkText: { fontFamily: fonts.medium, fontSize: 15, color: colors.mute },
  postMarkTextOn: { color: colors.spotText },
  postWho: { flex: 1, gap: 2 },
  postVenue: { fontFamily: fonts.medium, fontSize: 14.5, letterSpacing: -0.2, color: colors.paper },
  postMeta: { fontFamily: fonts.jet, fontSize: 9.5, letterSpacing: 1, color: colors.meta },
  postPhoto: { width: '100%', backgroundColor: colors.ink2 },
  postBody: { paddingHorizontal: brand.left, paddingTop: 10, gap: 4 },
  postThere: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.spotText },
  postTitle: { fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 20, color: colors.paper },
  feedEnd: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.2, color: colors.meta, textAlign: 'center', marginTop: 28 },
});
