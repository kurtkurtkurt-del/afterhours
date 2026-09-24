import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from '@/components/BackButton';
import Input from '@/components/Input';
import { reason, roomInfo, roomList, roomPost, type RoomInfo, type RoomPost } from '@/data/checkin';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

const left = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'frozen';
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  return `${h}h ${String(m).padStart(2, '0')}m left`;
};
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

// oda: gidenlerin konuştuğu yer. sadece check-in yapanlar okur ve yazar; 48 saat sonra donar.
export default function RoomScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const [info, setInfo] = useState<RoomInfo | null>(null);
  const [posts, setPosts] = useState<RoomPost[]>([]);
  const [text, setText] = useState('');
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    const i = await roomInfo(slug).catch(() => null);
    setInfo(i);
    if (i?.checked_in) setPosts(await roomList(slug).catch(() => []));
  }, [slug]);
  useEffect(() => {
    let cancelled = false;
    roomInfo(slug)
      .catch(() => null)
      .then(async (i) => {
        if (cancelled) return;
        setInfo(i);
        if (i?.checked_in) {
          const list = await roomList(slug).catch(() => []);
          if (!cancelled) setPosts(list);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    try {
      await roomPost(slug, body);
      setText('');
      setNote(null);
      load();
    } catch (e) {
      setNote(reason(e));
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.band}>
        <BackButton />
        <Text style={styles.title}>the room</Text>
      </View>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {info ? (
            <>
              <Text style={[styles.mono, info.frozen ? styles.frozen : styles.open]}>{info.frozen ? 'frozen' : left(info.freeze_at)}</Text>
              <View style={styles.who}>
                {info.initials.map((c, i) => (
                  <View key={i} style={styles.av}>
                    <Text style={styles.avText}>{c}</Text>
                  </View>
                ))}
                <Text style={styles.whoNote}>{info.who_count} {info.who_count === 1 ? 'was' : 'were'} there</Text>
              </View>
              {!info.checked_in ? (
                <Text style={styles.note}>only the people who checked in can see the room.</Text>
              ) : posts.length === 0 ? (
                <Text style={styles.note}>nobody has spoken yet.</Text>
              ) : (
                posts.map((p) => (
                  <View key={p.id} style={styles.post}>
                    <Text style={styles.postBody}>“{p.body}”</Text>
                    <Text style={styles.mono}>{p.mine ? 'you' : p.who} · {hhmm(p.created_at)}</Text>
                  </View>
                ))
              )}
            </>
          ) : (
            <Text style={styles.note}>loading the room…</Text>
          )}
        </ScrollView>
        {info?.checked_in && !info.frozen ? (
          <View style={[styles.compose, { paddingBottom: insets.bottom + 16 }]}>
            <Input value={text} onChangeText={setText} placeholder="two lines, at most" maxLength={200} returnKeyType="send" onSubmitEditing={send} />
            {note ? <Text style={styles.noteSmall}>{note}</Text> : null}
            <Pressable onPress={send} style={styles.sendBtn}>
              <Text style={styles.sendText}>say it</Text>
            </Pressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 40, backgroundColor: colors.ink, zIndex: 2 },
  title: { position: 'absolute', top: brand.top, left: 0, right: 0, textAlign: 'center', fontFamily: fonts.medium, fontSize: brand.smallSize, letterSpacing: -0.3, color: colors.paper },
  body: { paddingTop: brand.top + 48, paddingHorizontal: brand.left, paddingBottom: 24, gap: 12 },
  mono: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.mute },
  open: { color: colors.spot },
  frozen: { color: colors.mute },
  who: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  av: { width: 22, height: 22, borderWidth: 1, borderColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  avText: { fontFamily: fonts.medium, fontSize: 11, color: colors.paper },
  whoNote: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute, marginLeft: 6 },
  note: { fontFamily: fonts.regular, fontSize: 15, color: colors.paper2, opacity: 0.85, marginTop: 8 },
  noteSmall: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute },
  post: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.ink3, gap: 4 },
  postBody: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 23, color: colors.paper },
  compose: { paddingHorizontal: brand.left, paddingTop: 10, gap: 10, borderTopWidth: 1, borderTopColor: colors.ink3, backgroundColor: colors.ink },
  sendBtn: { alignSelf: 'flex-end', backgroundColor: colors.paper, paddingVertical: 8, paddingHorizontal: 14 },
  sendText: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
});
