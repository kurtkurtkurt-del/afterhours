import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors, fonts } from '@/theme/tokens';

// yer tutucu. açılışın bittiği yer; şehir seçimi sonra gelecek.
export default function CityScreen() {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Text style={styles.title}>afterhours</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink, paddingTop: 72, paddingHorizontal: 24 },
  title: { fontFamily: fonts.medium, fontSize: 18, letterSpacing: -0.3, color: colors.paper },
});
