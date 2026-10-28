import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { SvgUri } from 'react-native-svg';
import { posterUrl } from '@/data/deck';
import { colors } from '@/theme/tokens';

const fallback = require('../../assets/intro/concert.jpg');

// A night's picture in a small frame (the account's coming up, kept, the passport): its photo,
// else its drawn poster, else the stock photo, dimmed. A night without a photo left the frame
// empty before (owner, 28.10.2026). Fills its parent.
export default function NightThumb({ night }: { night: { image_url?: string | null; poster_no?: number | null; poster_path?: string | null } }) {
  const [broken, setBroken] = useState<'photo' | 'poster' | null>(null);
  const poster = posterUrl({ poster_no: night.poster_no ?? null, poster_path: night.poster_path ?? null });
  if (night.image_url && !broken) return <Image source={{ uri: night.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" onError={() => setBroken('photo')} />;
  if (poster && broken !== 'poster') {
    return (
      <View style={[StyleSheet.absoluteFill, styles.poster]}>
        <SvgUri uri={poster} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" onError={() => setBroken('poster')} />
      </View>
    );
  }
  return <Image source={fallback} style={[StyleSheet.absoluteFill, styles.dim]} contentFit="cover" />;
}

const styles = StyleSheet.create({
  poster: { backgroundColor: colors.poster, overflow: 'hidden' },
  dim: { opacity: 0.55 },
});
