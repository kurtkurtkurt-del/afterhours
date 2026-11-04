import { useMemo } from 'react';
import { SvgXml } from 'react-native-svg';
import CARDS, { type NightCardData } from '@/content/cardsgen';
import { fonts } from '@/theme/tokens';

type Props = { data: NightCardData; index: number | string; width: number };

// The generator writes web font names; here the loaded font families take their place.
CARDS.setFonts({ regular: fonts.regular, medium: fonts.medium, mono: fonts.jet });

// An afterhours card drawn by the shared generator (content/cardsgen.js), 400×600. One face only.
export default function AfterhoursCard({ data, index, width }: Props) {
  const xml = useMemo(() => CARDS.front(data, index), [data, index]);
  return <SvgXml xml={xml} width={width} height={width * 1.5} />;
}
