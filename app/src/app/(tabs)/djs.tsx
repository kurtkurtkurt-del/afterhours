import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Tips from '@/components/Tips';
import Storage from 'expo-sqlite/kv-store';
import { Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ClipShelf from '@/components/ClipShelf';
import { PeopleSearch } from '@/components/People';
import BigPicker from '@/components/BigPicker';
import Pill from '@/components/Pill';
import StoryViewer, { type StoryItem } from '@/components/StoryViewer';
import SoundCorner from '@/components/SoundCorner';
import Vinyl from '@/components/Vinyl';
import { TAB_BAR_SPACE, useTabBarSpace } from '@/components/TabBar';
import { useAmbient } from '@/audio/AmbientContext';
import { useTrack } from '@/audio/useTrack';
import { listenTracks } from '@/content/soundtracks';
import { useAuth } from '@/auth/AuthContext';
import { clips as sampleClips } from '@/content/clips';
import { stories } from '@/content/stories';
import { djs as localDjs, sets as localSets, type Dj, type DjSet } from '@/content/djs';
import type { Genre } from '@/content/music';
import { followedSlugs, loadDjs } from '@/data/djs';
import { useRefreshOnFocus } from '@/hooks/useRefresh';
import { useTabReset } from '@/hooks/useTabReset';
import { upperData, useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

const H = 3600_000;
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const photoOf = (dj: Dj): ImageSourcePropType => (dj.photoUrl ? { uri: dj.photoUrl } : dj.photo);
const GENRES: (Genre | 'all')[] = ['all', 'techno', 'house', 'rap'];
const SEEN = 'stories.seen';

// DJs, top to bottom: search, genre filter, stories, what is playing now, then clips
// shared by DJs (a large card over a record rack). The page ends there. While searching,
// the results replace everything below the field.
export default function DjsScreen() {
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const { t, tn, up } = useLang();
  const { session } = useAuth();
  const ambient = useAmbient();
  const tick = useRefreshOnFocus('djs');
  const scroll = useRef<ScrollView>(null);
  const [genre, setGenre] = useState<Genre | 'all'>('all');
  const [sheet, setSheet] = useState(false);
  const [query, setQuery] = useState('');
  // the stories being watched: the row's stories frozen at the moment one was tapped
  const [queue, setQueue] = useState<{ items: StoryItem[]; start: number } | null>(null);
  const [seen, setSeen] = useState<string[]>(() => (Storage.getItemSync(SEEN) ?? '').split(',').filter(Boolean));
  useTabReset('djs', () => {
    setGenre('all');
    setQuery('');
    scroll.current?.scrollTo({ y: 0, animated: true });
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => new Date(), [tick]); // refresh the clock whenever the tab opens
  const [data, setData] = useState<{ djs: Dj[]; sets: DjSet[]; live: boolean | null }>({ djs: localDjs, sets: [], live: null });
  const [follows, setFollows] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    loadDjs()
      .then((d) => !cancelled && setData({ djs: d.djs, sets: d.sets, live: d.live }))
      .catch(() => !cancelled && setData({ djs: localDjs, sets: localSets(new Date()), live: false }));
    if (session) followedSlugs().then((f) => !cancelled && setFollows(f), () => {});
    return () => {
      cancelled = true;
    };
  }, [tick, session]);

  const djOf = (slug: string) => data.djs.find((d) => d.id === slug) ?? localDjs.find((d) => d.id === slug);
  const fits = (slug: string) => genre === 'all' || djOf(slug)?.sound === genre;
  const ends = (s: DjSet) => s.startsAt.getTime() + s.hours * H;

  // Nobody on right now: one sample set that started an hour ago, labelled as a sample,
  // so the "now" card and a LIVE ring are always there to see.
  const onNow = (s: DjSet) => s.startsAt <= now && ends(s) > now.getTime();
  const sampleLive: DjSet | null = data.live !== null && !data.sets.some(onNow)
    ? { dj: data.djs.some((d) => d.id === 'levent-ok') ? 'levent-ok' : (data.djs[0]?.id ?? 'levent-ok'), venue: 'harry klein', startsAt: new Date(now.getTime() - H), hours: 3 }
    : null;
  const sets = sampleLive ? [sampleLive, ...data.sets] : data.sets;

  const nightEnd = new Date(now);
  nightEnd.setHours(8, 0, 0, 0);
  if (nightEnd <= now) nightEnd.setDate(nightEnd.getDate() + 1);
  const tonight = sets.filter((s) => ends(s) > now.getTime() && s.startsAt <= nightEnd);
  const live = tonight
    .filter((s) => s.startsAt <= now && fits(s.dj))
    .sort((a, b) => Number(follows.includes(b.dj)) - Number(follows.includes(a.dj)));
  const liveSlugs = new Set(tonight.filter((s) => s.startsAt <= now).map((s) => s.dj));
  const tonightOf = (slug: string) => {
    const s = tonight.find((x) => x.dj === slug);
    return s ? { venue: s.venue, time: hhmm(s.startsAt) } : null;
  };

  // Stories: DJs with a story first (unseen before seen), then the DJs you follow,
  // or everyone when you follow nobody. A red ring means a story you have not seen.
  const storyOf = (slug: string) => stories.find((st) => st.dj === slug);
  const fresh = (slug: string) => !!storyOf(slug) && !seen.includes(slug);
  const base = follows.length ? follows.map(djOf).filter((d): d is Dj => !!d) : data.djs;
  const withStory = stories.map((st) => djOf(st.dj)).filter((d): d is Dj => !!d);
  const strip = [...withStory, ...base.filter((d) => !storyOf(d.id))].sort((a, b) => Number(fresh(b.id)) - Number(fresh(a.id)));
  const unseen = stories.filter((st) => !seen.includes(st.dj)).length;
  const openStory = (dj: Dj) => {
    if (!storyOf(dj.id)) return router.push(`/dj/${dj.id}`);
    const items = strip.filter((d) => storyOf(d.id)).map((d) => ({ story: storyOf(d.id)!, name: d.name, avatar: photoOf(d) }));
    setQueue({ items, start: Math.max(0, items.findIndex((x) => x.story.dj === dj.id)) });
  };
  const markSeen = useCallback((dj: string) => {
    setSeen((prev) => {
      if (prev.includes(dj)) return prev;
      const next = [...prev, dj];
      Storage.setItemSync(SEEN, next.join(','));
      return next;
    });
  }, []);

  const q = query.trim().toLowerCase();
  const found = q ? data.djs.filter((d) => [d.name, d.genre, d.city].some((f) => f.toLowerCase().includes(q))) : [];

  const pickGenre = (g: Genre | 'all') => {
    setGenre(g);
    // follow the filter with the music, but only if it is already playing
    if (g !== 'all' && ambient.on) ambient.setGenre(g);
  };

  const clips = sampleClips.filter((c) => fits(c.dj));

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.band}>
        <Text style={styles.title}>{t('djs.title')}</Text>
        <SoundCorner />
      </View>
      <ScrollView ref={scroll} contentContainerStyle={[styles.body, { paddingBottom: TAB_BAR_SPACE + insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        {data.live === null ? <Text style={styles.note}>{up(t('djs.loading'))}</Text> : null}
        {data.live === false ? <Text style={styles.note}>{up(t('djs.sample'))}</Text> : null}

        <PeopleSearch value={query} onChange={setQuery} placeholder={t('djs.search')} />
        {q ? (
          <View style={styles.results}>
            {found.length ? (
              found.map((dj) => (
                <Pressable key={dj.id} onPress={() => router.push(`/dj/${dj.id}`)} accessibilityRole="button" style={({ pressed }) => [styles.result, pressed && styles.pressed]}>
                  <Image source={photoOf(dj)} style={styles.resultPhoto} />
                  <View style={styles.resultText}>
                    <Text style={styles.resultName} numberOfLines={1}>{dj.name}</Text>
                    <Text style={styles.mono} numberOfLines={1}>{upperData([dj.genre, dj.city].filter(Boolean).join(' · '))}</Text>
                  </View>
                  {liveSlugs.has(dj.id) ? <Text style={styles.liveTagInline}>LIVE</Text> : null}
                  <Text style={styles.chev}>›</Text>
                </Pressable>
              ))
            ) : (
              <Text style={styles.note}>{up(t('djs.noResults'))}</Text>
            )}
          </View>
        ) : (
        <>
        {/* The genre as one pill, like the flow and the map; the list opens from the bottom. */}
        <View style={styles.pills}>
          <Pill label={genre === 'all' ? t('djs.all') : genre} active={genre !== 'all'} onPress={() => setSheet(true)} a11y={t('djs.genre')} />
        </View>

        <View style={styles.sec}>
          <Text style={styles.secText}>{up(t('djs.stories'))}</Text>
          {unseen ? <Text style={styles.secRed}>{up(tn('djs.newStories', unseen))}</Text> : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {strip.map((dj) => (
            <Pressable key={dj.id} onPress={() => openStory(dj)} accessibilityRole="button" accessibilityLabel={dj.name} style={({ pressed }) => [styles.person, !fits(dj.id) && styles.dim, pressed && styles.pressed]}>
              <Ring photo={photoOf(dj)} story={storyOf(dj.id) ? (fresh(dj.id) ? 'new' : 'seen') : 'none'} live={liveSlugs.has(dj.id)} />
              <Text style={styles.personName} numberOfLines={1}>{dj.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.sec}>
          <Text style={styles.secText}>{up(t('djs.now'))}</Text>
        </View>
        {live[0] ? (
          <NowCard set={live[0]} dj={djOf(live[0].dj)} followed={follows.includes(live[0].dj)} now={now} ends={ends(live[0])} sample={live[0] === sampleLive} />
        ) : (
          <View style={[styles.now, styles.nowEmpty]}>
            <Text style={styles.nowEmptyText}>{genre === 'all' ? t('djs.nobody') : t('djs.nobodyGenre', { genre })}</Text>
          </View>
        )}
        {live.length > 1 ? (
          <Text style={styles.also} numberOfLines={2}>
            {t('djs.also')} {live.slice(1).map((s) => `${djOf(s.dj)?.name ?? s.dj} · ${s.venue}`).join(', ')}
          </Text>
        ) : null}

        <View style={styles.sec}>
          <Text style={styles.secText}>{up(t('clips.title'))}</Text>
          <Text style={styles.secText}>{up(t('clips.from'))}</Text>
        </View>
        <ClipShelf clips={clips} djOf={djOf} tonight={tonightOf} />
        <Text style={styles.foot}>{up(t('clips.sample'))}</Text>
        </>
        )}
      </ScrollView>
      <BigPicker
        open={sheet}
        title={t('djs.genre')}
        options={GENRES.map((g) => ({ id: g, label: g === 'all' ? t('djs.all') : g, count: g === 'all' ? data.djs.length : data.djs.filter((d) => d.sound === g).length }))}
        selected={genre}
        onSelect={(id) => {
          setSheet(false);
          pickGenre(id as Genre | 'all');
        }}
        onClose={() => setSheet(false)}
      />
      <StoryViewer items={queue?.items ?? []} start={queue ? queue.start : null} onSeen={markSeen} onClose={() => setQueue(null)} />
      <Tips page="djs" tips={[{ title: 'tips.djs.1.t', body: 'tips.djs.1.b', motion: 'tap' }, { title: 'tips.djs.2.t', body: 'tips.djs.2.b' }]} bottom={tabSpace + 12} />
    </View>
  );
}

// A DJ in the stories row: red ring for a story you have not seen, grey once seen,
// none without a story. LIVE marks a set that is on right now.
function Ring({ photo, story, live }: { photo: ImageSourcePropType; story: 'new' | 'seen' | 'none'; live: boolean }) {
  return (
    <View style={styles.ringBox}>
      <View style={[styles.ring, story === 'new' && styles.ringNew, story === 'seen' && styles.ringSeen]}>
        <Image source={photo} style={styles.ringPhoto} />
      </View>
      {live ? <Text style={styles.liveTag}>LIVE</Text> : null}
    </View>
  );
}

// What is playing now: a spinning record, how far into the set, and "listen".
function NowCard({ set, dj, followed, now, ends, sample }: { set: DjSet; dj?: Dj; followed: boolean; now: Date; ends: number; sample: boolean }) {
  const { t, up } = useLang();
  const track = useTrack();
  // one of the "listen" tracks, the same one for this DJ each time
  const pick = listenTracks[[...set.dj].reduce((a, ch) => a + ch.charCodeAt(0), 0) % listenTracks.length];
  if (!dj) return null;
  const listening = track.playing === set.dj;
  const progress = Math.max(0, Math.min(1, (now.getTime() - set.startsAt.getTime()) / (ends - set.startsAt.getTime())));
  return (
    <Pressable onPress={() => router.push(`/dj/${dj.id}`)} style={styles.now}>
      <Vinyl size={132} label={photoOf(dj)} spinning />
      <View style={styles.nowText}>
        <View style={styles.kicker}>
          <View style={styles.dot} />
          <Text style={styles.kickerText} numberOfLines={1}>{up(t('djs.at', { venue: set.venue }))}{sample ? ` · ${up(t('djs.example'))}` : ''}</Text>
        </View>
        <Text style={styles.nowName} numberOfLines={2}>{dj.name}</Text>
        <Text style={styles.mono}>{upperData(dj.genre)}{followed ? ` · ${up(t('djs.youFollow'))}` : ''}</Text>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.times}>
          <Text style={styles.time}>{hhmm(set.startsAt)}</Text>
          <Text style={styles.time}>{hhmm(new Date(ends))}</Text>
        </View>
        <Pressable onPress={() => track.play(set.dj, pick)} accessibilityRole="button" style={({ pressed }) => [styles.listen, listening && styles.listenOn, pressed && styles.pressed]}>
          <Text style={[styles.listenText, listening && styles.listenTextOn]}>{listening ? t('djs.listening') : t('djs.listen')}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pills: { flexDirection: 'row', paddingHorizontal: brand.left, marginTop: 4 },
  root: { flex: 1, backgroundColor: colors.ink },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 36, backgroundColor: colors.ink, zIndex: 2 },
  title: { position: 'absolute', top: brand.top - 8, left: brand.left, fontFamily: fonts.semibold, fontSize: 30, lineHeight: 32, letterSpacing: -0.9, color: colors.paper },
  body: { paddingTop: brand.top + 48 },
  pressed: { opacity: 0.7 },
  dim: { opacity: 0.3 },
  note: { fontFamily: fonts.regular, fontSize: 10, letterSpacing: 1.6, color: colors.meta, paddingHorizontal: brand.left, marginBottom: 10 },
  sec: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: brand.left, marginTop: 26, marginBottom: 12 },
  secText: { fontFamily: fonts.regular, fontSize: 10, letterSpacing: 1.6, color: colors.meta },
  secRed: { fontFamily: fonts.regular, fontSize: 10, letterSpacing: 1.6, color: colors.spotText },
  strip: { gap: 14, paddingHorizontal: brand.left },
  person: { width: 62, alignItems: 'center', gap: 6 },
  personName: { fontFamily: fonts.regular, fontSize: 10.5, color: colors.mute, maxWidth: 64 },
  ringBox: { width: 60, height: 60 },
  ring: { width: 60, height: 60, borderRadius: 30, padding: 3, borderWidth: 1.5, borderColor: colors.ink3, backgroundColor: colors.ink },
  ringNew: { borderColor: colors.spot, borderWidth: 2.5 },
  ringSeen: { borderColor: colors.mute },
  ringPhoto: { width: '100%', height: '100%', borderRadius: 27 },
  liveTag: { position: 'absolute', right: -2, bottom: 0, fontFamily: fonts.jet, fontSize: 7.5, letterSpacing: 0.6, color: colors.paper, backgroundColor: colors.spot, borderRadius: radius.pill, paddingHorizontal: 5, paddingVertical: 1, overflow: 'hidden' },
  results: { paddingHorizontal: brand.left },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderTopWidth: 1, borderTopColor: colors.ink3 },
  resultPhoto: { width: 44, height: 44, borderRadius: radius.sm },
  resultText: { flex: 1 },
  resultName: { fontFamily: fonts.semibold, fontSize: 17, letterSpacing: -0.4, color: colors.paper },
  liveTagInline: { fontFamily: fonts.jet, fontSize: 8.5, letterSpacing: 0.6, color: colors.paper, backgroundColor: colors.spot, borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  chev: { fontSize: 20, color: colors.mute },
  now: { marginHorizontal: 16, padding: 16, borderRadius: radius.lg, backgroundColor: colors.ink2, flexDirection: 'row', alignItems: 'center', gap: 16 },
  nowEmpty: { paddingVertical: 28 },
  nowEmptyText: { fontFamily: fonts.regular, fontSize: 14, color: colors.mute },
  nowText: { flex: 1 },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.spot },
  kickerText: { flex: 1, fontFamily: fonts.jet, fontSize: 9.5, letterSpacing: 1.2, color: colors.spotText },
  nowName: { fontFamily: fonts.semibold, fontSize: 26, lineHeight: 27, letterSpacing: -0.8, color: colors.paper, marginTop: 6 },
  mono: { fontFamily: fonts.jet, fontSize: 9.5, letterSpacing: 0.8, color: colors.mute, marginTop: 3 },
  bar: { height: 3, borderRadius: 2, backgroundColor: colors.ink3, marginTop: 12, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.spot },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  time: { fontFamily: fonts.jet, fontSize: 9.5, color: colors.meta },
  listen: { alignSelf: 'flex-start', marginTop: 12, paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.paper },
  listenOn: { backgroundColor: colors.spot },
  listenText: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.ink },
  listenTextOn: { color: colors.paper },
  also: { fontFamily: fonts.regular, fontSize: 12, color: colors.meta, paddingHorizontal: brand.left, marginTop: 8 },
  foot: { fontFamily: fonts.regular, fontSize: 10, letterSpacing: 1.4, color: colors.meta, paddingHorizontal: brand.left, marginTop: 14 },
});
