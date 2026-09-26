import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from '@/components/BackButton';
import Input from '@/components/Input';
import { reason, roomInfo, roomList, roomPost, type RoomInfo, type RoomPost } from '@/data/checkin';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

const two = (n: number) => String(n).padStart(2, '0');
const left = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  return `${Math.floor(ms / 3600_000)}h ${two(Math.floor((ms % 3600_000) / 60_000))}m`;
};
const hhmm = (iso: string) => {
  const d = new Date(iso);
  return `${two(d.getHours())}:${two(d.getMinutes())}`;
};
const ddmm = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : `${two(d.getDate())}.${two(d.getMonth() + 1)}`;
};

// the moment: gecenin sohbet odası. gidenler 48 saat yazar, sonra sonsuza kadar okunur.
// "a · thread": isim ve saat küçük künye, benimkiler sağa yaslı ve kırmızı çizgili; altta yazma satırı.
export default function RoomScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const [info, setInfo] = useState<RoomInfo | null>(null);
  const [night, setNight] = useState<{ title: string; starts_at: string | null } | null>(null);
  const [posts, setPosts] = useState<RoomPost[]>([]);
  const [text, setText] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [, setTick] = useState(0);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000); // kalan süre dakikada bir tazelenir
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    const i = await roomInfo(slug).catch(() => null);
    setInfo(i);
    if (i?.checked_in) setPosts(await roomList(slug).catch(() => []));
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [, n] = await Promise.all([
        load(),
        supabase.from('events_public').select('title,starts_at').eq('slug', slug).maybeSingle(),
      ]);
      if (!cancelled && n.data) setNight(n.data as { title: string; starts_at: string | null });
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, load]);

  // oda açıkken yeni satırlar 20 saniyede bir gelir
  const open = !!info?.checked_in && !info.frozen;
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => {
      roomList(slug).then(setPosts).catch(() => {});
    }, 20_000);
    return () => clearInterval(t);
  }, [open, slug]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await roomPost(slug, body);
      setText('');
      setNote(null);
      await load();
    } catch (e) {
      setNote(reason(e));
    }
    setSending(false);
  };

  const remaining = info ? left(info.freeze_at) : null;
  const frozen = !!info && (info.frozen || !remaining);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.band} pointerEvents="box-none">
        <BackButton lift={open ? 96 : 0} />
      </View>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          ref={scroll}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
        >
          {/* başlık: the / moment. — solda; sağda süre */}
          <View style={styles.head}>
            <Text style={[styles.moment, frozen && styles.momentFrozen]}>the{'\n'}moment.</Text>
            <View style={styles.clock}>
              <Text style={frozen ? styles.jetMeta : styles.jetRed}>{frozen ? 'sealed' : remaining}</Text>
              <Text style={styles.jetMeta}>{frozen ? 'read-only · forever' : 'then read-only'}</Text>
            </View>
          </View>
          <Text style={styles.jetMeta}>
            {[night?.title.toLowerCase(), ddmm(night?.starts_at ?? null), info ? `${info.who_count} in the room` : null].filter(Boolean).join(' · ')}
          </Text>

          {/* satırlar: alttan yukarı dolar */}
          <View style={styles.thread}>
            {!info ? (
              <Text style={styles.note}>opening the room…</Text>
            ) : !info.checked_in ? (
              <Text style={styles.note}>only the people who were there can read the room.</Text>
            ) : posts.length === 0 ? (
              <Text style={styles.note}>{frozen ? 'nobody said anything. sealed as it is.' : 'nobody has said anything yet. you first.'}</Text>
            ) : (
              posts.map((p) => (
                <View key={p.id} style={[styles.line, p.mine && styles.lineMine]}>
                  <Text style={[styles.jetMeta, p.mine && styles.jetRed]}>
                    {p.mine ? 'you' : p.who} · {hhmm(p.created_at)}
                  </Text>
                  <Text style={[styles.text, p.mine && styles.textMine]}>{p.body}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {open ? (
          <View style={[styles.compose, { paddingBottom: insets.bottom + 44 }]}>
            <View style={styles.composeRow}>
              <View style={{ flex: 1 }}>
                <Input value={text} onChangeText={setText} placeholder="say something" maxLength={200} returnKeyType="send" onSubmitEditing={send} />
              </View>
              <Pressable onPress={send} disabled={!text.trim() || sending} style={({ pressed }) => [styles.sendBtn, (!text.trim() || sending) && styles.sendOff, pressed && styles.pressed]}>
                <Text style={styles.sendText}>{sending ? '…' : 'say it'}</Text>
              </Pressable>
            </View>
            {note ? <Text style={styles.noteSmall}>{note}</Text> : null}
          </View>
        ) : (
          <View style={{ height: insets.bottom + 44 }} />
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top, zIndex: 2 },
  body: { flexGrow: 1, paddingTop: brand.top - 16, paddingHorizontal: brand.left, paddingBottom: 14 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 },
  moment: { fontFamily: fonts.logo, fontSize: 56, lineHeight: 48, letterSpacing: -1.5, color: colors.spotText },
  momentFrozen: { color: colors.meta },
  clock: { alignItems: 'flex-end', gap: 3, paddingBottom: 4 },
  jetRed: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.spotText },
  jetMeta: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.meta },
  thread: { flexGrow: 1, justifyContent: 'flex-end', gap: 14, paddingTop: 22 },
  line: { gap: 3, maxWidth: '82%', alignSelf: 'flex-start' },
  lineMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  text: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.paper },
  textMine: { textAlign: 'right', borderRightWidth: 2, borderRightColor: colors.spot, paddingRight: 10 },
  note: { fontFamily: fonts.regular, fontSize: 15, color: colors.paper2, opacity: 0.85 },
  noteSmall: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute },
  compose: { paddingHorizontal: brand.left, paddingTop: 12, gap: 8, borderTopWidth: 1, borderTopColor: colors.ink3, backgroundColor: colors.ink },
  composeRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  sendBtn: { backgroundColor: colors.spot, paddingHorizontal: 14, justifyContent: 'center' },
  sendOff: { opacity: 0.4 },
  sendText: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  pressed: { opacity: 0.7 },
});
