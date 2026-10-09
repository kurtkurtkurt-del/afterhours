import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '@/components/Avatar';
import CodeSheet from '@/components/CodeSheet';
import { openPerson } from '@/components/People';
import { DoubleTap, Heart, LikersSheet, LikesLine, Speech, type Liker } from '@/components/PostBits';
import { useReport } from '@/components/ReportSheet';
import { postCommentAdd, postCommentDelete, postComments, postDelete, postLike, postLikers, postPhotoUrl, postReport, type Post, type PostComment } from '@/data/posts';
import { dayLabel } from '@/data/when';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// One post in the yours tab, laid out like the sample posts: who and when on top, the
// photo full width (two taps like it), the heart and the speech mark, "n likes" (a tap
// shows who), the words, the first two comments, "all n comments" and a line to add
// one. ··· : your own → delete; someone else's → report. In the comments, a long press
// deletes your own (or any under your post) and reports someone else's.
export default function PostCard({ post, onGone }: { post: Post; onGone: (id: string) => void }) {
  const { width } = useWindowDimensions();
  const { t, up } = useLang();
  const [reporting, setReporting] = useState(false);
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.likes);
  const [count, setCount] = useState(post.comments);
  const [first, setFirst] = useState(post.first_comments);
  const [sheet, setSheet] = useState<'likes' | 'comments' | null>(null);
  const uri = postPhotoUrl(post.photo_path);
  const who = (post.mine ? t('posts.you') : (post.name ?? post.handle ?? '—')).toLowerCase();

  // Optimistic: the heart turns at once and goes back if the server says no.
  const like = (on: boolean) => {
    if (on === liked) return;
    setLiked(on);
    setLikes((n) => n + (on ? 1 : -1));
    postLike(post.id, on).then(setLikes, () => {
      setLiked(!on);
      setLikes((n) => n + (on ? -1 : 1));
    });
  };
  const more = () =>
    post.mine
      ? Alert.alert(t('posts.delete'), t('posts.delete.sure'), [
          { text: t('staff.delete.keep'), style: 'cancel' },
          { text: t('posts.delete'), style: 'destructive', onPress: () => postDelete(post.id).then(() => onGone(post.id), () => {}) },
        ])
      : setReporting(true);
  const loadLikers = useCallback(
    () => postLikers(post.id).then((l) => l.map((x): Liker => ({ key: x.id, name: (x.handle ?? x.name ?? '—').toLowerCase(), you: x.mine }))),
    [post.id],
  );
  const person = (handle: string | null) => handle && openPerson(handle);

  return (
    <View style={styles.post}>
      <View style={styles.head}>
        <Pressable onPress={post.mine ? undefined : () => person(post.handle)} style={styles.face}>
          <Avatar name={post.handle ?? who} size={34} />
        </Pressable>
        <View style={styles.whoBox}>
          <Text style={styles.name} numberOfLines={1} onPress={post.mine ? undefined : () => person(post.handle)}>{who}</Text>
          <Text style={styles.meta} numberOfLines={1}>{up(dayLabel(post.created_at))}</Text>
        </View>
        <Pressable onPress={more} hitSlop={12} accessibilityRole="button" accessibilityLabel={post.mine ? t('posts.delete') : t('posts.report')}>
          <Text style={styles.dots}>···</Text>
        </Pressable>
      </View>

      <DoubleTap onDouble={() => like(true)}>
        {uri ? <Image source={{ uri }} style={[styles.photo, { height: width * 1.1 }]} contentFit="cover" /> : <Text style={styles.big}>{post.body}</Text>}
      </DoubleTap>

      <View style={styles.body}>
        <View style={styles.icons}>
          <Pressable onPress={() => like(!liked)} hitSlop={10} accessibilityRole="button" accessibilityState={{ selected: liked }} accessibilityLabel={t('post.like')}>
            <Heart filled={liked} />
          </Pressable>
          <Pressable onPress={() => setSheet('comments')} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('post.addComment')}>
            <Speech />
          </Pressable>
        </View>
        <LikesLine n={likes} onPress={() => setSheet('likes')} />
        {uri && post.body ? (
          <Text style={styles.text}>
            <Text style={styles.strong}>{who} </Text>
            {post.body}
          </Text>
        ) : null}
        {post.event_slug ? (
          <Text style={styles.night} onPress={() => router.push(`/night/${post.event_slug}`)} numberOfLines={1}>
            ↗ {post.event_title?.toLowerCase()}
          </Text>
        ) : null}
        {count > 2 ? (
          <Pressable onPress={() => setSheet('comments')} hitSlop={6}>
            <Text style={styles.all}>{t('post.allComments', { n: count })}</Text>
          </Pressable>
        ) : null}
        {first.map((c, i) => (
          <Text key={i} style={styles.text} onPress={() => setSheet('comments')}>
            <Text style={styles.strong}>{(c.who ?? '—').toLowerCase()} </Text>
            {c.text}
          </Text>
        ))}
        <Pressable onPress={() => setSheet('comments')} hitSlop={6}>
          <Text style={styles.add}>{t('post.addComment')}</Text>
        </Pressable>
      </View>

      <LikersSheet
        open={sheet === 'likes'}
        onClose={() => setSheet(null)}
        load={loadLikers}
        onPerson={(l) => {
          setSheet(null);
          setTimeout(() => openPerson(l.name), 250);
        }}
      />
      <Comments
        open={sheet === 'comments'}
        post={post}
        who={who}
        onClose={() => setSheet(null)}
        onChange={(list) => {
          setCount(list.length);
          setFirst(list.slice(0, 2).map((c) => ({ who: c.handle ?? c.name, text: c.body })));
        }}
      />
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

