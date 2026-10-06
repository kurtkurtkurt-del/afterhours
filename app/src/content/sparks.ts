import type { ImageSourcePropType } from 'react-native';
import type { Key } from '@/i18n';

// Sparks: nights nobody has organised yet. Swiped right in the spark panel, one
// becomes your event and goes to your friends (backend/sql/27_sparks.sql).
// Photos: Unsplash (Unsplash License), see CREDITS.md. The eight added on 06.10.2026
// borrow photos from the feed and the first three until their own arrive.
export type SparkKind = 'derby' | 'grill' | 'hike' | 'sunrise' | 'breakfast' | 'rooftop' | 'swim' | 'quiz' | 'newplace' | 'camera' | 'festival';
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
  {
    kind: 'sunrise',
    photo: require('../../assets/sparks/hike.jpg'),
    label: 'spark.kind.sunrise',
    title: 'spark.sunrise.title',
    line: 'spark.sunrise.line',
    hour: 5,
    minute: 45,
    places: ['spark.place.hill', 'spark.place.bridge'],
  },
  {
    kind: 'breakfast',
    photo: require('../../assets/feed/f3.jpg'),
    label: 'spark.kind.breakfast',
    title: 'spark.breakfast.title',
    line: 'spark.breakfast.line',
    hour: 7,
    minute: 0,
    places: ['spark.place.cafe', 'spark.place.mine'],
  },
  {
    kind: 'rooftop',
    photo: require('../../assets/feed/r2.jpg'),
    label: 'spark.kind.rooftop',
    title: 'spark.rooftop.title',
    line: 'spark.rooftop.line',
    hour: 19,
    minute: 0,
    places: ['spark.place.firstRoof', 'spark.place.station'],
  },
  {
    kind: 'swim',
    photo: require('../../assets/sparks/grill.jpg'),
    label: 'spark.kind.swim',
    title: 'spark.swim.title',
    line: 'spark.swim.line',
    hour: 22,
    minute: 30,
    places: ['spark.place.lake', 'spark.place.river'],
  },
  {
    kind: 'quiz',
    photo: require('../../assets/feed/f2.jpg'),
    label: 'spark.kind.quiz',
    title: 'spark.quiz.title',
    line: 'spark.quiz.line',
    hour: 20,
    minute: 0,
    places: ['spark.place.quizBar'],
  },
  {
    kind: 'newplace',
    photo: require('../../assets/feed/a2.jpg'),
    label: 'spark.kind.newplace',
    title: 'spark.newplace.title',
    line: 'spark.newplace.line',
    hour: 19,
    minute: 30,
    places: ['spark.place.newPlace'],
  },
  {
    kind: 'camera',
    photo: require('../../assets/feed/h1.jpg'),
    label: 'spark.kind.camera',
    title: 'spark.camera.title',
    line: 'spark.camera.line',
    hour: 21,
    minute: 0,
    places: ['spark.place.mine', 'spark.place.bar2'],
  },
  {
    kind: 'festival',
    photo: require('../../assets/feed/e1.jpg'),
    label: 'spark.kind.festival',
    title: 'spark.festival.title',
    line: 'spark.festival.line',
    hour: 16,
    minute: 0,
    places: ['spark.place.festival'],
  },
];

export const sparkOf = (kind: string) => SPARKS.find((s) => s.kind === kind) ?? SPARKS[0];

// A city's own version of a spark: the same kind and photo, its text and places
// rewritten with real spots there. Munich first; other cities keep the general text.
type Local = Partial<Pick<Spark, 'title' | 'line' | 'places'>>;
const LOCAL: Record<string, Partial<Record<SparkKind, Local>>> = {
  munchen: {
    derby: { line: 'spark.munchen.derby.line', places: ['spark.place.mine', 'spark.munchen.place.augustinerKeller'] },
    grill: { title: 'spark.munchen.grill.title', line: 'spark.munchen.grill.line', places: ['spark.munchen.place.flaucher', 'spark.munchen.place.wittelsbacher'] },
    hike: { title: 'spark.munchen.hike.title', line: 'spark.munchen.hike.line', places: ['spark.munchen.place.hbf', 'spark.munchen.place.kochel'] },
    sunrise: { title: 'spark.munchen.sunrise.title', line: 'spark.munchen.sunrise.line', places: ['spark.munchen.place.olympiaberg', 'spark.munchen.place.monopteros'] },
    breakfast: { line: 'spark.munchen.breakfast.line', places: ['spark.munchen.place.frischhut', 'spark.munchen.place.viktualienmarkt'] },
    rooftop: { line: 'spark.munchen.rooftop.line', places: ['spark.munchen.place.vorhoelzer', 'spark.munchen.place.werksviertel'] },
    swim: { line: 'spark.munchen.swim.line', places: ['spark.munchen.place.feringasee', 'spark.munchen.place.langwieder'] },
    quiz: { line: 'spark.munchen.quiz.line', places: ['spark.munchen.place.kilians'] },
    newplace: { line: 'spark.munchen.newplace.line', places: ['spark.munchen.place.glockenbach', 'spark.munchen.place.maxvorstadt'] },
    camera: { line: 'spark.munchen.camera.line', places: ['spark.munchen.place.gaertnerplatz', 'spark.place.mine'] },
    festival: { line: 'spark.munchen.festival.line', places: ['spark.munchen.place.japanfest', 'spark.munchen.place.auerDult', 'spark.munchen.place.tollwood'] },
  },
};
export const sparkIn = (spark: Spark, city: string | null | undefined): Spark => ({ ...spark, ...LOCAL[city ?? '']?.[spark.kind] });

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
