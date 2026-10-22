import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { colors, fonts } from '@/theme/tokens';

// The logo since 22.10.2026, design 11F "the shared stub" (owner's pick in Claude Design):
// a ticket torn in two — two hands, two halves, one night. The left half in the colour of
// the words (paper on the dark ground, ink on the light), the right half red; each keeps
// its notch on its outer edge. Beside it "afterhours." in the logo face, the dot in the
// colour of the words. The same shapes are drawn into the app icon by tools/build-icons.py.

// One half, 32 × 40 (taller than wide), its notch on the left; the right half is the mirror.
export const HALF = 'M3 0 H29 Q32 0 32 3 V37 Q32 40 29 40 H3 Q0 40 0 37 V25 A5 5 0 0 0 0 15 V3 Q0 0 3 0 Z';
export const MIRROR = 'M3 0 H29 Q32 0 32 3 V15 A5 5 0 0 0 32 25 V37 Q32 40 29 40 H3 Q0 40 0 37 V3 Q0 0 3 0 Z';
// Where the halves sit in the mark's 84 × 56 box (the icon builder uses the same numbers).
export const PLACE = { left: { x: 5, y: 9, rot: -8 }, right: { x: 44, y: 6, rot: 7, scale: 1.04 } };

export function StubMark({ height, left = colors.paper, right = colors.spot }: { height: number; left?: string; right?: string }) {
  return (
    <Svg width={height * (84 / 56)} height={height} viewBox="0 0 84 56" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <G transform={`translate(${PLACE.left.x} ${PLACE.left.y}) rotate(${PLACE.left.rot} 16 20)`}>
        <Path d={HALF} fill={left} />
      </G>
      <G transform={`translate(${PLACE.right.x} ${PLACE.right.y}) rotate(${PLACE.right.rot} 16 20) scale(${PLACE.right.scale})`}>
        <Path d={MIRROR} fill={right} />
      </G>
    </Svg>
  );
}

// The mark and the name together. size: the letters' font size.
export default function Logo({ size, color = colors.paper, style, textStyle }: { size: number; color?: string; style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle> }) {
  return (
    <View style={[styles.row, { gap: size * 0.32 }, style]} accessibilityRole="header" accessibilityLabel="afterhours">
      <StubMark height={size * 0.84} left={color} />
      <Text style={[styles.word, { fontSize: size, color }, textStyle]}>afterhours.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  word: { fontFamily: fonts.logo, letterSpacing: -0.5 },
});
