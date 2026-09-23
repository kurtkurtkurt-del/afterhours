import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Storage from 'expo-sqlite/kv-store';
import BackButton from '@/components/BackButton';
import SoundCorner from '@/components/SoundCorner';
import { useCities } from '@/data/cities';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// şehir seçimi. seçilen şehir saklanır, fotoğraf bırakılır, asıl uygulama açılır.
export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { cities, live } = useCities();

  const pick = (id: string) => {
    Storage.setItemSync('city', id);
    Storage.setItemSync('city.name', cities.find((c) => c.id === id)?.name ?? id);
    router.replace('/yours');
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <BackButton />
      <SoundCorner />
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={styles.line}>where are</Text>
          <Text style={styles.line}>you based?</Text>
        </View>
        <View style={styles.list}>
          {cities.map((c) => (
            <Pressable key={c.id} onPress={() => pick(c.id)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <Text style={styles.city}>{c.name}</Text>
              <Text style={styles.nights}>
                {c.nights} {c.nights === 1 ? 'night' : 'nights'}
              </Text>
            </Pressable>
          ))}
          <Text style={styles.note}>{live ? 'nights listed right now' : 'sample numbers · offline'}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  body: { flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: brand.left, paddingTop: brand.top + 48 },
  heading: { marginBottom: 28 },
  line: { fontFamily: fonts.medium, fontSize: 34, lineHeight: 40, letterSpacing: -0.8, color: colors.paper },
  list: { borderTopWidth: 1, borderTopColor: colors.paper },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.paper,
  },
  pressed: { opacity: 0.6 },
  city: { fontFamily: fonts.medium, fontSize: 22, letterSpacing: -0.4, color: colors.paper },
  nights: { fontFamily: fonts.regular, fontSize: 14, color: colors.paper2, opacity: 0.8, fontVariant: ['tabular-nums'] },
  note: { fontFamily: fonts.regular, fontSize: 12, color: colors.paper2, opacity: 0.6, marginTop: 12 },
});
