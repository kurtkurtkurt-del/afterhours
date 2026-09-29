import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from '@/components/BackButton';
import PullDownScroll from '@/components/PullDownScroll';
import Button from '@/components/Button';
import Input from '@/components/Input';
import SoundCorner from '@/components/SoundCorner';
import { Row, Section, Value } from '@/components/Row';
import { friends, nights } from '@/content/friends';
import { friendAccept, friendRemove, friendRequest } from '@/data/friends';
import { useYours } from '@/data/yours';
import { upperData, useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// Friend page: their keeps, where they are now, nights together, remove. id "add" shows the add form.
export default function FriendScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { t, tx, up } = useLang();
  const [handle, setHandle] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  // sent: a server code or error text, resolved at render time
  const said = sent ? tx('friend.result.' + sent, sent) : null;
  const real = useYours();
  const rf = real.friends.find((x) => x.id === id);
  const f = rf ? { id: rf.id, name: rf.name, handle: rf.handle ?? '', live: rf.live, kept: rf.kept, seen: '' } : friends.find((x) => x.id === id);
  const face = rf?.photo;

  if (id === 'add') {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <View style={styles.band}>
          <BackButton />
          <SoundCorner />
        </View>
        <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.big}>{t('friend.add')}</Text>
          <Text style={styles.note}>{t('friend.add.note')}</Text>
          <Input value={handle} onChangeText={(v) => setHandle(v.toLowerCase())} placeholder={t('friend.placeholder')} autoCapitalize="none" />
          <View style={{ marginTop: 16 }}>
            <Button
              label={said ?? t('friend.send')}
              onPress={() =>
                handle &&
                friendRequest(handle.replace(/^@/, ''))
                  .then((r) => setSent(r))
                  .catch((e) => setSent(String(e.message).toLowerCase()))
              }
            />
          </View>
          <Text style={[styles.note, { marginTop: 24 }]}>{t('friend.qr')}</Text>
        </View>
      </View>
    );
  }

  if (!f) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <View style={styles.band}>
          <BackButton />
          <SoundCorner />
        </View>
        <View style={styles.body}>
          <Text style={styles.big}>{t('friend.none')}</Text>
        </View>
      </View>
    );
  }

  const shared = rf ? real.nights.filter((n) => n.friends.includes(rf.name)).map((n) => ({ id: n.id, title: n.title, venue: n.venue, when: n.when })) : nights.filter((n) => n.friends.includes(f.id));
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.band}>
        <BackButton />
        <SoundCorner />
      </View>
      {/* Like the DJ and night pages: pull down at the top to close. */}
      <PullDownScroll contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.initial, face && styles.initialFace, f.live && styles.initialLive]}>
          {face ? <Image source={{ uri: face }} style={styles.face} resizeMode="cover" /> : <Text style={[styles.initialText, f.live && styles.liveText]}>{f.name.charAt(0)}</Text>}
        </View>
        <Text style={styles.big}>{f.name}</Text>
        <Text style={styles.mono}>@{upperData(f.handle)}{f.live ? ` · ${up(t('friend.at', { venue: upperData(f.live) }))}` : f.seen ? ` · ${up(t('friend.seen', { when: upperData(f.seen) }))}` : ''}</Text>

        <Section title={t('friend.kept', { n: shared.length })} />
        {shared.map((n) => (
          <Row key={n.id} label={n.title} hint={n.venue} right={<Value text={n.when} />} />
        ))}
        {shared.length === 0 && <Text style={styles.note}>{t('friend.nothing')}</Text>}

        <Section title={t('friend.together')} />
        <Row label={t('friend.nights')} right={<Value text={String(Math.max(0, f.kept - 1))} />} />

        {said ? <Text style={styles.note}>{said}</Text> : null}
        <Section title="" />
        {rf?.pending === 'incoming' ? (
          <Button label={t('friend.accept')} onPress={() => friendAccept(rf.id).then(() => router.back()).catch((e) => setSent(String(e.message).toLowerCase()))} />
        ) : null}
        <Pressable hitSlop={8} onPress={() => rf && friendRemove(rf.id).then(() => router.back()).catch((e) => setSent(String(e.message).toLowerCase()))}>
          <Text style={styles.remove}>{rf?.pending === 'outgoing' ? t('friend.cancel') : t('friend.remove')}</Text>
        </Pressable>
      </PullDownScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 36, backgroundColor: colors.ink, zIndex: 2 },
  body: { paddingTop: brand.top + 48, paddingHorizontal: brand.left },
  initial: { width: 64, height: 64, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.paper, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  initialFace: { width: 96, height: 96, borderRadius: radius.lg },
  face: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  initialLive: { borderColor: colors.spot },
  initialText: { fontFamily: fonts.medium, fontSize: 30, color: colors.paper },
  liveText: { color: colors.spot },
  big: { fontFamily: fonts.medium, fontSize: 30, lineHeight: 32, letterSpacing: -0.9, color: colors.paper },
  mono: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.mute, marginTop: 6 },
  note: { fontFamily: fonts.regular, fontSize: 14, color: colors.mute, marginTop: 8, marginBottom: 16 },
  remove: { fontFamily: fonts.regular, fontSize: 14, color: colors.mute, marginTop: 8 },
});
