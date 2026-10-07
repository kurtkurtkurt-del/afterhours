import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Button from '@/components/Button';
import StaffPage, { Choice, Field, Said, staffStyles } from '@/components/StaffPage';
import { allCities, saveVenue, why, type Place } from '@/data/staff';
import { useLang } from '@/i18n';

// A new room. With a point it gets a pin on the map; without, only the city.
export default function VenueForm() {
  const { t } = useLang();
  const [cities, setCities] = useState<Place[]>([]);
  const [city, setCity] = useState('');
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [said, setSaid] = useState<{ text: string; bad?: boolean } | null>(null);
  useEffect(() => {
    allCities().then(setCities, () => {});
  }, []);
  const num = (s: string) => (s.trim() ? Number(s.replace(',', '.')) : null);
  const save = () =>
    saveVenue({ id: null, city, name, lat: num(lat), lng: num(lng) }).then(
      () => {
        setSaid({ text: t('staff.saved') });
        setName('');
        setLat('');
        setLng('');
      },
      (e) => setSaid({ text: why(e), bad: true }),
    );
  return (
    <StaffPage title={t('staff.venue.new')}>
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
