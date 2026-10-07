import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { File } from 'expo-file-system';
import PickerSheet from '@/components/PickerSheet';
import { useAuth } from '@/auth/AuthContext';
import { pickPostPhoto } from '@/data/posts';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme/tokens';
import { router, useLocalSearchParams } from 'expo-router';
import Button from '@/components/Button';
import StaffPage, { Choice, Field, Quiet, Said, staffStyles } from '@/components/StaffPage';
import { Panel, Row, Section, Switch, Value } from '@/components/Row';
import { useEventTypes } from '@/data/types';
import { allCities, deleteNight, isStaff, mySubmissions, saveNight, staffNights, submitNight, useRole, venuesIn, why, type Place, type Submission, type Venue } from '@/data/staff';
import { useLang } from '@/i18n';

const today = () => new Date().toISOString().slice(0, 10);

// A ticketed night: the staff make it (new, or ?id= to edit one made here);
// anyone else sends it in and the staff let it through (43_event_submit.sql).
// The + on the flow opens this page for both.
export default function NightForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t } = useLang();
  const role = useRole();
  const staff = isStaff(role);
  const [mine, setMine] = useState<Submission[]>([]);
  const types = useEventTypes();
  const [cities, setCities] = useState<Place[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [f, setF] = useState({ title: '', city: '', type: 'club-night', venue: '', date: today(), time: '23:00', body: '', ticket: '', image: '', published: true });
  const [said, setSaid] = useState<{ text: string; bad?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [venueOpen, setVenueOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const { up } = useLang();
  const { session } = useAuth();
  // The poster photo: picked on the phone, put in your folder of the photos bucket;
  // its public https address is what the night keeps.
  const photo = () => {
    const uid = session?.user.id;
    if (!uid) return;
    setPhotoBusy(true);
    pickPostPhoto()
      .then(async (local) => {
        if (!local) return;
        const path = `${uid}/night-${Date.now()}.jpg`;
        const sent = await supabase.storage.from('photos').upload(path, await new File(local).arrayBuffer(), { contentType: 'image/jpeg', cacheControl: '31536000' });
        if (sent.error) throw sent.error;
        set({ image: supabase.storage.from('photos').getPublicUrl(path).data.publicUrl });
      })
      .catch((e) => setSaid({ text: why(e), bad: true }))
      .finally(() => setPhotoBusy(false));
  };
  const set = (p: Partial<typeof f>) => setF((c) => ({ ...c, ...p }));

  useEffect(() => {
    allCities().then(setCities, () => {});
    if (!staff) mySubmissions().then(setMine, () => {});
    if (!id) return;
    staffNights().then((all) => {
      const n = all.find((x) => x.id === id);
      if (!n) return;
      // starts_at holds the local time as written (see 42_staff.sql), read it back as such.
      const iso = n.starts_at.replace(' ', 'T');
      setF({ title: n.title, city: n.city_slug, type: n.type_slug, venue: n.venue_id ?? '', date: iso.slice(0, 10), time: iso.slice(11, 16), body: n.body, ticket: n.ticket_url ?? '', image: n.image_url ?? '', published: n.review === 'pending' ? false : n.is_published });
    }, () => {});
  }, [id, staff]);
  useEffect(() => {
    if (f.city) venuesIn(f.city).then(setVenues, () => setVenues([]));
  }, [f.city]);

  const save = () => {
    setBusy(true);
    setSaid(null);
    const sent = staff ? saveNight({ id: id ?? null, ...f, venue: f.venue || null }) : submitNight({ ...f, venue: f.venue || null });
    sent
      .then(() => {
        if (staff) {
          setSaid({ text: t('staff.saved') });
          if (!id) router.replace('/panel/nights');
          return;
        }
        setSaid({ text: t('submit.sent') });
        set({ title: '', body: '', ticket: '', image: '' });
        mySubmissions().then(setMine, () => {});
      })
      .catch((e) => setSaid({ text: why(e), bad: true }))
      .finally(() => setBusy(false));
  };
  const remove = () =>
    Alert.alert(t('staff.delete'), t('staff.delete.sure'), [
      { text: t('staff.delete.keep'), style: 'cancel' },
      { text: t('staff.delete'), style: 'destructive', onPress: () => id && deleteNight(id).then(() => router.back(), (e) => setSaid({ text: why(e), bad: true })) },
    ]);

  return (
    <StaffPage title={id ? t('staff.night.edit') : t('staff.night.new')}>
      {!staff ? <Quiet text={t('submit.how')} /> : null}
      {/* The poster (design 14E): write straight onto it. */}
      <View style={styles.poster}>
        {f.image ? <Image source={{ uri: f.image }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
        {f.image ? <View style={styles.posterVeil} /> : null}
        <Pressable onPress={photo} style={styles.posterPhoto} accessibilityRole="button">
          <Text style={styles.posterMono}>{up(photoBusy ? '…' : f.image ? t('staff.poster.photo.change') : t('staff.poster.photo'))}</Text>
        </Pressable>
        <View style={styles.posterBottom}>
          <TextInput
            value={f.title}
            onChangeText={(title) => set({ title })}
            placeholder={t('staff.poster.title')}
            placeholderTextColor="rgba(243,241,236,0.35)"
            selectionColor={colors.spot}
            autoCapitalize="characters"
            multiline
            maxLength={120}
            style={styles.posterTitle}
          />
          <View style={styles.posterLine}>
            <TextInput value={f.date} onChangeText={(date) => set({ date })} placeholder="2026-10-11" placeholderTextColor="rgba(243,241,236,0.35)" maxLength={10} keyboardType="numbers-and-punctuation" style={[styles.posterMonoInput, styles.posterDate]} />
            <Text style={styles.posterMonoInput}>—</Text>
            <TextInput value={f.time} onChangeText={(time) => set({ time })} placeholder="23:00" placeholderTextColor="rgba(243,241,236,0.35)" maxLength={5} keyboardType="numbers-and-punctuation" style={[styles.posterMonoInput, styles.posterTime]} />
          </View>
          <Pressable onPress={() => f.city && setVenueOpen(true)} style={styles.posterLine} accessibilityRole="button">
            <Text style={[styles.posterMonoInput, !f.venue && styles.posterEmpty]} numberOfLines={1}>
              {f.venue ? (venues.find((v) => v.id === f.venue)?.name ?? '').toUpperCase() : up(f.city ? t('staff.poster.venue') : t('staff.poster.city.first'))}
            </Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.posterHint}>{t('staff.poster.hint')}</Text>
      <Choice label={t('staff.f.city')} value={f.city || null} options={cities.map((c) => ({ id: c.slug, label: c.name.toLowerCase() }))} onSelect={(city) => set({ city, venue: '' })} />
      <Choice label={t('staff.f.kind')} value={f.type} options={types} onSelect={(type) => set({ type })} />
      <Field label={t('staff.f.body')} value={f.body} onChangeText={(body) => set({ body })} maxLength={2000} multiline autoCapitalize="sentences" />
      <Field label={t('staff.f.ticket')} value={f.ticket} onChangeText={(ticket) => set({ ticket })} keyboardType="url" />
      {staff ? (
        <View style={staffStyles.gap}>
          <Panel>
            <Row label={t('staff.f.published')} hint={t('staff.f.published.hint')} right={<Switch on={f.published} />} onPress={() => set({ published: !f.published })} />
          </Panel>
        </View>
      ) : null}
      <Said text={said?.text ?? null} bad={said?.bad} />
      <View style={staffStyles.save}>
        <Button label={busy ? '…' : t(staff ? 'staff.save' : 'submit.send')} onPress={busy ? undefined : save} />
        {id ? <Button kind="line" label={t('staff.delete')} onPress={remove} /> : null}
      </View>

      {/* What you sent in before, and where each stands. */}
      {!staff && mine.length ? (
        <>
          <Section title={t('submit.mine')} />
          <Panel>
            {mine.map((m) => (
              <Row
                key={m.id}
                label={m.title}
                hint={[m.starts_at.slice(0, 16).replace('T', ' '), m.review === 'rejected' ? m.review_note : null].filter(Boolean).join(' · ')}
                right={<Value text={t(m.review === 'pending' ? 'submit.pending' : m.review === 'rejected' ? 'submit.rejected' : 'submit.live')} more={m.review === null} />}
                onPress={m.review === null ? () => router.push(`/night/${m.slug}`) : undefined}
              />
            ))}
          </Panel>
        </>
      ) : null}
      <PickerSheet
        open={venueOpen}
        title={t('staff.f.venue')}
        options={[{ id: 'none', label: t('staff.f.venue.none') }, ...venues.map((v) => ({ id: v.id, label: v.name }))]}
        selected={f.venue || 'none'}
        onSelect={(v) => set({ venue: v === 'none' ? '' : v })}
        onClose={() => setVenueOpen(false)}
      />
    </StaffPage>
  );
}

const styles = StyleSheet.create({
  poster: { aspectRatio: 3 / 4, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.ink3, justifyContent: 'space-between', padding: 18, marginTop: 4 },
  posterVeil: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(14,13,12,0.45)' },
  posterPhoto: { alignSelf: 'flex-start', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.mute, paddingHorizontal: 10, paddingVertical: 6 },
  posterMono: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.4, color: colors.paper },
  posterBottom: { gap: 8 },
  posterTitle: { fontFamily: fonts.logo, fontSize: 44, lineHeight: 44, color: colors.paper, borderBottomWidth: 1, borderStyle: 'dashed', borderBottomColor: colors.mute, paddingVertical: 0, textTransform: 'uppercase' },
  posterLine: { flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderStyle: 'dashed', borderBottomColor: colors.mute, paddingBottom: 4 },
  posterMonoInput: { fontFamily: fonts.jet, fontSize: 13, letterSpacing: 1.4, color: colors.paper, paddingVertical: 0 },
  posterDate: { minWidth: 110 },
  posterTime: { minWidth: 56 },
  posterEmpty: { color: 'rgba(243,241,236,0.4)' },
  posterHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute, textAlign: 'center', marginTop: 8 },
});
