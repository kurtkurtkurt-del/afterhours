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
import { pushStatus, registerPush, type PushStatus } from '@/lib/push';
import { useRefreshOnFocus } from '@/hooks/useRefresh';
import { genres, type Genre } from '@/content/music';
import { langNames, langs, upperData, useLang, type Lang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// Settings home: profile card (photo, name, "edit") above grouped panels.
// Form fields live on /profile, not here.
// › opens inside the app, ↗ leaves it.
// Notification switches in three groups (26_push.sql).
const NOTIFY = [
  {
    title: 'notify.friends',
    rows: [
      { key: 'notify_requests', label: 'notify.requests', hint: 'notify.requests.hint' },
      { key: 'notify_accepts', label: 'notify.accepts', hint: 'notify.accepts.hint' },
      { key: 'notify_matches', label: 'notify.matches', hint: 'notify.matches.hint' },
      { key: 'notify_live', label: 'notify.live', hint: 'notify.live.hint' },
    ],
  },
  {
    title: 'notify.nights.title',
    rows: [
      { key: 'notify_nights', label: 'notify.nights', hint: 'notify.nights.hint' },
      { key: 'notify_rooms', label: 'notify.rooms', hint: 'notify.rooms.hint' },
      { key: 'notify_replies', label: 'notify.replies', hint: 'notify.replies.hint' },
    ],
  },
  {
    title: 'notify.discovery',
    rows: [
      { key: 'notify_digest', label: 'notify.digest', hint: 'notify.digest.hint' },
      { key: 'notify_djs', label: 'notify.djs', hint: 'notify.djs.hint' },
      { key: 'notify_waves', label: 'notify.waves', hint: 'notify.waves.hint' },
      { key: 'notify_sparks', label: 'notify.sparks', hint: 'notify.sparks.hint' },
    ],
  },
] as const;

export default function SettingsScreen() {
  const { session, signOut, isAnonymous } = useAuth();
  const tick = useRefreshOnFocus();
  // Refresh the card after returning from the profile page.
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

  // Whether this phone may show notifications; re-read when returning from the system settings.
  const [push, setPush] = useState<PushStatus>('undetermined');
  useEffect(() => {
    pushStatus().then(setPush, () => setPush('unsupported'));
  }, [tick]);
  const allowPush = () => {
    if (push === 'denied') return Linking.openSettings();
    registerPush(true).then(setPush, () => {});
  };

  const patch = (p: Partial<Settings>) => {
    if (!uid || !settings) return;
    setSettings((cur) => (cur ? { ...cur, ...p } : cur));
    // On failure, restore the server value; two quick taps must not race.
    saveSettings(uid, p).catch(() => fetchSettings(uid).then((s) => s && setSettings(s)));
  };

  const confirmDelete = () =>
    Alert.alert(t('settings.delete'), t('settings.delete.body'), [
      { text: t('settings.delete.keep'), style: 'cancel' },
      {
        text: t('settings.delete.go'),
        style: 'destructive',
        onPress: () =>
          // Delete the file before the account: afterwards nobody can reach it.
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
        {/* Profile card: edits the profile when signed in, otherwise opens sign-up. */}
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

        {session && !isAnonymous ? (
          <>
            <Section title={t('notify.title')} />
            {push !== 'granted' ? (
              <Panel>
                {push === 'unsupported' ? (
                  <Row label={t('notify.unsupported')} hint={t('notify.unsupported.hint')} />
                ) : (
                  <Row
                    label={t('notify.allow')}
                    hint={push === 'denied' ? t('notify.allow.off') : t('notify.allow.hint')}
                    right={<Mark kind={push === 'denied' ? 'out' : 'more'} />}
                    onPress={allowPush}
                  />
                )}
              </Panel>
            ) : null}
            <Text style={styles.note}>{t('notify.quiet')}</Text>
            {NOTIFY.map((group) => (
              <View key={group.title}>
                <Section title={t(group.title)} />
                <Panel>
                  {group.rows.map(({ key, label, hint }) => (
                    <Row key={key} label={t(label)} hint={t(hint)} right={<Switch on={settings?.[key] ?? true} />} onPress={() => patch({ [key]: !(settings?.[key] ?? true) })} />
                  ))}
                </Panel>
              </View>
            ))}
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

        {/* Deletion sits in its own box in red, so it is never tapped by accident. */}
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
              router.push('/film');
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
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderWidth: 1, borderColor: colors.ink3, borderRadius: radius.md },
  cardText: { flex: 1, gap: 3 },
  cardName: { fontFamily: fonts.medium, fontSize: 20, letterSpacing: -0.4, color: colors.paper },
  cardUnder: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.2, color: colors.mute },
  note: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.mute, marginTop: 10 },
  foot: { alignItems: 'center', gap: 6, marginTop: 36, marginBottom: 28 },
  logo: { fontFamily: fonts.logo, fontSize: 20, letterSpacing: -0.4, color: colors.paper },
  logoDot: { color: colors.spot },
  version: { fontFamily: fonts.regular, fontSize: 10, letterSpacing: 1.6, color: colors.meta },
});
