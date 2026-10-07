import { useEffect, useMemo, useRef, useState } from 'react';
import Tips from '@/components/Tips';
import { KeyboardAvoidingView, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import Input from '@/components/Input';
import PullDownScroll from '@/components/PullDownScroll';
import SoundCorner from '@/components/SoundCorner';
import { useAuth } from '@/auth/AuthContext';
import { sparkIn, sparkOf, sparkTimes, type Spark } from '@/content/sparks';
import { sparkHint, type SparkHint } from '@/data/sparkHints';
import { useHere } from '@/data/here';
import * as Location from 'expo-location';
import { sparkAnswer, sparkAudience, sparkCancel, sparkCreate, sparkGet, sparkPeople, SparksNotReady, type Audience, type Reach, type SeenSpark, type SparkPerson } from '@/data/sparks';
import { upperData, useLang, type Key } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

const DAYS: Key[] = ['day.sun', 'day.mon', 'day.tue', 'day.wed', 'day.thu', 'day.fri', 'day.sat'];
const two = (n: number) => String(n).padStart(2, '0');

// A spark's page: the night page's layout, but the night does not exist yet.
// "create it" sits right under the photo and works with one press: the name, the
// time, the place and the friends are all suggested already; below them each can
// be changed. Who gets it is a wave, not a list: 1st your friends, 2nd their friends
// too, 3rd one step further; everyone inside finds it in their spark panel.
// Opened with ?invite=<id>, it is someone else's spark: in / out instead.
export default function SparkScreen() {
  const { kind, invite: inviteId } = useLocalSearchParams<{ kind: string; invite?: string }>();
  // The city's own version when it has one (Munich: real places).
  const spark = sparkIn(sparkOf(kind), useHere().city);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t } = useLang();

  // "today · 18:30", "tomorrow · 18:30", "sat 11.10 · 18:30"
  const whenText = (at: Date) => {
    const now = new Date();
    const days = Math.round((new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
    const day = days === 0 ? t('spark.today') : days === 1 ? t('when.tomorrow') : `${t(DAYS[at.getDay()])} ${two(at.getDate())}.${two(at.getMonth() + 1)}`;
    return `${day} · ${two(at.getHours())}:${two(at.getMinutes())}`;
  };

  const band = (
    <View style={styles.band}>
      <BackButton />
      <SoundCorner />
    </View>
  );
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <PullDownScroll header={band} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {inviteId ? (
            <InviteBody spark={spark} id={inviteId} width={width} whenText={whenText} />
          ) : (
            <CreateBody spark={spark} width={width} whenText={whenText} />
          )}
        </PullDownScroll>
      </KeyboardAvoidingView>
      <Tips page="spark" tips={[{ title: 'tips.spark.1.t', body: 'tips.spark.1.b', motion: 'tap' }, { title: 'tips.spark.2.t', body: 'tips.spark.2.b' }]} bottom={insets.bottom + 84} />
    </View>
  );
}

function Hero({ spark, title, width }: { spark: Spark; title: string; width: number }) {
  const { t, up } = useLang();
  return (
    <View style={[styles.hero, { height: width * 1.1 }]}>
      <Image source={spark.photo} style={styles.heroPhoto} contentFit="cover" />
      <View style={styles.heroShade} />
      <View style={styles.heroText}>
        <Text style={styles.mono}>{up(t(spark.label))} · {upperData('spark')}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.mono}>{up(t('spark.kicker'))}</Text>
      </View>
    </View>
  );
}

