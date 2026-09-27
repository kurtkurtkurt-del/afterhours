import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Storage from 'expo-sqlite/kv-store';
import AfterhoursCard from '@/components/AfterhoursCard';
import Icon from '@/components/Icon';
import PickerSheet from '@/components/PickerSheet';
import SoundCorner from '@/components/SoundCorner';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import { useAuth } from '@/auth/AuthContext';
import { usePhoto } from '@/data/photo';
import { useProfile } from '@/data/profile';
import { collection as samples } from '@/content/collection';
import { myCards, toCardData, type CardRow } from '@/data/checkin';
import { useRefreshOnFocus } from '@/hooks/useRefresh';
import type { NightCardData } from '@/content/cardsgen';
import { upperData, useLang } from '@/i18n';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// kartın genişliği ekranın bu kadarı; her kart bir öncekinin bu kadarını açıkta bırakır
const CARD = 0.39;
const STEP = 0.42;

function distinct(list: (string | null | undefined)[]) {
  return new Set(list.filter(Boolean).map((c) => String(c).toLowerCase())).size;
}

// hesap, "afiş üstte, kâğıt üstünde deste": üstte kendi fotoğrafın ve adın,
// altta kâğıt zeminde yana kayan kart destesi. sayılar iki ince satıra indi;
// çıkış ve geri kalan her şey ayarlarda.
export default function AccountScreen() {
  const { session, isAnonymous } = useAuth();
  const { t, tn, up } = useLang();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [open, setOpen] = useState<number | null>(null);
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [cards, setCards] = useState<CardRow[] | null>(null);
  const { photo, busy, choose, remove, broken } = usePhoto();
  const [sheet, setSheet] = useState(false);
  const tick = useRefreshOnFocus();
  // ayarlardan dönünce yeni isim ve şehir görünsün
  const profile = useProfile(tick);
  const uid = session?.user.id;
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    myCards().then((c) => !cancelled && setCards(c)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [uid, tick]);
  // gerçek kartlar; hiç yoksa örnekler, sağ üstte "örnekler" yazısıyla
  const real = cards && cards.length > 0;
  const collection: NightCardData[] = real ? cards.map(toCardData) : samples;
  const cities = real ? distinct(cards.map((c) => c.city_name)) : distinct(samples.map((c) => c.city));

  const name = (profile?.display_name ?? session?.user.email?.split('@')[0] ?? t('account.you')).toLowerCase();
  const handle = profile?.handle ? `@${profile.handle}` : null;
  const city = profile?.city_name ?? Storage.getItemSync('city.name');
  const since = profile ? new Date(profile.created_at) : null;
  const sinceText = since ? t('account.since', { date: `${String(since.getMonth() + 1).padStart(2, '0')}.${String(since.getFullYear()).slice(2)}` }) : null;
  const meta = [city ? upperData(city) : null, handle ? upperData(handle) : null, sinceText ? up(sinceText) : null].filter(Boolean).join(' · ') || up(t('account.notSignedIn'));

  const cardW = Math.round(width * CARD);
  const cardH = cardW * 1.5;

  // afişe dokunmak: fotoğraf yoksa doğrudan seçici, varsa iki seçenekli liste.
  // liste kapanırken seçiciyi açmak android'de ekranı kilitliyordu; önce kapansın.
  const tap = () => (photo ? setSheet(true) : choose());
  const picked = (id: string) => setTimeout(() => (id === 'remove' ? remove() : choose()), 320);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* afiş: fotoğraf, altında koyulaşan zemin, sol altta isim */}
      <Pressable style={styles.poster} onPress={tap} accessibilityRole="imagebutton" accessibilityLabel={t('account.photo.a11y')}>
        {photo ? (
          <Image key={photo} source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => broken(photo)} />
        ) : (
          <View style={styles.empty}>
            <Icon name="photo" size={30} color={colors.mute} />
            <Text style={styles.emptyTitle}>{t('account.photo')}</Text>
            <Text style={styles.emptyHint}>{t('account.photo.hint')}</Text>
          </View>
        )}
        <LinearGradient colors={['rgba(14,13,12,0.55)', 'rgba(14,13,12,0)']} style={styles.shadeTop} pointerEvents="none" />
        <LinearGradient colors={['rgba(14,13,12,0)', 'rgba(14,13,12,0.92)']} style={styles.shadeBottom} pointerEvents="none" />
        {/* görünür düğme: fotoğrafın değiştirilebildiği belli olsun */}
        {photo || busy !== 'idle' ? (
          <View style={styles.edit} pointerEvents="none">
            <Icon name="photo" size={15} color={colors.paper} />
            <Text style={styles.editText}>{busy === 'working' ? t('word.moment') : busy === 'sending' ? t('account.photo.sending') : t('account.photo.edit')}</Text>
          </View>
        ) : null}
        <View style={styles.who} pointerEvents="none">
          <Text style={styles.name} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>
            {name}
          </Text>
          <Text style={styles.meta} numberOfLines={2}>
            {meta}
          </Text>
        </View>
      </Pressable>

      <Text style={styles.title} pointerEvents="none">
        {t('account.title')}
      </Text>
      <Pressable onPress={() => router.push('/settings')} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('account.settings')} style={({ pressed }) => [styles.gear, pressed && styles.pressed]}>
        <Icon name="settings" size={20} color={colors.paper} />
      </Pressable>
      <SoundCorner />

      {/* kâğıt: deste */}
      <View style={[styles.paper, { paddingBottom: TAB_BAR_SPACE + insets.bottom }]}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.deckTitle}>{t('account.deck')}</Text>
            <View style={styles.dot} />
          </View>
          <Text style={styles.small} numberOfLines={1}>
            {up(real ? `${tn('account.nNights', collection.length)} · ${tn('account.nCities', cities)}` : t('account.deck.sample'))}
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.deckScroll, { height: cardH }]} contentContainerStyle={styles.deck}>
          {collection.map((c, i) => (
            <Pressable
              key={`${c.t}-${i}`}
              onPress={() => {
                setSide('front');
                setOpen(i);
              }}
              style={({ pressed }) => [styles.card, i > 0 && { marginLeft: -Math.round(cardW * (1 - STEP)) }, pressed && styles.pressed]}
            >
              <AfterhoursCard data={c} index={i} width={cardW} />
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.rule} />
        <View style={styles.row}>
          <Text style={styles.small}>{up(t('account.deck.hint'))}</Text>
          {session ? (
            <Text style={styles.small}>{up(`${tn('account.nKept', profile?.kept_count ?? 0)} · ${tn('account.nFriends', profile?.friend_count ?? 0)}`)}</Text>
          ) : (
            <Pressable onPress={() => router.push('/signup')} hitSlop={12} style={({ pressed }) => pressed && styles.pressed}>
              <Text style={styles.link}>{t('word.signup')}</Text>
            </Pressable>
          )}
        </View>
      </View>

      <PickerSheet
        open={sheet}
        title={t('account.photo')}
        options={[
          { id: 'change', label: t('account.photo.change') },
          { id: 'remove', label: t('account.photo.remove') },
        ]}
        selected={null}
        onSelect={picked}
        onClose={() => setSheet(false)}
        note={!session || isAnonymous ? t('account.photo.note.guest') : t('account.photo.note')}
      />

      {/* kart büyütme: dokununca ön/arka döner */}
      <Modal visible={open !== null} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <Pressable style={styles.dim} onPress={() => setOpen(null)}>
          {open !== null && collection[open] && (
            <Pressable onPress={() => setSide((s) => (s === 'front' ? 'back' : 'front'))}>
              <AfterhoursCard data={collection[open]} index={open} side={side} width={Math.min(width - 48, 360, Math.floor((height - 300) / 1.5))} />
            </Pressable>
          )}
          <Text style={styles.flipHint}>{up(t('account.flip'))}</Text>
          {/* kartın altında: o gecenin odası. örnek kartların odası yok */}
          {open !== null && real && cards?.[open] ? (
            <Pressable
              onPress={() => {
                // android: modal kapanırken açılan sayfa modalın altında kalıyordu; önce kapat, sonra git
                const slug = cards[open].slug;
                setOpen(null);
                setTimeout(() => router.push(`/room/${slug}`), 260);
              }}
              hitSlop={12}
              style={({ pressed }) => [styles.roomLink, pressed && styles.pressed]}
            >
              <Text style={styles.roomLinkText}>afterhours</Text>
              <Text style={styles.roomLinkSub}>{up(cards[open].frozen ? t('account.roomFrozen') : t('account.roomOpen'))}</Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  poster: { flex: 1, minHeight: 220, backgroundColor: colors.ink, overflow: 'hidden' },
  empty: { position: 'absolute', top: brand.top + 40, left: 0, right: 0, bottom: 110, alignItems: 'center', justifyContent: 'center', gap: 6 },
  emptyTitle: { fontFamily: fonts.medium, fontSize: 15, color: colors.mute, marginTop: 6 },
  emptyHint: { fontFamily: fonts.regular, fontSize: 13, color: colors.meta, textDecorationLine: 'underline' },
  shadeTop: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 60 },
  shadeBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 190 },
  who: { position: 'absolute', left: brand.left, right: brand.left + 96, bottom: 22 },
  edit: { position: 'absolute', right: brand.left, bottom: 24, flexDirection: 'row', alignItems: 'center', gap: 6 },
  editText: { fontFamily: fonts.regular, fontSize: 13, color: colors.paper, textDecorationLine: 'underline' },
  name: { fontFamily: fonts.semibold, fontSize: 54, lineHeight: 56, letterSpacing: -2, color: colors.paper },
  meta: { fontFamily: fonts.regular, fontSize: 12, letterSpacing: 1.4, color: colors.paper, marginTop: 8 },
  title: { position: 'absolute', top: brand.top, left: brand.left, fontFamily: fonts.medium, fontSize: brand.smallSize, letterSpacing: -0.3, color: colors.paper },
  gear: { position: 'absolute', top: brand.top - 3, right: brand.left + 84 },
  paper: { backgroundColor: colors.paper, paddingTop: 18 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: brand.left },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deckTitle: { fontFamily: fonts.medium, fontSize: 15, letterSpacing: -0.2, color: colors.ink },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.spot },
  small: { flexShrink: 1, fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.ink2 },
  link: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink, textDecorationLine: 'underline' },
  deckScroll: { flexGrow: 0, marginTop: 12 },
  deck: { paddingHorizontal: brand.left },
  card: {},
  rule: { borderTopWidth: 1, borderTopColor: colors.rule, marginHorizontal: brand.left, marginTop: 14, marginBottom: 12 },
  pressed: { opacity: 0.7 },
  dim: { flex: 1, backgroundColor: 'rgba(14,13,12,0.92)', alignItems: 'center', justifyContent: 'center', gap: 18 },
  roomLink: { alignItems: 'center', gap: 4, marginTop: 6, paddingHorizontal: 22, paddingVertical: 10, borderWidth: 1, borderColor: colors.spot },
  roomLinkText: { fontFamily: fonts.logo, fontSize: 26, letterSpacing: -0.5, color: colors.spotText },
  roomLinkSub: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.meta },
  flipHint: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.mute },
});
