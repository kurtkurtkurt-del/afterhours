import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Pressable, StyleSheet, Text, View } from 'react-native';
import PullDownScroll from '@/components/PullDownScroll';
import { StatusBar } from 'expo-status-bar';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton, { EdgeBack } from '@/components/BackButton';
import Button from '@/components/Button';
import Input from '@/components/Input';
import PhotoBox from '@/components/PhotoBox';
import PickerSheet from '@/components/PickerSheet';
import SoundCorner from '@/components/SoundCorner';
import { Mark } from '@/components/Row';
import { useAuth } from '@/auth/AuthContext';
import { useCities } from '@/data/cities';
import { usePhoto } from '@/data/photo';
import { saveAbout, saveLinks, useProfile, useProfileExtra, type LinkKind } from '@/data/profile';
import { LINKS } from '@/content/links';
import { handleStatus, saveProfile } from '@/data/settings';
import { useLang, type Key } from '@/i18n';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

const BIO = 300;
const ABOUT = 1500;

// Server code → string key, resolved at render time. empty: nothing to say.
const handleWords: Record<string, Key | null> = {
  ok: 'settings.handle.ok',
  yours: 'settings.handle.yours',
  empty: null,
  format: 'settings.handle.format',
  taken: 'settings.handle.taken',
  signedout: 'settings.handle.signedout',
  nocity: 'settings.handle.nocity',
};
const fine = (code: string) => code === 'ok' || code === 'yours';

