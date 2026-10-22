import { useEffect, useState, type ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, Text, View, type ImageSourcePropType, Image as RNImage } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SvgUri } from 'react-native-svg';
import { upperData, useLang } from '@/i18n';
import { colors, ground, fonts, radius, themeId } from '@/theme/tokens';
import { posterUrl, type Night } from '@/data/deck';
import { dayName } from '@/data/when';

const fallback = require('../../assets/intro/concert.jpg');

export type DeckFriend = { name: string; live: boolean };
export type DeckCard = {
  key: string;
  slug: string;
  title: string;
  venue: string | null;
  city: string;
  kind: string;          // konzert, rave …
  source: string;        // ticket / szene / ''
  startsAt: string | null;
  image: string | null;
  local?: ImageSourcePropType; // a bundled photo (sparks)
  poster: string | null; // nights without a photo: the site's hand-drawn poster
  ticketUrl: string | null;
  friends: DeckFriend[]; // friends who kept this night
  ticket?: boolean;      // you said you got your ticket (60_tickets.sql)
  note?: string;         // a line under the facts (sparks: who started it, or how to start it)
  // Friends of friends: who it came through. path starts after you; the first name is
  // your friend, the last is the keeper (someone you do not know).
  via?: { wave: 2 | 3; path: string[] };
};

// Card from an events_public row; friends are supplied by the caller.
export function toDeckCard(n: Night, friends: DeckFriend[] = []): DeckCard {
  return {
    key: n.id,
    slug: n.slug,
    title: n.title,
    venue: n.venue_name,
    city: n.city_slug,
    kind: n.type_name.toLowerCase(),
    source: n.source === 'ticketmaster' ? 'ticket' : 'szene',
    startsAt: n.starts_at,
    image: n.image_url,
    poster: n.image_url ? null : posterUrl(n),
    ticketUrl: n.ticket_url,
    friends,
  };
}

const two = (n: number) => String(n).padStart(2, '0');
// The date tag on the poster (11.10.2026, design E): "fri 17.10" in Archivo and "23:00"
// beside it; a night without a date says "date tba".
const stamp = (iso: string | null): { day: string; time: string } | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return { day: `${dayName(d)} ${two(d.getDate())}.${two(d.getMonth() + 1)}`, time: `${two(d.getHours())}:${two(d.getMinutes())}` };
};

// Date and time in one ink tag at the poster's top left corner, the kind in a small one
// at its top right (owner, 11.10.2026), so the caption holds only the title, the venue
// and the people.
function DateTag({ card, kind }: { card: DeckCard; kind: string }) {
  const { t, up } = useLang();
  const when = stamp(card.startsAt);
  return (
    <>
      <View style={styles.tag} pointerEvents="none">
        <View style={styles.tagRow}>
          <Text style={styles.tagDay}>{when ? when.day : t('deck.dateTba').toLowerCase()}</Text>
          {when ? <Text style={styles.tagTime}>{when.time}</Text> : null}
        </View>
      </View>
      {kind ? (
        <View style={styles.kindTag} pointerEvents="none">
          <Text style={styles.tagKind}>{up(kind)}</Text>
        </View>
      ) : null}
      {card.ticket ? (
        <View style={styles.ticketTag} pointerEvents="none">
          <Text style={styles.ticketTagText}>{up(t('night.ticketGot'))}</Text>
        </View>
      ) : null}
    </>
  );
}

export const openDetails = (card: DeckCard) => card.slug && router.push(`/night/${card.slug}`);
// Ticket: the source's page; nights without a ticket (szene) open their own page.
export const openTicket = (card: DeckCard) => (card.ticketUrl ? Linking.openURL(card.ticketUrl).catch(() => {}) : openDetails(card));

type Props = {
  // in a room of its own (a specialty deck): no backdrop of its own, the room shows around it
  room?: boolean;
  card: DeckCard;
  bottom: number;         // bottom edge of the caption (above the tab bar)
  rightLabel: string;     // the red strip on the right
  rightDone?: boolean;    // strip dims (kept)
  onRight: () => void;
  // Flow: the poster is not cropped; it sits above the caption at its own ratio,
  // over a blurred copy of itself. top: upper bound for the poster.
  fit?: { top: number };
  onDetails?: () => void; // instead of the night page (sparks have their own)
  overlay?: ReactNode;  // drawn over the poster (the listen player)
};

