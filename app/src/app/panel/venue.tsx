import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Button from '@/components/Button';
import StaffPage, { Choice, Field, Said, staffStyles } from '@/components/StaffPage';
import { router, useLocalSearchParams } from 'expo-router';
import { allCities, saveVenue, why, type Place } from '@/data/staff';
import { myVenues } from '@/data/venues';
import { useLang } from '@/i18n';

// A new room, or ?id= to edit one you run (97). With a point it gets a pin on the map;
// without, only the city.
export default function VenueForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t } = useLang();
  const [cities, setCities] = useState<Place[]>([]);
  const [city, setCity] = useState('');
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [said, setSaid] = useState<{ text: string; bad?: boolean } | null>(null);
  useEffect(() => {
    allCities().then(setCities, () => {});
    if (!id) return;
    myVenues().then((l) => {
      const v = l.find((r) => r.id === id);
      if (!v) return;
      setCity(v.city_slug);
      setName(v.name);
      setLat(v.lat === null ? '' : String(v.lat));
      setLng(v.lng === null ? '' : String(v.lng));
    }, () => {});
  }, [id]);
  const num = (s: string) => (s.trim() ? Number(s.replace(',', '.')) : null);
  const save = () =>
    saveVenue({ id: id ?? null, city, name, lat: num(lat), lng: num(lng) }).then(
      () => {
        setSaid({ text: t('staff.saved') });
        if (id) return router.back();
        setName('');
        setLat('');
        setLng('');
      },
      (e) => setSaid({ text: why(e), bad: true }),
    );
  return (
    <StaffPage title={id ? t('desk.edit') : t('staff.venue.new')}>
      <Choice label={t('staff.f.city')} value={city || null} options={cities.map((c) => ({ id: c.slug, label: c.name.toLowerCase() }))} onSelect={setCity} />
      <Field label={t('staff.f.name')} value={name} onChangeText={setName} maxLength={80} autoCapitalize="words" />
      <Field label={t('staff.f.lat')} value={lat} onChangeText={setLat} keyboardType="numbers-and-punctuation" />
      <Field label={t('staff.f.lng')} value={lng} onChangeText={setLng} keyboardType="numbers-and-punctuation" />
      <Said text={said?.text ?? null} bad={said?.bad} />
      <View style={staffStyles.save}>
        <Button label={t('staff.save')} onPress={save} />
      </View>
    </StaffPage>
  );
}
