import { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Button from '@/components/Button';
import StaffPage, { Choice, Field, Quiet, Said, staffStyles } from '@/components/StaffPage';
import { Panel, Row, Section } from '@/components/Row';
import { addSet, allCities, deleteSet, myDj, saveDj, saveMyDj, setsOf, why, type DjForm, type DjSetRow, type MyDj, type Place } from '@/data/staff';
import { useLang } from '@/i18n';

const SOUNDS = [
  { id: 'house', label: 'house' },
  { id: 'techno', label: 'techno' },
  { id: 'rap', label: 'rap' },
];
const empty: DjForm = { name: '', genre: '', sound: 'house', city: null, bio: '', photo: '' };
const today = () => new Date().toISOString().slice(0, 10);

// /panel/dj: the staff make a dj page. /panel/dj?mine=1: a dj edits their own page
// and lists where they play.
export default function DjPage() {
  const { mine } = useLocalSearchParams<{ mine?: string }>();
  const own = mine === '1';
  const { t } = useLang();
  const [cities, setCities] = useState<Place[]>([]);
  const [f, setF] = useState<DjForm>(empty);
  const [me, setMe] = useState<MyDj | null>(null);
  const [sets, setSets] = useState<DjSetRow[]>([]);
  const [set, setSet] = useState({ venue: '', date: today(), time: '23:00', hours: '4' });
  const [said, setSaid] = useState<{ text: string; bad?: boolean } | null>(null);
  const [setSaidLine, setSetSaid] = useState<{ text: string; bad?: boolean } | null>(null);
  const patch = (p: Partial<DjForm>) => setF((c) => ({ ...c, ...p }));

  const loadSets = useCallback((id: string) => setsOf(id).then(setSets, () => {}), []);
  useEffect(() => {
    allCities().then(setCities, () => {});
    if (!own) return;
    myDj().then((d) => {
      if (!d) return;
      setMe(d);
      setF({ name: d.name, genre: d.genre, sound: d.sound, city: d.city, bio: d.bio, photo: d.photo });
      loadSets(d.id);
    }, () => {});
  }, [own, loadSets]);

  const save = () => {
    setSaid(null);
    (own ? saveMyDj(f) : saveDj(f)).then(
      () => {
        setSaid({ text: t('staff.saved') });
        if (own) myDj().then((d) => d && setMe(d), () => {});
        else setF(empty);
      },
      (e) => setSaid({ text: why(e), bad: true }),
    );
  };
  const add = () => {
    if (!me) return;
    setSetSaid(null);
    addSet({ dj: me.id, venue: set.venue, city: f.city, date: set.date, time: set.time, hours: Number(set.hours.replace(',', '.')) || 3 }).then(
      () => {
        setSet((s) => ({ ...s, venue: '' }));
        loadSets(me.id);
      },
      (e) => setSetSaid({ text: why(e), bad: true }),
    );
  };
  const drop = (id: string) =>
    Alert.alert(t('staff.delete'), t('staff.delete.sure'), [
      { text: t('staff.delete.keep'), style: 'cancel' },
      { text: t('staff.delete'), style: 'destructive', onPress: () => deleteSet(id).then(() => me && loadSets(me.id), () => {}) },
    ]);

  return (
    <StaffPage title={own ? t('staff.mydj') : t('staff.dj.new')}>
      <Field label={t('staff.f.name')} value={f.name} onChangeText={(name) => patch({ name })} maxLength={60} autoCapitalize="words" />
      <Field label={t('staff.f.genre')} value={f.genre} onChangeText={(genre) => patch({ genre })} maxLength={60} />
      <Choice label={t('staff.f.sound')} value={f.sound} options={SOUNDS} onSelect={(s) => patch({ sound: s as DjForm['sound'] })} />
      <Choice label={t('staff.f.city')} value={f.city} options={cities.map((c) => ({ id: c.slug, label: c.name.toLowerCase() }))} onSelect={(city) => patch({ city })} />
      <Field label={t('staff.f.bio')} value={f.bio} onChangeText={(bio) => patch({ bio })} maxLength={600} multiline autoCapitalize="sentences" />
      <Field label={t('staff.f.photo')} value={f.photo} onChangeText={(photo) => patch({ photo })} keyboardType="url" />
      <Said text={said?.text ?? null} bad={said?.bad} />
      <View style={staffStyles.save}>
        <Button label={t('staff.save')} onPress={save} />
        {own && me ? <Button kind="line" label={t('staff.mydj.open')} onPress={() => router.push(`/dj/${me.slug}`)} /> : null}
      </View>

      {own && me ? (
        <>
          <Section title={t('staff.sets')} />
          {sets.length ? (
            <Panel>
              {sets.map((s) => (
                <Row key={s.id} label={s.venue} hint={`${s.starts_at.slice(0, 16).replace('T', ' ')} · ${s.hours}h`} onPress={() => drop(s.id)} />
              ))}
            </Panel>
          ) : (
            <Quiet text={t('staff.sets.none')} />
          )}
          <Field label={t('staff.set.venue')} value={set.venue} onChangeText={(venue) => setSet((s) => ({ ...s, venue }))} maxLength={80} autoCapitalize="words" />
          <Field label={t('staff.f.date')} value={set.date} onChangeText={(date) => setSet((s) => ({ ...s, date }))} maxLength={10} keyboardType="numbers-and-punctuation" />
          <Field label={t('staff.f.time')} value={set.time} onChangeText={(time) => setSet((s) => ({ ...s, time }))} maxLength={5} keyboardType="numbers-and-punctuation" />
          <Field label={t('staff.f.hours')} value={set.hours} onChangeText={(hours) => setSet((s) => ({ ...s, hours }))} maxLength={4} keyboardType="decimal-pad" />
          <Said text={setSaidLine?.text ?? null} bad={setSaidLine?.bad} />
          <View style={staffStyles.save}>
            <Button kind="line" label={t('staff.set.add')} onPress={add} />
          </View>
        </>
      ) : null}
    </StaffPage>
  );
}