function CreateBody({ spark, width, whenText }: { spark: Spark; width: number; whenText: (at: Date) => string }) {
  const { session } = useAuth();
  const { t, tn, up } = useLang();
  const here = useHere();
  // The real next match, or the days the forecast likes; the plain hours until then.
  const [hint, setHint] = useState<SparkHint | null>(null);
  const titled = useRef(false);
  const [title, setTitle] = useState(() => t(spark.title).replace(/\.$/, ''));
  const [when, setWhen] = useState(0);
  useEffect(() => {
    let live = true;
    sparkHint(spark, here.city, here.coords).then((h) => {
      if (!live) return;
      setHint(h);
      setWhen(0);
      // the derby takes the match as its name, unless you already wrote one
      if (h?.title && !titled.current) setTitle(h.title);
    });
    return () => {
      live = false;
    };
  }, [spark, here.city, here.coords]);
  const plain = useMemo(() => sparkTimes(spark), [spark]);
  const times = hint?.times.length ? hint.times : plain;
  const noteOf = (i: number) => {
    const n = hint?.notes[i];
    if (!n) return null;
    if ('match' in n) return n.match;
    return `${n.tmax}° · ${n.rain <= 20 ? t('spark.dry') : t('spark.rain', { n: n.rain })}`;
  };
  const [place, setPlace] = useState(() => t(spark.places[0]));
  const [reach, setReach] = useState<Reach>(1);
  const [audience, setAudience] = useState<Audience | null>(null);
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [note, setNote] = useState<string | null>(null);

  // How many people each wave holds, written beside it.
  useEffect(() => {
    if (!session) return;
    let live = true;
    sparkAudience().then((a) => live && setAudience(a));
    return () => {
      live = false;
    };
  }, [session]);

  const create = () => {
    if (state !== 'idle') return;
    if (!session || session.user.is_anonymous) {
      router.push('/signup'); // invites belong to an account
      return;
    }
    setState('sending');
    setNote(null);
    spotNow()
      .then((spot) => sparkCreate(spark.kind, title.trim() || t(spark.title), times[when], place, reach, spot))
      .then(() => {
        setState('sent');
        setNote(t('spark.sent'));
        setTimeout(() => router.back(), 1400);
      })
      .catch((e) => {
        setState('idle');
        setNote(e instanceof SparksNotReady ? t('spark.notReady') : String(e?.message ?? e).toLowerCase());
      });
  };

  const waves: { reach: Reach; label: string; count: number | undefined }[] = [
    { reach: 1, label: t('spark.wave1'), count: audience?.wave1 },
    { reach: 2, label: t('deck.wave2.deck'), count: audience?.wave2 },
    { reach: 3, label: t('deck.wave3.deck'), count: audience?.wave3 },
  ];
  const reached = waves[reach - 1].count;
  const label = state === 'idle' ? t('spark.createIt') : state === 'sending' ? t('spark.sending') : '✓';

  return (
    <>
      <Hero spark={spark} title={title.toLowerCase() || t(spark.title)} width={width} />
      <View style={styles.body}>
        <Button label={label} onPress={create} />
        {note ? <Text style={[styles.mono, state === 'sent' && styles.ok]}>{up(note)}</Text> : null}
        {!session || session.user.is_anonymous ? <Text style={styles.mono}>{up(t('spark.signIn'))}</Text> : null}

        <Text style={styles.text}>{t(spark.line)}</Text>

        <Text style={styles.mono}>{up(t('spark.change'))}</Text>
        <View style={styles.rows}>
          <View style={styles.field}>
            <Text style={styles.rowK}>{t('spark.name')}</Text>
            <Input value={title} onChangeText={(v) => { titled.current = true; setTitle(v); }} maxLength={80} />
          </View>
          <View style={styles.field}>
            <Text style={styles.rowK}>{t('spark.when')}</Text>
            <View style={styles.chips}>
              {times.map((at, i) => (
                <Chip key={at.toISOString()} label={whenText(at)} on={i === when} onPress={() => setWhen(i)} />
              ))}
            </View>
            {noteOf(when) ? <Text style={styles.small}>{noteOf(when)}</Text> : null}
          </View>
          <View style={styles.field}>
            <Text style={styles.rowK}>{t('spark.where')}</Text>
            <Input value={place} onChangeText={setPlace} maxLength={80} />
            <View style={styles.chips}>
              {spark.places.map((k) => (
                <Chip key={k} label={t(k)} on={place === t(k)} onPress={() => setPlace(t(k))} />
              ))}
            </View>
          </View>
          {session && !session.user.is_anonymous ? (
            <View style={styles.field}>
              <Text style={styles.rowK}>{t('spark.waveNote')}</Text>
              {waves.map((w) => {
                const on = w.reach === reach;
                return (
                  <Pressable key={w.reach} onPress={() => setReach(w.reach)} style={({ pressed }) => [styles.wave, on && styles.waveOn, pressed && styles.pressed]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                    <View style={[styles.waveDot, on && styles.waveDotOn]} />
                    <Text style={[styles.waveText, on && styles.waveTextOn]} numberOfLines={1}>{w.label}</Text>
                    {w.count !== undefined ? <Text style={[styles.waveCount, on && styles.waveTextOn]}>{tn('spark.people', w.count, { n: w.count })}</Text> : null}
                  </Pressable>
                );
              })}
              {reached === 0 ? <Text style={styles.small}>{t('spark.emptyWave')}</Text> : null}
            </View>
          ) : null}
        </View>
      </View>
    </>
  );
}

// Where you are now, for the map: the last known position if it is fresh, otherwise a
// quick fix (6 s at most). No permission or no fix: the spark has no spot.
async function spotNow(): Promise<[number, number] | null> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted) return null;
    const last = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60_000 }).catch(() => null);
    const pos =
      last ??
      (await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null),
        new Promise<null>((ok) => setTimeout(() => ok(null), 6000)),
      ]));
    return pos ? [pos.coords.latitude, pos.coords.longitude] : null;
  } catch {
    return null;
  }
}

