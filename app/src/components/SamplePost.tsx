import { memo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { SamplePost as Post } from '@/content/posts';
import Avatar from '@/components/Avatar';
import { dayLabel } from '@/data/when';
import { upperData, useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// One sample post in the past feed, laid out like a photo app: who and where on top,
// the photo full width, a heart and a speech mark, the likes, the caption, two
// comments and "all n comments", and a line to add your own. Likes and comments stay
// on the phone (they are samples); marked "sample" at the top right.
// memo: yours re-renders every six seconds (the gallery); the feed under it need not.
export default memo(function SamplePost({ post }: { post: Post }) {
  const { width } = useWindowDimensions();
  const { t, up } = useLang();
  const [liked, setLiked] = useState(false);
  const [open, setOpen] = useState(false);
  const [mine, setMine] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [writing, setWriting] = useState(false);
  const [at] = useState(() => new Date(Date.now() - post.daysAgo * 86400000).toISOString());
  const comments = open ? post.comments : post.comments.slice(0, 2);
  const you = t('deck.you');

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMine((m) => [...m, text]);
    setDraft('');
  };

  return (
    <View style={styles.post}>
      <View style={styles.head}>
        <View style={styles.face}>
          <Avatar name={post.who} size={34} />
        </View>
        <View style={styles.who}>
          <Text style={styles.name} numberOfLines={1}>{post.who}</Text>
          <Text style={styles.meta} numberOfLines={1}>{upperData(post.venue)} · {up(dayLabel(at))}</Text>
        </View>
        <Text style={styles.sample}>{up(t('deck.sample'))}</Text>
      </View>

      <Pressable onLongPress={() => setLiked(true)} delayLongPress={250}>
        <Image source={post.photo} style={[styles.photo, { height: width }]} resizeMode="cover" />
      </Pressable>

      <View style={styles.body}>
        <View style={styles.icons}>
          <Pressable onPress={() => setLiked((l) => !l)} hitSlop={10} accessibilityRole="button" accessibilityState={{ selected: liked }}>
            <Svg width={26} height={26} viewBox="0 0 24 24">
              <Path
                d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z"
                fill={liked ? colors.spot : 'none'}
                stroke={liked ? colors.spot : colors.paper}
                strokeWidth={1.6}
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
          <Pressable onPress={() => setWriting(true)} hitSlop={10} accessibilityRole="button">
            <Svg width={25} height={25} viewBox="0 0 24 24">
              <Path d="M20 11.5a7.5 7.5 0 0 1-11 6.6L4.5 19.5l1.3-4.2A7.5 7.5 0 1 1 20 11.5Z" fill="none" stroke={colors.paper} strokeWidth={1.6} strokeLinejoin="round" />
            </Svg>
          </Pressable>
        </View>
        <Text style={styles.likes}>{t('post.likes', { n: post.likes + (liked ? 1 : 0) })}</Text>
        <Text style={styles.text}>
          <Text style={styles.strong}>{post.who} </Text>
          {post.caption}
        </Text>
        {post.comments.length > 2 && !open ? (
          <Pressable onPress={() => setOpen(true)} hitSlop={6}>
            <Text style={styles.all}>{t('post.allComments', { n: post.comments.length + mine.length })}</Text>
          </Pressable>
        ) : null}
        {comments.map((c, i) => (
          <Text key={i} style={styles.text}>
            <Text style={styles.strong}>{c.who} </Text>
            {c.text}
          </Text>
        ))}
        {mine.map((c, i) => (
          <Text key={`m${i}`} style={styles.text}>
            <Text style={styles.strong}>{you} </Text>
            {c}
          </Text>
        ))}
        {writing ? (
          <View style={styles.write}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={t('post.addComment')}
              placeholderTextColor={colors.meta}
              selectionColor={colors.spot}
              style={styles.input}
              autoFocus
              returnKeyType="send"
              onSubmitEditing={send}
              maxLength={300}
            />
            <Pressable onPress={send} hitSlop={8} disabled={!draft.trim()}>
              <Text style={[styles.post_, !draft.trim() && styles.off]}>{t('post.send')}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setWriting(true)} hitSlop={6}>
            <Text style={styles.add}>{t('post.addComment')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  post: { marginTop: 26 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: brand.left, marginBottom: 10 },
  face: { width: 34, height: 34, borderRadius: radius.sm, overflow: 'hidden' },
  who: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.semibold, fontSize: 14.5, letterSpacing: -0.2, color: colors.paper },
  meta: { fontFamily: fonts.jet, fontSize: 9.5, letterSpacing: 1, color: colors.meta },
  sample: { fontFamily: fonts.jet, fontSize: 9, letterSpacing: 1.2, color: colors.meta },
  photo: { width: '100%', backgroundColor: colors.ink2 },
  body: { paddingHorizontal: brand.left, paddingTop: 10, gap: 5 },
  icons: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 2 },
  likes: { fontFamily: fonts.semibold, fontSize: 14, color: colors.paper },
  text: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.paper },
  strong: { fontFamily: fonts.semibold },
  all: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.mute },
  add: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.meta, marginTop: 2 },
  write: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.ink3, marginTop: 4 },
  input: { flex: 1, height: 40, fontFamily: fonts.regular, fontSize: 14, color: colors.paper, paddingVertical: 0 },
  post_: { fontFamily: fonts.semibold, fontSize: 14, color: colors.spotText },
  off: { opacity: 0.4 },
});
