import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Button from '@/components/Button';
import DayPicker, { fromIso, isoDay, shortDay } from '@/components/DayPicker';
import GroupBadge from '@/components/GroupBadge';
import PickerSheet from '@/components/PickerSheet';
import StaffPage, { Choice, Field, Quiet, Said, staffStyles } from '@/components/StaffPage';
import { Panel, Row, Section, Switch, Value } from '@/components/Row';
import { useAuth } from '@/auth/AuthContext';
import { friendsList, type FriendRow } from '@/data/friends';
import {
  chooseCover,
  GROUP_COLORS,
  GROUP_EMOJI,
  groupAdd,
  groupCreate,
  groupDelete,
  groupGet,
  groupLeave,
  groupLegsSet,
  groupRemove,
  groupSetVisible,
  groupUpdate,
  why,
  type Group,
  type GroupColor,
  type GroupForm,
  type LegForm,
} from '@/data/groups';
import { allCities, type Place } from '@/data/staff';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// Making a group (/groups/new, ?with=<ids> from a suggestion) or changing one
// (?id=…): the look, the deck (city and days), who is in. Friends are added
// directly; anyone else comes in with the link (invite).
export default function GroupEdit() {
  const { id, with: preset } = useLocalSearchParams<{ id?: string; with?: string }>();
  const { t } = useLang();
  const { session } = useAuth();
  const uid = session?.user.id ?? '';
  const [cities, setCities] = useState<Place[]>([]);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [f, setF] = useState<GroupForm>({ name: '', emoji: GROUP_EMOJI[0], color: 'red', kind: 'lasting', city: null, from: null, to: null, legs: [] });
  const [picked, setPicked] = useState<Set<string>>(() => new Set(preset ? preset.split(',') : []));
  const [said, setSaid] = useState<{ text: string; bad?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<GroupForm>) => setF((c) => ({ ...c, ...p }));

  const load = () =>
    id
      ? groupGet(id).then((g) => {
          setGroup(g);
          setF({ name: g.name, emoji: g.emoji, color: g.color, kind: g.kind, city: g.city_slug, from: g.date_from, to: g.date_to, legs: (g.legs ?? []).map((l) => ({ city: l.city, from: l.from, to: l.to })) });
        }, (e) => setSaid({ text: why(e), bad: true }))
      : Promise.resolve();
  useEffect(() => {
    allCities().then(setCities, () => {});
    friendsList().then((l) => setFriends(l.filter((r) => r.status === 'accepted')), () => {});
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const inGroup = new Set(group?.members.map((m) => m.id) ?? []);
  const owner = group?.members.find((m) => m.id === uid)?.role === 'owner';
  const toggle = (who: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(who)) n.delete(who);
      else n.add(who);
      return n;
    });

  const save = async () => {
    setBusy(true);
    setSaid(null);
    try {
      if (id) {
        await groupUpdate(id, f);
        if (f.kind === 'travel') await groupLegsSet(id, f.legs);
        const add = [...picked].filter((x) => !inGroup.has(x));
        if (add.length) await groupAdd(id, add);
        setPicked(new Set());
        await load();
        setSaid({ text: t('staff.saved') });
      } else {
        const made = await groupCreate(f, [...picked]);
        if (f.kind === 'travel' && f.legs.length) await groupLegsSet(made, f.legs);
        router.replace(`/groups/${made}`);
      }
    } catch (e) {
      setSaid({ text: why(e), bad: true });
    } finally {
      setBusy(false);
    }
  };
  const ask = (title: string, body: string, go: () => Promise<unknown>) =>
    Alert.alert(title, body, [
      { text: t('staff.delete.keep'), style: 'cancel' },
      { text: title, style: 'destructive', onPress: () => go().catch((e) => setSaid({ text: why(e), bad: true })) },
    ]);
  const cover = () => {
    if (id && uid)
      chooseCover(id, uid).then(
        (p) => {
          if (p) load();
        },
        (e) => setSaid({ text: why(e), bad: true }),
      );
  };

  if (!id) return <Wizard f={f} set={set} cities={cities} friends={friends} picked={picked} toggle={toggle} said={said} busy={busy} save={save} />;

  return (
    <StaffPage title={id ? t('groups.edit') : t('groups.new')}>
      <View style={styles.face}>
        <GroupBadge emoji={f.emoji} color={f.color} cover={group?.cover_path ?? null} size={96} />
        {id ? (
          <Pressable onPress={cover} hitSlop={8}>
            <Text style={styles.link}>{t('groups.f.cover.set')}</Text>
          </Pressable>
        ) : null}
      </View>
      <Field label={t('groups.f.name')} value={f.name} onChangeText={(name) => set({ name })} placeholder={t('groups.f.name.placeholder')} maxLength={40} autoCapitalize="sentences" />

      <Text style={styles.label}>{t('groups.f.emoji').toUpperCase()}</Text>
      <View style={styles.wrap}>
        {GROUP_EMOJI.map((e) => (
          <Pressable key={e} onPress={() => set({ emoji: e })} style={[styles.emoji, f.emoji === e && styles.on]}>
            <Text style={styles.emojiText}>{e}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>{t('groups.f.color').toUpperCase()}</Text>
      <View style={styles.wrap}>
        {(Object.keys(GROUP_COLORS) as GroupColor[]).map((c) => (
          <Pressable key={c} onPress={() => set({ color: c })} accessibilityLabel={c} style={[styles.swatch, { backgroundColor: GROUP_COLORS[c] }, f.color === c && styles.swatchOn]} />
        ))}
      </View>

      {/* A group is for good (Ahmet, 11.10.2026): no "just once", no last day. Groups made
          "once" before keep their dates in the table; the app no longer offers them. */}
      {f.kind === 'travel' ? (
        <>
          <Text style={styles.label}>{t('groups.step.route').toUpperCase()}</Text>
          <RouteEditor legs={f.legs} cities={cities} onChange={(legs) => set({ legs })} />
        </>
      ) : (
        <Choice
          label={t('groups.f.city')}
          value={f.city ?? '*'}
          options={[{ id: '*', label: t('groups.f.anywhere') }, ...cities.map((c) => ({ id: c.slug, label: c.name.toLowerCase() }))]}
          onSelect={(c) => set({ city: c === '*' ? null : c })}
        />
      )}

      {group ? (
        <>
          <Section title={t('groups.members', { n: group.members.length })} />
          <Panel>
            {group.members.map((m) => (
              <Row
                key={m.id}
                label={(m.name ?? m.handle ?? '—').toLowerCase()}
                hint={[m.handle ? `@${m.handle}` : null, m.role === 'owner' ? t('groups.owner') : null].filter(Boolean).join(' · ')}
                right={owner && m.id !== uid ? <Value text={t('groups.remove')} /> : undefined}
                onPress={owner && m.id !== uid ? () => ask(t('groups.remove'), (m.name ?? '').toLowerCase(), () => groupRemove(group.id, m.id).then(load)) : undefined}
              />
            ))}
          </Panel>
        </>
      ) : null}

      {group && owner ? (
        <View style={styles.gap}>
          <Panel>
            <Row label={t('groups.visible')} hint={t('groups.visible.hint')} right={<Switch on={!!group.visible} />} onPress={() => groupSetVisible(group.id, !group.visible).then(load, (e) => setSaid({ text: why(e), bad: true }))} />
          </Panel>
        </View>
      ) : null}

      <Section title={group ? t('groups.add') : t('groups.f.friends')} />
      {friends.filter((r) => !inGroup.has(r.other_id)).length ? (
        <Panel>
          {friends
            .filter((r) => !inGroup.has(r.other_id))
            .map((r) => (
              <Row
                key={r.other_id}
                label={(r.display_name ?? r.handle ?? '—').toLowerCase()}
                hint={r.handle ? `@${r.handle}` : undefined}
                right={<Switch on={picked.has(r.other_id)} />}
                onPress={() => toggle(r.other_id)}
              />
            ))}
        </Panel>
      ) : (
        <Quiet text={t('groups.f.friends.none')} />
      )}

      <Said text={said?.text ?? null} bad={said?.bad} />
      <View style={staffStyles.save}>
        <Button label={busy ? '…' : id ? t('groups.f.save') : t('groups.f.make')} onPress={busy ? undefined : save} />
        {group ? <Button kind="line" label={t('groups.leave')} onPress={() => ask(t('groups.leave'), t('groups.leave.sure'), () => groupLeave(group.id).then(() => router.replace('/groups')))} /> : null}
        {group && owner ? <Button kind="line" label={t('groups.delete')} onPress={() => ask(t('groups.delete'), t('groups.delete.sure'), () => groupDelete(group.id).then(() => router.replace('/groups')))} /> : null}
      </View>
    </StaffPage>
  );
}

// Making a group, one question per screen (design 4B): how it looks → who is in →
// where and when. The bars on top say where you are; back goes one step back.
function Wizard({ f, set, cities, friends, picked, toggle, said, busy, save }: {
  f: GroupForm;
  set: (p: Partial<GroupForm>) => void;
  cities: Place[];
  friends: FriendRow[];
  picked: Set<string>;
  toggle: (who: string) => void;
  said: { text: string; bad?: boolean } | null;
  busy: boolean;
  save: () => void;
}) {
  const { t, up } = useLang();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const travel = f.kind === 'travel';
  const steps = [t('groups.step.look'), t('groups.step.who'), t(travel ? 'groups.step.route' : 'groups.step.when')];
  const ready = step === 0 ? f.name.trim().length > 0 : step === 2 && travel ? f.legs.length > 0 && f.legs.every((l) => l.city && l.from && l.to) : true;
  const next = () => (step < 2 ? setStep(step + 1) : save());
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.wizTop, { paddingTop: Math.max(insets.top, 20) + 12 }]}>
        <View style={styles.bars}>
          {steps.map((_, i) => (
            <View key={i} style={[styles.bar, i <= step && styles.barOn]} />
          ))}
        </View>
        <Text style={styles.stepMono}>{up(`${step + 1} / 3 · ${steps[step]}`)}</Text>
        <Text style={styles.question}>{t(step === 0 ? 'groups.q.look' : step === 1 ? 'groups.q.who' : travel ? 'groups.q.route' : 'groups.q.when')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.wizBody} keyboardShouldPersistTaps="handled">
        {step === 0 ? (
          <>
            <View style={styles.face}>
              <GroupBadge emoji={f.emoji} color={f.color} cover={null} size={110} />
            </View>
            {/* friends or travel (12.10.2026): a trip gets a route instead of a city */}
            <View style={styles.kinds}>
              {(['lasting', 'travel'] as const).map((k) => {
                const on = (f.kind === 'travel') === (k === 'travel');
                return (
                  <Pressable key={k} onPress={() => set({ kind: k })} accessibilityRole="radio" accessibilityState={{ selected: on }} style={[styles.kindCard, on && styles.kindCardOn]}>
                    <Text style={[styles.kindTitle, on && styles.kindTitleOn]}>{t(k === 'travel' ? 'groups.kind.travel' : 'groups.kind.friends')}</Text>
                    <Text style={[styles.kindHint, on && styles.kindHintOn]}>{t(k === 'travel' ? 'groups.kind.travel.hint' : 'groups.kind.friends.hint')}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Field label={t('groups.f.name')} value={f.name} onChangeText={(name) => set({ name })} placeholder={t('groups.f.name.placeholder')} maxLength={40} autoCapitalize="sentences" />
            <Text style={styles.label}>{up(t('groups.f.emoji'))}</Text>
            <View style={styles.wrap}>
              {GROUP_EMOJI.map((e) => (
                <Pressable key={e} onPress={() => set({ emoji: e })} style={[styles.emoji, f.emoji === e && styles.on]}>
                  <Text style={styles.emojiText}>{e}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>{up(t('groups.f.color'))}</Text>
            <View style={styles.wrap}>
              {(Object.keys(GROUP_COLORS) as GroupColor[]).map((c) => (
                <Pressable key={c} onPress={() => set({ color: c })} accessibilityLabel={c} style={[styles.swatch, { backgroundColor: GROUP_COLORS[c] }, f.color === c && styles.swatchOn]} />
              ))}
            </View>
          </>
        ) : null}
        {step === 1 ? (
          <View style={styles.faces}>
            {friends.map((r) => {
              const on = picked.has(r.other_id);
              const name = (r.display_name ?? r.handle ?? '?').toLowerCase();
              return (
                <Pressable key={r.other_id} onPress={() => toggle(r.other_id)} style={styles.faceCell} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                  <View style={[styles.faceDot, on && styles.faceDotOn]}>
                    <Text style={styles.faceLetter}>{name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.faceName} numberOfLines={1}>{on ? `${name} ✓` : name}</Text>
                </Pressable>
              );
            })}
            <View style={styles.faceCell}>
              <View style={[styles.faceDot, styles.faceLink]}>
                <Text style={styles.faceLetter}>+</Text>
              </View>
              <Text style={styles.faceName}>{t('groups.step.link')}</Text>
            </View>
            {!friends.length ? <Quiet text={t('groups.f.friends.none')} /> : null}
          </View>
        ) : null}
        {step === 2 && !travel ? (
          <Choice label={t('groups.f.city')} value={f.city ?? '*'} options={[{ id: '*', label: t('groups.f.anywhere') }, ...cities.map((c) => ({ id: c.slug, label: c.name.toLowerCase() }))]} onSelect={(c) => set({ city: c === '*' ? null : c })} />
        ) : null}
        {step === 2 && travel ? <RouteEditor legs={f.legs} cities={cities} onChange={(legs) => set({ legs })} /> : null}
        <Said text={said?.text ?? null} bad={said?.bad} />
      </ScrollView>
      <View style={[styles.wizFoot, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable onPress={() => (step ? setStep(step - 1) : router.back())} hitSlop={10} accessibilityRole="button">
          <Text style={styles.back}>{step ? '‹' : '✕'}</Text>
        </Pressable>
        <View style={styles.flex}>
          <Button
            label={busy ? '…' : step < 2 ? (step === 1 ? t('groups.step.next.n', { n: picked.size + 1 }) : t('groups.step.next')) : t('groups.f.make')}
            onPress={ready && !busy ? next : undefined}
          />
        </View>
      </View>
    </View>
  );
}

// The route of a trip: a leg per city with its first and last day, in order of travel.
// A new leg starts the day the one before ends; the city sheet opens for it at once.
function RouteEditor({ legs, cities, onChange }: { legs: LegForm[]; cities: Place[]; onChange: (legs: LegForm[]) => void }) {
  const { t, up } = useLang();
  const [cityFor, setCityFor] = useState<number | null>(null);
  const [dayFor, setDayFor] = useState<{ i: number; which: 'from' | 'to' } | null>(null);
  const nameOf = (slug: string) => cities.find((c) => c.slug === slug)?.name.toLowerCase() ?? slug;
  const plus = (iso: string, n: number) => isoDay(new Date(fromIso(iso).getTime() + n * 86_400_000));
  const patch = (i: number, p: Partial<LegForm>) =>
    onChange(
      legs.map((l, j) => {
        if (j !== i) return l;
        const next = { ...l, ...p };
        if (next.to < next.from) next.to = next.from;
        return next;
      }),
    );
  const add = () => {
    const last = legs[legs.length - 1];
    const from = last ? last.to : isoDay(new Date());
    onChange([...legs, { city: '', from, to: plus(from, 2) }]);
    setCityFor(legs.length);
  };
  const leg = dayFor ? legs[dayFor.i] : null;
  return (
    <View>
      {!legs.length ? <Quiet text={t('groups.route.none')} /> : null}
      {legs.map((l, i) => (
        <View key={i} style={styles.leg}>
          <Text style={styles.legNo}>{String(i + 1).padStart(2, '0')}</Text>
          <View style={styles.legBody}>
            <Pressable onPress={() => setCityFor(i)} hitSlop={6} accessibilityRole="button">
              <Text style={[styles.legCity, !l.city && styles.legCityNone]}>{l.city ? nameOf(l.city) : `${t('groups.route.city')}…`}</Text>
            </Pressable>
            <View style={styles.legDays}>
              <Pressable onPress={() => setDayFor({ i, which: 'from' })} hitSlop={6} accessibilityRole="button" style={styles.legDay}>
                <Text style={styles.legDayLabel}>{up(t('groups.route.arrive'))}</Text>
                <Text style={styles.legDayValue}>{shortDay(l.from)}</Text>
              </Pressable>
              <Pressable onPress={() => setDayFor({ i, which: 'to' })} hitSlop={6} accessibilityRole="button" style={styles.legDay}>
                <Text style={styles.legDayLabel}>{up(t('groups.route.leave'))}</Text>
                <Text style={styles.legDayValue}>{shortDay(l.to)}</Text>
              </Pressable>
            </View>
          </View>
          <Pressable onPress={() => onChange(legs.filter((_, j) => j !== i))} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('groups.remove')}>
            <Text style={styles.legRemove}>✕</Text>
          </Pressable>
        </View>
      ))}
      {legs.length < 12 ? (
        <Pressable onPress={add} style={({ pressed }) => [styles.legAdd, pressed && styles.pressed]} accessibilityRole="button">
          <Text style={styles.legAddText}>+ {t('groups.route.add')}</Text>
        </Pressable>
      ) : null}
      <PickerSheet
        open={cityFor !== null}
        title={t('groups.route.city')}
        options={cities.map((c) => ({ id: c.slug, label: c.name.toLowerCase() }))}
        selected={cityFor !== null ? (legs[cityFor]?.city ?? null) : null}
        onSelect={(c) => cityFor !== null && patch(cityFor, { city: c })}
        onClose={() => setCityFor(null)}
      />
      <DayPicker
        open={dayFor !== null}
        title={t(dayFor?.which === 'to' ? 'groups.route.leave' : 'groups.route.arrive')}
        value={leg ? (dayFor?.which === 'to' ? leg.to : leg.from) : null}
        min={dayFor ? (dayFor.which === 'to' ? leg?.from : legs[dayFor.i - 1]?.from) ?? null : null}
        onSelect={(d) => dayFor && patch(dayFor.i, { [dayFor.which]: d })}
        onClose={() => setDayFor(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  pressed: { opacity: 0.7 },
  kinds: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  kindCard: { flex: 1, borderRadius: radius.md, borderWidth: 1, borderColor: colors.ink3, padding: 12 },
  kindCardOn: { backgroundColor: colors.paper, borderColor: colors.paper },
  kindTitle: { fontFamily: fonts.semibold, fontSize: 17, letterSpacing: -0.3, color: colors.paper },
  kindTitleOn: { color: colors.ink },
  kindHint: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 15, color: colors.mute, marginTop: 3 },
  kindHintOn: { color: colors.ink2 },
  leg: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderColor: colors.ink3, borderRadius: radius.md, padding: 12, marginBottom: 8 },
  legNo: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.4, color: colors.spotText, paddingTop: 5 },
  legBody: { flex: 1 },
  legCity: { fontFamily: fonts.logo, fontSize: 26, lineHeight: 28, letterSpacing: -0.6, color: colors.paper },
  legCityNone: { color: colors.mute },
  legDays: { flexDirection: 'row', gap: 18, marginTop: 8 },
  legDay: { gap: 2 },
  legDayLabel: { fontFamily: fonts.jet, fontSize: 9, letterSpacing: 1.4, color: colors.meta },
  legDayValue: { fontFamily: fonts.medium, fontSize: 15, color: colors.paper },
  legRemove: { fontFamily: fonts.regular, fontSize: 14, color: colors.mute, paddingTop: 4 },
  legAdd: { height: 44, borderRadius: radius.pill, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.mute, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  legAddText: { fontFamily: fonts.medium, fontSize: 14, color: colors.paper },
  flex: { flex: 1 },
  wizTop: { paddingHorizontal: brand.left },
  bars: { flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.ink3 },
  barOn: { backgroundColor: colors.spot },
  stepMono: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.4, color: colors.spotText, marginTop: 20 },
  question: { fontFamily: fonts.semibold, fontSize: 30, lineHeight: 32, letterSpacing: -0.9, color: colors.paper, marginTop: 8 },
  wizBody: { paddingHorizontal: brand.left, paddingTop: 18, paddingBottom: 40 },
  wizFoot: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: brand.left, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.ink3 },
  back: { fontFamily: fonts.medium, fontSize: 26, color: colors.paper, width: 24, textAlign: 'center' },
  faces: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 18 },
  faceCell: { width: '33.333%', alignItems: 'center', gap: 6 },
  faceDot: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#3a3632', alignItems: 'center', justifyContent: 'center' },
  faceDotOn: { backgroundColor: colors.spot },
  faceLink: { backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.mute },
  faceLetter: { fontFamily: fonts.semibold, fontSize: 24, color: colors.paper },
  faceName: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute, maxWidth: 96 },
  kind: { height: 40, paddingHorizontal: 18, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.ink3, justifyContent: 'center' },
  kindOn: { backgroundColor: colors.paper, borderColor: colors.paper },
  kindText: { fontFamily: fonts.medium, fontSize: 15, color: colors.paper },
  kindTextOn: { color: colors.ink },
  face: { alignItems: 'center', gap: 10, marginBottom: 4 },
  gap: { marginTop: 24 },
  link: { fontFamily: fonts.regular, fontSize: 14, color: colors.paper, textDecorationLine: 'underline' },
  label: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.mute, marginTop: 24, marginBottom: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emoji: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.ink3 },
  on: { borderColor: colors.paper, backgroundColor: colors.ink3 },
  emojiText: { fontSize: 22 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
  swatchOn: { borderColor: colors.paper },
});
