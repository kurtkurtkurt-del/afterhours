import { SITE } from '@/data/deck';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Storage from 'expo-sqlite/kv-store';
import BackButton, { EdgeBack } from '@/components/BackButton';
import PhotoBox from '@/components/PhotoBox';
import PickerSheet from '@/components/PickerSheet';
import SoundCorner from '@/components/SoundCorner';
import { Mark, Panel, Row, Section, Switch, Value } from '@/components/Row';
import { useAuth } from '@/auth/AuthContext';
import { useAmbient } from '@/audio/AmbientContext';
import { forgetPhoto, removePhoto, usePhoto } from '@/data/photo';
import { useProfile } from '@/data/profile';
import { deleteAccount, exportMe, fetchSettings, saveSettings, type Settings } from '@/data/settings';
import { useRefreshOnFocus } from '@/hooks/useRefresh';
import { genres, type Genre } from '@/content/music';
import { langNames, langs, upperData, useLang, type Lang } from '@/i18n';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// ayarlar, ana sayfa: üstte profil kartı (fotoğraf + isim + "düzenle"), altında
// gruplu paneller. form alanları burada değil, /profile sayfasında.
// › sayfa içinde açılır, ↗ uygulamanın dışına çıkar.
export default function SettingsScreen() {
  const { session, signOut, isAnonymous } = useAuth();
  const tick = useRefreshOnFocus();
  // profil sayfasından dönünce kart yeni ismi göstersin
  const profile = useProfile(tick);
  const ambient = useAmbient();
  const insets = useSafeAreaInsets();
  const { photo, broken } = usePhoto();
  const { t, up, lang, setLang } = useLang();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [sheet, setSheet] = useState<'sound' | 'locale' | 'kept' | null>(null);

  const uid = session?.user.id;
  useEffect(() => {
    if (!uid) return;
    let live = true;
    fetchSettings(uid).then((s) => live && s && setSettings(s));
    return () => {
      live = false;
    };
  }, [uid]);

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
          // dosya kovadan önce gider: hesap silinince ona ulaşacak kimse kalmaz
          removePhoto()
            .then(() => deleteAccount())
            .then(() => signOut())
            .then(() => router.replace('/'))
            .catch((e) => Alert.alert(t('settings.delete.failed'), String(e.message ?? e).toLowerCase())),
      },
    ]);

  const doExport = () =>
    exportMe()
      .then((json) => Alert.alert(t('settings.export.title'), t('settings.export.body', { kb: (json.length / 1024).toFixed(1) })))
      .catch((e) => Alert.alert(t('settings.export.failed'), String(e.message ?? e).toLowerCase()));

  const soundName = genres.find((g) => g.id === ambient.genre)?.label ?? ambient.genre;
  const hidden = settings?.kept_visibility === 'private';
  const name = (profile?.display_name ?? session?.user.email?.split('@')[0] ?? t('account.you')).toLowerCase();
  const under = [profile?.handle ? `@${profile.handle}` : null, profile?.city_name ?? Storage.getItemSync('city.name')]
    .filter(Boolean)
    .map((s) => upperData(String(s)))
    .join(' · ');
  const version = `${Constants.expoConfig?.version ?? '0.1.0'} · ${Constants.executionEnvironment === ExecutionEnvironment.StoreClient ? 'expo go' : 'build'}`;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <EdgeBack />
      <View style={styles.band}>
        <Text style={styles.title}>{t('settings.title')}</Text>
        <SoundCorner />
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {/* profil kartı: girişliyse düzenlemeye, değilse kayda götürür */}
        <Pressable
          onPress={() => router.push(session && !isAnonymous ? '/profile' : '/signup')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <PhotoBox uri={photo} size={52} onError={() => photo && broken(photo)} />
          <View style={styles.cardText}>
            <Text style={styles.cardName} numberOfLines={1}>
              {session ? name : t('account.you')}
            </Text>
            <Text style={styles.cardUnder} numberOfLines={1}>
              {session && !isAnonymous ? under || up(t('account.noHandle')) : up(isAnonymous ? t('word.guest') : t('settings.guest.hint'))}
            </Text>
          </View>
          <Value text={session && !isAnonymous ? t('settings.edit') : t('word.signup')} more />
        </Pressable>

        <Section title={t('settings.app')} />
        <Panel>
          <Row label={t('lang.label')} hint={t('lang.hint')} right={<Value text={langNames[lang]} more />} onPress={() => setSheet('locale')} />
          <Row label={t('settings.music')} right={<Switch on={ambient.on} />} onPress={ambient.toggle} />
          <Row label={t('settings.genre')} hint={t('settings.genre.hint')} right={<Value text={soundName} more />} onPress={() => setSheet('sound')} />
        </Panel>

        {session ? (
          <>
            <Section title={t('settings.privacy')} />
            <Panel>
              <Row
                label={t('settings.kept')}
                hint={hidden ? t('settings.kept.private') : t('settings.kept.friends')}
                right={<Value text={settings ? (hidden ? t('settings.vis.private') : t('settings.vis.friends')) : '…'} more />}
                onPress={settings ? () => setSheet('kept') : undefined}
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
            </Panel>
          </>
        ) : null}

        <Section title={t('settings.account')} />
        <Panel>
          {isAnonymous ? <Row label={t('settings.finish')} hint={t('settings.finish.hint')} right={<Mark kind="more" />} onPress={() => router.push('/signup')} /> : null}
          <Row label={t('settings.email')} right={<Value text={session?.user.email ?? (isAnonymous ? t('word.guest') : t('word.none'))} />} />
          {session ? <Row label={t('settings.export')} hint={t('settings.export.hint')} right={<Mark kind="more" />} onPress={doExport} /> : null}
          {session && !isAnonymous ? <Row label={t('word.signout')} onPress={() => signOut().then(forgetPhoto).then(() => router.replace('/'))} /> : null}
          {!session ? <Row label={t('word.signup')} right={<Mark kind="more" />} onPress={() => router.push('/signup')} /> : null}
          {isAnonymous ? (
            <Row
              label={t('settings.leave')}
              hint={t('settings.leave.hint')}
              onPress={() =>
                Alert.alert(t('settings.leave'), t('settings.leave.body'), [
                  { text: t('settings.leave.stay'), style: 'cancel' },
                  { text: t('settings.leave.go'), style: 'destructive', onPress: () => signOut().then(forgetPhoto).then(() => router.replace('/')) },
                ])
              }
            />
          ) : null}
        </Panel>

        {/* silmek ayrı kutuda, kırmızı yazıyla: yanlışlıkla dokunulacak bir satır değil */}
        {session ? (
          <Panel>
            <Row danger label={t('settings.delete')} hint={t('settings.delete.hint')} onPress={confirmDelete} />
          </Panel>
        ) : null}

        <Section title={t('settings.about')} />
        <Panel>
          <Row
            label={t('settings.intro')}
            hint={t('settings.intro.hint')}
            right={<Mark kind="more" />}
            onPress={() => {
              Storage.removeItemSync('intro.seen');
              router.push('/explore');
            }}
          />
          <Row label={t('settings.web')} hint={t('settings.web.hint')} right={<Mark kind="out" />} onPress={() => Linking.openURL(SITE)} />
          <Row label={t('settings.credits')} hint={t('settings.credits.hint')} right={<Mark kind="more" />} onPress={() => router.push('/credits')} />
          <Row label={t('settings.privacy.link')} hint={t('settings.privacy.hint')} right={<Mark kind="out" />} onPress={() => Linking.openURL('https://kurtkurtkurt-del.github.io/afterhours/datenschutz/')} />
        </Panel>

        <View style={styles.foot}>
          <Text style={styles.logo}>
            afterhours<Text style={styles.logoDot}>.</Text>
          </Text>
          <Text style={styles.version}>{`${up(t('settings.version'))} ${upperData(version)}`}</Text>
        </View>

        <BackButton inline />
      </ScrollView>

      <PickerSheet
        open={sheet === 'kept'}
        title={t('settings.kept')}
        options={[
          { id: 'friends', label: t('settings.kept.friends') },
          { id: 'private', label: t('settings.kept.private') },
        ]}
        selected={settings?.kept_visibility ?? null}
        onSelect={(id) => patch({ kept_visibility: id as Settings['kept_visibility'] })}
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
  body: { paddingTop: brand.top + 56, paddingHorizontal: brand.left },
  pressed: { opacity: 0.6 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderWidth: 1, borderColor: colors.ink3 },
  cardText: { flex: 1, gap: 3 },
  cardName: { fontFamily: fonts.medium, fontSize: 20, letterSpacing: -0.4, color: colors.paper },
  cardUnder: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.2, color: colors.mute },
  foot: { alignItems: 'center', gap: 6, marginTop: 36, marginBottom: 28 },
  logo: { fontFamily: fonts.logo, fontSize: 20, letterSpacing: -0.4, color: colors.paper },
  logoDot: { color: colors.spot },
  version: { fontFamily: fonts.regular, fontSize: 10, letterSpacing: 1.6, color: colors.meta },
});
