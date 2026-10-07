import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { openPerson } from '@/components/People';
import CodeSheet from '@/components/CodeSheet';
import { postDelete, postPhotoUrl, postReport, type Post } from '@/data/posts';
import { dayLabel } from '@/data/when';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';

// One post in the yours tab: who, when, the photo, the words, the night it was about.
// ··· : your own → delete; someone else's → report (with an optional reason).
export default function PostCard({ post, onGone }: { post: Post; onGone: (id: string) => void }) {
  const { t, up } = useLang();
  const [reporting, setReporting] = useState(false);
  const uri = postPhotoUrl(post.photo_path);
  const more = () =>
    post.mine
      ? Alert.alert(t('posts.delete'), t('posts.delete.sure'), [
          { text: t('staff.delete.keep'), style: 'cancel' },
          { text: t('posts.delete'), style: 'destructive', onPress: () => postDelete(post.id).then(() => onGone(post.id), () => {}) },
        ])
      : setReporting(true);
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.name} numberOfLines={1} onPress={post.handle && !post.mine ? () => openPerson(post.handle!) : undefined}>
          {post.mine ? t('posts.you') : (post.name ?? post.handle ?? '—').toLowerCase()}
        </Text>
        <Text style={styles.when}>{up(dayLabel(post.created_at))}</Text>
        <Pressable onPress={more} hitSlop={12} accessibilityRole="button" accessibilityLabel={post.mine ? t('posts.delete') : t('posts.report')}>
          <Text style={styles.more}>···</Text>
        </Pressable>
      </View>
      {uri ? <Image source={{ uri }} style={styles.photo} contentFit="cover" /> : null}
      {post.body ? <Text style={styles.body}>{post.body}</Text> : null}
      {post.event_slug ? (
        <Text style={styles.night} onPress={() => router.push(`/night/${post.event_slug}`)} numberOfLines={1}>
          ↗ {post.event_title?.toLowerCase()}
        </Text>
      ) : null}
      <CodeSheet
        key={reporting ? 'open' : 'shut'}
        open={reporting}
        title={t('posts.report.why')}
        go={t('posts.report')}
        error={null}
        onSubmit={(why) => {
          setReporting(false);
          postReport(post.id, why || null).then(() => Alert.alert(t('posts.report'), t('posts.report.done')), () => {});
        }}
        onClose={() => setReporting(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.ink3, borderRadius: radius.lg, overflow: 'hidden', marginBottom: 14, paddingBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  name: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.paper },
  when: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.2, color: colors.mute },
  more: { fontFamily: fonts.medium, fontSize: 18, color: colors.paper, paddingHorizontal: 4 },
  photo: { width: '100%', aspectRatio: 4 / 5 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.paper, paddingHorizontal: 14, paddingTop: 12 },
  night: { fontFamily: fonts.regular, fontSize: 13, color: colors.spotText, paddingHorizontal: 14, paddingTop: 8 },
});
