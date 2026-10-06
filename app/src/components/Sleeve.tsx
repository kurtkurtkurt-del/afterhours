import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import { colors, fonts, radius } from '@/theme/tokens';

type Props = {
  width: number; // the whole sleeve, cover and record
  photo: string | null;
  name: string;
  meta: string;
  disc: string; // the words on the red label
  city?: string | null; // a city with its own label (Munich) draws it instead of the words
  empty?: ReactNode; // shown on the cover without a photo (default: the initial)
  corner?: ReactNode; // over the cover, bottom right (e.g. "change")
  onPress?: () => void;
  onPhotoError?: () => void;
  a11y?: string;
};

// A profile as a record sleeve: the photo is a square cover with the name on it,
// the record slides out behind it on the right, far enough that most of its red
// label shows. The label carries the city when it has its own (Munich: the Alps
// under "münchen"), otherwise the words given in disc.
export default function Sleeve({ width, photo, name, meta, disc, city, empty, corner, onPress, onPhotoError, a11y }: Props) {
  const cover = Math.round(width * 0.66);
  const d = Math.round(cover * 0.92);
  const label = d * 0.42;
  const art = cityLabel(city);
  return (
    <View style={{ height: cover }}>
      {/* The record reaches 10 px into the page margin on the right. */}
      <View style={[styles.disc, { width: d, height: d, left: width - d + 10, top: (cover - d) / 2 }]}>
        {/* Grooves light enough to read against the ink page, and a faint sheen across. */}
        <Svg width={d} height={d} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#ffffff" stopOpacity={0.1} />
              <Stop offset="0.45" stopColor="#ffffff" stopOpacity={0} />
              <Stop offset="0.55" stopColor="#ffffff" stopOpacity={0} />
              <Stop offset="1" stopColor="#ffffff" stopOpacity={0.07} />
            </SvgGradient>
          </Defs>
          <Circle cx={d / 2} cy={d / 2} r={d / 2 - 1} fill="#151412" stroke="#3a3733" strokeWidth={1.5} />
          {[0.94, 0.88, 0.82, 0.76, 0.7, 0.64, 0.58, 0.52].map((k) => (
            <Circle key={k} cx={d / 2} cy={d / 2} r={(d / 2) * k} fill="none" stroke="#34312d" strokeWidth={1.1} />
          ))}
          <Circle cx={d / 2} cy={d / 2} r={d / 2 - 1} fill="url(#sheen)" />
        </Svg>
        {/* The cover hides the left edge of the label: what is on it sits a little right. */}
        <View style={[styles.label, { width: label, height: label, borderRadius: label / 2, paddingLeft: label * 0.16 }]}>
          {art ? (
            <>
              {/* The landscape fills the lower part of the label, cut by its round edge. */}
              <View style={styles.landscape}>{art.draw(label)}</View>
              <Text style={[styles.cityText, { marginBottom: label * 0.3 }]} numberOfLines={1}>
                {art.name}
              </Text>
            </>
          ) : (
            <Text style={styles.labelText} numberOfLines={1}>
              {disc}
            </Text>
          )}
        </View>
      </View>

      <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'imagebutton' : undefined} accessibilityLabel={a11y} style={[styles.cover, { width: cover, height: cover }]}>
        {photo ? (
          <Image key={photo} source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" onError={onPhotoError} />
        ) : (
          (empty ?? <Text style={styles.initial}>{name.charAt(0)}</Text>)
        )}
        <LinearGradient colors={['rgba(14,13,12,0)', 'rgba(14,13,12,0.9)']} style={styles.shade} pointerEvents="none" />
        <View style={styles.who} pointerEvents="none">
          <Text style={styles.name} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>
            {name.replace(' ', '\n')}
          </Text>
          <Text style={styles.meta} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {meta}
          </Text>
        </View>
        {corner ? (
          <View style={styles.corner} pointerEvents="none">
            {corner}
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

// Cities with their own label. Munich: the Alps as seen from the city on a föhn day:
// a pale far range, the near range in rock, snow on the summits. Matched by slug or by name.
const LABELS: { match: RegExp; name: string; draw: (w: number) => ReactNode }[] = [
  {
    match: /^(munchen|münchen|munich|münih|monaco di baviera)$/i,
    name: 'MÜNCHEN',
    draw: (w) => (
      <Svg width={w} height={w * 0.42} viewBox="0 0 120 50">
        {/* the far range, pale */}
        <Path d="M0 50 L0 30 L8 26 L14 28 L22 21 L28 24 L34 19 L42 23 L50 18 L58 22 L66 17 L74 21 L82 16 L90 22 L98 19 L106 23 L114 20 L120 22 L120 50 Z" fill={colors.paper} opacity={0.35} />
        {/* the near range in rock, the highest summit a little right of the middle */}
        <Path d="M0 50 L0 38 L6 35 L10 36 L16 30 L20 31 L26 24 L29 26 L33 20 L36 23 L39 21 L44 29 L48 27 L54 33 L60 30 L64 32 L70 22 L73 25 L77 14 L80 18 L83 16 L87 24 L92 22 L97 29 L103 27 L110 33 L116 31 L120 34 L120 50 Z" fill={colors.ink} />
        {/* snow on the summits */}
        <Path d="M30.5 24.5 L33 20 L36 23 L34.6 22.4 L33.2 24 L32 22.6 Z M74.5 19.6 L77 14 L80 18 L83 16 L85.2 20.4 L83 19.4 L81 21 L79.5 19.2 L77.6 21.2 L76 19 Z M68.6 25.2 L70 22 L71.8 24.2 L70.4 23.6 Z M24.7 26.2 L26 24 L27.6 25.4 Z M90.6 23.8 L92 22 L93.6 24.2 L92.2 23.4 Z" fill={colors.paper} />
      </Svg>
    ),
  },
];
const cityLabel = (city: string | null | undefined) => (city ? (LABELS.find((l) => l.match.test(city.trim())) ?? null) : null);

const styles = StyleSheet.create({
  disc: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  label: { backgroundColor: colors.spot, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  landscape: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  labelText: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.4, color: colors.paper },
  cityText: { fontFamily: fonts.jet, fontSize: 8.5, letterSpacing: 1.4, color: colors.paper },
  cover: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#1f1d1a', alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: fonts.logo, fontSize: 120, color: colors.ink2 },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' },
  who: { position: 'absolute', left: 16, right: 16, bottom: 14 },
  name: { fontFamily: fonts.logo, fontSize: 46, lineHeight: 44, letterSpacing: -1, color: colors.paper },
  meta: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.4, color: colors.mute, marginTop: 10 },
  corner: { position: 'absolute', top: 12, right: 12 },
});
