import type { ImageSourcePropType } from 'react-native';
import type { Key } from '@/i18n';

// Sparks: nights nobody has organised yet. Swiped right in the spark panel, one
// becomes your event and goes to your friends (backend/sql/27_sparks.sql).
// Photos: Unsplash (Unsplash License), see CREDITS.md.
export type SparkKind = 'derby' | 'grill' | 'hike';
export type Spark = {
  kind: SparkKind;
  photo: ImageSourcePropType;
  label: Key;     // the kind, where a ticket card says "konzert"
  title: Key;
  line: Key;
  hour: number;   // suggested start, local time
  minute: number;
  places: Key[];  // first one is the suggestion on the card
};

export const SPARKS: Spark[] = [
  {
    kind: 'derby',
    photo: require('../../assets/sparks/derby.jpg'),
    label: 'spark.kind.derby',
    title: 'spark.derby.title',
    line: 'spark.derby.line',
    hour: 18,
    minute: 30,
    places: ['spark.place.mine', 'spark.place.bar'],
  },
  {
    kind: 'grill',
    photo: require('../../assets/sparks/grill.jpg'),
    label: 'spark.kind.grill',
    title: 'spark.grill.title',
    line: 'spark.grill.line',
    hour: 17,
    minute: 0,
    places: ['spark.place.river', 'spark.place.park', 'spark.place.mine'],
  },
  {
    kind: 'hike',
    photo: require('../../assets/sparks/hike.jpg'),
    label: 'spark.kind.hike',
    title: 'spark.hike.title',
    line: 'spark.hike.line',
    hour: 8,
    minute: 30,
    places: ['spark.place.station', 'spark.place.trailhead'],
  },
];

export const sparkOf = (kind: string) => SPARKS.find((s) => s.kind === kind) ?? SPARKS[0];

// Start times to choose from: the spark's hour on the next four days (today only
// while it is still an hour away). The first one is the suggestion on the card.
export function sparkTimes(spark: Spark, now = new Date()): Date[] {
  const out: Date[] = [];
  for (let d = 0; out.length < 4 && d < 6; d++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, spark.hour, spark.minute);
    if (at.getTime() - now.getTime() > 60 * 60 * 1000) out.push(at);
  }
  return out;
}
