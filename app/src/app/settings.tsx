import { SITE } from '@/data/deck';
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
import { langNames, langs, useLang, type Lang } from '@/i18n';
import type { Key } from '@/i18n/dict';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// kod → söz anahtarı; söz çizerken çözülür. empty: söylenecek bir şey yok.
const handleWords: Record<string, Key | null> = {
  ok: 'settings.handle.ok',
  yours: 'settings.handle.yours',
  empty: null,
  format: 'settings.handle.format',
  taken: 'settings.handle.taken',
  signedout: 'settings.handle.signedout',
  nocity: 'settings.handle.nocity',
};

// ayarlar: profil, gizlilik, ses, hesap. veritabanındaki kurallarla bire bir.
export default function SettingsScreen() {
  const { session, signOut, isAnonymous } = useAuth();
  const profile = useProfile();
  const { cities } = useCities();
  const ambient = useAmbient();
  const insets = useSafeAreaInsets();
  const { t, up, lang, setLang } = useLang();
  // status ve saved kod saklar (ok, taken …); bilinmeyen kod olduğu gibi görünür
  const word = (code: string) => {
    const key = handleWords[code];
    return key === undefined ? code : key ? t(key) : '';
  };

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
    const timer = setTimeout(() => handleStatus(handle).then((s) => live && setStatus(s)).catch(() => {}), 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [handle]);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setSaved(null);
    try {
      const r = await saveProfile({ handle, name, city, bio });
      setSaved(r);
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
    Alert.alert(t('settings.delete'), t('settings.delete.body'), [
      { text: t('settings.delete.keep'), style: 'cancel' },
      {
        text: t('settings.delete.go'),
        style: 'destructive',
        onPress: () =>
          deleteAccount()
            .then(() => signOut())
            .then(() => router.replace('/'))
            .catch((e) => Alert.alert(t('settings.delete.failed'), String(e.message ?? e).toLowerCase())),
      },
    ]);

  const doExport = () =>
    exportMe()
      .then((json) => Alert.alert(t('settings.export.title'), t('settings.export.body', { kb: (json.length / 1024).toFixed(1) })))
      .catch((e) => Alert.alert(t('settings.export.failed'), String(e.message ?? e).toLowerCase()));

  const cityName = city ? (cities.find((c) => c.id === city)?.name ?? city) : t('settings.city.none');
  const soundName = genres.find((g) => g.id === ambient.genre)?.label ?? ambient.genre;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.band}>
        <BackButton />
        <Text style={styles.title}>{t('settings.title')}</Text>
        <SoundCorner />
      </View>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {!session ? (
          <>
            <Text style={styles.note}>{t('settings.signedout')}</Text>
            <View style={{ marginTop: 16 }}>
              <Button label={t('word.signup')} onPress={() => router.push('/signup')} />
            </View>
          </>
        ) : (
          <>
            <Section title={t('settings.profile')} />
            <Text style={styles.fieldLabel}>{up(t('settings.name'))}</Text>
            <Input value={name} onChangeText={setName} placeholder={t('settings.name.placeholder')} maxLength={40} />
            <Text style={styles.fieldLabel}>{up(t('settings.handle'))}</Text>
            <Input value={handle} onChangeText={(v) => setHandle(v.toLowerCase())} placeholder={t('settings.handle.placeholder')} autoCapitalize="none" maxLength={20} />
            {handle && status && word(status) ? <Text style={styles.fieldHint}>{word(status)}</Text> : null}
            <Text style={styles.fieldLabel}>{up(t('settings.bio'))}</Text>
            <Input value={bio} onChangeText={setBio} placeholder={t('settings.bio.placeholder')} maxLength={160} />
            <Row label={t('settings.city')} hint={t('settings.city.hint')} right={<Value text={cityName} />} onPress={() => setSheet('city')} />
            <View style={styles.save}>
              <Button label={saving ? t('word.moment') : t('settings.save')} onPress={save} />
              {saved ? <Text style={styles.fieldHint}>{saved === 'ok' ? t('word.saved') : word(saved)}</Text> : null}
            </View>

            <Section title={t('settings.privacy')} />
            <Row
              label={t('settings.kept')}
              hint={settings?.kept_visibility === 'private' ? t('settings.kept.private') : t('settings.kept.friends')}
              right={<Value text={settings ? (settings.kept_visibility === 'private' ? t('settings.vis.private') : t('settings.vis.friends')) : '…'} />}
              onPress={() => patch({ kept_visibility: settings?.kept_visibility === 'private' ? 'friends' : 'private' })}
            />
            <Row
              label={t('settings.findable')}
              hint={t('settings.findable.hint')}
              right={<Switch on={settings?.discoverable ?? true} />}
              onPress={() => patch({ discoverable: !(settings?.discoverable ?? true) })}
            />
            <Row
              label={t('settings.email.me')}
              hint={t('settings.email.me.hint')}
              right={<Switch on={settings?.notify_email ?? true} />}
              onPress={() => patch({ notify_email: !(settings?.notify_email ?? true) })}
            />
          </>
        )}

        {/* dil: herkes görür (girişli, misafir, girişsiz). setLang cihaza ve hesaba kendisi yazar. */}
        <Section title={t('lang.label')} />
        <Row label={t('lang.label')} hint={t('lang.hint')} right={<Value text={langNames[lang]} />} onPress={() => setSheet('locale')} />

        <Section title={t('settings.sound')} />
        <Row label={t('settings.music')} right={<Switch on={ambient.on} />} onPress={ambient.toggle} />
        <Row label={t('settings.genre')} hint={t('settings.genre.hint')} right={<Value text={soundName} />} onPress={() => setSheet('sound')} />

        <Section title={t('settings.account')} />
        {isAnonymous ? (
          <Row label={t('settings.finish')} hint={t('settings.finish.hint')} onPress={() => router.push('/signup')} />
        ) : null}
        <Row label={t('settings.email')} right={<Value text={session?.user.email ?? (isAnonymous ? t('word.guest') : t('word.none'))} />} />
        {session ? <Row label={t('settings.export')} hint={t('settings.export.hint')} onPress={doExport} /> : null}
        {session && !isAnonymous ? <Row label={t('word.signout')} onPress={() => signOut().then(() => router.replace('/'))} /> : null}
        {isAnonymous ? (
          <Row
            label={t('settings.leave')}
            hint={t('settings.leave.hint')}
            onPress={() =>
              Alert.alert(t('settings.leave'), t('settings.leave.body'), [
                { text: t('settings.leave.stay'), style: 'cancel' },
                { text: t('settings.leave.go'), style: 'destructive', onPress: () => signOut().then(() => router.replace('/')) },
              ])
            }
          />
        ) : null}
        {session ? <Row label={t('settings.delete')} hint={t('settings.delete.hint')} onPress={confirmDelete} /> : null}

        <Section title={t('settings.about')} />
        <Row label={t('settings.intro')} hint={t('settings.intro.hint')} onPress={() => { Storage.removeItemSync('intro.seen'); router.push('/explore'); }} />
        <Row label={t('settings.web')} hint={t('settings.web.hint')} onPress={() => Linking.openURL(SITE)} />
        <Row label={t('settings.credits')} hint={t('settings.credits.hint')} onPress={() => router.push('/credits')} />
        <Row label={t('settings.privacy.link')} hint={t('settings.privacy.hint')} onPress={() => Linking.openURL('https://kurtkurtkurt-del.github.io/afterhours/datenschutz/')} />
        <Row label={t('settings.version')} right={<Value text={`${Constants.expoConfig?.version ?? '0.1.0'} · ${Constants.executionEnvironment === ExecutionEnvironment.StoreClient ? 'expo go' : 'build'}`} />} />
      </ScrollView>
      </KeyboardAvoidingView>

      <PickerSheet
        open={sheet === 'city'}
        title={t('settings.city')}
        options={cities.map((c) => ({ id: c.id, label: c.name, extra: `${c.nights}` }))}
        selected={city}
        onSelect={setCity}
        onClose={() => setSheet(null)}
      />
      <PickerSheet
        open={sheet === 'sound'}
        title={t('settings.sound')}
        options={genres}
        selected={ambient.genre}
        onSelect={(id) => ambient.setGenre(id as Genre)}
        onClose={() => setSheet(null)}
      />
      <PickerSheet
        open={sheet === 'locale'}
        title={t('lang.label')}
        options={langs.map((id) => ({ id, label: langNames[id] }))}
        selected={lang}
        onSelect={(id) => setLang(id as Lang)}
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
  fieldLabel: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.mute, marginTop: 18 },
  fieldHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute, marginTop: 6 },
  save: { marginTop: 22, gap: 8 },
});
