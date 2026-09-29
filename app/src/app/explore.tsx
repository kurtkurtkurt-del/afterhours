import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Storage from 'expo-sqlite/kv-store';
import { useAuth } from '@/auth/AuthContext';
import BackButton from '@/components/BackButton';
import Onboarding from '@/components/Onboarding';
import SoundCorner from '@/components/SoundCorner';
import { useCities } from '@/data/cities';
import { chooseCity } from '@/data/here';
import { useT } from '@/i18n';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// City picker. The chosen city is stored, the photo fades out, and the app opens.
export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const t = useT();
  // Intro on first visit only (it can be replayed from settings).
  const [intro, setIntro] = useState(() => Storage.getItemSync('intro.seen') !== '1');
  const finishIntro = () => {
    Storage.setItemSync('intro.seen', '1');
    setIntro(false);
  };
  const { cities, live } = useCities();

  const pick = (id: string) => {
    chooseCity(id, cities.find((c) => c.id === id)?.name ?? id);
    // Sign-up follows the city; users with a session go straight in.
    router.replace(session ? '/flow' : '/signup');
  };

  if (intro) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <BackButton />
        <Onboarding onDone={finishIntro} />
      </View>
    );
  }

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
          <Text style={styles.line}>{t('home.city.line1')}</Text>
          <Text style={styles.line}>{t('home.city.line2')}</Text>
        </View>
        <View style={styles.list}>
          {cities.map((c) => (
            <Pressable key={c.id} onPress={() => pick(c.id)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <Text style={styles.city}>{c.name}</Text>
              <Text style={styles.nights}>{t(c.nights === 1 ? 'home.city.nights.one' : 'home.city.nights.other', { n: c.nights })}</Text>
            </Pressable>
          ))}
          <Text style={styles.note}>{live ? t('home.city.live') : t('home.city.offline')}</Text>
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