// Card face: full-bleed photo or poster with the date tag on it, caption at the bottom
// (ink block: red Archivo title, the venue, friend squares), "details ↓" on the left, the
// red main action on the right. Since 11.10.2026 the caption no longer lists kind,
// source and date in mono: the date and kind are on the poster, and "ticket" is said
// once, by the hint that appears when the card is pulled up.
export default function CardFace({ card, bottom, rightLabel, rightDone, onRight, fit, onDetails, overlay, room }: Props) {
  const [captionH, setCaptionH] = useState(0);
  const shown = card.friends.slice(0, 2);
  const more = card.friends.length - shown.length;
  const details = onDetails ?? (() => openDetails(card));
  const { t, tx, up } = useLang();
  // The type name comes from the database ("club night"); the key is built from its slug.
  // Use the translation when there is one, otherwise the data; uppercase accordingly.
  const kindWord = tx('type.' + card.kind.replace(/\s+/g, '-'), '');
  const kind = kindWord ? up(kindWord) : upperData(card.kind);
  return (
    <>
      {fit ? (
        <FitPoster card={card} top={fit.top} bottom={bottom + captionH + 12} ready={captionH > 0} tag={<DateTag card={card} kind={kind} />} overlay={overlay} room={room} />
      ) : card.image || card.local ? (
        <Image source={card.image ? { uri: card.image } : card.local!} style={styles.photo} contentFit="cover" />
      ) : card.poster ? (
        <View style={styles.posterBox}>
          <SvgUri uri={card.poster} width="100%" height="100%" />
        </View>
      ) : (
        <Image source={fallback} style={styles.photo} contentFit="cover" />
      )}
      {fit ? null : (
        <View style={styles.tagFull}>
          <DateTag card={card} kind={kind} />
        </View>
      )}
      <View style={[styles.caption, { bottom }]} onLayout={fit ? (e) => setCaptionH(e.nativeEvent.layout.height) : undefined}>
        <Pressable style={styles.stripLeft} onPress={details} accessibilityRole="button" accessibilityLabel={t('word.details')}>
          <Text style={styles.stripLeftText}>{up(t('word.details'))} ↓</Text>
        </Pressable>
        <Pressable style={styles.block} onPress={details}>
          <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
            {card.title.toLowerCase()}
          </Text>
          {/* the venue only; a night without one shows none (the city stood here for a day
              and read as a wrong place, owner, 12.10.2026) — the block keeps its height */}
          {card.venue ? <Text style={styles.venue} numberOfLines={1}>{card.venue.toLowerCase()}</Text> : null}
          {card.via ? <Chain via={card.via} /> : null}
          {card.note ? <Text style={styles.note} numberOfLines={2}>{card.note}</Text> : null}
          {card.friends.length > 0 ? (
            <View style={styles.friends}>
              {shown.map((f) => (
                <View key={f.name} style={[styles.sq, f.live && styles.sqLive]}>
                  <Text style={[styles.sqText, f.live && styles.sqTextLive]}>{f.name.charAt(0)}</Text>
                </View>
              ))}
              <Text style={[styles.keptNote, styles.friendsNote]}>{more > 0 ? t('deck.moreKeptIt', { n: more }) : t('deck.keptIt')}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.strip, rightDone && styles.stripDone, pressed && styles.pressed]}
          onPress={onRight}
          accessibilityRole="button"
          accessibilityLabel={rightLabel}
        >
          <Text style={[styles.stripText, rightDone && styles.stripTextDone]}>{up(rightLabel)}</Text>
        </Pressable>
      </View>
    </>
  );
}

