import { useMemo } from 'react';
import { SvgXml } from 'react-native-svg';
import CARDS, { type NightCardData } from '@/content/cardsgen';

type Props = { data: NightCardData; index: number; side?: 'front' | 'back'; width: number };

// sitedeki üreteçle çizilen afterhours kartı. 400×600 oranı.
export default function AfterhoursCard({ data, index, side = 'front', width }: Props) {
  const xml = useMemo(() => (side === 'front' ? CARDS.front(data, index) : CARDS.back(data, index)), [data, index, side]);
  return <SvgXml xml={xml} width={width} height={width * 1.5} />;
}
