import { useEffect, useRef, useState } from 'react';
import Tips from '@/components/Tips';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Storage from 'expo-sqlite/kv-store';
import AfterhoursCard from '@/components/AfterhoursCard';
import Icon from '@/components/Icon';
import LinkMarks from '@/components/LinkMarks';
import PickerSheet from '@/components/PickerSheet';
import ProfileCounts from '@/components/ProfileCounts';
import Sleeve from '@/components/Sleeve';
import SoundCorner from '@/components/SoundCorner';
import { TAB_BAR_SPACE, useTabBarSpace } from '@/components/TabBar';
import { useAuth } from '@/auth/AuthContext';
import { usePhoto } from '@/data/photo';
import { useProfile, useProfileExtra } from '@/data/profile';
import { kept } from '@/data/friends';
import { sparkMine, type MySpark } from '@/data/sparks';
import { dayLabel } from '@/data/when';
import type { Night } from '@/data/deck';
import { sparkOf } from '@/content/sparks';
import { collection as samples } from '@/content/collection';
import { myCards, toCardData, type CardRow } from '@/data/checkin';
import { useRefreshOnFocus } from '@/hooks/useRefresh';
import { useTabReset } from '@/hooks/useTabReset';
import type { NightCardData } from '@/content/cardsgen';
import { upperData, useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// Card width as a share of the screen; each card leaves this much of the previous one visible.
const CARD = 0.39;
const STEP = 0.42;

function distinct(list: (string | null | undefined)[]) {
  return new Set(list.filter(Boolean).map((c) => String(c).toLowerCase())).size;
}

// Account, the same record sleeve as someone else's profile: your photo as the cover
// with the record behind it, your bio, your links as small marks, an edit button, then
// your collection, placed so the first screen ends halfway down the cards. Sign-out and
// everything else lives in settings. The page then goes on downwards on paper: the
// nights coming up, the sparks you started, your cities.
export default function AccountScreen() {
  const tabSpace = useTabBarSpace();
  const { session, isAnonymous } = useAuth();
  const { t, tn, up } = useLang();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [open, setOpen] = useState<number | null>(null);
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [cards, setCards] = useState<CardRow[] | null>(null);
  const { photo, choose, remove, broken } = usePhoto();
  const [sheet, setSheet] = useState(false);
  const strip = useRef<ScrollView>(null);
  const page = useRef<ScrollView>(null);
  useTabReset('account', () => {
    setOpen(null);
    setSheet(false);
    strip.current?.scrollTo({ x: 0, animated: true });
    page.current?.scrollTo({ y: 0, animated: true });
  });
  const [rootH, setRootH] = useState(0);
  const [aboveH, setAboveH] = useState(0);
  const [headH, setHeadH] = useState(0);
  const tick = useRefreshOnFocus('cards', 'kept');
  // Show the new name and city after returning from settings.
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
  const extra = useProfileExtra(null, tick);
  const [upcoming, setUpcoming] = useState<Night[] | null>(null);
  const [sparks, setSparks] = useState<MySpark[] | null>(null);
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    kept()
      .then((list) => {
        if (cancelled) return;
        const now = Date.now() - 6 * 3600 * 1000;
        setUpcoming(list.filter((n) => n.starts_at && new Date(n.starts_at).getTime() > now).sort((a, b) => a.starts_at!.localeCompare(b.starts_at!)).slice(0, 4));
      })
      .catch(() => !cancelled && setUpcoming([]));
    sparkMine().then((list) => !cancelled && setSparks(list));
    return () => {
      cancelled = true;
    };
  }, [uid, tick]);
  // Real cards; samples (labelled at the top right) when there are none.
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

  // Tapping the poster: straight to the picker without a photo, otherwise a two-option sheet.
  // Opening the picker while the sheet closes froze Android, so close first.
  const tap = () => (photo ? setSheet(true) : choose());
  const picked = (id: string) => setTimeout(() => (id === 'remove' ? remove() : choose()), 320);

  const tabBottom = TAB_BAR_SPACE + insets.bottom;
  const screenH = rootH || height;
  // Push the collection down until half of its cards fill the bottom of the first screen.
  const gap = aboveH && headH ? Math.max(0, screenH - tabBottom - (aboveH + headH + cardH / 2)) : 0;
  const signedIn = !!session && !isAnonymous;
  const two = (n: number) => String(n).padStart(2, '0');
  const at = (iso: string | null) => {
    if (!iso) return dayLabel(iso);
    const d = new Date(iso);
    return `${dayLabel(iso)} · ${two(d.getHours())}:${two(d.getMinutes())}`;
  };

  return (
    <View style={styles.root} onLayout={(e) => setRootH(e.nativeEvent.layout.height)}>
      <StatusBar style="light" />
      <ScrollView ref={page} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabBottom }} style={styles.page}>
        <View style={styles.top} onLayout={(e) => setAboveH(e.nativeEvent.layout.height)}>
          <Text style={styles.title} pointerEvents="none">
            {t('account.title')}
          </Text>
          <Pressable onPress={() => router.push('/settings')} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('account.settings')} style={({ pressed }) => [styles.gear, pressed && styles.pressed]}>
            <Icon name="settings" size={20} color={colors.paper} />
          </Pressable>
          <SoundCorner />

          {/* The sleeve: your photo is the cover (tap to change), the record behind it. */}
          <Sleeve
            width={width - brand.left * 2}
            city={profile?.city_slug ?? city}
            photo={photo}
            name={name}
            meta={meta}
            disc={up(tn('account.nNights', real ? cards.length : 0))}
            onPress={tap}
            onPhotoError={() => photo && broken(photo)}
            a11y={t('account.photo.a11y')}
            empty={
              <View style={styles.empty}>
                <Icon name="photo" size={30} color={colors.mute} />
                <Text style={styles.emptyTitle}>{t('account.photo')}</Text>
                <Text style={styles.emptyHint}>{t('account.photo.hint')}</Text>
              </View>
            }
          />

          {/* Under the photo: the bio and the longer text, or a nudge to write them. */}
          {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
          {extra?.about ? <Text style={styles.about}>{extra.about}</Text> : null}
          {signedIn && !profile?.bio && !extra?.about ? (
            <Pressable onPress={() => router.push('/profile')} style={({ pressed }) => pressed && styles.pressed}>
              <Text style={[styles.prompt, styles.promptInk]}>{t('account.about.empty')} ›</Text>
            </Pressable>
          ) : null}

          <LinkMarks links={extra?.links ?? {}} onMissing={signedIn ? () => router.push('/profile') : undefined} />
          {signedIn ? <ProfileCounts handle={profile?.handle ?? null} events={profile?.kept_count ?? null} people={profile?.friend_count ?? null} mine /> : null}

          <Pressable
            onPress={() => router.push(signedIn ? '/profile' : '/signup')}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText}>{signedIn ? t('account.editProfile') : t('word.signup')}</Text>
          </Pressable>
        </View>

        {/* The collection starts halfway into the bottom of the first screen. */}
        <View style={{ height: gap }} />
        <View onLayout={(e) => setHeadH(e.nativeEvent.layout.height)} style={[styles.row, styles.deckHead]}>
          <View style={styles.rowLeft}>
            <Text style={[styles.deckTitle, styles.onInk]}>{t('account.deck')}</Text>
            <View style={styles.dot} />
          </View>
          <Text style={[styles.small, styles.onInkSmall]} numberOfLines={1}>
            {up(real ? `${tn('account.nNights', collection.length)} · ${tn('account.nCities', cities)}` : t('account.deck.sample'))}
          </Text>
        </View>

        <ScrollView ref={strip} horizontal showsHorizontalScrollIndicator={false} style={[styles.deckScroll, { height: cardH }]} contentContainerStyle={styles.deck}>
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

        <View style={[styles.rule, styles.onInkRule]} />
        <View style={[styles.row, styles.deckFoot]}>
          <Text style={[styles.small, styles.onInkSmall]}>{up(t('account.deck.hint'))}</Text>
          {session ? (
            <Text style={[styles.small, styles.onInkSmall]}>{up(`${tn('account.nKept', profile?.kept_count ?? 0)} · ${tn('account.nFriends', profile?.friend_count ?? 0)}`)}</Text>
          ) : null}
        </View>

        {/* Paper: the rest of you. */}
        <View style={styles.paper}>
          {!signedIn ? (
            <Section title={t('account.about')} first>
              <Pressable onPress={() => router.push('/signup')} style={({ pressed }) => pressed && styles.pressed}>
                <Text style={styles.prompt}>{t('account.more.guest')}</Text>
              </Pressable>
            </Section>
          ) : (
            <>
              <Section title={t('account.next')} first>
                {upcoming === null ? null : upcoming.length ? (
                  upcoming.map((n) => (
                    <Pressable key={n.id} onPress={() => router.push(`/night/${n.slug}`)} style={({ pressed }) => [styles.line, pressed && styles.pressed]}>
                      <View style={styles.lineMain}>
                        <Text style={styles.lineTitle} numberOfLines={1}>{n.title.toLowerCase()}</Text>
                        <Text style={styles.small} numberOfLines={1}>{up(at(n.starts_at))} · {upperData(n.venue_name ?? n.city_name)}</Text>
                      </View>
                      <Text style={styles.lineValue}>›</Text>
                    </Pressable>
                  ))
                ) : (
                  <Text style={styles.prompt}>{t('account.next.empty')}</Text>
                )}
              </Section>

              <Section title={t('account.sparks')}>
                {sparks === null ? null : sparks.length ? (
                  sparks.map((sp) => (
                    <Pressable key={sp.id} onPress={() => router.push(`/spark/${sparkOf(sp.kind).kind}?invite=${sp.id}`)} style={({ pressed }) => [styles.line, pressed && styles.pressed]}>
                      <View style={styles.lineMain}>
                        <Text style={styles.lineTitle} numberOfLines={1}>{sp.title.toLowerCase()}</Text>
                        <Text style={styles.small} numberOfLines={1}>
                          {up(at(sp.starts_at))}
                          {sp.reach ? ` · ${up(t(sp.reach === 1 ? 'spark.wave1.short' : sp.reach === 2 ? 'deck.wave2' : 'deck.wave3'))}` : ''}
                        </Text>
                      </View>
                      <Text style={styles.answers}>{t('account.sparks.answers', { in: sp.going, out: sp.not_going })}</Text>
                    </Pressable>
                  ))
                ) : (
                  <Text style={styles.prompt}>{t('account.sparks.empty')}</Text>
                )}
              </Section>

              {real ? (
                <Section title={t('account.cities')}>
                  <View style={styles.chips}>
                    {[...new Set(cards.map((c) => (c.city_name ?? '').toLowerCase()).filter(Boolean))].map((c) => (
                      <View key={c} style={styles.chip}>
                        <Text style={styles.chipText}>{c}</Text>
                      </View>
                    ))}
                  </View>
                </Section>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>

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

      {/* Enlarged card: tap to flip. */}
      <Modal visible={open !== null} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <Pressable style={styles.dim} onPress={() => setOpen(null)}>
          {open !== null && collection[open] && (
            <Pressable onPress={() => setSide((s) => (s === 'front' ? 'back' : 'front'))}>
              <AfterhoursCard data={collection[open]} index={open} side={side} width={Math.min(width - 48, 360, Math.floor((height - 300) / 1.5))} />
            </Pressable>
          )}
          <Text style={styles.flipHint}>{up(t('account.flip'))}</Text>
          {/* Under the card: that night's room. Sample cards have none. */}
          {open !== null && real && cards?.[open] ? (
            <Pressable
              onPress={() => {
                // Android: a page pushed while the modal closes ended up beneath it; close first, then navigate.
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
      <Tips page="account" tips={[{ title: 'tips.account.1.t', body: 'tips.account.1.b', motion: 'tap' }, { title: 'tips.account.2.t', body: 'tips.account.2.b' }]} bottom={tabSpace + 12} />
    </View>
  );
}

// A part of the page under the deck: a heading with the red dot, an optional
// "edit" on the right, a hairline above (none on the first).
function Section({ title, action, onAction, first, children }: { title: string; action?: string; onAction?: () => void; first?: boolean; children: React.ReactNode }) {
  return (
    <View style={[styles.section, first && styles.sectionFirst]}>
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <Text style={styles.deckTitle}>{title}</Text>
          <View style={styles.dot} />
        </View>
        {action ? (
          <Pressable onPress={onAction} hitSlop={12} style={({ pressed }) => pressed && styles.pressed}>
            <Text style={styles.link}>{action}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  page: { flex: 1 },
  top: { paddingTop: brand.top + 48, paddingHorizontal: brand.left },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 60 },
  emptyTitle: { fontFamily: fonts.medium, fontSize: 15, color: colors.mute, marginTop: 6 },
  emptyHint: { fontFamily: fonts.regular, fontSize: 13, color: colors.meta, textDecorationLine: 'underline' },
  title: { position: 'absolute', top: brand.top, left: brand.left, fontFamily: fonts.medium, fontSize: brand.smallSize, letterSpacing: -0.3, color: colors.paper },
  gear: { position: 'absolute', top: brand.top - 3, right: brand.left + 84 },
  button: { alignSelf: 'stretch', marginTop: 20, height: 54, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.spot, borderRadius: radius.md },
  buttonText: { fontFamily: fonts.medium, fontSize: 17, letterSpacing: -0.3, color: colors.ink },
  deckHead: { paddingTop: 30 },
  deckFoot: { paddingBottom: 26 },
  onInk: { color: colors.paper },
  onInkSmall: { color: colors.mute },
  onInkRule: { borderTopColor: colors.ink3 },
  // The paper overlaps the poster with rounded top corners.
  paper: { backgroundColor: colors.paper, paddingTop: 22, paddingBottom: 18, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  section: { marginTop: 22, paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.rule, marginHorizontal: 0 },
  sectionFirst: { marginTop: 0, paddingTop: 0, borderTopWidth: 0 },
  sectionBody: { paddingHorizontal: brand.left, marginTop: 12, gap: 2 },
  bio: { fontFamily: fonts.medium, fontSize: 19, lineHeight: 25, letterSpacing: -0.4, color: colors.paper, marginTop: 22 },
  about: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, color: colors.mute, marginTop: 8 },
  prompt: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.ink2, textDecorationLine: 'underline' },
  promptInk: { color: colors.mute, marginTop: 22 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.rule },
  lineMain: { flex: 1, gap: 3 },
  lineKey: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink2 },
  lineTitle: { fontFamily: fonts.medium, fontSize: 16, letterSpacing: -0.3, color: colors.ink },
  lineValue: { flexShrink: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  answers: { fontFamily: fonts.jet, fontSize: 10.5, letterSpacing: 0.6, color: colors.spot },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 32, paddingHorizontal: 13, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.rule, justifyContent: 'center' },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
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
  roomLink: { alignItems: 'center', gap: 4, marginTop: 6, paddingHorizontal: 22, paddingVertical: 10, borderWidth: 1, borderColor: colors.spot, borderRadius: radius.md },
  roomLinkText: { fontFamily: fonts.logo, fontSize: 26, letterSpacing: -0.5, color: colors.spotText },
  roomLinkSub: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.meta },
  flipHint: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.mute },
});