// Every comment under a post, in a sheet that leaves the top of the screen visible
// and rises with the keyboard.
function Comments({ open, post, who, onClose, onChange }: { open: boolean; post: Post; who: string; onClose: () => void; onChange: (list: PostComment[]) => void }) {
  const { t } = useLang();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reporting = useReport();
  const [list, setList] = useState<PostComment[] | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const load = useCallback(() => {
    postComments(post.id).then(
      (l) => {
        setList(l);
        onChange(l);
      },
      (e) => setSaid(String(e?.message ?? e).toLowerCase()),
    );
  }, [post.id, onChange]);
  const send = () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setSaid(null);
    postCommentAdd(post.id, text)
      .then(() => {
        setDraft('');
        load();
      })
      .catch((e) => setSaid(String(e?.message ?? e).toLowerCase()))
      .finally(() => setSending(false));
  };
  const hold = (c: PostComment) =>
    c.can_delete
      ? Alert.alert(t('post.comment.delete'), undefined, [
          { text: t('staff.delete.keep'), style: 'cancel' },
          { text: t('staff.delete'), style: 'destructive', onPress: () => postCommentDelete(c.id).then(load, () => {}) },
        ])
      : reporting.ask('post_comment', c.id);
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} onShow={load}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetWrap}>
        <Pressable style={styles.sheetDim} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('word.close')} />
        <View style={[styles.sheet, { maxHeight: height * 0.75, paddingBottom: insets.bottom + 10 }]}>
          <View style={styles.grab} />
          <Text style={styles.sheetTitle}>{t('post.comments')}</Text>
          <ScrollView style={styles.sheetList} contentContainerStyle={styles.sheetListIn} keyboardShouldPersistTaps="handled">
            {post.body ? (
              <Text style={styles.text}>
                <Text style={styles.strong}>{who} </Text>
                {post.body}
              </Text>
            ) : null}
            {list === null ? <Text style={styles.all}>…</Text> : null}
            {list && !list.length ? <Text style={styles.all}>{t('post.comments.none')}</Text> : null}
            {(list ?? []).map((c) => {
              const name = (c.mine ? t('deck.you') : (c.handle ?? c.name ?? '—')).toLowerCase();
              return (
                <Pressable key={c.id} onLongPress={() => hold(c)} delayLongPress={300} style={styles.sheetLine}>
                  <Pressable onPress={c.mine || !c.handle ? undefined : () => openPerson(c.handle!)} hitSlop={4}>
                    <Avatar name={c.handle ?? name} size={28} />
                  </Pressable>
                  <View style={styles.sheetText}>
                    <Text style={styles.text}>
                      <Text style={styles.strong}>{name} </Text>
                      {c.body}
                    </Text>
                    <Text style={styles.when}>{dayLabel(c.created_at)}</Text>
                  </View>
                </Pressable>
              );
            })}
            {said ? <Text style={styles.said}>{said}</Text> : null}
          </ScrollView>
          <View style={styles.write}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={t('post.addComment')}
              placeholderTextColor={colors.meta}
              selectionColor={colors.spot}
              style={styles.input}
              returnKeyType="send"
              onSubmitEditing={send}
              blurOnSubmit={false}
              maxLength={300}
            />
            <Pressable onPress={send} hitSlop={8} disabled={!draft.trim() || sending}>
              <Text style={[styles.send, (!draft.trim() || sending) && styles.off]}>{sending ? '…' : t('post.send')}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
      {reporting.sheet}
    </Modal>
  );
}

const styles = StyleSheet.create({
  post: { marginBottom: 26 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: brand.left, marginBottom: 10 },
  face: { width: 34, height: 34, borderRadius: radius.sm, overflow: 'hidden' },
  whoBox: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.semibold, fontSize: 14.5, letterSpacing: -0.2, color: colors.paper },
  meta: { fontFamily: fonts.jet, fontSize: 9.5, letterSpacing: 1, color: colors.meta },
  dots: { fontFamily: fonts.medium, fontSize: 18, color: colors.paper, paddingHorizontal: 4 },
  photo: { width: '100%', backgroundColor: colors.ink2 },
  big: { fontFamily: fonts.medium, fontSize: 22, lineHeight: 29, letterSpacing: -0.4, color: colors.paper, paddingHorizontal: brand.left, paddingVertical: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.ink3 },
  body: { paddingHorizontal: brand.left, paddingTop: 10, gap: 5 },
  icons: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 2 },
  text: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.paper },
  strong: { fontFamily: fonts.semibold },
  night: { fontFamily: fonts.regular, fontSize: 13, color: colors.spotText },
  all: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.mute },
  add: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.meta, marginTop: 2 },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheetDim: { flex: 1, backgroundColor: 'rgba(14,13,12,0.55)' },
  sheet: { backgroundColor: colors.ink, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderTopWidth: 1, borderColor: colors.ink3, paddingTop: 8 },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.ink3, marginBottom: 10 },
  sheetTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.paper, textAlign: 'center', marginBottom: 8 },
  sheetList: { flexGrow: 0 },
  sheetListIn: { paddingHorizontal: brand.left, paddingBottom: 12, gap: 12 },
  sheetLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sheetText: { flex: 1, gap: 2 },
  when: { fontFamily: fonts.regular, fontSize: 11, color: colors.meta },
  said: { fontFamily: fonts.regular, fontSize: 12, color: colors.spotText },
  write: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: colors.ink3, marginTop: 6, paddingHorizontal: brand.left, paddingTop: 6 },
  input: { flex: 1, height: 40, fontFamily: fonts.regular, fontSize: 14, color: colors.paper, paddingVertical: 0 },
  send: { fontFamily: fonts.semibold, fontSize: 14, color: colors.spotText },
  off: { opacity: 0.4 },
});
