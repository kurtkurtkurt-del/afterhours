import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgUri } from 'react-native-svg';
import { colors, fonts } from '@/theme/tokens';
import { posterUrl, type Night } from '@/data/deck';

const fallback = require('../../assets/intro/concert.jpg');

// seçenek 1, "tam kart": fotoğraf kartın tamamı, yazı altta koyu bantta.
export default function NightCard({ night }: { night: Night }) {
  const line = [night.type_name, night.source === 'ticketmaster' ? 'ticket' : 'szene'].filter(Boolean).join(' · ');
  return (
    <View style={styles.card}>
      {night.image_url ? (
        <Image source={{ uri: night.image_url }} style={styles.photo} resizeMode="cover" />
      ) : posterUrl(night) ? (
        // fotoğrafsız gece: sitedeki el çizimi afiş; her gecenin kendi yüzü olsun
        <View style={styles.posterBox}>
          <SvgUri uri={posterUrl(night)!} width="100%" height="100%" />
        </View>
      ) : (
        <Image source={fallback} style={styles.photo} resizeMode="cover" />
      )}
      <LinearGradient
        colors={['rgba(14,13,12,0)', 'rgba(14,13,12,0.25)', 'rgba(14,13,12,0.92)']}
        locations={[0, 0.45, 1]}
        style={styles.shade}
      />
      <View style={styles.text}>
        <Text style={styles.mono}>{line.toLowerCase()}</Text>
        <Text style={styles.title} numberOfLines={3}>
          {night.title.toLowerCase()}
        </Text>
        <Text style={styles.mono}>{night.meta.toLowerCase()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: colors.ink2, overflow: 'hidden' },
  posterBox: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink2 },
  photo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' },
  text: { position: 'absolute', left: 18, right: 18, bottom: 18, gap: 6 },
  mono: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.paper2, opacity: 0.7 },
  title: { fontFamily: fonts.medium, fontSize: 30, lineHeight: 32, letterSpacing: -0.9, color: colors.paper },
});