// Edit profile, opened from "edit ›" in settings and from the account page. Photo,
// name, handle, bio and city go through profile_setup(); the text about you and the
// links to other networks (29_profile_more.sql) are saved with the same "save".
export default function ProfileScreen() {
  const { session, ready, isAnonymous } = useAuth();
  const profile = useProfile();
  const extra = useProfileExtra(null);
  const { cities } = useCities();
  const insets = useSafeAreaInsets();
  const { photo, busy, choose, remove, broken } = usePhoto();
  const { t, up } = useLang();
  const word = (code: string) => {
    const key = handleWords[code];
    return key === undefined ? code : key ? t(key) : '';
  };

  // Form fields stay null until touched; the displayed value comes from the profile.
  const [nameEdit, setName] = useState<string | null>(null);
  const [handleEdit, setHandle] = useState<string | null>(null);
  const [bioEdit, setBio] = useState<string | null>(null);
  const [cityEdit, setCity] = useState<string | null | undefined>(undefined);
  const name = nameEdit ?? profile?.display_name ?? '';
  const handle = handleEdit ?? profile?.handle ?? '';
  const bio = bioEdit ?? profile?.bio ?? '';
  const city = cityEdit === undefined ? (profile?.city_slug ?? null) : cityEdit;
  const [aboutEdit, setAbout] = useState<string | null>(null);
  const about = aboutEdit ?? extra?.about ?? '';
  const [linkEdits, setLinkEdits] = useState<Partial<Record<LinkKind, string>>>({});
  const linkValue = (k: LinkKind) => linkEdits[k] ?? extra?.links[k] ?? '';
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);

  // Check handle availability on every keystroke.
  useEffect(() => {
    if (!handle) return;
    let live = true; // ignore a late response for an older value
    const timer = setTimeout(() => handleStatus(handle).then((s) => live && setStatus(s)).catch(() => {}), 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [handle]);

  if (ready && !session) return <Redirect href="/signup" />;

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setSaved(null);
    try {
      const r = await saveProfile({ handle, name, city, bio });
      if (r !== 'ok') {
        setSaved(r);
        setSaving(false);
        return;
      }
      if (aboutEdit !== null) await saveAbout(aboutEdit);
      if (Object.keys(linkEdits).length) {
        const l = await saveLinks(linkEdits);
        if (l !== 'ok') {
          setSaved(t('settings.links.format', { kind: l.replace(/^format:?/, '') }));
          setSaving(false);
          return;
        }
      }
      router.back();
      return;
    } catch (e) {
      setSaved(String((e as Error).message).toLowerCase());
    }
    setSaving(false);
  };

  const cityName = city ? (cities.find((c) => c.id === city)?.name ?? city) : t('settings.city.none');
  const said = handle && status ? word(status) : '';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <EdgeBack />
      <KeyboardAvoidingView behavior="padding" style={styles.fill}>
        <PullDownScroll
          header={
            <View style={styles.band}>
              <Text style={styles.title}>{t('settings.profile')}</Text>
              <SoundCorner />
            </View>
          }
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.photoRow}>
            <Pressable onPress={choose} accessibilityRole="imagebutton" accessibilityLabel={t('account.photo')} style={({ pressed }) => pressed && styles.pressed}>
              <PhotoBox uri={photo} size={84} onError={() => photo && broken(photo)} />
            </Pressable>
            <View style={styles.photoLinks}>
              <Pressable onPress={choose} hitSlop={10} style={({ pressed }) => pressed && styles.pressed}>
                <Text style={styles.link}>{busy === 'working' ? t('word.moment') : busy === 'sending' ? t('account.photo.sending') : photo ? t('settings.photo.change') : t('settings.photo.choose')}</Text>
              </Pressable>
              {photo ? (
                <Pressable onPress={remove} hitSlop={10} style={({ pressed }) => pressed && styles.pressed}>
                  <Text style={styles.quiet}>{t('account.photo.remove')}</Text>
                </Pressable>
              ) : null}
              <Text style={styles.hint}>{isAnonymous ? t('account.photo.note.guest') : t('account.photo.note')}</Text>
            </View>
          </View>

          <Text style={styles.label}>{up(t('settings.name'))}</Text>
          <Input value={name} onChangeText={setName} placeholder={t('settings.name.placeholder')} maxLength={40} />

          <View style={styles.labelRow}>
            <Text style={styles.label}>{up(t('settings.handle'))}</Text>
            {said ? (
              <View style={styles.state}>
                <Text style={[styles.label, !fine(status) && styles.bad]}>{up(said)}</Text>
                {fine(status) ? <View style={styles.dot} /> : null}
              </View>
            ) : null}
          </View>
          <View style={styles.handle}>
            <Text style={styles.at}>@</Text>
            <Input value={handle} onChangeText={(v) => setHandle(v.toLowerCase().replace(/^@+/, ''))} autoCapitalize="none" maxLength={20} style={styles.handleInput} />
          </View>
          <Text style={styles.hint}>{t('settings.handle.about')}</Text>

          <View style={styles.labelRow}>
            <Text style={styles.label}>{up(t('settings.bio'))}</Text>
            <Text style={styles.label}>{`${bio.length} / ${BIO}`}</Text>
          </View>
          <Input value={bio} onChangeText={setBio} placeholder={t('settings.bio.placeholder')} maxLength={BIO} multiline style={styles.multi} />

          <View style={styles.labelRow}>
            <Text style={styles.label}>{up(t('settings.aboutYou'))}</Text>
            <Text style={styles.label}>{`${about.length} / ${ABOUT}`}</Text>
          </View>
          <Input value={about} onChangeText={setAbout} placeholder={t('settings.aboutYou.placeholder')} maxLength={ABOUT} multiline textAlignVertical="top" autoCapitalize="sentences" autoCorrect style={[styles.multi, styles.about]} />

          <Text style={styles.label}>{up(t('settings.city'))}</Text>
          <Pressable onPress={() => setSheet(true)} accessibilityRole="button" style={({ pressed }) => [styles.city, pressed && styles.pressed]}>
            <Text style={styles.cityText} numberOfLines={1}>
              {cityName.toLowerCase()}
            </Text>
            <Mark kind="more" />
          </Pressable>
          <Text style={styles.hint}>{t('settings.city.hint')}</Text>

          <Text style={styles.label}>{up(t('settings.links'))}</Text>
          {LINKS.map((l) => (
            <View key={l.kind} style={styles.linkRow}>
              <Text style={styles.linkKind}>{l.label}</Text>
              {l.prefix ? <Text style={styles.at}>{l.prefix}</Text> : null}
              <Input
                value={linkValue(l.kind)}
                onChangeText={(v) => setLinkEdits((e) => ({ ...e, [l.kind]: l.kind === 'website' ? v.trim() : v.replace(/^@+/, '').trim() }))}
                placeholder={l.kind === 'website' ? 'https://' : l.kind === 'spotify' ? t('settings.links.spotify') : l.kind === 'whatsapp' ? t('settings.links.whatsapp') : ''}
                keyboardType={l.kind === 'website' ? 'url' : l.kind === 'whatsapp' ? 'phone-pad' : 'default'}
                maxLength={l.kind === 'website' ? 200 : 40}
                style={styles.linkInput}
              />
            </View>
          ))}
          <Text style={styles.hint}>{t('settings.links.hint')}</Text>

          <View style={styles.save}>
            <Button label={saving ? t('word.moment') : t('settings.save')} onPress={save} />
            {saved ? <Text style={[styles.hint, styles.bad]}>{word(saved)}</Text> : null}
          </View>

          <BackButton inline />
        </PullDownScroll>
      </KeyboardAvoidingView>

      <PickerSheet
        open={sheet}
        title={t('settings.city')}
        options={cities.map((c) => ({ id: c.id, label: c.name, extra: `${c.nights}` }))}
        selected={city}
        onSelect={setCity}
        onClose={() => setSheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  fill: { flex: 1 },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 40, backgroundColor: colors.ink, zIndex: 2 },
  title: { position: 'absolute', top: brand.top, left: 0, right: 0, textAlign: 'center', fontFamily: fonts.medium, fontSize: brand.smallSize, letterSpacing: -0.3, color: colors.paper },
  body: { paddingTop: brand.top + 56, paddingHorizontal: brand.left },
  pressed: { opacity: 0.6 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 6 },
  photoLinks: { flex: 1, alignItems: 'flex-start', gap: 8 },
  link: { fontFamily: fonts.regular, fontSize: 14, color: colors.paper, textDecorationLine: 'underline' },
  quiet: { fontFamily: fonts.regular, fontSize: 13, color: colors.mute },
  labelRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  label: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.mute, marginTop: 24 },
  state: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.spot, marginTop: 24 },
  bad: { color: colors.spotText },
  handle: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.paper },
  at: { fontFamily: fonts.regular, fontSize: 17, color: colors.mute },
  handleInput: { flex: 1, borderBottomWidth: 0 },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute, marginTop: 8 },
  city: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.paper },
  cityText: { flex: 1, fontFamily: fonts.regular, fontSize: 17, letterSpacing: -0.2, color: colors.paper },
  save: { marginTop: 40, marginBottom: 18, gap: 8 },
  multi: { height: undefined, minHeight: 48, paddingVertical: 12 },
  about: { minHeight: 140, lineHeight: 23 },
  linkRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.ink3 },
  linkKind: { width: 96, fontFamily: fonts.regular, fontSize: 13, color: colors.mute },
  linkInput: { flex: 1, borderBottomWidth: 0 },
});
