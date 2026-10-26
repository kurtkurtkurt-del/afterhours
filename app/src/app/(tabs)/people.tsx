import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Tips from '@/components/Tips';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { peek, useShelf } from '@/lib/offline';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgUri } from 'react-native-svg';
import WhoSheet from '@/components/WhoSheet';
import { openPerson } from '@/components/People';
import { coverSource, GROUP_COLORS, groupPlan, myGroups, type GroupRow, type Plan, type Round } from '@/data/groups';
import { ticketsMine } from '@/data/tickets';
import GroupBadge from '@/components/GroupBadge';
import SoundCorner from '@/components/SoundCorner';
import DeckViewer from '@/components/DeckViewer';
import MotifField from '@/components/Motifs';
import { bySoonest, nextDate, specialOf, specials, type SpecialId } from '@/content/specials';
import { fetchSpecial } from '@/data/specials';
import { toDeckCard, type DeckCard } from '@/components/CardFace';
import { TAB_BAR_SPACE, useTabBarSpace } from '@/components/TabBar';
import { fetchDeck, posterUrl, swipe, unswipe, type Night } from '@/data/deck';
import { supabase } from '@/lib/supabase';
import { friendById as sampleFriendById, friends as sampleFriends, matches as sampleMatches, nights as sampleNights, sampleText } from '@/content/friends';
import { useYours, type YoursFriend, type YoursMatch, type YoursNight } from '@/data/yours';
import { SAMPLES } from '@/content/samples';
import { waveCards, wavesKept, type WaveKept } from '@/data/waves';
import { useAuth } from '@/auth/AuthContext';
import { useTabReset } from '@/hooks/useTabReset';
import { dayLabel } from '@/data/when';
import { sparkInbox, type SparkInvite } from '@/data/sparks';
import { rsvpFor, rsvpSet, type Answer, type Rsvp } from '@/data/rsvp';
import Avatar from '@/components/Avatar';
import { useLocalCity } from '@/data/here';
import { sparkOf } from '@/content/sparks';
import { upperData, useLang } from '@/i18n';
import { colors, fonts, radius, barStyle, scrim } from '@/theme/tokens';
import { brand } from '@/theme/layout';

const fallbackPhoto = require('../../../assets/intro/concert.jpg');

// Connect (12.10.2026, design A in prototypes/connect.html; the tab was people): the first
// two groups as covers, then the gallery and the decks (messages is the tab beside it).
// Search and the faces of your people moved to the messages page. Before: top to
// bottom: search (typing replaced the page with people results); one thin line to the
// groups (their badges, how many are live); "with your people", a gallery that mixes
// the groups' plans and open votes (first), the nights your friends kept (most keepers
// first) and the sparks waiting for your answer, one full photo each, sliding by itself
// every 6 s; the decks as card stacks (a tap opens the viewer); your people (faces, a red
// ring for whoever is out right now, what each is up to). Stories, posts and past nights
// are in yours. A group without a plan or a vote is only in the line, not the gallery.
// first names for the people further out on a sample wave (never shown as real)
const WAVE_NAMES = ['tarık', 'noa', 'ece', 'felix', 'mele', 'hana', 'yusuf', 'ruby', 'lev', 'ana', 'kai', 'bo'];

