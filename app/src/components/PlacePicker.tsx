import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { City } from '@/content/cities';
import { cityPhotos, type CityPhoto } from '@/data/cityPhotos';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

type Props = {
  open: boolean;
  cities: City[];
  selected: string | null; // city id; null = everywhere
  onSelect: (city: string | null) => void;
  onClose: () => void;
};

type Country = { slug: string; name: string; nights: number; cities: City[] };

// Where, in two steps inside one sheet.
// 1. Countries set large, like a poster: the one you are in first, in paper, the rest
//    dimmed by how much is on.
// 2. The country's cities as tall photo cards that slide sideways; each photo is the
//    city's own (Wikipedia lead image), credited on the card.
export default function PlacePicker({ open, cities, selected, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { t, tx, tn, up } = useLang();
  const [country, setCountry] = useState<string | null>(null);

  const current = cities.find((c) => c.id === selected)?.countrySlug ?? null;
  const countries = useMemo(() => {
    const by = new Map<string, Country>();
    cities.forEach((c) => {
      const slug = c.countrySlug || '?';
      const entry = by.get(slug) ?? { slug, name: tx('country.' + slug, (c.country || slug).toLowerCase()), nights: 0, cities: [] };
      entry.nights += c.nights;
      entry.cities.push(c);
      by.set(slug, entry);
    });
    return [...by.values()].sort((a, b) => Number(b.slug === current) - Number(a.slug === current) || b.nights - a.nights);
  }, [cities, current, tx]);

  const chosen = countries.find((c) => c.slug === country);
  const close = () => {
    setCountry(null);
    onClose();
  };
  const pick = (id: string | null) => {
    onSelect(id);
    close();
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => (chosen ? setCountry(null) : close())}>
      <Pressable style={styles.dim} onPress={close} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.grip} />
        {chosen ? (
          <Cities country={chosen} selected={selected} onBack={() => setCountry(null)} onPick={pick} />
        ) : (
          <>
            <Text style={styles.step}>{up(t('filter.country'))} · 1/2</Text>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              <Pressable onPress={() => pick(null)} accessibilityRole="button" style={({ pressed }) => [styles.everywhere, pressed && styles.pressed]}>
                <Text style={[styles.everywhereText, selected === null && styles.on]}>{t('filter.everywhere')}</Text>
              </Pressable>
              {countries.map((c) => {
                const on = c.slug === current;
                return (
                  <Pressable key={c.slug} onPress={() => setCountry(c.slug)} accessibilityRole="button" accessibilityLabel={c.name} style={({ pressed }) => pressed && styles.pressed}>
                    <Text style={[styles.country, on && styles.on]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                      {c.name}
                      <Text style={[styles.sup, on && styles.supOn]}>{`  ${c.nights}`}</Text>
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Text style={styles.foot}>{tn('filter.nights', countries.reduce((a, c) => a + c.nights, 0))}</Text>
          </>
        )}
      </View>
    </Modal>
  );
}

// Step 2: the country's cities as photo cards, most nights first.
function Cities({ country, selected, onBack, onPick }: { country: Country; selected: string | null; onBack: () => void; onPick: (id: string) => void }) {
  const { t, tn, up } = useLang();
  const [photos, setPhotos] = useState<Record<string, CityPhoto>>({});
  const list = useMemo(() => [...country.cities].sort((a, b) => b.nights - a.nights), [country]);
  useEffect(() => {
    let live = true;
    cityPhotos(list).then((p) => live && setPhotos(p), () => {});
    return () => {
      live = false;
    };
  }, [list]);

  return (
    <>
      <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button" style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
        <Text style={styles.backText}>‹ {t('filter.countries')}</Text>
      </Pressable>
      <Text style={styles.countryTitle} numberOfLines={1}>{country.name}</Text>
      <Text style={styles.step}>{up(t('filter.city'))} · 2/2</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
        {list.map((c) => {
          const on = c.id === selected;
          const photo = photos[c.id];
          return (
            <Pressable key={c.id} onPress={() => onPick(c.id)} accessibilityRole="button" accessibilityLabel={c.name} style={({ pressed }) => [styles.card, on && styles.cardOn, pressed && styles.pressed]}>
              {photo ? <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
              <LinearGradient colors={['rgba(14,13,12,0)', 'rgba(14,13,12,0.92)']} locations={[0.35, 1]} style={StyleSheet.absoluteFill} />
              <View style={styles.cardText}>
                <Text style={styles.cityName} numberOfLines={2}>{c.name}</Text>
                <Text style={styles.cityNights}>{tn('filter.nights', c.nights)}</Text>
                {photo ? <Text style={styles.credit} numberOfLines={1}>{photo.credit}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  dim: { flex: 1, backgroundColor: 'rgba(14,13,12,0.6)' },
  sheet: { backgroundColor: colors.ink, borderWidth: 1, borderBottomWidth: 0, borderColor: colors.ink3, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: brand.left, paddingTop: 10, maxHeight: '82%' },
  grip: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.ink3, marginBottom: 14 },
  step: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.4, color: colors.meta, marginBottom: 8 },
  list: { flexGrow: 0 },
  pressed: { opacity: 0.6 },
  everywhere: { paddingVertical: 4, marginBottom: 6 },
  everywhereText: { fontFamily: fonts.medium, fontSize: 17, color: colors.mute },
  country: { fontFamily: fonts.semibold, fontSize: 38, lineHeight: 42, letterSpacing: -1.4, color: '#4a4640' },
  on: { color: colors.paper },
  sup: { fontFamily: fonts.jet, fontSize: 12, letterSpacing: 0.4, color: colors.meta },
  supOn: { color: colors.spotText },
  foot: { fontFamily: fonts.regular, fontSize: 12, color: colors.meta, marginTop: 12 },
  back: { alignSelf: 'flex-start', paddingVertical: 4 },
  backText: { fontFamily: fonts.medium, fontSize: 14, color: colors.mute },
  countryTitle: { fontFamily: fonts.semibold, fontSize: 38, lineHeight: 42, letterSpacing: -1.4, color: colors.paper, marginTop: 4, marginBottom: 6 },
  cards: { gap: 10, paddingRight: brand.left, paddingBottom: 4 },
  card: { width: 150, height: 210, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.ink2, borderWidth: 2, borderColor: 'transparent' },
  cardOn: { borderColor: colors.spot },
  cardText: { position: 'absolute', left: 10, right: 10, bottom: 10 },
  cityName: { fontFamily: fonts.semibold, fontSize: 19, lineHeight: 21, letterSpacing: -0.5, color: colors.paper },
  cityNights: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute, marginTop: 2 },
  credit: { fontFamily: fonts.regular, fontSize: 8.5, color: colors.meta, marginTop: 6 },
});
