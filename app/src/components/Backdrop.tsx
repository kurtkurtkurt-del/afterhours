import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, veil } from '@/theme/tokens';

// Night photo under a light veil (try/light): the photo stays as texture, the words on it
// are the page's own dark ink. The intro and the next screen share this background.
export default function Backdrop() {
  return (
    <View style={styles.fill} pointerEvents="none">
      <Image source={require('../../assets/intro/concert.jpg')} style={styles.fill} contentFit="cover" />
      <View style={[styles.fill, styles.tint]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  tint: { backgroundColor: colors.ink, opacity: veil },
});
