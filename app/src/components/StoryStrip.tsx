import { useCallback, useEffect, useState } from 'react';
import Storage from 'expo-sqlite/kv-store';
import { Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import StoryViewer, { type StoryItem } from '@/components/StoryViewer';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/auth/AuthContext';
import { stories as sampleStories, type Story } from '@/content/stories';
import { postDelete, postPhotoUrl, postsFeed, type Post } from '@/data/posts';
import { friendPhotos } from '@/data/photo';
import { SAMPLES } from '@/content/samples';
import { djs as localDjs, type Dj } from '@/content/djs';
import { followedSlugs, loadDjs } from '@/data/djs';
import { useLocalCity } from '@/data/here';
import { useRefreshOnFocus } from '@/hooks/useRefresh';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// Until people post their own, the stories are samples — and only in development (F30).
const stories = SAMPLES ? sampleStories : [];

const SEEN = 'stories.seen';
const photoOf = (dj: Dj): ImageSourcePropType => (dj.photoUrl ? { uri: dj.photoUrl } : dj.photo);

// A day, for a post to count as a story.
const DAY = 24 * 3600_000;

// Stories, as on Instagram: a row of ringed faces at the top of messages. Since
// 26.10.2026 (owner: "+ on messages, add a story") the posts your friends and you made
// with a photo in the last day come first, each person one ring, their frames newest
// last — nothing new in the database, a story is a post with a photo (45_posts.sql,
// posts_feed). After them the DJs with a story (unseen before seen), then the DJs you
// follow, or everyone when you follow nobody; your city's DJs ahead within each. A red
// ring is a story you have not seen; a tap plays it, a face without a story opens the
// DJ's page.
type Entry = { id: string; name: string; photo: ImageSourcePropType | null; story: Story | null; dj: Dj | null; mine?: boolean };

export default function StoryStrip() {
  const { t, tn, up } = useLang();
  const { session } = useAuth();
  const tick = useRefreshOnFocus('djs', 'posts');
  const uid = session?.user.id;
  const [posts, setPosts] = useState<Post[]>([]);
  const [faces, setFaces] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    if (!uid || session?.user.is_anonymous) return;
    let cancelled = false;
    postsFeed(null).then((l) => !cancelled && setPosts(l), () => {});
    friendPhotos().then((m) => !cancelled && setFaces(m), () => {});
    return () => {
      cancelled = true;
    };
  }, [tick, uid, session?.user.is_anonymous]);
  // one ring per person: their photo posts of the last day, oldest first
  const people: Entry[] = [];
  const now = posts.length ? Date.now() : 0; // eslint-disable-line react-hooks/purity -- the clock, read once per render
  posts
    .filter((p) => p.photo_path && now - Date.parse(p.created_at) < DAY)
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
    .forEach((p) => {
      const id = 'post:' + p.author_id;
      const frame = { image: { uri: postPhotoUrl(p.photo_path)! }, caption: p.body, postId: p.mine ? p.id : undefined };
      const have = people.find((e) => e.id === id);
      if (have) {
        have.story!.frames.push(frame);
        return;
      }
      const face = faces.get(p.author_id);
      people.push({
        id,
        name: p.mine ? t('stories.you') : (p.name ?? p.handle ?? '').toLowerCase(),
        photo: face ? { uri: face } : null,
        story: { dj: id, hoursAgo: Math.max(0, Math.floor((now - Date.parse(p.created_at)) / 3600_000)), frames: [frame] },
        dj: null,
        mine: p.mine,
      });
    });
  people.sort((a, b) => Number(!!b.mine) - Number(!!a.mine));
  const local = useLocalCity();
  const [djs, setDjs] = useState<Dj[]>(localDjs);
  const [follows, setFollows] = useState<string[]>([]);
  const [queue, setQueue] = useState<{ items: StoryItem[]; start: number } | null>(null);
  const [seen, setSeen] = useState<string[]>(() => (Storage.getItemSync(SEEN) ?? '').split(',').filter(Boolean));

  useEffect(() => {
    let cancelled = false;
    loadDjs()
      .then((d) => !cancelled && setDjs(d.djs))
      .catch(() => {});
    if (session) followedSlugs().then((f) => !cancelled && setFollows(f), () => {});
    return () => {
      cancelled = true;
    };
  }, [tick, session]);

  const djOf = (slug: string) => djs.find((d) => d.id === slug) ?? localDjs.find((d) => d.id === slug);
  const isLocal = (d: Dj) => (d.citySlug ? d.citySlug === local.slug : !!local.name && d.city === local.name.toLowerCase());
  const storyOf = (slug: string) => stories.find((st) => st.dj === slug);
  const fresh = (slug: string) => !!storyOf(slug) && !seen.includes(slug);
  const base = follows.length ? follows.map(djOf).filter((d): d is Dj => !!d) : djs;
  const withStory = stories.map((st) => djOf(st.dj)).filter((d): d is Dj => !!d);
  const djStrip = [...withStory, ...base.filter((d) => !storyOf(d.id))].sort((a, b) => Number(fresh(b.id)) - Number(fresh(a.id)) || Number(isLocal(b)) - Number(isLocal(a)));
  // only people's own stories for now (owner, 26.10.2026): the DJs are off the strip until
  // they post their own; the row may stand empty apart from yours
  const SHOW_DJS = false;
  const strip: Entry[] = [...people, ...(SHOW_DJS ? djStrip.map((d): Entry => ({ id: d.id, name: d.name, photo: photoOf(d), story: storyOf(d.id) ?? null, dj: d })) : [])];
  const unseen = strip.filter((e) => e.story && !seen.includes(e.id)).length;

  const open = (e: Entry) => {
    if (!e.story) return e.dj ? router.push(`/dj/${e.dj.id}`) : undefined;
    const items = strip.filter((x) => x.story).map((x) => ({ story: x.story!, name: x.name, avatar: x.photo ?? undefined, mine: !!x.mine }));
    setQueue({ items, start: Math.max(0, items.findIndex((x) => x.story.dj === e.id)) });
  };
  const markSeen = useCallback((dj: string) => {
    setSeen((prev) => {
      if (prev.includes(dj)) return prev;
      const next = [...prev, dj];
      Storage.setItemSync(SEEN, next.join(','));
      return next;
    });
  }, []);

  return (
    <>
      <View style={styles.head}>
        <Text style={styles.headText}>{t('djs.stories')}</Text>
        {unseen ? <Text style={styles.headRed}>{up(tn('djs.newStories', unseen))}</Text> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {strip.map((e) => {
          const state = e.story ? (seen.includes(e.id) ? 'seen' : 'new') : 'none';
          return (
            <Pressable key={e.id} onPress={() => open(e)} accessibilityRole="button" accessibilityLabel={e.name} style={({ pressed }) => [styles.person, pressed && styles.pressed]}>
              <View style={[styles.ring, state === 'new' && styles.ringNew, state === 'seen' && styles.ringSeen]}>
                {e.photo ? <Image source={e.photo} style={styles.ringPhoto} /> : <View style={styles.ringFace}><Avatar name={e.name} size={50} /></View>}
              </View>
              <Text style={styles.personName} numberOfLines={1}>{e.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <StoryViewer
        items={queue?.items ?? []}
        start={queue ? queue.start : null}
        onSeen={markSeen}
        onClose={() => setQueue(null)}
        onDelete={(postId) => postDelete(postId).then(() => setPosts((l) => l.filter((p) => p.id !== postId)))}
      />
    </>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: brand.left, marginTop: 10, marginBottom: 12 },
  headText: { fontFamily: fonts.medium, fontSize: 17, letterSpacing: -0.3, color: colors.paper },
  headRed: { fontFamily: fonts.jet, fontSize: 10.5, letterSpacing: 1, color: colors.spotText },
  strip: { gap: 14, paddingHorizontal: brand.left },
  pressed: { opacity: 0.7 },
  person: { width: 62, alignItems: 'center', gap: 6 },
  personName: { fontFamily: fonts.regular, fontSize: 10.5, color: colors.mute, maxWidth: 64 },
  ring: { width: 60, height: 60, borderRadius: 30, padding: 3, borderWidth: 1.5, borderColor: colors.ink3, backgroundColor: colors.ink },
  ringNew: { borderColor: colors.spot, borderWidth: 2.5 },
  ringSeen: { borderColor: colors.mute },
  ringPhoto: { width: '100%', height: '100%', borderRadius: radius.pill },
  ringFace: { width: '100%', height: '100%', borderRadius: radius.pill, overflow: 'hidden' },
});