// Someone's spark (from your spark deck or the map), or your own: read as it is now.
function InviteBody({ spark, id, width, whenText }: { spark: Spark; id: string; width: number; whenText: (at: Date) => string }) {
  const { t, up } = useLang();
  const [invite, setInvite] = useState<SeenSpark | null | undefined>(undefined);
  const [answer, setAnswer] = useState<'in' | 'out' | null>(null);
  const [note, setNote] = useState<string | null>(null);
  // Who answered: the host sees in and out, someone who is in sees the others in.
  const [people, setPeople] = useState<SparkPerson[]>([]);
  const [calling, setCalling] = useState(false);

  useEffect(() => {
    let live = true;
    sparkPeople(id).then((list) => live && setPeople(list));
    sparkGet(id)
      .then((one) => live && setInvite(one))
      .catch(() => live && setInvite(null));
    return () => {
      live = false;
    };
  }, [id]);

  const say = (a: 'in' | 'out') => {
    setAnswer(a);
    setNote(null);
    sparkAnswer(id, a)
      .then(() => setTimeout(() => router.back(), 1100))
      .catch((e) => {
        setAnswer(null);
        setNote(String(e?.message ?? e).toLowerCase());
      });
  };

  if (invite === undefined) return <Hero spark={spark} title={t(spark.title)} width={width} />;
  if (invite === null) {
    return (
      <>
        <Hero spark={spark} title={t(spark.title)} width={width} />
        <View style={styles.body}>
          <Text style={styles.mono}>{up(t('spark.gone'))}</Text>
        </View>
      </>
    );
  }
  const callOff = () => {
    if (!calling) {
      setCalling(true); // a second press confirms
      return;
    }
    sparkCancel(id)
      .then(() => router.back())
      .catch((e) => {
        setCalling(false);
        setNote(String(e?.message ?? e).toLowerCase());
      });
  };
  const ins = people.filter((p) => p.answer === 'in');
  const outs = people.filter((p) => p.answer === 'out');
  const host = invite.mine ? t('deck.you') : (invite.host_name ?? invite.host_handle ?? '').toLowerCase();
  const said = answer ?? (invite.my_answer === 'in' || invite.my_answer === 'out' ? invite.my_answer : null);
  return (
    <>
      <Hero spark={spark} title={invite.title.toLowerCase()} width={width} />
      <View style={styles.body}>
        {invite.mine ? null : (
          <View style={styles.actions}>
            <View style={{ flex: 1 }}>
              <Button label={said === 'in' ? t('spark.answered.in') : t('spark.in')} kind={said === 'out' ? 'line' : 'fill'} onPress={() => say('in')} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={said === 'out' ? t('spark.answered.out') : t('spark.out')} kind={said === 'out' ? 'fill' : 'line'} onPress={() => say('out')} />
            </View>
          </View>
        )}
        {note ? <Text style={styles.mono}>{upperData(note)}</Text> : null}
        <View style={styles.rows}>
          <Row k={t('spark.host')} v={host} />
          {invite.wave ? <Row k={t('spark.wave')} v={t(invite.wave === 1 ? 'spark.wave1.short' : invite.wave === 2 ? 'deck.wave2' : 'deck.wave3')} /> : null}
          <Row k={t('spark.when')} v={whenText(new Date(invite.starts_at))} />
          <Row k={t('spark.where')} v={invite.place ?? '—'} />
          <Row k={t('spark.who')} v={t('spark.going', { n: invite.going })} />
          {ins.length ? <Row k={t('spark.in.names')} v={ins.map((p) => (p.me ? t('deck.you') : p.name.toLowerCase())).join(', ')} /> : null}
          {invite.mine && outs.length ? <Row k={t('spark.out.names')} v={outs.map((p) => p.name.toLowerCase()).join(', ')} /> : null}
        </View>
        {invite.mine ? <Button label={calling ? t('spark.callOff.sure') : t('spark.callOff')} kind="line" onPress={callOff} /> : null}
      </View>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowK}>{k}</Text>
      <Text style={styles.rowV}>{v}</Text>
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.pressed]}>
      <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 36, zIndex: 2 },
  hero: { backgroundColor: colors.ink2, overflow: 'hidden', borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  heroPhoto: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  heroShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 170, backgroundColor: colors.ink, opacity: 0.78 },
  heroText: { position: 'absolute', left: brand.left, right: brand.left, bottom: 18, gap: 6 },
  title: { fontFamily: fonts.medium, fontSize: 34, lineHeight: 36, letterSpacing: -1.1, color: colors.paper },
  mono: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.mute },
  ok: { color: colors.spotText },
  body: { paddingHorizontal: brand.left, paddingTop: 18, gap: 22 },
  actions: { flexDirection: 'row', gap: 10 },
  text: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.paper2, opacity: 0.9 },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.mute },
  rows: { borderTopWidth: 1, borderTopColor: colors.ink3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.ink3 },
  field: { paddingVertical: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.ink3 },
  rowK: { fontFamily: fonts.regular, fontSize: 13, color: colors.mute },
  rowV: { fontFamily: fonts.regular, fontSize: 13, color: colors.paper2, flex: 1, textAlign: 'right' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 34, paddingHorizontal: 13, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.ink3, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.paper, borderColor: colors.paper },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.mute },
  chipTextOn: { color: colors.ink },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 46, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.ink3 },
  waveOn: { borderColor: colors.paper, backgroundColor: 'rgba(243,241,236,0.06)' },
  waveDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: colors.mute },
  waveDotOn: { backgroundColor: colors.spot, borderColor: colors.spot },
  waveText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.mute },
  waveTextOn: { color: colors.paper },
  waveCount: { fontFamily: fonts.jet, fontSize: 11, letterSpacing: 0.6, color: colors.mute },
  pressed: { opacity: 0.6 },
});