// Poster aspect ratio: Ticketmaster URLs carry it (…_16_9.jpg); otherwise measure the image.
const ratios = new Map<string, number>();
const fromUrl = (uri: string) => {
  const m = /_(\d+)_(\d+)\.\w+$/.exec(uri);
  return m ? Number(m[1]) / Number(m[2]) : null;
};
function useRatio(uri: string | null, fallbackRatio: number) {
  const [ratio, setRatio] = useState(() => (uri ? (ratios.get(uri) ?? fromUrl(uri) ?? fallbackRatio) : fallbackRatio));
  useEffect(() => {
    if (!uri || ratios.has(uri) || fromUrl(uri)) return;
    let alive = true;
    RNImage.getSize(uri, (w, h) => {
      if (!w || !h) return;
      ratios.set(uri, w / h);
      if (alive) setRatio(w / h);
    }, () => {});
    return () => {
      alive = false;
    };
  }, [uri]);
  return ratio;
}

// react-native-web has no resolveAssetSource: the web build (PWA) crashed on the first
// spark card. There the poster frame is 2:3, the shape of every spark photo.
const sizeOf = (source: ImageSourcePropType) => {
  if (typeof RNImage.resolveAssetSource !== 'function') return 2 / 3;
  const s = RNImage.resolveAssetSource(source);
  return s && s.width && s.height ? s.width / s.height : 2 / 3;
};

// Flow card: blurred backdrop + uncropped poster, fitted and centred between the chip and the caption.
function FitPoster({ card, top, bottom, ready, tag, overlay, room }: { card: DeckCard; top: number; bottom: number; ready: boolean; tag: ReactNode; overlay?: ReactNode; room?: boolean }) {
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  const svg = !card.image && !!card.poster;
  const ratio = useRatio(card.image, svg ? 2 / 3 : sizeOf(card.local ?? fallback));
  let w = 0;
  let h = 0;
  if (area) {
    w = area.w;
    h = w / ratio;
    if (h > area.h) {
      h = area.h;
      w = h * ratio;
    }
  }
  const source = card.image ? { uri: card.image } : (card.local ?? fallback);
  return (
    <>
      {/* dark theme: the poster, blurred, fills the page under a veil; light: the plain ground */}
      {themeId === 'light' || room ? null : svg ? (
        <View style={[styles.photo, { backgroundColor: colors.ink2 }]} />
      ) : (
        <Image source={source} style={styles.photo} contentFit="cover" blurRadius={28} />
      )}
      {themeId === 'light' || room ? null : <View style={styles.veil} />}
      <View style={[styles.fitArea, { top, bottom }]} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {area && ready ? (
          <View style={[styles.fitPoster, { width: w, height: h }]}>
            {svg ? <SvgUri uri={card.poster!} width="100%" height="100%" /> : <Image source={source} style={styles.fill} contentFit="cover" />}
            {tag}
            {/* listen to the artist (design D): the preview plays over the poster, dimmed */}
            {overlay}
          </View>
        ) : null}
      </View>
    </>
  );
}

// Where it came from (11.10.2026, design E in prototypes/via-chain.html): the wave as
// a sign — three rings, you in the middle, the card's wave in red — then "friends of
// friends" or "one step further", and one line: who kept it, via whom. The squares and
// the mono sentence it used to draw said the same thing twice and read badly.
function Chain({ via }: { via: { wave: 2 | 3; path: string[] } }) {
  const { t } = useLang();
  const keeper = via.path[via.path.length - 1];
  const through = via.path.slice(0, -1);
  return (
    <View style={styles.chain}>
      <View style={styles.rings}>
        <View style={[styles.ring, styles.ringOuter, via.wave === 3 && styles.ringOn]} />
        <View style={[styles.ring, styles.ringMid, via.wave === 2 && styles.ringOn]} />
        <View style={styles.ringCore} />
      </View>
      <View style={styles.chainText}>
        <Text style={styles.chainWave} numberOfLines={1}>{t(via.wave === 2 ? 'deck.wave2.who' : 'deck.wave3.who')}</Text>
        <Text style={styles.keptNote} numberOfLines={1}>
          {t('deck.keptBy', { name: keeper })}{through.length ? ` · ${t('deck.via', { path: through.join(', ') })}` : ''}
        </Text>
      </View>
    </View>
  );
}

// Label that appears while dragging.
export function Hint({ label }: { label: string }) {
  const { up } = useLang();
  return <Text style={styles.hintText}>{up(label)}</Text>;
}

