import { memo, useCallback, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { openPerson } from '@/components/People';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import type { SamplePost as Post } from '@/content/posts';
import Avatar from '@/components/Avatar';
import { DoubleTap, LikersSheet, LikesLine, type Liker } from '@/components/PostBits';
import { dayLabel } from '@/data/when';
import { upperData, useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// Names that like a sample post, after the people in its comments.
const SAMPLE_LIKERS = ['lena.k', 'mert_', 'jonas', 'selin', 'deniz', 'mia', 'can', 'ela'];

// One sample post in the past feed, laid out like a photo app: who and where on top,
// the photo full width, a heart and a speech mark, the likes, the caption, two
// comments and "all n comments", and a line to add your own. Names and the face open
// that person's profile. The comments open in a sheet that leaves the post visible
// above it and rises with the keyboard. Likes and comments stay on the phone (they are
// samples); marked "sample" at the top right.
// memo: yours re-renders every six seconds (the gallery); the feed under it need not.
export default memo(function SamplePost({ post }: { post: Post }) {
  const { width } = useWindowDimensions();
  const { t, up } = useLang();
  const [liked, setLiked] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [likers, setLikers] = useState(false);
  const you = t('deck.you');
  // Sample likers: the people in its comments first, then a few more names; you on top once liked.
  const loadLikers = useCallback(async (): Promise<Liker[]> => {
    const names = [...new Set([...post.comments.map((c) => c.who), ...SAMPLE_LIKERS])].filter((n) => n !== post.who);
    const list = names.slice(0, Math.min(post.likes, SAMPLE_LIKERS.length)).map((n) => ({ key: n, name: n }));
    return liked ? [{ key: 'you', name: you, you: true }, ...list] : list;
  }, [post, liked, you]);
  const [mine, setMine] = useState<string[]>([]);
  const [at] = useState(() => new Date(Date.now() - post.daysAgo * 86400000).toISOString());
  const person = (name: string) => openPerson(name, true);

  return (
    <View style={styles.post}>
      <View style={styles.head}>
        <Pressable onPress={() => person(post.who)} hitSlop={6} style={styles.face} accessibilityRole="button" accessibilityLabel={post.who}>
          <Avatar name={post.who} size={34} />
        </Pressable>
        <View style={styles.who}>
          <Text style={styles.name} numberOfLines={1} onPress={() => person(post.who)}>{post.who}</Text>
          <Text style={styles.meta} numberOfLines={1}>{upperData(post.venue)} · {up(dayLabel(at))}</Text>
        </View>
        <Text style={styles.sample}>{up(t('deck.sample'))}</Text>
      </View>

      <DoubleTap onDouble={() => setLiked(true)}>
        <Image source={post.photo} style={[styles.photo, { height: width }]} contentFit="cover" />
      </DoubleTap>

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
          <Pressable onPress={() => setSheet(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('post.addComment')}>
            <Svg width={25} height={25} viewBox="0 0 24 24">
              <Path d="M20 11.5a7.5 7.5 0 0 1-11 6.6L4.5 19.5l1.3-4.2A7.5 7.5 0 1 1 20 11.5Z" fill="none" stroke={colors.paper} strokeWidth={1.6} strokeLinejoin="round" />
            </Svg>
          </Pressable>
        </View>
        <LikesLine n={post.likes + (liked ? 1 : 0)} onPress={() => setLikers(true)} />
        <Text style={styles.text}>
          <Name who={post.who} onPress={person} />
          {post.caption}
        </Text>
        {post.comments.length + mine.length > 2 ? (
          <Pressable onPress={() => setSheet(true)} hitSlop={6}>
            <Text style={styles.all}>{t('post.allComments', { n: post.comments.length + mine.length })}</Text>
          </Pressable>
        ) : null}
        {post.comments.slice(0, 2).map((c, i) => (
          <Text key={i} style={styles.text}>
            <Name who={c.who} onPress={person} />
            {c.text}
          </Text>
        ))}
        {mine.map((c, i) => (
          <Text key={`m${i}`} style={styles.text}>
            <Text style={styles.strong}>{you} </Text>
            {c}
          </Text>
        ))}
        <Pressable onPress={() => setSheet(true)} hitSlop={6}>
          <Text style={styles.add}>{t('post.addComment')}</Text>
        </Pressable>
      </View>

      <LikersSheet
        open={likers}
        onClose={() => setLikers(false)}
        load={loadLikers}
        more={Math.max(0, post.likes - SAMPLE_LIKERS.length)}
        onPerson={(l) => {
          setLikers(false);
          setTimeout(() => person(l.name), 250);
        }}
      />
      <CommentSheet open={sheet} onClose={() => setSheet(false)} post={post} mine={mine} onSend={(text) => setMine((m) => [...m, text])} onPerson={(name) => {
        setSheet(false);
        setTimeout(() => person(name), 250);
      }} />
    </View>
  );
});

// A name in a caption or comment: opens that person's profile.
function Name({ who, onPress }: { who: string; onPress: (who: string) => void }) {
  return (
    <Text style={styles.strong} onPress={() => onPress(who)}>
      {who}{' '}
    </Text>
  );
}

// All comments of a post in a sheet from the bottom: the top of the screen stays visible
// (tap it to close), the field sits at the bottom and rises with the keyboard.
function CommentSheet({ open, onClose, post, mine, onSend, onPerson }: { open: boolean; onClose: () => void; post: Post; mine: string[]; onSend: (text: string) => void; onPerson: (name: string) => void }) {
  const { t } = useLang();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const you = t('deck.you');
  const send = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  };
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetWrap}>
        <Pressable style={styles.sheetDim} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('word.close')} />
        <View style={[styles.sheet, { maxHeight: height * 0.7, paddingBottom: insets.bottom + 10 }]}>
          <View style={styles.grab} />
          <Text style={styles.sheetTitle}>{t('post.comments')}</Text>
          <ScrollView style={styles.sheetList} contentContainerStyle={styles.sheetListIn} keyboardShouldPersistTaps="handled">
            <Text style={styles.text}>
              <Text style={styles.strong} onPress={() => onPerson(post.who)}>{post.who} </Text>
              {post.caption}
            </Text>
            {post.comments.map((c, i) => (
              <View key={i} style={styles.sheetLine}>
                <Pressable onPress={() => onPerson(c.who)} hitSlop={4}>
                  <Avatar name={c.who} size={28} />
                </Pressable>
                <Text style={[styles.text, styles.sheetText]}>
                  <Text style={styles.strong} onPress={() => onPerson(c.who)}>{c.who} </Text>
                  {c.text}
                </Text>
              </View>
            ))}
            {mine.map((c, i) => (
              <View key={`m${i}`} style={styles.sheetLine}>
                <Avatar name={you} size={28} />
                <Text style={[styles.text, styles.sheetText]}>
                  <Text style={styles.strong}>{you} </Text>
                  {c}
                </Text>
              </View>
            ))}
          </ScrollView>
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
              blurOnSubmit={false}
              maxLength={300}
            />
            <Pressable onPress={send} hitSlop={8} disabled={!draft.trim()}>
              <Text style={[styles.post_, !draft.trim() && styles.off]}>{t('post.send')}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

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
  write: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: colors.ink3, marginTop: 6, paddingHorizontal: brand.left, paddingTop: 6 },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheetDim: { flex: 1, backgroundColor: 'rgba(14,13,12,0.55)' },
  sheet: { backgroundColor: colors.ink, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderTopWidth: 1, borderColor: colors.ink3, paddingTop: 8 },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.ink3, marginBottom: 10 },
  sheetTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.paper, textAlign: 'center', marginBottom: 8 },
  sheetList: { flexGrow: 0 },
  sheetListIn: { paddingHorizontal: brand.left, paddingBottom: 12, gap: 12 },
  sheetLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sheetText: { flex: 1 },
  input: { flex: 1, height: 40, fontFamily: fonts.regular, fontSize: 14, color: colors.paper, paddingVertical: 0 },
  post_: { fontFamily: fonts.semibold, fontSize: 14, color: colors.spotText },
  off: { opacity: 0.4 },
});
