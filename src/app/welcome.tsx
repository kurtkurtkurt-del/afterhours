import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Storage from 'expo-sqlite/kv-store';
import Button from '@/components/Button';
import Input from '@/components/Input';
import PickerSheet from '@/components/PickerSheet';
import { Row, Value } from '@/components/Row';
import { useCities } from '@/data/cities';
import { handleStatus, saveProfile } from '@/data/settings';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

const words: Record<string, string> = { ok: 'available', yours: 'that is you', format: '3–20 letters, numbers or _', taken: 'taken', signedout: 'sign in first', nocity: 'unknown city' };

// kaydın son adımı: handle (arkadaşlar seni bununla bulur), isim, şehir.
// web sitesiyle aynı kural: handle seçilince kayıt tamamlanmış sayılır.
export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { cities } = useCities();
  const [handle, setHandle] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState<string | null>(() => Storage.getItemSync('city'));
  const [status, setStatus] = useState('');
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!handle) return;
    const t = setTimeout(() => handleStatus(handle).then((s) => setStatus(words[s] ?? s)).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [handle]);

  const done = async () => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      const r = await saveProfile({ handle, name, city, bio: '' });
      if (r === 'ok') {
        if (city) Storage.setItemSync('city', city);
        router.replace('/yours');
        return;
      }
      setNote(words[r] ?? r);
    } catch (e) {
      setNote(String((e as Error).message).toLowerCase());
    }
    setBusy(false);
  };

  const cityName = city ? (cities.find((c) => c.id === city)?.name ?? city) : 'pick one';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior="padding" style={styles.body}>
        <View style={{ paddingBottom: insets.bottom + 24 }}>
          <Text style={styles.line}>one last thing.</Text>
          <Text style={styles.line}>what do we call you?</Text>
          <Text style={styles.label}>handle</Text>
          <Input value={handle} onChangeText={(v) => setHandle(v.toLowerCase())} placeholder="friends find you by this" autoCapitalize="none" maxLength={20} autoFocus />
          {handle && status ? <Text style={styles.hint}>{status}</Text> : null}
          <Text style={styles.label}>name</Text>
          <Input value={name} onChangeText={setName} placeholder="how you are shown" maxLength={40} />
          <Row label="city" hint="the deck opens here" right={<Value text={cityName} />} onPress={() => setSheet(true)} />
          {note ? <Text style={styles.hint}>{note}</Text> : null}
          <View style={styles.cta}>
            <Button label={busy ? 'one moment' : 'done'} onPress={done} />
            <Text style={styles.skip} onPress={() => router.replace('/yours')}>
              later
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
      <PickerSheet open={sheet} title="city" options={cities.map((c) => ({ id: c.id, label: c.name, extra: `${c.nights}` }))} selected={city} onSelect={setCity} onClose={() => setSheet(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  body: { flex: 1, paddingHorizontal: brand.left, justifyContent: 'flex-end' },
  line: { fontFamily: fonts.medium, fontSize: 34, lineHeight: 40, letterSpacing: -0.8, color: colors.paper },
  label: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.mute, marginTop: 22 },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute, marginTop: 6 },
  cta: { marginTop: 22, gap: 14, alignItems: 'center' },
  skip: { fontFamily: fonts.regular, fontSize: 13, color: colors.mute },
});