const styles = StyleSheet.create({
  photo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  veil: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: ground(0.42) },
  fitArea: { position: 'absolute', left: 12, right: 12, alignItems: 'center', justifyContent: 'center' },
  fitPoster: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.ink },
  fill: { width: '100%', height: '100%' },
  posterBox: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink2 },
  caption: { position: 'absolute', left: 8, right: 8, flexDirection: 'row', alignItems: 'stretch', borderRadius: radius.lg, overflow: 'hidden' },
  // never shorter than the strips' rotated words need (12.10.2026: a title-only block shrank to a bar)
  block: { flex: 1, minHeight: 124, backgroundColor: colors.ink, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 13, gap: 2, justifyContent: 'center' },
  // the title grew a size when the mono lines left the block (11.10.2026)
  title: { fontFamily: fonts.logo, fontSize: 36, lineHeight: 34, letterSpacing: -0.8, color: colors.spotText, marginBottom: 5 },
  venue: { fontFamily: fonts.medium, fontSize: 14, letterSpacing: -0.2, color: colors.paper },
  // the date tag on the poster
  tag: { position: 'absolute', top: 10, left: 10, backgroundColor: colors.ink, borderRadius: radius.sm, paddingVertical: 6, paddingHorizontal: 9 },
  kindTag: { position: 'absolute', top: 10, right: 10, backgroundColor: colors.ink, borderRadius: radius.sm, paddingVertical: 6, paddingHorizontal: 9 },
  tagFull: { position: 'absolute', top: 64, left: 2 },
  tagRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  tagDay: { fontFamily: fonts.logo, fontSize: 17, lineHeight: 18, letterSpacing: -0.3, color: colors.paper },
  tagTime: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.paper },
  tagKind: { fontFamily: fonts.jet, fontSize: 9, letterSpacing: 1.2, color: colors.paper },
  ticketTag: { position: 'absolute', bottom: 10, left: 10, backgroundColor: colors.paper, borderRadius: radius.sm, paddingVertical: 5, paddingHorizontal: 8 },
  ticketTagText: { fontFamily: fonts.jet, fontSize: 9, letterSpacing: 1.2, color: colors.ink },
  friends: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  friendsNote: { marginLeft: 6 },
  sq: { width: 24, height: 24, borderRadius: radius.xs, borderWidth: 1.5, borderColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  sqLive: { backgroundColor: colors.spot, borderColor: colors.spot },
  sqText: { fontFamily: fonts.medium, fontSize: 12, color: colors.paper },
  sqTextLive: { color: colors.ink },
  note: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 17, color: colors.mute, marginTop: 8 },
  keptNote: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute },
  chain: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  rings: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderRadius: 17, borderWidth: 1.5, borderColor: colors.ink3 },
  ringOuter: { width: 34, height: 34 },
  ringMid: { width: 22, height: 22 },
  ringOn: { borderColor: colors.spot, borderWidth: 2 },
  ringCore: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.paper },
  chainText: { flex: 1, gap: 1 },
  chainWave: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.paper },
  strip: { width: 56, backgroundColor: colors.spot, alignItems: 'center', justifyContent: 'center' },
  stripDone: { backgroundColor: colors.ink, borderLeftWidth: 1, borderLeftColor: colors.ink3 },
  stripText: { fontFamily: fonts.jet, fontSize: 11, letterSpacing: 2, color: colors.ink, transform: [{ rotate: '-90deg' }], width: 120, textAlign: 'center' },
  stripTextDone: { color: colors.spotText },
  stripLeft: { width: 44, backgroundColor: colors.ink, borderRightWidth: 1, borderRightColor: colors.ink3, alignItems: 'center', justifyContent: 'center' },
  stripLeftText: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 2, color: colors.paper, transform: [{ rotate: '-90deg' }], width: 120, textAlign: 'center' },
  // the pull hints (ticket ↑ / details ↓): one line, large enough to read on the poster, air around the words
  hintText: { fontFamily: fonts.jet, fontSize: 13, letterSpacing: 2, color: colors.ink, backgroundColor: colors.paper, paddingVertical: 9, paddingHorizontal: 18, borderRadius: radius.pill, overflow: 'hidden' },
  pressed: { opacity: 0.75 },
});
