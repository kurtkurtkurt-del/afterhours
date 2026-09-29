import { Image, StyleSheet, View } from 'react-native';
import { colors } from '@/theme/tokens';

// Night photo with an ink tint. The intro and the next screen share this background.
export default function Backdrop() {
  return (
    <View style={styles.fill} pointerEvents="none">
      <Image source={require('../../assets/intro/concert.jpg')} style={styles.fill} resizeMode="cover" />
      <View style={[styles.fill, styles.tint]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  tint: { backgroundColor: colors.ink, opacity: 0.35 },
});
