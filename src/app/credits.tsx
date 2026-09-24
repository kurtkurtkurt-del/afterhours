import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from '@/components/BackButton';
import { credits } from '@/content/credits';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// credits: müzik (cc0 / cc by 4.0), harita karoları, yazı tipi. mağaza ve lisans şartı.
export default function CreditsScreen() {
  const insets = useSafeAreaInsets();
  const genres = ['house', 'techno', 'rap'];
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.band}>
        <BackButton />
        <Text style={styles.title}>credits</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>music</Text>
        <Text style={styles.note}>sixty-second excerpts from free music archive. cc by 4.0 tracks require naming the artist; here they are.</Text>
        {genres.map((g) => (
          <View key={g}>
            <Text style={styles.genre}>{g}</Text>
            {credits
              .filter((c) => c.genre === g)
              .map((c) => (
                <Pressable key={c.url} onPress={() => Linking.openURL(c.url)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                  <Text style={styles.track}>{c.title.toLowerCase()}</Text>
                  <Text style={styles.lic}>{c.license}</Text>
                </Pressable>
              ))}
          </View>
        ))}
        <Text style={styles.section}>map</Text>
        <Text style={styles.note}>tiles © esri, here, garmin, openstreetmap contributors (world dark gray canvas). rendered with leaflet (bsd-2).</Text>
        <Text style={styles.section}>type</Text>
        <Text style={styles.note}>inter tight, sil open font license.</Text>
        <Text style={styles.section}>nights</Text>
        <Text style={styles.note}>ticketed nights are listed via the ticketmaster discovery api; szene nights are entered by hand.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 40, backgroundColor: colors.ink, zIndex: 2 },
  title: { position: 'absolute', top: brand.top, left: 0, right: 0, textAlign: 'center', fontFamily: fonts.medium, fontSize: brand.smallSize, letterSpacing: -0.3, color: colors.paper },
  body: { paddingTop: brand.top + 40, paddingHorizontal: brand.left },
  section: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.mute, marginTop: 28, marginBottom: 6 },
  note: { fontFamily: fonts.regular, fontSize: 14, color: colors.paper2, opacity: 0.85, lineHeight: 20 },
  genre: { fontFamily: fonts.medium, fontSize: 18, letterSpacing: -0.3, color: colors.paper, marginTop: 18, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.ink3 },
  pressed: { opacity: 0.6 },
  track: { fontFamily: fonts.regular, fontSize: 14, color: colors.paper2, flex: 1 },
  lic: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute },
});
