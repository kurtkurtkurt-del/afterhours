import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, radius, scrim } from '@/theme/tokens';
import { RECORDS } from '@/content/records';

type Props = {
  width: number; // the whole sleeve, cover and record
  photo: string | null;
  name: string;
  meta: string;
  disc: string; // the words on the red label
  city?: string | null; // slug or name; a city with a record of its own (content/records.ts) shows it
  empty?: ReactNode; // shown on the cover without a photo (default: the initial)
  corner?: ReactNode; // over the cover, bottom right (e.g. "change")
  onPress?: () => void;
  onPhotoError?: () => void;
  a11y?: string;
};

// A profile as a record sleeve: the photo is a square cover with the name on it,
// the record slides out behind it on the right, far enough that most of its label
// shows. Munich has a label of its own (the Alps under "MÜNCHEN"); elsewhere the label
// is red and carries the words given in disc.
export default function Sleeve({ width, photo, name, meta, disc, city, empty, corner, onPress, onPhotoError, a11y }: Props) {
  const cover = Math.round(width * 0.66);
  const d = Math.round(cover * 0.92);
  const label = d * 0.42;
  const own = recordFor(city);
  return (
    <View style={{ height: cover }}>
      {/* The record reaches 10 px into the page margin on the right. */}
      <View style={[styles.disc, { width: d, height: d, left: width - d + 10, top: (cover - d) / 2 }]}>
        {/* A real-looking record, drawn ahead of time (tools/build-record.py): grooves,
            the light lying across them, the run-out, a hole the page shows through. */}
        <Image source={own ?? RECORD} style={StyleSheet.absoluteFill} contentFit="contain" />
        {own ? null : (
          // The cover hides the left edge of the label: the words sit a little right.
          <View style={[styles.label, { width: label, height: label, borderRadius: label / 2, paddingLeft: label * 0.16 }]}>
            <Text style={styles.labelText} numberOfLines={1}>
              {disc}
            </Text>
          </View>
        )}
      </View>
      <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'imagebutton' : undefined} accessibilityLabel={a11y} style={[styles.cover, { width: cover, height: cover }]}>
        {photo ? (
          <Image key={photo} source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" onError={onPhotoError} />
        ) : (
          (empty ?? <Text style={styles.initial}>{name.charAt(0)}</Text>)
        )}
        {/* the dark scrim only over a real photo; an empty cover keeps the ground's own words */}
        {photo ? <LinearGradient colors={[scrim(0.0), scrim(0.9)]} style={styles.shade} pointerEvents="none" /> : null}
        <View style={styles.who} pointerEvents="none">
          <Text style={[styles.name, !photo && styles.nameBare]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>
            {name.replace(' ', '\n')}
          </Text>
          <Text style={[styles.meta, !photo && styles.metaBare]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
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

// Every city the app serves has a record of its own (tools/build-record.py → content/records.ts):
// its skyline or landscape under its name on the label, in the frame of Munich's "föhn"
// (22.10.2026). Looked up by slug, or by name made into a slug; a city without one gets the
// red label with the words.
const RECORD = require('../../assets/record/record.webp');
const ALIAS: Record<string, string> = { munich: 'munchen', münih: 'munchen', vienna: 'wien', rome: 'roma', milan: 'milano', lisbon: 'lisboa', prague: 'praha', warsaw: 'warszawa', copenhagen: 'kobenhavn', athens: 'athina', brussels: 'brussel', bruxelles: 'brussel', antwerp: 'antwerpen', cologne: 'koln', geneve: 'geneva', genf: 'geneva', zurich: 'zurich', turin: 'torino', seville: 'sevilla', gothenburg: 'goteborg', 'mexico-city': 'ciudad-de-mexico' };
const slugOf = (city: string) =>
  city
    .trim()
    .toLowerCase()
    .replace(/ı/g, 'i').replace(/ł/g, 'l').replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
export function recordFor(city: string | null | undefined): number | null {
  if (!city) return null;
  const slug = slugOf(city);
  return RECORDS[slug] ?? RECORDS[ALIAS[slug] ?? ''] ?? null;
}

const styles = StyleSheet.create({
  disc: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  label: { backgroundColor: colors.spot, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  labelText: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.4, color: colors.onSpot },
  cover: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.sleeve, alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: fonts.logo, fontSize: 120, color: colors.ink2 },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' },
  who: { position: 'absolute', left: 16, right: 16, bottom: 14 },
  name: { fontFamily: fonts.logo, fontSize: 46, lineHeight: 44, letterSpacing: -1, color: colors.onPhoto },
  meta: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.4, color: colors.onPhotoMute, marginTop: 10 },
  nameBare: { color: colors.paper },
  metaBare: { color: colors.mute },
  corner: { position: 'absolute', top: 12, right: 12 },
});
