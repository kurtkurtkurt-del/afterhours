import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
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
  poster: string | null; // fotoğrafsız gece: sitedeki el çizimi afiş
  ticketUrl: string | null;
  friends: DeckFriend[]; // bu geceyi tutan arkadaşlar
  // arkadaşların arkadaşları: kimin üzerinden geldiği. path senden başlar,
  // ilk isim senin arkadaşın, son isim geceyi tutan (tanımadığın biri)
  via?: { wave: 2 | 3; path: string[] };
};

// events_public satırından kart; arkadaşlar dışarıdan gelir
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
// bilet: kaynağın sayfası; bileti olmayan gece (szene) kendi sayfasını açar
export const openTicket = (card: DeckCard) => (card.ticketUrl ? Linking.openURL(card.ticketUrl).catch(() => {}) : openDetails(card));

type Props = {
  card: DeckCard;
  bottom: number;         // altyazının alt kenarı (alt menünün üstü)
  rightLabel: string;     // sağdaki kırmızı şerit
  rightDone?: boolean;    // şerit söner (kept)
  onRight: () => void;
};

// kartın yüzü: tam ekran fotoğraf ya da afiş, altta afiş altyazısı (mürekkep blok, kırmızı archivo
// başlık, jetbrains künye, arkadaş kareleri), solda "details ↓", sağda kırmızı ana eylem.
export default function CardFace({ card, bottom, rightLabel, rightDone, onRight }: Props) {
  const shown = card.friends.slice(0, 2);
  const more = card.friends.length - shown.length;
  const details = () => openDetails(card);
  const { t, tx, up } = useLang();
  // tür adı veritabanından gelir ("club night"); anahtar slug ile kurulur.
  // sözlükte varsa çevrilmiş söz, yoksa veri: büyük harf ona göre
  const kindWord = tx('type.' + card.kind.replace(/\s+/g, '-'), '');
  const kind = kindWord ? up(kindWord) : upperData(card.kind);
  const sourceWord = card.source ? tx('word.' + card.source, '') : '';
  const source = sourceWord ? up(sourceWord) : upperData(card.source);
  return (
    <>
      {card.image ? (
        <Image source={{ uri: card.image }} style={styles.photo} resizeMode="cover" />
      ) : card.poster ? (
        <View style={styles.posterBox}>
          <SvgUri uri={card.poster} width="100%" height="100%" />
        </View>
      ) : (
        <Image source={fallback} style={styles.photo} resizeMode="cover" />
      )}
      <View style={[styles.caption, { bottom }]}>
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

// kimden geldiği: sen — arkadaşın — onun arkadaşı (— onunki). kareler çizgiyle
// bağlı; geceyi tutan son kare kırmızı. altında zincirin adları.
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

// çekerken beliren ipucu etiketi
export function Hint({ label }: { label: string }) {
  const { up } = useLang();
  return <Text style={styles.hintText}>{up(label)}</Text>;
}

const styles = StyleSheet.create({
  photo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', filter: [{ grayscale: 1 }] },
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
