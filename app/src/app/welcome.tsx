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
import { useLang } from '@/i18n';
import type { Key } from '@/i18n/dict';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// Server code → string key, resolved at render time.
const words: Record<string, Key> = { ok: 'signup.handle.ok', yours: 'signup.handle.yours', empty: 'signup.handle.empty', format: 'signup.handle.format', taken: 'signup.handle.taken', signedout: 'signup.handle.signedout', nocity: 'signup.handle.nocity' };

// Last registration step: handle (how friends find you), name, city.
// Same rule as the website: registration is complete once a handle is chosen.
export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { t, up } = useLang();
  const say = (code: string) => (words[code] ? t(words[code]) : code);
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
    let live = true;
    const timer = setTimeout(() => handleStatus(handle).then((s) => live && setStatus(s)).catch(() => {}), 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
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
      setNote(r);
    } catch (e) {
      setNote(String((e as Error).message).toLowerCase());
    }
    setBusy(false);
  };

  const cityName = city ? (cities.find((c) => c.id === city)?.name ?? city) : t('signup.city.pick');

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior="padding" style={styles.body}>
        <View style={{ paddingBottom: insets.bottom + 24 }}>
          <Text style={styles.line}>{t('signup.welcome.line1')}</Text>
          <Text style={styles.line}>{t('signup.welcome.line2')}</Text>
          <Text style={styles.label}>{up(t('signup.handle'))}</Text>
          <Input value={handle} onChangeText={(v) => setHandle(v.toLowerCase())} placeholder={t('signup.handle.hint')} autoCapitalize="none" maxLength={20} autoFocus />
          {handle && status ? <Text style={styles.hint}>{say(status)}</Text> : null}
          <Text style={styles.label}>{up(t('signup.name'))}</Text>
          <Input value={name} onChangeText={setName} placeholder={t('signup.name.hint')} maxLength={40} />
          <Row label={t('signup.city')} hint={t('signup.city.hint')} right={<Value text={cityName} />} onPress={() => setSheet(true)} />
          {note ? <Text style={styles.hint}>{say(note)}</Text> : null}
          <View style={styles.cta}>
            <Button label={busy ? t('word.moment') : t('signup.done')} onPress={done} />
            <Text style={styles.skip} onPress={() => router.replace('/yours')}>
              {t('signup.later')}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
      <PickerSheet open={sheet} title={t('signup.city')} options={cities.map((c) => ({ id: c.id, label: c.name, extra: `${c.nights}` }))} selected={city} onSelect={setCity} onClose={() => setSheet(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  body: { flex: 1, paddingHorizontal: brand.left, justifyContent: 'flex-end' },
  line: { fontFamily: fonts.medium, fontSize: 34, lineHeight: 40, letterSpacing: -0.8, color: colors.paper },
  label: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.mute, marginTop: 22 },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute, marginTop: 6 },
  cta: { marginTop: 22, gap: 14, alignItems: 'center' },
  skip: { fontFamily: fonts.regular, fontSize: 13, color: colors.mute },
});
