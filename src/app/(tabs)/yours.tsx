import { StyleSheet, Text } from 'react-native';
import Storage from 'expo-sqlite/kv-store';
import TabPage from '@/components/TabPage';
import { cityById } from '@/content/cities';
import { colors, fonts } from '@/theme/tokens';

// arkadaş sekmesi. yer tutucu; seçilen şehri gösterir.
export default function YoursScreen() {
  const city = cityById(Storage.getItemSync('city') ?? undefined);
  return (
    <TabPage title="yours">
      {city && <Text style={styles.city}>{city.name}</Text>}
    </TabPage>
  );
}

const styles = StyleSheet.create({
  city: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink2 },
});
