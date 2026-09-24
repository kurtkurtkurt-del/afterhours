import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Storage from 'expo-sqlite/kv-store';
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import Input from '@/components/Input';
import PickerSheet from '@/components/PickerSheet';
import SoundCorner from '@/components/SoundCorner';
import { Row, Section, Switch, Value } from '@/components/Row';
import { useAuth } from '@/auth/AuthContext';
import { useAmbient } from '@/audio/AmbientContext';
import { useCities } from '@/data/cities';
import { useProfile } from '@/data/profile';
import { deleteAccount, exportMe, fetchSettings, handleStatus, saveProfile, saveSettings, type Settings } from '@/data/settings';
import { genres, type Genre } from '@/content/music';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

const handleWords: Record<string, string> = {
  ok: 'available',
  yours: 'that is you',
  empty: '',
  format: '3–20 letters, numbers or _',
  taken: 'taken',
  signedout: 'sign in first',
  nocity: 'unknown city',
};

// ayarlar: profil, gizlilik, ses, hesap. veritabanındaki kurallarla bire bir.
export default function SettingsScreen() {
  const { session, signOut, isAnonymous } = useAuth();
  const profile = useProfile();
  const { cities } = useCities();
  const ambient = useAmbient();
  const insets = useSafeAreaInsets();

  // form alanları: kullanıcı dokunana kadar null, görünen değer profilden gelir.
  // böylece profili forma "kopyalayan" bir effect gerekmiyor.
  const [nameEdit, setName] = useState<string | null>(null);
  const [handleEdit, setHandle] = useState<string | null>(null);
  const [bioEdit, setBio] = useState<string | null>(null);
  const [cityEdit, setCity] = useState<string | null | undefined>(undefined);
  const name = nameEdit ?? profile?.display_name ?? '';
  const handle = handleEdit ?? profile?.handle ?? '';
  const bio = bioEdit ?? profile?.bio ?? '';
  const city = cityEdit === undefined ? (profile?.city_slug ?? null) : cityEdit;
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [sheet, setSheet] = useState<'city' | 'sound' | 'locale' | null>(null);

  const uid = session?.user.id;
  useEffect(() => {
    if (!uid) return;
    let live = true;
    fetchSettings(uid).then((s) => live && s && setSettings(s));
    return () => {
      live = false;
    };
  }, [uid]);

  // handle her tuşta sorulur
  useEffect(() => {
    if (!handle) return;
    let live = true; // geç gelen eski cevap yeni değeri ezmesin
    const t = setTimeout(() => handleStatus(handle).then((s) => live && setStatus(handleWords[s] ?? s)).catch(() => {}), 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [handle]);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setSaved(null);
    try {
      const r = await saveProfile({ handle, name, city, bio });
      setSaved(r === 'ok' ? 'saved' : (handleWords[r] ?? r));
    } catch (e) {
      setSaved(String((e as Error).message).toLowerCase());
    }
    setSaving(false);
  };

  const patch = (p: Partial<Settings>) => {
    if (!uid || !settings) return;
    setSettings((cur) => (cur ? { ...cur, ...p } : cur));
    // olmazsa sunucudaki gerçek hali geri çek; iki hızlı dokunuş birbirini bozmasın
    saveSettings(uid, p).catch(() => fetchSettings(uid).then((s) => s && setSettings(s)));
  };

  const confirmDelete = () =>
    Alert.alert('delete account', 'your comments stay, your name becomes "someone". this cannot be undone.', [
      { text: 'keep it', style: 'cancel' },
      {
        text: 'delete',
        style: 'destructive',
        onPress: () =>
          deleteAccount()
            .then(() => signOut())
            .then(() => router.replace('/'))
            .catch((e) => Alert.alert('could not delete', String(e.message ?? e).toLowerCase())),
      },
    ]);

  const doExport = () =>
    exportMe()
      .then((json) => Alert.alert('your data', `${(json.length / 1024).toFixed(1)} kb of json. a share sheet comes later; for now it is fetched and shown here.`))
      .catch((e) => Alert.alert('export failed', String(e.message ?? e).toLowerCase()));

  const cityName = city ? (cities.find((c) => c.id === city)?.name ?? city) : 'not set';
  const soundName = genres.find((g) => g.id === ambient.genre)?.label ?? ambient.genre;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.band}>
        <BackButton />
        <Text style={styles.title}>settings</Text>
        <SoundCorner />
      </View>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {!session ? (
          <>
            <Text style={styles.note}>you are not signed in. the profile and privacy settings need an account.</Text>
            <View style={{ marginTop: 16 }}>
              <Button label="sign up" onPress={() => router.push('/signup')} />
            </View>
          </>
        ) : (
          <>
            <Section title="profile" />
            <Text style={styles.fieldLabel}>name</Text>
            <Input value={name} onChangeText={setName} placeholder="how you are shown" maxLength={40} />
            <Text style={styles.fieldLabel}>handle</Text>
            <Input value={handle} onChangeText={(v) => setHandle(v.toLowerCase())} placeholder="friends find you by this" autoCapitalize="none" maxLength={20} />
            {handle && status ? <Text style={styles.fieldHint}>{status}</Text> : null}
            <Text style={styles.fieldLabel}>one line</Text>
            <Input value={bio} onChangeText={setBio} placeholder="techno first, house after four." maxLength={160} />
            <Row label="city" hint="the deck opens here" right={<Value text={cityName} />} onPress={() => setSheet('city')} />
            <View style={styles.save}>
              <Button label={saving ? 'one moment' : 'save profile'} onPress={save} />
              {saved ? <Text style={styles.fieldHint}>{saved}</Text> : null}
            </View>

            <Section title="privacy" />
            <Row
              label="who sees what you kept"
              hint={settings?.kept_visibility === 'private' ? 'nobody, not even friends' : 'confirmed friends'}
              right={<Value text={settings?.kept_visibility ?? '…'} />}
              onPress={() => patch({ kept_visibility: settings?.kept_visibility === 'private' ? 'friends' : 'private' })}
            />
            <Row
              label="findable by handle"
              hint="off: strangers see no card, but can still send a request"
              right={<Switch on={settings?.discoverable ?? true} />}
              onPress={() => patch({ discoverable: !(settings?.discoverable ?? true) })}
            />
            <Row
              label="email me"
              hint="friend requests, the odd reminder"
              right={<Switch on={settings?.notify_email ?? true} />}
              onPress={() => patch({ notify_email: !(settings?.notify_email ?? true) })}
            />
        {/* language: hidden until there are translations; profile_settings.locale stays in the database */}
          </>
        )}

        <Section title="sound" />
        <Row label="background music" right={<Switch on={ambient.on} />} onPress={ambient.toggle} />
        <Row label="genre" hint="ten tracks each" right={<Value text={soundName} />} onPress={() => setSheet('sound')} />

        <Section title="account" />
        {isAnonymous ? (
          <Row label="finish your account" hint="you are browsing as a guest; add an email to keep your nights" onPress={() => router.push('/signup')} />
        ) : null}
        <Row label="email" right={<Value text={session?.user.email ?? (isAnonymous ? 'guest' : 'none')} />} />
        {session ? <Row label="download my data" hint="everything we hold about you, as json" onPress={doExport} /> : null}
        {session && !isAnonymous ? <Row label="sign out" onPress={() => signOut().then(() => router.replace('/'))} /> : null}
        {isAnonymous ? (
          <Row
            label="leave guest mode"
            hint="a guest has no password: what you kept cannot be recovered afterwards"
            onPress={() =>
              Alert.alert('leave guest mode', 'your kept nights and cards on this device will be lost. add an email first to keep them.', [
                { text: 'stay', style: 'cancel' },
                { text: 'leave', style: 'destructive', onPress: () => signOut().then(() => router.replace('/')) },
              ])
            }
          />
        ) : null}
        {session ? <Row label="delete account" hint="comments stay, name becomes “someone”" onPress={confirmDelete} /> : null}

        <Section title="about" />
        <Row label="show the intro again" hint="the six steps you saw on first visit" onPress={() => { Storage.removeItemSync('intro.seen'); router.push('/explore'); }} />
        <Row label="credits" hint="music, map, type" onPress={() => router.push('/credits')} />
        <Row label="privacy" hint="what we keep and why" onPress={() => Linking.openURL('https://kurtkurtkurt-del.github.io/afterhours/datenschutz/')} />
        <Row label="version" right={<Value text={`${Constants.expoConfig?.version ?? '0.1.0'} · ${Constants.executionEnvironment === ExecutionEnvironment.StoreClient ? 'expo go' : 'build'}`} />} />
      </ScrollView>
      </KeyboardAvoidingView>

      <PickerSheet
        open={sheet === 'city'}
        title="city"
        options={cities.map((c) => ({ id: c.id, label: c.name, extra: `${c.nights}` }))}
        selected={city}
        onSelect={setCity}
        onClose={() => setSheet(null)}
      />
      <PickerSheet
        open={sheet === 'sound'}
        title="sound"
        options={genres}
        selected={ambient.genre}
        onSelect={(id) => ambient.setGenre(id as Genre)}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 40, backgroundColor: colors.ink, zIndex: 2 },
  title: { position: 'absolute', top: brand.top, left: 0, right: 0, textAlign: 'center', fontFamily: fonts.medium, fontSize: brand.smallSize, letterSpacing: -0.3, color: colors.paper },
  body: { paddingTop: brand.top + 40, paddingHorizontal: brand.left },
  note: { fontFamily: fonts.regular, fontSize: 15, color: colors.paper2, opacity: 0.85, marginTop: 16 },
  fieldLabel: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.mute, marginTop: 18 },
  fieldHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute, marginTop: 6 },
  save: { marginTop: 22, gap: 8 },
});
