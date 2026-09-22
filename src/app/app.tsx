import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';
import BackButton from '@/components/BackButton';
import SoundCorner from '@/components/SoundCorner';
import { cityById } from '@/content/cities';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// asıl uygulama: kâğıt üstüne mürekkep. şimdilik boş; sol üstte seçilen şehir.
export default function AppScreen() {
  const { city } = useLocalSearchParams<{ city?: string }>();
  const chosen = cityById(city ?? Storage.getItemSync('city') ?? undefined);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <BackButton tone="ink" />
      <SoundCorner tone="ink" />
      <View style={styles.centre}>
        <Text style={styles.city}>{chosen?.name ?? 'afterhours'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: brand.left },
  city: { fontFamily: fonts.medium, fontSize: brand.smallSize, letterSpacing: -0.3, color: colors.ink },
});
