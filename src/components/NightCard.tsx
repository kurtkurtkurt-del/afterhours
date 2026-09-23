import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '@/theme/tokens';
import type { Night } from '@/data/deck';

const fallback = require('../../assets/intro/concert.jpg');

// seçenek 1, "tam kart": fotoğraf kartın tamamı, yazı altta koyu bantta.
export default function NightCard({ night }: { night: Night }) {
  const line = [night.type_name, night.source === 'ticketmaster' ? 'ticket' : 'szene'].filter(Boolean).join(' · ');
  return (
    <View style={styles.card}>
      <Image source={night.image_url ? { uri: night.image_url } : fallback} style={styles.photo} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(22,21,18,0)', 'rgba(22,21,18,0.25)', 'rgba(22,21,18,0.92)']}
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
  photo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' },
  text: { position: 'absolute', left: 18, right: 18, bottom: 18, gap: 6 },
  mono: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.paper2, opacity: 0.7 },
  title: { fontFamily: fonts.medium, fontSize: 30, lineHeight: 32, letterSpacing: -0.9, color: colors.paper },
});
