import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SvgUri } from 'react-native-svg';
import { colors, fonts } from '@/theme/tokens';
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
  if (!iso) return 'date tba';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'date tba';
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
        <Pressable style={styles.stripLeft} onPress={details} accessibilityRole="button" accessibilityLabel="details">
          <Text style={styles.stripLeftText}>details ↓</Text>
        </Pressable>
        <Pressable style={styles.block} onPress={details}>
          <Text style={styles.title} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.6}>
            {card.title.toLowerCase()}
          </Text>
          <Text style={styles.jet}>{card.source ? `${card.kind} · ${card.source}` : card.kind}</Text>
          {card.venue ? <Text style={styles.jet} numberOfLines={1}>{card.venue}</Text> : null}
          <Text style={styles.jet}>{stamp(card.startsAt)}</Text>
          {card.friends.length > 0 ? (
            <View style={styles.friends}>
              {shown.map((f) => (
                <View key={f.name} style={[styles.sq, f.live && styles.sqLive]}>
                  <Text style={[styles.sqText, f.live && styles.sqTextLive]}>{f.name.charAt(0)}</Text>
                </View>
              ))}
              <Text style={styles.keptNote}>{more > 0 ? `+${more} kept it` : 'kept it'}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.strip, rightDone && styles.stripDone, pressed && styles.pressed]}
          onPress={onRight}
          accessibilityRole="button"
          accessibilityLabel={rightLabel}
        >
          <Text style={[styles.stripText, rightDone && styles.stripTextDone]}>{rightLabel}</Text>
        </Pressable>
      </View>
    </>
  );
}

// çekerken beliren ipucu etiketi
export function Hint({ label }: { label: string }) {
  return <Text style={styles.hintText}>{label}</Text>;
}

const styles = StyleSheet.create({
  photo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', filter: [{ grayscale: 1 }] },
  posterBox: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink2 },
  caption: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'stretch' },
  block: { flex: 1, backgroundColor: colors.ink, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, gap: 3 },
  title: { fontFamily: fonts.logo, fontSize: 48, lineHeight: 42, letterSpacing: -1, color: colors.spotText, marginBottom: 12 },
  jet: { fontFamily: fonts.jet, fontSize: 10.5, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.paper },
  friends: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  sq: { width: 24, height: 24, borderWidth: 1.5, borderColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  sqLive: { backgroundColor: colors.spot, borderColor: colors.spot },
  sqText: { fontFamily: fonts.medium, fontSize: 12, color: colors.paper },
  sqTextLive: { color: colors.ink },
  keptNote: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute, marginLeft: 6 },
  strip: { width: 56, backgroundColor: colors.spot, alignItems: 'center', justifyContent: 'center' },
  stripDone: { backgroundColor: colors.ink, borderLeftWidth: 1, borderLeftColor: colors.ink3 },
  stripText: { fontFamily: fonts.jet, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: colors.ink, transform: [{ rotate: '-90deg' }], width: 120, textAlign: 'center' },
  stripTextDone: { color: colors.spotText },
  stripLeft: { width: 44, backgroundColor: colors.ink, borderRightWidth: 1, borderRightColor: colors.ink3, alignItems: 'center', justifyContent: 'center' },
  stripLeftText: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: colors.paper, transform: [{ rotate: '-90deg' }], width: 120, textAlign: 'center' },
  hintText: { fontFamily: fonts.jet, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: colors.ink, backgroundColor: colors.paper, paddingVertical: 6, paddingHorizontal: 10 },
  pressed: { opacity: 0.75 },
});
