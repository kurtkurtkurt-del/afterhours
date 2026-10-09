import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AfterhoursCard from '@/components/AfterhoursCard';
import BackButton from '@/components/BackButton';
import LinkMarks from '@/components/LinkMarks';
import ProfileCounts from '@/components/ProfileCounts';
import PullDownScroll from '@/components/PullDownScroll';
import Sleeve from '@/components/Sleeve';
import SoundCorner from '@/components/SoundCorner';
import { ActionButton, SAMPLES, confirmBlock, useConnect } from '@/components/People';
import { useReport } from '@/components/ReportSheet';
import { friendRemove, person, personPeople, type Found, type PersonCard } from '@/data/friends';
import { friendPhotos } from '@/data/photo';
import { personCards, toCardData } from '@/data/checkin';
import { useProfileExtra } from '@/data/profile';
import { useShelf } from '@/lib/offline';
import { refreshYours } from '@/data/yours';
import { collection as samples } from '@/content/collection';
import type { NightCardData } from '@/content/cardsgen';
import { upperData, useLang } from '@/i18n';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';
import PillAction, { PillRow } from '@/components/PillAction';

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
  const { after, busy, act, member } = useConnect();
  const reporting = useReport();
  const [state, setState] = useState<{ handle: string; data: Loaded } | null>(null);
  const [sampleAsked, setSampleAsked] = useState(false);
  // Removed here: the button goes back to add without waiting for a reload.
  const [removed, setRemoved] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [cards, setCards] = useState<NightCardData[] | null>(null);
  const [peopleCount, setPeopleCount] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [rootH, setRootH] = useState(0);
  const [aboveH, setAboveH] = useState(0);
  const [headH, setHeadH] = useState(0);

  // Sample people (the suggestions, the names in the sample posts) have no account: their
  // page is drawn from the name alone and says "sample profile".
  const example = sample && handle ? (SAMPLES.find((p) => p.handle === handle) ?? { id: `sample-${handle}`, handle, display_name: handle, city_name: null, mutual: 0, reason: 'new' as const }) : undefined;
  const isSample = !!example;
  const fresh = useShelf('personCards');
  const freshPhotos = useShelf('photos');
  useEffect(() => {
    if (isSample || !handle) return;
    let live = true;
    person(handle)
      .then((data) => live && setState({ handle, data }))
      .catch(() => live && setState({ handle, data: null }));
    personCards(handle)
      .then((rows) => live && setCards(rows.map(toCardData)))
      .catch(() => live && setCards([]));
    // Their people: only a friend (or you) gets the list, so only then is there a count.
    personPeople(handle)
      .then((rows) => live && setPeopleCount(rows.length ? rows.length : null))
      .catch(() => live && setPeopleCount(null));
    return () => {
      live = false;
    };
  }, [handle, isSample, fresh]);

  const loaded = example || state?.handle === handle;
  const card = example
    ? { handle: example.handle, display_name: example.display_name, bio: null, city_name: example.city_name, created_at: '', is_friend: false, kept_count: null }
    : state?.data?.card;
  const found = state?.data?.found ?? null;
  const relation = example ? (sampleAsked ? 'outgoing' : 'none') : found ? (after[found.id] ?? (removed ? 'none' : found.relation)) : card?.is_friend ? 'friend' : 'none';
  // Remove a friend or take a request back, asked first.
  const unfriend = (other: string, label: string) =>
    Alert.alert(label, undefined, [
      { text: t('block.keep'), style: 'cancel' },
      {
        text: label,
        style: 'destructive',
        onPress: () =>
          friendRemove(other)
            .then(() => {
              setRemoved(true);
              refreshYours();
            })
            .catch((e) => Alert.alert(String(e?.message ?? e).toLowerCase())),
      },
    ]);

  // The photo table only returns confirmed friends' rows; anyone else gets the initial.
  const id = found?.id;
  useEffect(() => {
    if (!id) return;
    let live = true;
    friendPhotos().then((m) => live && setPhoto(m.get(id) ?? null));
    return () => {
      live = false;
    };
  }, [id, relation, freshPhotos]);

  const since = card?.created_at ? new Date(card.created_at) : null;
  const sinceText = since && !isNaN(since.getTime()) ? `${String(since.getMonth() + 1).padStart(2, '0')}.${since.getFullYear()}` : null;
  const name = (card?.display_name ?? card?.handle ?? '').toLowerCase();
  const meta = card
    ? [`@${upperData(card.handle)}`, card.city_name ? upperData(card.city_name) : null, sinceText, example ? up(t('person.sample')) : null].filter(Boolean).join(' · ')
    : '';

  const collection = example ? samples : (cards ?? []);

  const inner = width - brand.left * 2;
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
              <Sleeve width={inner} photo={photo} name={name} meta={meta} disc={up(tn('account.nNights', collection.length))} city={card.city_name} onPhotoError={() => setPhoto(null)} />

              {card.bio ? <Text style={styles.bio}>{card.bio}</Text> : null}
              {!example && extra?.about ? <Text style={styles.about}>{extra.about}</Text> : null}

              <LinkMarks links={example || !extra ? {} : extra.links} />
              <ProfileCounts handle={card.handle} events={card.kept_count} people={peopleCount} mine={false} />

              <View style={styles.action}>
                <ActionButton
                  wide
                  relation={relation}
                  busy={!!found && busy === found.id}
                  onPress={() => (example ? setSampleAsked(true) : found ? act(found, relation) : undefined)}
                />
              </View>
              {found && member && !example ? (
                <View style={styles.links}>
                  <PillRow>
                    {relation === 'friend' || relation === 'outgoing' ? (
                      <PillAction
                        icon={relation === 'friend' ? 'minus' : 'close'}
                        label={t(relation === 'friend' ? 'friend.remove' : 'friend.cancel')}
                        onPress={() => unfriend(found.id, t(relation === 'friend' ? 'friend.remove' : 'friend.cancel'))}
                      />
                    ) : null}
                    <PillAction icon="flag" label={t('posts.report')} onPress={() => reporting.ask('profile', found.id)} />
                    <PillAction icon="block" tone="danger" label={t('block.do')} onPress={() => confirmBlock({ id: found.id, name: card.display_name ?? card.handle }, t, () => router.back())} />
                  </PillRow>
                </View>
              ) : null}
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
      {reporting.sheet}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 36, backgroundColor: colors.ink, zIndex: 2 },
  body: {},
  pad: { paddingHorizontal: brand.left },
  bio: { fontFamily: fonts.medium, fontSize: 19, lineHeight: 25, letterSpacing: -0.4, color: colors.paper, marginTop: 22 },
  about: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, color: colors.mute, marginTop: 8 },
  action: { marginTop: 20 },
  links: { marginTop: 14 },
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
