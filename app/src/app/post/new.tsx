import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/Button';
import PickerSheet from '@/components/PickerSheet';
import StaffPage, { Quiet } from '@/components/StaffPage';
import { useAuth } from '@/auth/AuthContext';
import { kept } from '@/data/friends';
import type { Night } from '@/data/deck';
import { pickPostPhoto, postCreate } from '@/data/posts';
import { why } from '@/data/staff';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// A post, camera first (design 2A): the photo fills the screen, the words go on top
// of it at the bottom, the night is a chip at the top. Without a photo the screen
// is ink and the words stand alone. Friends see it in their yours tab.
export default function NewPost() {
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const { session, isAnonymous } = useAuth();
  const uid = session?.user.id;
  const [photo, setPhoto] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [night, setNight] = useState<Night | null>(null);
  const [nights, setNights] = useState<Night[]>([]);
  const [choosing, setChoosing] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    kept().then(setNights, () => {});
  }, []);

  if (!uid || isAnonymous) {
    return (
      <StaffPage title={t('posts.new')}>
        <Quiet text={t('posts.account')} />
        <View style={styles.gap}>
          <Button label={t('word.signup')} onPress={() => router.push('/signup')} />
        </View>
      </StaffPage>
    );
  }
  const pick = () => pickPostPhoto().then((u) => u && setPhoto(u), (e) => setSaid(why(e)));
  const share = () => {
    setBusy(true);
    setSaid(null);
    postCreate(uid, body, photo, night?.id ?? null)
      .then(() => router.back())
      .catch((e) => setSaid(why(e)))
      .finally(() => setBusy(false));
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {photo ? <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
      <LinearGradient colors={['rgba(14,13,12,0.55)', 'rgba(14,13,12,0)', 'rgba(14,13,12,0.2)', 'rgba(14,13,12,0.9)']} locations={[0, 0.2, 0.5, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />

      <View style={[styles.top, { top: Math.max(insets.top, 20) + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('word.back')}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
        <Pressable onPress={() => setChoosing(true)} style={({ pressed }) => [styles.chip, night && styles.chipOn, pressed && styles.pressed]} accessibilityRole="button">
          <Text style={[styles.chipText, night && styles.chipTextOn]} numberOfLines={1}>
            {night ? `↗ ${night.title.toLowerCase()}` : t('posts.night')}
          </Text>
        </Pressable>
      </View>

      {!photo ? (
        <Pressable onPress={pick} style={styles.empty} accessibilityRole="button">
          <Text style={styles.plus}>+</Text>
          <Text style={styles.emptyText}>{t('posts.photo')}</Text>
        </Pressable>
      ) : null}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.bottomWrap} pointerEvents="box-none">
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder={t('posts.body')}
            placeholderTextColor="rgba(243,241,236,0.55)"
            selectionColor={colors.spot}
            multiline
            maxLength={500}
            style={styles.words}
          />
          {said ? <Text style={styles.bad}>{said}</Text> : null}
          <View style={styles.buttons}>
            <Pressable onPress={pick} style={({ pressed }) => [styles.line, pressed && styles.pressed]} accessibilityRole="button">
              <Text style={styles.lineText}>{photo ? t('posts.photo.change') : t('posts.photo')}</Text>
            </Pressable>
            <Pressable onPress={busy ? undefined : share} style={({ pressed }) => [styles.share, pressed && styles.pressed]} accessibilityRole="button">
              <Text style={styles.shareText}>{busy ? '…' : t('posts.share')}</Text>
            </Pressable>
          </View>
          <Text style={styles.who}>{t('posts.who')}</Text>
        </View>
      </KeyboardAvoidingView>

      <PickerSheet
        open={choosing}
        title={t('posts.night')}
        options={[{ id: 'none', label: t('posts.night.none') }, ...nights.map((n) => ({ id: n.id, label: n.title.toLowerCase() }))]}
        selected={night?.id ?? 'none'}
        onSelect={(id) => setNight(nights.find((n) => n.id === id) ?? null)}
        onClose={() => setChoosing(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  gap: { marginTop: 24 },
  top: { position: 'absolute', left: brand.left, right: brand.left, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 2, gap: 16 },
  close: { fontFamily: fonts.medium, fontSize: 22, color: colors.paper },
  chip: { flexShrink: 1, height: 32, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(243,241,236,0.45)', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.paper, borderColor: colors.paper },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.paper },
  chipTextOn: { color: colors.ink },
  pressed: { opacity: 0.6 },
  empty: { position: 'absolute', top: '22%', left: 0, right: 0, alignItems: 'center', gap: 6 },
  plus: { fontFamily: fonts.medium, fontSize: 56, color: colors.paper },
  emptyText: { fontFamily: fonts.regular, fontSize: 14, color: colors.mute },
  bottomWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bottom: { paddingHorizontal: brand.left, gap: 12 },
  words: { fontFamily: fonts.medium, fontSize: 24, lineHeight: 30, letterSpacing: -0.4, color: colors.paper, maxHeight: 180, paddingVertical: 0 },
  bad: { fontFamily: fonts.regular, fontSize: 13, color: colors.spotText },
  buttons: { flexDirection: 'row', gap: 10 },
  line: { flex: 1, height: 46, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(243,241,236,0.45)', alignItems: 'center', justifyContent: 'center' },
  lineText: { fontFamily: fonts.medium, fontSize: 15, color: colors.paper },
  share: { flex: 1, height: 46, borderRadius: radius.pill, backgroundColor: colors.spot, alignItems: 'center', justifyContent: 'center' },
  shareText: { fontFamily: fonts.medium, fontSize: 15, color: colors.paper },
  who: { fontFamily: fonts.regular, fontSize: 11, color: colors.mute, textAlign: 'center' },
});