export default function PeopleScreen() {
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  // Your groups (44_groups.sql), read on every visit.
  useShelf('groups'); // redraws when a refresh lands on the shelf
  const [freshGroups, setGroups] = useState<GroupRow[] | null>(null);
  const groups = freshGroups ?? peek<GroupRow[]>('groups', '') ?? [];
  const { session } = useAuth();
  const real = useYours();
  const { t, tn, tx, up, lang } = useLang();
  const uid = session?.user.id;
  // The nights you said you have a ticket for: a mark on their cards in your deck.
  const [ticketed, setTicketed] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!uid) return;
    let live = true;
    ticketsMine().then((set) => live && setTicketed(set), () => {});
    return () => {
      live = false;
    };
  }, [uid, real.ready]);
  // Who is coming: your answers (stored, friends see them) and your friends' (32_rsvp.sql).
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [theirAnswers, setTheirAnswers] = useState<Rsvp[]>([]);
  // Each living group's plan or open vote (46_group_plans.sql), for the gallery.
  const [plans, setPlans] = useState<{ g: GroupRow; plan: Plan | null; round: Round | null; members: number }[]>([]);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      myGroups()
        .then(async (list) => {
          if (!live) return;
          setGroups(list);
          const living = list.filter((g) => !g.archived);
          const states = await Promise.all(living.map((g) => groupPlan(g.id).then((st) => ({ g, plan: st.plan, round: st.round, members: st.members }), () => null)));
          if (!live) return;
          const kept = states.filter((x): x is NonNullable<typeof x> => !!x && (!!x.plan || !!x.round));
          setPlans(kept);
          // My own answer on each plan's night, so its button starts right.
          setAnswers((a) => {
            const next = { ...a };
            kept.forEach(({ plan }) => {
              const me = plan?.people.find((x) => x.id === uid);
              if (plan && me?.answer && !(plan.id in next)) next[plan.id] = me.answer;
            });
            return next;
          });
        })
        .catch(() => {});
      return () => {
        live = false;
      };
    }, [uid]),
  );
  // Samples fill whatever is still empty, each with a "sample" note: the friend row
  // until you have friends (a pending request counts), the feed until a friend keeps
  // a night. A first friend request no longer empties the whole screen.
  const sampleRow = SAMPLES && real.ready && real.friends.length === 0;
  const sample = SAMPLES && real.ready && real.nights.length === 0;
  const friends: YoursFriend[] = sampleRow
    ? sampleFriends.map((f) => ({ id: f.id, name: f.name, handle: f.handle, live: f.live, kept: f.kept }))
    : real.friends;
  // Nights coming up in the city you are in (followed by location, not the deck's pick):
  // they fill the gallery after friends' nights there, and stand in as samples (with
  // sample friends on them) until you have friends; the drawn sample nights only while
  // those load or offline.
  const local = useLocalCity();
  const feedCity = local.slug ?? 'munchen';
  const [upcoming, setUpcoming] = useState<Night[]>([]);
  // more real nights of the city, for the sample waves (not the ones on the sample friends' deck)
  const [wavePool, setWavePool] = useState<Night[]>([]);
  // Specialties: one deck per occasion, soonest first (content/specials.ts).
  const occasions = useMemo(() => bySoonest(specials), []);
  const [special, setSpecial] = useState<Partial<Record<SpecialId, Night[]>>>({});
  useEffect(() => {
    let live = true;
    occasions.forEach((o) => fetchSpecial(o, feedCity).then((rows) => live && setSpecial((m) => ({ ...m, [o.id]: rows }))));
    return () => {
      live = false;
    };
  }, [occasions, feedCity]);
  const specialDecks = useMemo(() => Object.fromEntries(Object.entries(special).map(([id, rows]) => [id, (rows ?? []).map((n) => toDeckCard(n, []))])) as Partial<Record<SpecialId, DeckCard[]>>, [special]);
  const specialCards = (id: SpecialId) => specialDecks[id] ?? [];
  const isSpecial = (d: typeof deck): d is SpecialId => !!d && specials.some((o) => o.id === d);
  const monthName = (d: Date) => d.toLocaleDateString(lang === 'tr' ? 'tr-TR' : lang === 'de' ? 'de-DE' : 'en-GB', { month: 'long' }).toLowerCase();
  useEffect(() => {
    let live = true;
    fetchDeck(feedCity, null, 40)
      .then((rows) => {
        if (!live) return;
        const withPhoto = rows.filter((n) => n.image_url);
        setUpcoming(withPhoto.slice(0, 8));
        setWavePool(withPhoto.slice(8, 22));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [feedCity]);
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
  // Called at render, after the gallery (ranked) is built: it holds the city's nights too.
  const nightById = (id: string) => ranked.find((n) => n.id === id);
  // Live names for the feed's squares: sample friends go with the sample feed.
  const live = useMemo(
    () => new Set((sample ? sampleFriends : friends).filter((f) => f.live).map((f) => f.name)),
    [sample, friends],
  );
  const [meToo, setMeToo] = useState<Record<string, boolean>>({});
  const [asking, setAsking] = useState<string | null>(null);

  // Friend search: while typing, results replace the page.
  const [query, setQuery] = useState('');
  const [deck, setDeck] = useState<'mine' | 'friends' | 'wave2' | 'wave3' | SpecialId | null>(null);
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
  useTabReset('people', () => {
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
  // Until anyone out there keeps something: the city's real nights coming up, with sample
  // chains on them — your (sample) friend, then the keeper you do not know (owner, 26.10.2026:
  // the invented nights that stood here are gone; the deck says sample).
  const sampleWave = (wave: 2 | 3) =>
    wavePool
      .filter((_, i) => (wave === 2 ? i % 2 === 0 : i % 2 === 1))
      .map((n, i): DeckCard => {
        const friend = sampleFriends[i % sampleFriends.length].name;
        const between = WAVE_NAMES[(i * 3 + 1) % WAVE_NAMES.length];
        const keeper = WAVE_NAMES[(i * 3 + (wave === 2 ? 1 : 2)) % WAVE_NAMES.length];
        return { ...toDeckCard(n, []), key: `w${wave}-${n.id}`, via: { wave, path: wave === 2 ? [friend, keeper] : [friend, between, keeper] } };
      });
  const wave2 = realWave2.length ? realWave2 : sampleWave(2);
  const wave3 = realWave3.length ? realWave3 : sampleWave(3);
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
        return { ...toDeckCard(n, names.map((name) => ({ name, live: live.has(name) }))), ticket: ticketed.has(n.id) };
      }),
    [real.mine, real.swipes, live, ticketed],
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
  // Friends' nights in your city first, then what is coming up there, then their nights elsewhere.
  const byKeepers = (a: YoursNight, b: YoursNight) => b.friends.length - a.friends.length || String(a.startsAt ?? '').localeCompare(String(b.startsAt ?? ''));
  const here = sample ? nights : nights.filter((n) => n.city === feedCity).sort(byKeepers);
  const filler: YoursNight[] = sample
    ? []
    : upcoming
        .filter((u) => !nights.some((n) => n.id === u.id))
        .map((u) => ({ id: u.id, slug: u.slug, title: u.title.toLowerCase(), venue: u.venue_name ?? u.city_name, when: dayLabel(u.starts_at), startsAt: u.starts_at, image: u.image_url, friends: [], city: feedCity }));
  const elsewhere = sample ? [] : nights.filter((n) => n.city !== feedCity).sort(byKeepers);
  const ranked = [...here, ...filler, ...elsewhere];
  const matched = new Set(matches.map((mt) => mt.night));
  type Slide =
    | { kind: 'night'; key: string; n: YoursNight }
    | { kind: 'spark'; key: string; s: SparkInvite }
    | { kind: 'plan'; key: string; g: GroupRow; p: Plan }
    | { kind: 'round'; key: string; g: GroupRow; r: Round; members: number };
  // The groups' plans and votes come first: they are the nights already decided, or being decided.
  const slides: Slide[] = [
    ...plans.flatMap(({ g, plan, round, members }): Slide[] =>
      plan ? [{ kind: 'plan', key: `p${g.id}`, g, p: plan }] : round ? [{ kind: 'round', key: `r${g.id}`, g, r: round, members }] : []),
    ...ranked.slice(0, 8).map((n): Slide => ({ kind: 'night', key: n.id, n })),
    ...sparkAsks.map((sp): Slide => ({ kind: 'spark', key: `s${sp.id}`, s: sp })),
  ];
  const galleryIds = slides
    .map((sl) => (sl.kind === 'night' ? sl.n.id : sl.kind === 'plan' ? sl.p.id : ''))
    .filter((id) => /^[0-9a-f-]{36}$/.test(id))
    .join(',');
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
  const squareW = Math.floor((slideW - 10) / 2);
  const step = width;

  // Slides on by itself every 6 s; a finger on it restarts the count.
  const gallery = useRef<FlatList<Slide>>(null);
  const [slide, setSlide] = useState(0);
  const [touched, setTouched] = useState(0);
  const count = slides.length;
  // Only while this tab is on screen: tabs stay mounted, and a timer here re-rendered the
  // whole tab every 6 s while the person was on another one (the app stuttered, 20.10.2026).
  useFocusEffect(
    useCallback(() => {
      if (count < 2 || query.trim() || deck) return;
      const timer = setInterval(() => {
        setSlide((i) => {
          const next = (i + 1) % count;
          gallery.current?.scrollToOffset({ offset: next * step, animated: true });
          return next;
        });
      }, 6000);
      return () => clearInterval(timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [count, step, touched, query, deck]),
  );

  const decks: { id: 'mine' | 'friends' | 'wave2' | 'wave3'; label: string; cards: DeckCard[]; red?: boolean }[] = [
    { id: 'friends', label: t('deck.friends'), cards: friendsDeck, red: true },
    { id: 'mine', label: t('deck.yours'), cards: mineCards },
    { id: 'wave2', label: t('deck.wave2'), cards: wave2 },
    { id: 'wave3', label: t('deck.wave3'), cards: wave3 },
  ];

  return (
    <View style={styles.root}>
      <StatusBar style={barStyle} />
      <View style={styles.band}>
        <Text style={styles.title}>{t('connect.title')}</Text>
        <SoundCorner />
      </View>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.body, { paddingBottom: TAB_BAR_SPACE + insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        {
          <>
            {/* Groups (connect, design A, 12.10.2026): the first two as covers, side by side;
                the plans themselves are in the gallery. A tap opens the group; the heading opens all. */}
            <View style={styles.groupsHead}>
              <Text style={styles.groupsTitle}>{t('groups.entry')}{groups.some((g) => g.live) ? <Text style={styles.redText}> · {t('groups.liveNow', { n: groups.reduce((a, g) => a + g.live, 0) })}</Text> : null}</Text>
              <Pressable onPress={() => router.push('/groups')} hitSlop={8} accessibilityRole="button">
                <Text style={styles.groupsAll}>{groups.filter((g) => !g.archived).length > 2 ? `${t('connect.groups.all')} · ${groups.filter((g) => !g.archived).length} ›` : '+'}</Text>
              </Pressable>
            </View>
            {groups.filter((g) => !g.archived).length ? (
              <View style={styles.covers}>
                {groups.filter((g) => !g.archived).slice(0, 2).map((g) => {
                  const st = plans.find((x) => x.g.id === g.id);
                  const line = g.kind === 'travel' ? t('connect.group.travel', { n: g.members }) : st?.round ? t('groups.card.closes', { at: dayLabel(st.round.closes_at) }) : st?.plan ? st.plan.title.toLowerCase() : t('connect.group.people', { n: g.members });
                  return (
                    <Pressable key={g.id} onPress={() => router.push({ pathname: '/groups/[id]', params: { id: g.id } })} style={({ pressed }) => [styles.cover, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={g.name}>
                      {coverSource(g.cover_path) ? <Image source={coverSource(g.cover_path)!} style={StyleSheet.absoluteFill} contentFit="cover" /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: GROUP_COLORS[g.color], opacity: 0.35 }]} />}
                      <LinearGradient colors={[scrim(0.0), scrim(0.92)]} locations={[0.3, 1]} style={StyleSheet.absoluteFill} />
                      <View style={styles.coverBadge}><GroupBadge emoji={g.emoji} color={g.color} cover={null} size={28} /></View>
                      <View style={styles.coverText}>
                        <Text style={styles.coverName} numberOfLines={1}>{g.name.toLowerCase()}</Text>
                        <Text style={[styles.coverLine, (g.live > 0 || !!st?.round) && styles.redOnPhoto]} numberOfLines={1}>{g.live > 0 ? t('groups.liveNow', { n: g.live }) : line}</Text>
                      </View>
                    </Pressable>
                  );
                })}
                {groups.filter((g) => !g.archived).length === 1 ? (
                  <Pressable onPress={() => router.push('/groups/new')} style={({ pressed }) => [styles.cover, styles.coverNew, pressed && styles.pressed]} accessibilityRole="button">
                    <Text style={styles.coverPlus}>+</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <Pressable onPress={() => router.push('/groups/new')} style={({ pressed }) => [styles.groupsLine, pressed && styles.pressed]} accessibilityRole="button">
                <Text style={styles.groupsText}>{t('connect.groups.none')}</Text>
                <Text style={styles.groupArrow}>+</Text>
              </Pressable>
            )}
            {/* Specialties: two squares to a screen, the rest sideways; a tap opens the deck. */}
            <Head label={t('special.title')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={squareW + 10} decelerationRate="fast" contentContainerStyle={styles.squares}>
              {occasions.map((o) => {
                const rows = special[o.id];
                const n = rows?.length ?? 0;
                const line = rows === undefined ? ' ' : n ? `${tn('special.nights', n)} · ${dayLabel(nextDate(o).toISOString())}` : t('special.back', { month: monthName(nextDate(o)) });
                return (
                  <Pressable key={o.id} onPress={() => setDeck(o.id)} style={({ pressed }) => [styles.square, { width: squareW, height: squareW }, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={t(o.label)}>
                    <LinearGradient colors={[o.ground, o.deep]} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={StyleSheet.absoluteFill} />
                    <MotifField special={o} width={squareW} height={squareW} kind="cover" />
                    <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']} style={styles.squareShade} pointerEvents="none" />
                    <View style={styles.squareText}>
                      <Text style={[styles.squareName, { color: o.ink }]} numberOfLines={2}>{t(o.label)}<Text style={{ color: o.accents[0] }}>.</Text></Text>
                      <Text style={[styles.squareLine, { color: o.ink }]} numberOfLines={1}>{up(line)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* With your people: the gallery. */}
            {count ? (
              <>
                <Head label={t('yours.withPeople')} note={sample ? up(t('yours.sample')) : `${two(slide + 1)}/${two(count)}`} />
                <FlatList
                  ref={gallery}
                  data={slides}
                  initialNumToRender={2}
                  maxToRenderPerBatch={2}
                  windowSize={3}
                  removeClippedSubviews
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
                      {item.kind === 'plan' ? (
                        <Pressable onPress={() => router.push({ pathname: '/groups/[id]', params: { id: item.g.id, tab: 'plan' } })} style={[styles.hero, { width: slideW, height: slideW * 1.08 }]}>
                          <Image source={item.p.image_url ? { uri: item.p.image_url } : fallbackPhoto} style={StyleSheet.absoluteFill} contentFit="cover" />
                          <LinearGradient colors={[scrim(0.55), scrim(0.0), scrim(0.55), colors.poster]} locations={[0, 0.25, 0.6, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
                          <View style={styles.planHead}>
                            <GroupBadge emoji={item.g.emoji} color={item.g.color} cover={item.g.cover_path} size={40} />
                            <View style={styles.planHeadText}>
                              <Text style={styles.planGroup} numberOfLines={1}>{item.g.name.toLowerCase()}</Text>
                              <Text style={styles.planMono}>{up(t('groups.card.plan'))}</Text>
                            </View>
                          </View>
                          <View style={styles.heroText}>
                            {(() => {
                              const mineIn = answers[item.p.id] ? answers[item.p.id] === 'in' : item.p.people.find((x) => x.id === uid)?.answer === 'in';
                              const others = item.p.people.filter((x) => x.id !== uid && x.answer === 'in');
                              const inNames = [...others.map((x) => x.name ?? ''), ...(mineIn ? [t('posts.you')] : [])];
                              return (
                                <>
                                  <Text style={[styles.heroMeta, styles.redOnPhoto]} numberOfLines={1}>{up(t('groups.card.in', { n: inNames.length, m: item.p.people.length }))}</Text>
                                  <Text style={styles.heroTitle} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>{item.p.title.toLowerCase()}</Text>
                                  <Text style={styles.heroMeta} numberOfLines={1}>{[item.p.venue_name, dayLabel(item.p.starts_at), item.p.starts_at?.slice(11, 16)].filter(Boolean).map((x) => upperData(String(x))).join(' · ')}</Text>
                                  <View style={styles.planRow}>
                                    <View style={styles.keptFaces}>
                                      {others.slice(0, 4).map((x, i) => (
                                        <View key={x.id} style={[styles.keptFace, i > 0 && styles.keptOverlap]}>
                                          <Avatar name={x.name ?? '?'} size={KEPT} />
                                        </View>
                                      ))}
                                      {others.length > 4 ? (
                                        <View style={[styles.keptFace, styles.keptOverlap, styles.keptMore]}>
                                          <Text style={styles.keptMoreText}>+{others.length - 4}</Text>
                                        </View>
                                      ) : null}
                                    </View>
                                    <Pressable onPress={() => answer(item.p.id, 'in')} style={({ pressed }) => [mineIn ? styles.btnLine : styles.btnRed, pressed && styles.pressed]} accessibilityRole="button">
                                      <Text style={mineIn ? styles.btnTextLine : styles.btnTextRed}>{mineIn ? t('groups.card.youreIn') : t('groups.card.imIn')}</Text>
                                    </Pressable>
                                  </View>
                                </>
                              );
                            })()}
                          </View>
                        </Pressable>
                      ) : item.kind === 'round' ? (
                        <Pressable onPress={() => router.push({ pathname: '/groups/[id]', params: { id: item.g.id, tab: 'plan' } })} style={[styles.hero, { width: slideW, height: slideW * 1.08 }]}>
                          <Image source={item.r.options.find((o) => o.image_url)?.image_url ? { uri: item.r.options.find((o) => o.image_url)!.image_url! } : fallbackPhoto} style={StyleSheet.absoluteFill} contentFit="cover" />
                          <LinearGradient colors={[scrim(0.55), scrim(0.0), scrim(0.55), colors.poster]} locations={[0, 0.25, 0.6, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
                          <View style={styles.planHead}>
                            <GroupBadge emoji={item.g.emoji} color={item.g.color} cover={item.g.cover_path} size={40} />
                            <View style={styles.planHeadText}>
                              <Text style={styles.planGroup} numberOfLines={1}>{item.g.name.toLowerCase()}</Text>
                              <Text style={styles.planMono}>{up(t('groups.card.vote'))}</Text>
                            </View>
                          </View>
                          <View style={styles.heroText}>
                            <Text style={[styles.heroMeta, styles.redOnPhoto]} numberOfLines={1}>{up(t('groups.vote.voted', { n: item.r.voted, m: item.members }))} · {up(t('groups.card.closes', { at: dayLabel(item.r.closes_at) }))}</Text>
                            <Text style={styles.heroTitle} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>{t('groups.card.nights', { n: item.r.options.length })}</Text>
                            <Text style={styles.heroMeta} numberOfLines={1}>{item.r.options.map((o) => o.title.toLowerCase()).join(' · ')}</Text>
                            <View style={styles.planRow}>
                              <Text style={styles.avNote} numberOfLines={1}>{item.r.my_vote ? t('groups.vote.mine') + ': ' + (item.r.options.find((o) => o.id === item.r.my_vote)?.title.toLowerCase() ?? '') : ''}</Text>
                              <Pressable onPress={() => router.push({ pathname: '/groups/[id]', params: { id: item.g.id, tab: 'plan' } })} style={({ pressed }) => [item.r.my_vote ? styles.btnLine : styles.btnRed, pressed && styles.pressed]} accessibilityRole="button">
                                <Text style={item.r.my_vote ? styles.btnTextLine : styles.btnTextRed}>{t('groups.card.voteGo')}</Text>
                              </Pressable>
                            </View>
                          </View>
                        </Pressable>
                      ) : item.kind === 'night' ? (
                        <Pressable onPress={() => item.n.slug && router.push(`/night/${item.n.slug}`)} style={[styles.hero, { width: slideW, height: slideW * 1.08 }]}>
                          <Image source={(item.n as YoursNight & { photo?: number }).photo ?? (item.n.image ? { uri: item.n.image } : fallbackPhoto)} style={StyleSheet.absoluteFill} contentFit="cover" />
                          <LinearGradient colors={[scrim(0.0), scrim(0.55), colors.poster]} locations={[0.3, 0.6, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
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
                                      {f?.photo ? <Image source={{ uri: f.photo }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Avatar name={f?.handle ?? name} size={KEPT} />}
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
                                <Text style={styles.keptNames} numberOfLines={1}>{item.n.friends.length ? names(item.n.friends) : t('yours.inCity', { city: (local.name ?? '').toLowerCase() })}</Text>
                                <Text style={styles.keptWord} numberOfLines={1}>
                                  {item.n.friends.length ? up(tn('yours.friendsKept', item.n.friends.length)) : up(t('yours.beFirst'))}
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
                          <Image source={sparkOf(item.s.kind).photo} style={StyleSheet.absoluteFill} contentFit="cover" />
                          <LinearGradient colors={[scrim(0.0), scrim(0.55), colors.poster]} locations={[0.3, 0.6, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
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
            ) : !real.ready || (sample && !upcoming.length) ? (
              <>
                {/* Still loading: the gallery's place is kept, so nothing below it jumps. */}
                <Head label={t('yours.withPeople')} />
                <View style={[styles.hero, styles.heroWait, { width: slideW, height: slideW * 1.08 }]} />
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


          </>
        }
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
          setTimeout(() => (f.handle ? openPerson(f.handle) : router.push(`/friend/${f.id}`)), 250);
        }}
        onClose={() => setAsking(null)}
      />

      {/* Card viewer: sits under the tab bar, which keeps floating on top. */}
      {deck ? (
        <DeckViewer
          mode={isSpecial(deck) ? 'special' : deck}
          special={isSpecial(deck) ? specialOf(deck) : undefined}
          cards={isSpecial(deck) ? specialCards(deck) : deck === 'mine' ? mineCards : deck === 'wave2' ? wave2 : deck === 'wave3' ? wave3 : friendsDeck}
          sample={!isSpecial(deck) && (waveSample || (deck === 'friends' && friendsSample))}
          onKeep={keepCard}
          onLetGo={letGoCard}
          onUndo={undoCard}
          onClose={closeDeck}
          empty={
            isSpecial(deck)
              ? t('special.empty')
              : deck === 'mine'
              ? session ? t('yours.emptyMine') : t('yours.emptyMineGuest')
              : deck === 'wave2' || deck === 'wave3'
                ? t('deck.waveEmpty')
                : real.friends.length ? t('yours.emptyFriends') : t('yours.emptyNoFriends')
          }
        />
      ) : null}
      <Tips page="people" tip={{ title: 'tips.people.1.t', body: 'tips.people.1.b', motion: 'tap' }} bottom={tabSpace + 12} />
    </View>
  );
}

const two = (n: number) => String(n).padStart(2, '0');

// One card of a deck stack: its photo, else its drawn poster, else the stock photo
// (an empty or broken picture left blank cards before).
function StackThumb({ card }: { card: DeckCard | undefined }) {
  const [broken, setBroken] = useState(false);
  if (card?.image && !broken) return <Image source={{ uri: card.image }} style={StyleSheet.absoluteFill} contentFit="cover" onError={() => setBroken(true)} />;
  if (card?.poster && !broken) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.stackPoster]}>
        <SvgUri uri={card.poster} width="100%" height="100%" onError={() => setBroken(true)} />
      </View>
    );
  }
  return (
    <>
      <Image source={fallbackPhoto} style={[StyleSheet.absoluteFill, styles.stackDim]} contentFit="cover" />
      {card ? <Text style={styles.stackTitle} numberOfLines={3}>{card.title.toLowerCase()}</Text> : null}
    </>
  );
}

// Who kept it, short: two names and +n.
const names = (list: string[]) => (list.length > 2 ? `${list.slice(0, 2).join(', ')} +${list.length - 2}` : list.join(', '));

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

const KEPT = 36; // the faces of who kept a night, on the gallery card
const FACE = 62;
const GOLD = '#E8B04B'; // sparks (as on the map)

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 44, backgroundColor: colors.ink, zIndex: 2 },
  title: { position: 'absolute', top: brand.top - 8, left: brand.left, fontFamily: fonts.semibold, fontSize: 30, lineHeight: 32, letterSpacing: -0.9, color: colors.paper },
  groupsLine: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12, marginTop: 12, marginHorizontal: brand.left, borderWidth: 1, borderColor: colors.ink3, borderRadius: radius.md },
  groupsHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4, paddingHorizontal: brand.left },
  groupsTitle: { fontFamily: fonts.medium, fontSize: 17, letterSpacing: -0.3, color: colors.paper },
  groupsAll: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute },
  // smaller than the page, air left and right (owner, 12.10.2026)
  covers: { flexDirection: 'row', gap: 10, marginTop: 10, marginHorizontal: brand.left },
  cover: { flex: 1, height: 126, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.ink3 },
  coverNew: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.mute },
  coverPlus: { fontFamily: fonts.medium, fontSize: 28, color: colors.mute },
  coverBadge: { position: 'absolute', left: 8, top: 8 },
  coverText: { position: 'absolute', left: 10, right: 10, bottom: 9 },
  coverName: { fontFamily: fonts.semibold, fontSize: 14, letterSpacing: -0.2, color: colors.onPhoto },
  coverLine: { fontFamily: fonts.jet, fontSize: 8.5, letterSpacing: 1, color: colors.onPhotoMute, marginTop: 3, textTransform: 'uppercase' },
  groupFaces: { flexDirection: 'row', minWidth: 28 },
  groupOverlap: { marginLeft: -10 },
  groupsText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.mute },
  groupArrow: { fontFamily: fonts.medium, fontSize: 22, color: colors.mute },
  // a group's plan or vote on the gallery: the badge and the name on top
  planHead: { position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  planHeadText: { flex: 1, gap: 1 },
  planGroup: { fontFamily: fonts.semibold, fontSize: 16, letterSpacing: -0.3, color: colors.onPhoto },
  planMono: { fontFamily: fonts.jet, fontSize: 9.5, letterSpacing: 1.2, color: colors.onPhotoMute },
  planRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8 },
  body: { paddingTop: brand.top + 56 },
  pressed: { opacity: 0.6 },
  redText: { color: colors.spotText },
  redOnPhoto: { color: colors.onPhotoSpot },
  goldText: { color: GOLD },

  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: brand.left, marginTop: 30, marginBottom: 12 },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headText: { fontFamily: fonts.medium, fontSize: 17, letterSpacing: -0.3, color: colors.paper },
  headDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.ink3 },
  headDotRed: { backgroundColor: colors.spot },
  headNote: { fontFamily: fonts.jet, fontSize: 10.5, letterSpacing: 1, color: colors.meta },
  rail: { paddingHorizontal: brand.left, gap: 12 },
  squares: { paddingHorizontal: brand.left, gap: 10, marginTop: 10 },
  square: { borderRadius: radius.md, overflow: 'hidden' },
  squareShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  squareText: { position: 'absolute', left: 12, right: 12, bottom: 11 },
  squareName: { fontFamily: fonts.logo, fontSize: 25, lineHeight: 26, letterSpacing: -0.3 },
  squareLine: { fontFamily: fonts.jet, fontSize: 8.5, letterSpacing: 1, opacity: 0.85, marginTop: 4 },

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
  heroWait: { alignSelf: 'center', backgroundColor: '#1a1917' },
  heroText: { position: 'absolute', left: 16, right: 16, bottom: 16, gap: 6 },
  heroMeta: { fontFamily: fonts.jet, fontSize: 10.5, letterSpacing: 1.2, color: colors.onPhoto },
  heroTitle: { fontFamily: fonts.logo, fontSize: 44, lineHeight: 40, letterSpacing: -1, color: colors.onPhotoSpot, marginBottom: 4 },
  kept: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, marginBottom: 2 },
  keptFaces: { flexDirection: 'row', alignItems: 'center' },
  keptFace: { width: KEPT + 4, height: KEPT + 4, borderRadius: radius.sm, overflow: 'hidden', borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink2 },
  keptOverlap: { marginLeft: -12 },
  keptLive: { borderColor: colors.spot },
  keptMore: { backgroundColor: colors.paper },
  keptMoreText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  keptText: { flex: 1, gap: 2 },
  keptNames: { fontFamily: fonts.semibold, fontSize: 18, letterSpacing: -0.4, color: colors.onPhoto },
  keptWord: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.2, color: colors.onPhotoSpot },
  avNote: { flexShrink: 1, fontFamily: fonts.regular, fontSize: 12, color: colors.onPhoto, marginLeft: 6 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btnRed: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: colors.spot, borderRadius: radius.pill },
  btnLine: { paddingVertical: 9, paddingHorizontal: 15, borderWidth: 1, borderColor: colors.onPhoto, backgroundColor: scrim(0.45), borderRadius: radius.pill },
  btnSmall: { paddingVertical: 7, paddingHorizontal: 12 },
  btnTextRed: { fontFamily: fonts.medium, fontSize: 13, letterSpacing: -0.1, color: colors.onSpot },
  btnTextLine: { fontFamily: fonts.medium, fontSize: 13, letterSpacing: -0.1, color: colors.onPhoto },

  page: { paddingHorizontal: brand.left },
  heroGold: { borderWidth: 1.5, borderColor: GOLD },
  badge: { position: 'absolute', top: 14, left: 14, backgroundColor: colors.spot, paddingVertical: 4, paddingHorizontal: 9, borderRadius: radius.pill },
  badgeGold: { backgroundColor: GOLD },
  badgeText: { fontFamily: fonts.jet, fontSize: 9.5, letterSpacing: 1.2, color: colors.ink },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
  dotSmall: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.ink3 },
  dotOn: { width: 16, backgroundColor: colors.paper },

});
