import { memo, useCallback, useEffect, useRef, useState } from 'react';
import Tips from '@/components/Tips';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import PostCard from '@/components/PostCard';
import { postsFeed, type Post } from '@/data/posts';
import StoryStrip from '@/components/StoryStrip';
import SoundCorner from '@/components/SoundCorner';
import MessagesButton from '@/components/MessagesButton';
import { TAB_BAR_SPACE, useTabBarSpace } from '@/components/TabBar';
import { useAuth } from '@/auth/AuthContext';
import { useTabReset } from '@/hooks/useTabReset';
import { dayLabel } from '@/data/when';
import { pastFeed, type PastNight } from '@/data/feed';
import ShareButton from '@/components/ShareButton';
import { shareNight } from '@/lib/share';
import { useLocalCity } from '@/data/here';
import { upperData, useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// Yours, the feed. Top to bottom: stories (ringed faces, as on Instagram), then one
// endless feed like a timeline: the posts by you and your friends (newest first), then
// photos from past nights. No sample posts any more (11.10.2026): what is not real is
// not shown. The people themselves (groups, friends, the gallery of nights they kept,
// the decks) live in the people tab.
export default function YoursScreen() {
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  // Posts by you and your friends (45_posts.sql), read on every visit.
  const [posts, setPosts] = useState<Post[]>([]);
  useFocusEffect(
    useCallback(() => {
      postsFeed(null).then(setPosts, () => {});
    }, []),
  );
  const { session } = useAuth();
  const { t, up } = useLang();
  const uid = session?.user.id;
  // The feed follows the city you are in.
  const local = useLocalCity();
  const feedCity = local.slug ?? 'munchen';
  const scroll = useRef<ScrollView>(null);
  useTabReset('yours', () => scroll.current?.scrollTo({ y: 0, animated: true }));
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

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.band}>
        <Text style={styles.title}>{t('yours.title')}</Text>
        {/* + : a new post */}
        <Pressable onPress={() => router.push('/post/new')} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('posts.a11y')} style={({ pressed }) => [styles.plus, pressed && styles.pressed]}>
          <Svg width={14} height={14} viewBox="0 0 16 16">
            <Path d="M8 2.5v11M2.5 8h11" stroke={colors.ink} strokeWidth={2.2} strokeLinecap="round" />
          </Svg>
        </Pressable>
        <SoundCorner />
      </View>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.body, { paddingBottom: TAB_BAR_SPACE + insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
        onScroll={nearBottom}
        scrollEventThrottle={250}
      >
        <StoryStrip />
        {/* Posts by you and your friends, newest first, then past nights. */}
        {posts.map((p) => (
          <PostCard key={p.id} post={p} onGone={(gone) => setPosts((l) => l.filter((x) => x.id !== gone))} />
        ))}
        {/* From past nights: an endless feed of photos, newest first. */}
        {past.length ? <Head label={t('yours.past')} /> : null}
        {past.map((p) => (
          <PastPost key={p.id} p={p} names={names} />
        ))}
        {past.length && pastState === 'end' ? <Text style={styles.feedEnd}>{up(t('yours.pastEnd'))}</Text> : null}
        {pastState === 'loading' ? <Text style={styles.feedEnd}>{up(t('word.moment'))}</Text> : null}
      </ScrollView>

      <MessagesButton />
      <Tips page="yours" tips={[{ title: 'tips.yours.1.t', body: 'tips.yours.1.b' }, { title: 'tips.yours.2.t', body: 'tips.yours.2.b', motion: 'tap' }]} bottom={tabSpace + 12} />
    </View>
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
      <View>
        <Image source={{ uri: p.image_url }} style={[styles.postPhoto, { height: width }]} contentFit="cover" />
        <ShareButton onPress={() => shareNight({ slug: p.slug, title: p.title, starts_at: p.starts_at, venue_name: p.venue_name, city_name: p.city_name })} />
      </View>
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


const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 44, backgroundColor: colors.ink, zIndex: 2 },
  title: { position: 'absolute', top: brand.top - 8, left: brand.left, fontFamily: fonts.semibold, fontSize: 30, lineHeight: 32, letterSpacing: -0.9, color: colors.paper },
  plus: { position: 'absolute', top: brand.top - 6, right: brand.left + 126, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  body: { paddingTop: brand.top + 56 },
  pressed: { opacity: 0.6 },
  redText: { color: colors.spotText },

  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: brand.left, marginTop: 30, marginBottom: 12 },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headText: { fontFamily: fonts.medium, fontSize: 17, letterSpacing: -0.3, color: colors.paper },
  headDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.ink3 },
  headDotRed: { backgroundColor: colors.spot },
  headNote: { fontFamily: fonts.jet, fontSize: 10.5, letterSpacing: 1, color: colors.meta },





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
