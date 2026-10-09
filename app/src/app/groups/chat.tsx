import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from '@/components/BackButton';
import { useReport } from '@/components/ReportSheet';
import { Said } from '@/components/StaffPage';
import { groupGet, groupSay, groupThread, groupUnsay, why, type Line } from '@/data/groups';
import { useLang } from '@/i18n';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// The group's thread: what members wrote, and the group's own moments (a plan was
// set, a vote started, a vote decided) as quiet lines between them. New lines are
// read every 3 s while the page is open. A long press on your own line deletes it.
export default function GroupChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, up } = useLang();
  // A long press on someone else's bubble reports it (51_safety.sql).
  const reporting = useReport();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [text, setText] = useState('');
  const [said, setSaid] = useState<string | null>(null);
  const last = useRef(0);
  const scroll = useRef<ScrollView>(null);

  const more = useCallback(
    () =>
      groupThread(id, last.current).then((got) => {
        if (!got.length) return;
        last.current = got[got.length - 1].id;
        setLines((l) => [...l, ...got.filter((g) => !l.some((x) => x.id === g.id))]);
      }, (e) => setSaid(why(e))),
    [id],
  );
  useEffect(() => {
    groupGet(id).then((g) => setName(g.name), () => {});
    more();
    const timer = setInterval(more, 3000);
    return () => clearInterval(timer);
  }, [id, more]);

  const send = () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    groupSay(id, body).then(more, (e) => {
      setText(body);
      setSaid(why(e));
    });
  };
  const drop = (l: Line) =>
    Alert.alert(t('staff.delete'), t('groups.chat.delete'), [
      { text: t('staff.delete.keep'), style: 'cancel' },
      { text: t('staff.delete'), style: 'destructive', onPress: () => groupUnsay(l.id).then(() => setLines((x) => x.filter((y) => y.id !== l.id)), () => {}) },
    ]);
  const time = (iso: string) => iso.slice(11, 16);
  const moment = (l: Line) =>
    l.kind === 'plan'
      ? t('groups.chat.plan', { name: (l.name ?? '').toLowerCase(), title: l.body.toLowerCase() })
      : l.kind === 'round'
        ? t('groups.chat.round', { name: (l.name ?? '').toLowerCase(), title: l.body.toLowerCase() })
        : t('groups.chat.won', { title: l.body.toLowerCase() });

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.band}>
        <Text style={styles.title} numberOfLines={1}>{`${name} · ${t('groups.chat')}`}</Text>
      </View>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroll} contentContainerStyle={styles.body} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
          {!lines.length ? <Text style={styles.quiet}>{t('groups.chat.none')}</Text> : null}
          {lines.map((l, i) => {
            if (l.kind !== 'say') {
              return (
                <Pressable key={l.id} onPress={l.event_slug ? () => router.push(`/night/${l.event_slug}`) : undefined} style={styles.moment}>
                  <Text style={styles.momentText}>{up(moment(l))}</Text>
                </Pressable>
              );
            }
            // the face and the name only on the first line of a run by the same person
            const first = lines[i - 1]?.user_id !== l.user_id || lines[i - 1]?.kind !== 'say';
            const name = (l.name ?? '—').toLowerCase();
            return l.mine ? (
              <Pressable key={l.id} onLongPress={() => drop(l)} style={styles.mineWrap}>
                <View style={styles.bubbleMine}>
                  <Text style={styles.text}>{l.body}</Text>
                </View>
                <Text style={styles.metaMine}>{time(l.created_at)}</Text>
              </Pressable>
            ) : (
              <View key={l.id} style={styles.theirsWrap}>
                <View style={[styles.face, !first && styles.faceHidden]}>
                  <Text style={styles.faceText}>{name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.theirsCol}>
                  {first ? <Text style={styles.meta}>{name}</Text> : null}
                  <Pressable onLongPress={() => reporting.ask('group_message', String(l.id))} style={styles.bubble}>
                    <Text style={styles.text}>{l.body}</Text>
                  </Pressable>
                  <Text style={styles.metaSmall}>{time(l.created_at)}</Text>
                </View>
              </View>
            );
          })}
          <Said text={said} bad />
        </ScrollView>
        <View style={[styles.input, { paddingBottom: insets.bottom + 10 }]}>
          <View style={styles.pill}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t('groups.chat.say')}
              placeholderTextColor={colors.mute}
              selectionColor={colors.spot}
              maxLength={1000}
              multiline
              style={styles.pillInput}
            />
            <Pressable onPress={send} style={({ pressed }) => [styles.send, !text.trim() && styles.sendOff, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={t('groups.chat.send')}>
              <Text style={styles.sendText}>↑</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
      <BackButton lift={70} />
      {reporting.sheet}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 40, backgroundColor: colors.ink, zIndex: 2 },
  title: { position: 'absolute', top: brand.top, left: brand.left + 40, right: brand.left + 40, textAlign: 'center', fontFamily: fonts.medium, fontSize: brand.smallSize, letterSpacing: -0.3, color: colors.paper },
  body: { paddingTop: brand.top + 52, paddingHorizontal: brand.left, paddingBottom: 16, gap: 12 },
  quiet: { fontFamily: fonts.regular, fontSize: 13, color: colors.mute, textAlign: 'center', marginTop: 40 },
  theirsWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '86%' },
  theirsCol: { flexShrink: 1, gap: 3 },
  face: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#3a3632', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  faceHidden: { opacity: 0 },
  faceText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.paper },
  bubble: { alignSelf: 'flex-start', backgroundColor: colors.ink3, borderRadius: 18, borderBottomLeftRadius: 5, paddingHorizontal: 13, paddingVertical: 9 },
  mineWrap: { alignSelf: 'flex-end', alignItems: 'flex-end', gap: 3, maxWidth: '80%' },
  bubbleMine: { backgroundColor: colors.spot, borderRadius: 18, borderBottomRightRadius: 5, paddingHorizontal: 13, paddingVertical: 9 },
  meta: { fontFamily: fonts.regular, fontSize: 11, color: colors.mute, marginLeft: 4 },
  metaSmall: { fontFamily: fonts.regular, fontSize: 10, color: colors.meta, marginLeft: 4 },
  metaMine: { fontFamily: fonts.regular, fontSize: 10, color: colors.meta, marginRight: 4 },
  text: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.paper },
  moment: { alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 4 },
  momentText: { fontFamily: fonts.jet, fontSize: 9.5, letterSpacing: 1.1, color: colors.mute, textAlign: 'center' },
  input: { paddingHorizontal: 10, paddingTop: 8, backgroundColor: colors.ink },
  pill: { flexDirection: 'row', alignItems: 'flex-end', minHeight: 46, borderRadius: 23, borderWidth: 1, borderColor: colors.ink3, paddingLeft: 16, paddingRight: 5, paddingVertical: 5 },
  pillInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.paper, maxHeight: 110, paddingTop: 8, paddingBottom: 8 },
  send: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.spot, alignItems: 'center', justifyContent: 'center' },
  sendOff: { opacity: 0.35 },
  sendText: { fontFamily: fonts.semibold, fontSize: 18, color: colors.paper },
  pressed: { opacity: 0.6 },
});
