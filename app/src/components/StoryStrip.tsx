import { useCallback, useEffect, useState } from 'react';
import Storage from 'expo-sqlite/kv-store';
import { Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import StoryViewer, { type StoryItem } from '@/components/StoryViewer';
import { useAuth } from '@/auth/AuthContext';
import { stories as sampleStories } from '@/content/stories';
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

// Stories, as on Instagram: a row of ringed faces at the top of yours. DJs with a story
// first (unseen before seen), then the DJs you follow, or everyone when you follow
// nobody; your city's DJs ahead within each. A red ring is a story you have not seen;
// a tap plays it, a face without a story opens the DJ's page. (Moved here from the
// former djs tab; the stories are still the sample ones in content/stories.ts.)
export default function StoryStrip() {
  const { t, tn, up } = useLang();
  const { session } = useAuth();
  const tick = useRefreshOnFocus('djs');
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
  const strip = [...withStory, ...base.filter((d) => !storyOf(d.id))].sort((a, b) => Number(fresh(b.id)) - Number(fresh(a.id)) || Number(isLocal(b)) - Number(isLocal(a)));
  const unseen = stories.filter((st) => !seen.includes(st.dj)).length;

  const open = (dj: Dj) => {
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

  return (
    <>
      <View style={styles.head}>
        <Text style={styles.headText}>{t('djs.stories')}</Text>
        {unseen ? <Text style={styles.headRed}>{up(tn('djs.newStories', unseen))}</Text> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {strip.map((dj) => {
          const state = storyOf(dj.id) ? (fresh(dj.id) ? 'new' : 'seen') : 'none';
          return (
            <Pressable key={dj.id} onPress={() => open(dj)} accessibilityRole="button" accessibilityLabel={dj.name} style={({ pressed }) => [styles.person, pressed && styles.pressed]}>
              <View style={[styles.ring, state === 'new' && styles.ringNew, state === 'seen' && styles.ringSeen]}>
                <Image source={photoOf(dj)} style={styles.ringPhoto} />
              </View>
              <Text style={styles.personName} numberOfLines={1}>{dj.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <StoryViewer items={queue?.items ?? []} start={queue ? queue.start : null} onSeen={markSeen} onClose={() => setQueue(null)} />
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
});
