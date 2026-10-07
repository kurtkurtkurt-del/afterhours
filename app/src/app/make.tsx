import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/auth/AuthContext';
import { SPARKS } from '@/content/sparks';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// The + on the flow (design 12B): two big photo cards, a ticketed night for
// everyone or a spark among friends. The spark card opens the kinds, each with its photo.
export default function Make() {
  const { t, up } = useLang();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [sparks, setSparks] = useState(false);
  const ticket = () => (!session || session.user.is_anonymous ? router.push('/signup') : router.replace('/panel/night'));

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={[styles.body, { paddingTop: Math.max(insets.top, 20) + 20, paddingBottom: insets.bottom + 100 }]}>
        <Text style={styles.title}>{sparks ? t('make.which') : t('make.question')}</Text>
        {!sparks ? (
          <>
            <Choice photo={require('../../assets/feed/t3.jpg')} mono={t('make.ticket.mono')} title={t('make.ticket')} hint={t('make.ticket.hint')} onPress={ticket} />
            <Choice photo={require('../../assets/sparks/grill.jpg')} mono={t('make.friends.mono')} title={t('make.friends')} hint={t('make.friends.hint')} red onPress={() => setSparks(true)} />
          </>
        ) : (
          <View style={styles.grid}>
            {SPARKS.map((sp) => (
              <Pressable key={sp.kind} onPress={() => router.replace(`/spark/${sp.kind}`)} style={({ pressed }) => [styles.tile, pressed && styles.pressed]} accessibilityRole="button">
                <Image source={sp.photo} style={StyleSheet.absoluteFill} contentFit="cover" />
                <LinearGradient colors={['rgba(14,13,12,0)', 'rgba(14,13,12,0.85)']} locations={[0.4, 1]} style={StyleSheet.absoluteFill} />
                <Text style={styles.tileText}>{up(t(sp.label))}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
      <BackButton />
    </View>
  );
}

function Choice({ photo, mono, title, hint, red, onPress }: { photo: number; mono: string; title: string; hint: string; red?: boolean; onPress: () => void }) {
  const { up } = useLang();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]} accessibilityRole="button">
      <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient colors={['rgba(14,13,12,0)', 'rgba(14,13,12,0.9)']} locations={[0.3, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.cardText}>
        <Text style={[styles.mono, red && styles.monoRed]}>{up(mono)}</Text>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardHint}>{hint}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  body: { paddingHorizontal: brand.left, gap: 12 },
  title: { fontFamily: fonts.semibold, fontSize: 30, letterSpacing: -0.9, color: colors.paper, marginBottom: 6 },
  card: { height: 280, borderRadius: radius.lg, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: colors.ink3 },
  cardText: { padding: 18, gap: 4 },
  mono: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.6, color: colors.paper },
  monoRed: { color: colors.spotText },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 32, letterSpacing: -1, color: colors.paper },
  cardHint: { fontFamily: fonts.regular, fontSize: 13, color: '#ddd' },
  pressed: { opacity: 0.75 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  tile: { width: '48.5%', height: 130, borderRadius: radius.md, overflow: 'hidden', justifyContent: 'flex-end', padding: 10, backgroundColor: colors.ink3 },
  tileText: { fontFamily: fonts.jet, fontSize: 11, letterSpacing: 1.4, color: colors.paper },
});
