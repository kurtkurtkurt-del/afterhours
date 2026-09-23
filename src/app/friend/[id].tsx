import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import Input from '@/components/Input';
import SoundCorner from '@/components/SoundCorner';
import { Row, Section, Value } from '@/components/Row';
import { friends, nights } from '@/content/friends';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// arkadaş sayfası: keep'leri, şu an nerede, ortak geceler, kaldır. id "add" ise ekleme formu.
export default function FriendScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [handle, setHandle] = useState('');
  const [sent, setSent] = useState(false);
  const f = friends.find((x) => x.id === id);

  if (id === 'add' || !f) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <View style={styles.band}>
          <BackButton />
          <SoundCorner />
        </View>
        <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.big}>add a friend</Text>
          <Text style={styles.note}>by handle. they get a request; nothing is shared until they say yes.</Text>
          <Input value={handle} onChangeText={(v) => setHandle(v.toLowerCase())} placeholder="@handle" autoCapitalize="none" />
          <View style={{ marginTop: 16 }}>
            <Button label={sent ? 'request sent' : 'send request'} onPress={() => handle && setSent(true)} />
          </View>
          <Text style={[styles.note, { marginTop: 24 }]}>or show your code at the door: qr comes with check-in.</Text>
        </View>
      </View>
    );
  }

  const shared = nights.filter((n) => n.friends.includes(f.id));
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.band}>
        <BackButton />
        <SoundCorner />
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.initial, f.live && styles.initialLive]}>
          <Text style={[styles.initialText, f.live && styles.liveText]}>{f.name.charAt(0)}</Text>
        </View>
        <Text style={styles.big}>{f.name}</Text>
        <Text style={styles.mono}>@{f.handle} · {f.live ? `at ${f.live} now` : `seen ${f.seen}`}</Text>

        <Section title={`kept · ${shared.length}`} />
        {shared.map((n) => (
          <Row key={n.id} label={n.title} hint={n.venue} right={<Value text={n.when} />} />
        ))}
        {shared.length === 0 && <Text style={styles.note}>nothing kept this week.</Text>}

        <Section title="together" />
        <Row label="nights out together" right={<Value text={String(Math.max(0, f.kept - 1))} />} />
        <Row label="friends since" right={<Value text="05.26" />} />

        <Section title="" />
        <Pressable hitSlop={8}>
          <Text style={styles.remove}>remove friend</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 36, backgroundColor: colors.ink, zIndex: 2 },
  body: { paddingTop: brand.top + 48, paddingHorizontal: brand.left },
  initial: { width: 64, height: 64, borderWidth: 1.5, borderColor: colors.paper, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  initialLive: { borderColor: colors.spot },
  initialText: { fontFamily: fonts.medium, fontSize: 30, color: colors.paper },
  liveText: { color: colors.spot },
  big: { fontFamily: fonts.medium, fontSize: 30, lineHeight: 32, letterSpacing: -0.9, color: colors.paper },
  mono: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.mute, marginTop: 6 },
  note: { fontFamily: fonts.regular, fontSize: 14, color: colors.mute, marginTop: 8, marginBottom: 16 },
  remove: { fontFamily: fonts.regular, fontSize: 14, color: colors.mute, marginTop: 8 },
});
