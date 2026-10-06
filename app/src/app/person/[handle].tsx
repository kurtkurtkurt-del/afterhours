import { useEffect, useState } from 'react';
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import AfterhoursCard from '@/components/AfterhoursCard';
import BackButton from '@/components/BackButton';
import LinkIcon from '@/components/LinkIcon';
import PullDownScroll from '@/components/PullDownScroll';
import SoundCorner from '@/components/SoundCorner';
import { ActionButton, SAMPLES, useConnect } from '@/components/People';
import { person, type Found, type PersonCard } from '@/data/friends';
import { friendPhotos } from '@/data/photo';
import { personCards, toCardData } from '@/data/checkin';
import { useProfileExtra } from '@/data/profile';
import { LINKS } from '@/content/links';
import { collection as samples } from '@/content/collection';
import type { NightCardData } from '@/content/cardsgen';
import { upperData, useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

type Loaded = { card: PersonCard; found: Found | null } | null;

// Card width as a share of the screen and how much of each card stays visible (as on account).
const CARD = 0.39;
const STEP = 0.42;

// Someone's public profile, opened from search results and suggestions, as a record sleeve:
// their photo is the cover with the record sliding out behind it, the bio under it, their
// links as small marks (friends only), the add / accept button, then their collection —
// placed so the first screen ends halfway down the cards and the page reads as going on.
export default function PersonScreen() {
  const { handle, sample } = useLocalSearchParams<{ handle: string; sample?: string }>();
  const extra = useProfileExtra(handle ?? null, 0, !!sample);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { t, tn, up } = useLang();
  const { after, busy, act } = useConnect();
  const [state, setState] = useState<{ handle: string; data: Loaded } | null>(null);
  const [sampleAsked, setSampleAsked] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [cards, setCards] = useState<NightCardData[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [rootH, setRootH] = useState(0);
  const [aboveH, setAboveH] = useState(0);
  const [headH, setHeadH] = useState(0);

  const example = sample ? SAMPLES.find((p) => p.handle === handle) : undefined;
  useEffect(() => {
    if (example || !handle) return;
    let live = true;
    person(handle)
      .then((data) => live && setState({ handle, data }))
      .catch(() => live && setState({ handle, data: null }));
    personCards(handle)
      .then((rows) => live && setCards(rows.map(toCardData)))
      .catch(() => live && setCards([]));
    return () => {
      live = false;
    };
  }, [handle, example]);

  const loaded = example || state?.handle === handle;
  const card = example
    ? { handle: example.handle, display_name: example.display_name, bio: null, city_name: example.city_name, created_at: '', is_friend: false, kept_count: null }
    : state?.data?.card;
  const found = state?.data?.found ?? null;
  const relation = example ? (sampleAsked ? 'outgoing' : 'none') : found ? (after[found.id] ?? found.relation) : card?.is_friend ? 'friend' : 'none';

  // The photo table only returns confirmed friends' rows; anyone else gets the initial.
  const id = found?.id;
  useEffect(() => {
    if (!id) return;
    let live = true;
    friendPhotos().then((m) => live && setPhoto(m.get(id) ?? null));
    return () => {
      live = false;
    };
  }, [id, relation]);

  const since = card?.created_at ? new Date(card.created_at) : null;
  const sinceText = since && !isNaN(since.getTime()) ? `${String(since.getMonth() + 1).padStart(2, '0')}.${since.getFullYear()}` : null;
  const name = (card?.display_name ?? card?.handle ?? '').toLowerCase();
  const meta = card
    ? [`@${upperData(card.handle)}`, card.city_name ? upperData(card.city_name) : null, sinceText, example ? up(t('person.sample')) : null].filter(Boolean).join(' · ')
    : '';

  const collection = example ? samples : (cards ?? []);
  const links = example || !extra ? [] : LINKS.filter((l) => extra.links[l.kind]);

  // The sleeve: a square cover on the left, the record peeking out on the right.
  const inner = width - brand.left * 2;
  const cover = Math.round(inner * 0.7);
  const disc = Math.round(cover * 0.96);
  const cardW = Math.round(width * CARD);
  const cardH = cardW * 1.5;
  const top = brand.top + 48;
  // Push the collection down until half of its cards fill the bottom of the first screen.
  const gap = rootH && aboveH && headH ? Math.max(0, rootH - insets.bottom - (top + aboveH + headH + cardH / 2)) : 0;

  const band = (
    <View style={styles.band}>
      <BackButton />
      <SoundCorner />
    </View>
  );
  return (
    <View style={styles.root} onLayout={(e) => setRootH(e.nativeEvent.layout.height)}>
      <StatusBar style="light" />
      <PullDownScroll header={band} contentContainerStyle={[styles.body, { paddingTop: top, paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        {!loaded ? (
          <Text style={[styles.note, styles.pad]}>{up(t('person.loading'))}</Text>
        ) : !card ? (
          <Text style={[styles.hidden, styles.pad]}>{t('person.hidden')}</Text>
        ) : (
          <>
            <View style={styles.pad} onLayout={(e) => setAboveH(e.nativeEvent.layout.height)}>
              <View style={{ height: cover }}>
                <View style={[styles.disc, { width: disc, height: disc, left: inner - disc, top: (cover - disc) / 2 }]}>
                  <Svg width={disc} height={disc} style={StyleSheet.absoluteFill}>
                    <Circle cx={disc / 2} cy={disc / 2} r={disc / 2 - 1} fill="#0e0d0b" />
                    {[0.94, 0.86, 0.78, 0.7, 0.62, 0.54, 0.46].map((k) => (
                      <Circle key={k} cx={disc / 2} cy={disc / 2} r={(disc / 2) * k} fill="none" stroke="#24221f" strokeWidth={1} />
                    ))}
                  </Svg>
                  <View style={[styles.label, { width: disc * 0.36, height: disc * 0.36, borderRadius: disc * 0.18 }]}>
                    {/* The label shows on the visible half: the text sits right of the hole. */}
                    <Text style={styles.labelText} numberOfLines={1}>
                      {up(tn('account.nNights', collection.length))}
                    </Text>
                  </View>
                </View>

                <View style={[styles.cover, { width: cover, height: cover }]}>
                  {photo ? (
                    <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setPhoto(null)} />
                  ) : (
                    <Text style={styles.coverInitial}>{name.charAt(0)}</Text>
                  )}
                  <LinearGradient colors={['rgba(14,13,12,0)', 'rgba(14,13,12,0.9)']} style={styles.shade} pointerEvents="none" />
                  <View style={styles.who}>
                    <Text style={styles.name} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>
                      {name.replace(' ', '\n')}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                      {meta}
                    </Text>
                  </View>
                </View>
              </View>

              {card.bio ? <Text style={styles.bio}>{card.bio}</Text> : null}
              {!example && extra?.about ? <Text style={styles.about}>{extra.about}</Text> : null}

              {links.length ? (
                <View style={styles.links}>
                  {links.map((l) => (
                    <Pressable
                      key={l.kind}
                      onPress={() => Linking.openURL(l.url(extra!.links[l.kind]!)).catch(() => {})}
                      hitSlop={6}
                      accessibilityRole="link"
                      accessibilityLabel={l.label}
                      style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
                    >
                      <LinkIcon kind={l.kind} size={19} color={colors.paper} />
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <View style={[styles.action, !links.length && styles.actionAlone]}>
                <ActionButton
                  wide
                  relation={relation}
                  busy={!!found && busy === found.id}
                  onPress={() => (example ? setSampleAsked(true) : found ? act(found, relation) : undefined)}
                />
              </View>
            </View>

            <View style={{ height: gap }} />

            <View onLayout={(e) => setHeadH(e.nativeEvent.layout.height)} style={[styles.pad, styles.head]}>
              <View style={styles.headLeft}>
                <Text style={styles.deckTitle}>{t('account.deck')}</Text>
                <View style={styles.dot} />
              </View>
              <Text style={styles.small} numberOfLines={1}>
                {up(
                  example
                    ? t('person.sample')
                    : collection.length
                      ? tn('account.nNights', collection.length)
                      : relation === 'friend'
                        ? t('person.deck.empty')
                        : t('person.deck.locked'),
                )}
              </Text>
            </View>

            {collection.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.deckScroll, { height: cardH }]} contentContainerStyle={styles.pad}>
                {collection.map((c, i) => (
                  <Pressable
                    key={`${c.t}-${i}`}
                    onPress={() => {
                      setSide('front');
                      setOpen(i);
                    }}
                    style={({ pressed }) => [i > 0 && { marginLeft: -Math.round(cardW * (1 - STEP)) }, pressed && styles.pressed]}
                  >
                    <AfterhoursCard data={c} index={i} width={cardW} />
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <View style={[styles.deckScroll, styles.pad, { height: cardH / 2 }]} />
            )}
          </>
        )}
      </PullDownScroll>

      {/* Enlarged card: tap to flip. */}
      <Modal visible={open !== null} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <Pressable style={styles.dim} onPress={() => setOpen(null)}>
          {open !== null && collection[open] && (
            <Pressable onPress={() => setSide((s) => (s === 'front' ? 'back' : 'front'))}>
              <AfterhoursCard data={collection[open]} index={open} side={side} width={Math.min(width - 48, 360, Math.floor((height - 300) / 1.5))} />
            </Pressable>
          )}
          <Text style={styles.flipHint}>{up(t('account.flip'))}</Text>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 36, backgroundColor: colors.ink, zIndex: 2 },
  body: {},
  pad: { paddingHorizontal: brand.left },
  disc: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  label: { backgroundColor: colors.spot, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 8 },
  labelText: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.4, color: colors.paper, maxWidth: '48%' },
  cover: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#1f1d1a', alignItems: 'center', justifyContent: 'center' },
  coverInitial: { fontFamily: fonts.logo, fontSize: 120, color: colors.ink2 },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' },
  who: { position: 'absolute', left: 16, right: 16, bottom: 14 },
  name: { fontFamily: fonts.logo, fontSize: 46, lineHeight: 44, letterSpacing: -1, color: colors.paper },
  meta: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.4, color: colors.mute, marginTop: 10 },
  bio: { fontFamily: fonts.medium, fontSize: 19, lineHeight: 25, letterSpacing: -0.4, color: colors.paper, marginTop: 22 },
  about: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, color: colors.mute, marginTop: 8 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 },
  linkBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.ink3, alignItems: 'center', justifyContent: 'center' },
  action: { marginTop: 14 },
  actionAlone: { marginTop: 22 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 30 },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deckTitle: { fontFamily: fonts.medium, fontSize: 15, letterSpacing: -0.2, color: colors.paper },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.spot },
  small: { flexShrink: 1, fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.mute },
  deckScroll: { flexGrow: 0, marginTop: 12 },
  hidden: { fontFamily: fonts.medium, fontSize: 30, lineHeight: 32, letterSpacing: -0.9, color: colors.paper },
  note: { fontFamily: fonts.regular, fontSize: 10, letterSpacing: 1.6, color: colors.meta },
  pressed: { opacity: 0.7 },
  dim: { flex: 1, backgroundColor: 'rgba(14,13,12,0.92)', alignItems: 'center', justifyContent: 'center', gap: 18 },
  flipHint: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.mute },
});
