import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from '@/components/BackButton';
import MotifField from '@/components/Motifs';
import { bySoonest, nextDate, specials, type SpecialId } from '@/content/specials';
import { askSpecial } from '@/data/specialOpen';
import { dayLabel } from '@/data/when';
import { useLang } from '@/i18n';
import { colors, fonts, radius, barStyle } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// All the specialties (owner, 03.11.2026): the fifty occasions as squares, soonest
// first, with a search line on top. A tap hands the occasion to the connect tab, which
// opens its deck.
export default function Specials() {
  const { t, up } = useLang();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [q, setQ] = useState('');
  const all = useMemo(() => bySoonest(specials), []);
  const needle = q.trim().toLowerCase();
  const list = needle ? all.filter((o) => t(o.label).toLowerCase().includes(needle) || o.id.includes(needle)) : all;
  const squareW = Math.floor((width - brand.left * 2 - 10) / 2);
  const open = (id: SpecialId) => {
    askSpecial(id);
    router.back();
  };
  return (
    <View style={styles.root}>
      <StatusBar style={barStyle} />
      <ScrollView contentContainerStyle={[styles.body, { paddingTop: Math.max(brand.top, insets.top + 24), paddingBottom: insets.bottom + 100 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('special.all')}</Text>
        <TextInput value={q} onChangeText={setQ} placeholder={t('special.search')} placeholderTextColor={colors.mute} autoCorrect={false} autoCapitalize="none" style={styles.field} />
        <View style={styles.grid}>
          {list.map((o) => (
            <Pressable key={o.id} onPress={() => open(o.id)} style={({ pressed }) => [styles.square, { width: squareW, height: squareW }, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={t(o.label)}>
              <LinearGradient colors={[o.ground, o.deep]} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={StyleSheet.absoluteFill} />
              <MotifField special={o} width={squareW} height={squareW} kind="cover" />
              <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']} style={styles.shade} pointerEvents="none" />
              <View style={styles.text}>
                <Text style={[styles.name, { color: o.ink }]} numberOfLines={2}>{t(o.label)}<Text style={{ color: o.accents[0] }}>.</Text></Text>
                <Text style={[styles.line, { color: o.ink }]} numberOfLines={1}>{up(dayLabel(nextDate(o).toISOString()))}</Text>
              </View>
            </Pressable>
          ))}
        </View>
        {!list.length ? <Text style={styles.none}>{t('special.none')}</Text> : null}
      </ScrollView>
      <BackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  body: { paddingHorizontal: brand.left },
  title: { fontFamily: fonts.semibold, fontSize: 30, lineHeight: 32, letterSpacing: -0.9, color: colors.paper, marginBottom: 14 },
  field: { height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.edge, paddingHorizontal: 16, fontFamily: fonts.medium, fontSize: 16, color: colors.paper, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  square: { borderRadius: radius.md, overflow: 'hidden' },
  pressed: { opacity: 0.7 },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  text: { position: 'absolute', left: 12, right: 12, bottom: 11 },
  name: { fontFamily: fonts.logo, fontSize: 25, lineHeight: 26, letterSpacing: -0.3 },
  line: { fontFamily: fonts.jet, fontSize: 8.5, letterSpacing: 1, opacity: 0.85, marginTop: 4 },
  none: { fontFamily: fonts.regular, fontSize: 14, color: colors.mute, marginTop: 10 },
});
