import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View, type ImageSourcePropType, Image as RNImage } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SvgUri } from 'react-native-svg';
import { upperData, useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { posterUrl, type Night } from '@/data/deck';

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
const stamp = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return `${two(d.getDate())}.${two(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)} · ${two(d.getHours())}:${two(d.getMinutes())}`;
};

export const openDetails = (card: DeckCard) => card.slug && router.push(`/night/${card.slug}`);
// Ticket: the source's page; nights without a ticket (szene) open their own page.
export const openTicket = (card: DeckCard) => (card.ticketUrl ? Linking.openURL(card.ticketUrl).catch(() => {}) : openDetails(card));

type Props = {
  card: DeckCard;
  bottom: number;         // bottom edge of the caption (above the tab bar)
  rightLabel: string;     // the red strip on the right
  rightDone?: boolean;    // strip dims (kept)
  onRight: () => void;
  // Flow: the poster is not cropped; it sits above the caption at its own ratio,
  // over a blurred copy of itself. top: upper bound for the poster.
  fit?: { top: number };
  onDetails?: () => void; // instead of the night page (sparks have their own)
};

// Card face: full-bleed photo or poster, caption at the bottom (ink block, red Archivo
// title, mono details, friend squares), "details ↓" on the left, the red main action on the right.
export default function CardFace({ card, bottom, rightLabel, rightDone, onRight, fit, onDetails }: Props) {
  const [captionH, setCaptionH] = useState(0);
  const shown = card.friends.slice(0, 2);
  const more = card.friends.length - shown.length;
  const details = onDetails ?? (() => openDetails(card));
  const { t, tx, up } = useLang();
  // The type name comes from the database ("club night"); the key is built from its slug.
  // Use the translation when there is one, otherwise the data; uppercase accordingly.
  const kindWord = tx('type.' + card.kind.replace(/\s+/g, '-'), '');
  const kind = kindWord ? up(kindWord) : upperData(card.kind);
  const sourceWord = card.source ? tx('word.' + card.source, '') : '';
  const source = sourceWord ? up(sourceWord) : upperData(card.source);
  return (
    <>
      {fit ? (
        <FitPoster card={card} top={fit.top} bottom={bottom + captionH + 12} ready={captionH > 0} />
      ) : card.image || card.local ? (
        <Image source={card.image ? { uri: card.image } : card.local!} style={styles.photo} contentFit="cover" />
      ) : card.poster ? (
        <View style={styles.posterBox}>
          <SvgUri uri={card.poster} width="100%" height="100%" />
        </View>
      ) : (
        <Image source={fallback} style={styles.photo} contentFit="cover" />
      )}
      <View style={[styles.caption, { bottom }]} onLayout={fit ? (e) => setCaptionH(e.nativeEvent.layout.height) : undefined}>
        <Pressable style={styles.stripLeft} onPress={details} accessibilityRole="button" accessibilityLabel={t('word.details')}>
          <Text style={styles.stripLeftText}>{up(t('word.details'))} ↓</Text>
        </Pressable>
        <Pressable style={styles.block} onPress={details}>
          <Text style={styles.title} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.6}>
            {card.title.toLowerCase()}
          </Text>
          <Text style={styles.jet}>{source ? `${kind} · ${source}` : kind}</Text>
          {card.venue ? <Text style={styles.jet} numberOfLines={1}>{upperData(card.venue)}</Text> : null}
          <Text style={styles.jet}>{stamp(card.startsAt) ?? up(t('deck.dateTba'))}</Text>
          {card.via ? <Chain via={card.via} /> : null}
          {card.note ? <Text style={styles.note} numberOfLines={2}>{card.note}</Text> : null}
          {card.friends.length > 0 ? (
            <View style={styles.friends}>
              {shown.map((f) => (
                <View key={f.name} style={[styles.sq, f.live && styles.sqLive]}>
                  <Text style={[styles.sqText, f.live && styles.sqTextLive]}>{f.name.charAt(0)}</Text>
                </View>
              ))}
              <Text style={styles.keptNote}>{more > 0 ? t('deck.moreKeptIt', { n: more }) : t('deck.keptIt')}</Text>
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

const sizeOf = (source: ImageSourcePropType) => {
  const s = RNImage.resolveAssetSource(source);
  return s.width && s.height ? s.width / s.height : 2 / 3;
};

// Flow card: blurred backdrop + uncropped poster, fitted and centred between the chip and the caption.
function FitPoster({ card, top, bottom, ready }: { card: DeckCard; top: number; bottom: number; ready: boolean }) {
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
      {svg ? (
        <View style={[styles.photo, { backgroundColor: colors.ink2 }]} />
      ) : (
        <Image source={source} style={styles.photo} contentFit="cover" blurRadius={28} />
      )}
      <View style={styles.veil} />
      <View style={[styles.fitArea, { top, bottom }]} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {area && ready ? (
          <View style={[styles.fitPoster, { width: w, height: h }]}>
            {svg ? <SvgUri uri={card.poster!} width="100%" height="100%" /> : <Image source={source} style={styles.fill} contentFit="cover" />}
          </View>
        ) : null}
      </View>
    </>
  );
}

// Where it came from: you — your friend — their friend (— theirs). Squares joined by
// lines; the keeper's square is red. The chain's names underneath.
function Chain({ via }: { via: { wave: 2 | 3; path: string[] } }) {
  const { t, up } = useLang();
  const keeper = via.path[via.path.length - 1];
  return (
    <View style={styles.chain}>
      <View style={styles.chainRow}>
        <View style={[styles.sq, styles.sqYou]}>
          <Text style={styles.sqYouText}>{up(t('deck.you'))}</Text>
        </View>
        {via.path.map((name, i) => {
          const last = i === via.path.length - 1;
          return (
            <View key={`${name}-${i}`} style={styles.chainStep}>
              <View style={styles.link} />
              <View style={[styles.sq, last && styles.sqLive]}>
                <Text style={[styles.sqText, last && styles.sqTextLive]}>{name.charAt(0)}</Text>
              </View>
            </View>
          );
        })}
        <Text style={styles.wave}>{up(t(via.wave === 2 ? 'deck.wave2' : 'deck.wave3'))}</Text>
      </View>
      <Text style={styles.keptNote} numberOfLines={2}>
        {t('deck.via', { path: via.path.slice(0, -1).join(' → ') })} · {t('deck.keptBy', { name: keeper })}
      </Text>
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
  veil: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(14,13,12,0.42)' },
  fitArea: { position: 'absolute', left: 12, right: 12, alignItems: 'center', justifyContent: 'center' },
  fitPoster: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.ink },
  fill: { width: '100%', height: '100%' },
  posterBox: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink2 },
  caption: { position: 'absolute', left: 8, right: 8, flexDirection: 'row', alignItems: 'stretch', borderRadius: radius.lg, overflow: 'hidden' },
  block: { flex: 1, backgroundColor: colors.ink, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, gap: 3 },
  title: { fontFamily: fonts.logo, fontSize: 48, lineHeight: 42, letterSpacing: -1, color: colors.spotText, marginBottom: 12 },
  jet: { fontFamily: fonts.jet, fontSize: 10.5, letterSpacing: 1.2, color: colors.paper },
  friends: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  sq: { width: 24, height: 24, borderRadius: radius.xs, borderWidth: 1.5, borderColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  sqLive: { backgroundColor: colors.spot, borderColor: colors.spot },
  sqText: { fontFamily: fonts.medium, fontSize: 12, color: colors.paper },
  sqTextLive: { color: colors.ink },
  note: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 17, color: colors.mute, marginTop: 12 },
  keptNote: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute, marginLeft: 6 },
  chain: { marginTop: 12, gap: 6 },
  chainRow: { flexDirection: 'row', alignItems: 'center' },
  chainStep: { flexDirection: 'row', alignItems: 'center' },
  link: { width: 10, height: 1, backgroundColor: colors.mute },
  sqYou: { width: undefined, paddingHorizontal: 5, borderColor: colors.mute },
  sqYouText: { fontFamily: fonts.jet, fontSize: 8.5, letterSpacing: 0.8, color: colors.mute },
  wave: { fontFamily: fonts.jet, fontSize: 9.5, letterSpacing: 1.2, color: colors.spotText, marginLeft: 10 },
  strip: { width: 56, backgroundColor: colors.spot, alignItems: 'center', justifyContent: 'center' },
  stripDone: { backgroundColor: colors.ink, borderLeftWidth: 1, borderLeftColor: colors.ink3 },
  stripText: { fontFamily: fonts.jet, fontSize: 11, letterSpacing: 2, color: colors.ink, transform: [{ rotate: '-90deg' }], width: 120, textAlign: 'center' },
  stripTextDone: { color: colors.spotText },
  stripLeft: { width: 44, backgroundColor: colors.ink, borderRightWidth: 1, borderRightColor: colors.ink3, alignItems: 'center', justifyContent: 'center' },
  stripLeftText: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 2, color: colors.paper, transform: [{ rotate: '-90deg' }], width: 120, textAlign: 'center' },
  hintText: { fontFamily: fonts.jet, fontSize: 11, letterSpacing: 2, color: colors.ink, backgroundColor: colors.paper, paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.pill, overflow: 'hidden' },
  pressed: { opacity: 0.75 },
});
