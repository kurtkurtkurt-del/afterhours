import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Button from '@/components/Button';
import GroupBadge from '@/components/GroupBadge';
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
  groupRemove,
  groupSetVisible,
  groupUpdate,
  why,
  type Group,
  type GroupColor,
  type GroupForm,
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
  const [f, setF] = useState<GroupForm>({ name: '', emoji: GROUP_EMOJI[0], color: 'red', kind: 'lasting', city: null, from: null, to: null });
  const [picked, setPicked] = useState<Set<string>>(() => new Set(preset ? preset.split(',') : []));
  const [said, setSaid] = useState<{ text: string; bad?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<GroupForm>) => setF((c) => ({ ...c, ...p }));

  const load = () =>
    id
      ? groupGet(id).then((g) => {
          setGroup(g);
          setF({ name: g.name, emoji: g.emoji, color: g.color, kind: g.kind, city: g.city_slug, from: g.date_from, to: g.date_to });
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
        const add = [...picked].filter((x) => !inGroup.has(x));
        if (add.length) await groupAdd(id, add);
        setPicked(new Set());
        await load();
        setSaid({ text: t('staff.saved') });
      } else {
        const made = await groupCreate(f, [...picked]);
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

      <Choice
        label={t('groups.f.kind')}
        value={f.kind}
        options={[
          { id: 'lasting', label: t('groups.f.lasting') },
          { id: 'once', label: t('groups.f.once') },
        ]}
        onSelect={(k) => set({ kind: k as GroupForm['kind'] })}
      />
      {f.kind === 'once' ? <Quiet text={t('groups.f.once.hint')} /> : null}
      <Choice
        label={t('groups.f.city')}
        value={f.city ?? '*'}
        options={[{ id: '*', label: t('groups.f.anywhere') }, ...cities.map((c) => ({ id: c.slug, label: c.name.toLowerCase() }))]}
        onSelect={(c) => set({ city: c === '*' ? null : c })}
      />
      <Field label={t('groups.f.from')} value={f.from ?? ''} onChangeText={(from) => set({ from })} maxLength={10} keyboardType="numbers-and-punctuation" />
      <Field label={t('groups.f.to')} value={f.to ?? ''} onChangeText={(to) => set({ to })} maxLength={10} keyboardType="numbers-and-punctuation" />

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
  const steps = [t('groups.step.look'), t('groups.step.who'), t('groups.step.when')];
  const ready = step === 0 ? f.name.trim().length > 0 : step === 2 ? f.kind === 'lasting' || !!f.to : true;
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
        <Text style={styles.question}>{t(step === 0 ? 'groups.q.look' : step === 1 ? 'groups.q.who' : 'groups.q.when')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.wizBody} keyboardShouldPersistTaps="handled">
        {step === 0 ? (
          <>
            <View style={styles.face}>
              <GroupBadge emoji={f.emoji} color={f.color} cover={null} size={110} />
            </View>
            <Field label={t('groups.f.name')} value={f.name} onChangeText={(name) => set({ name })} placeholder={t('groups.f.name.placeholder')} maxLength={40} autoCapitalize="sentences" autoFocus />
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
        {step === 2 ? (
          <>
            <View style={styles.wrap}>
              {(['lasting', 'once'] as const).map((k) => (
                <Pressable key={k} onPress={() => set({ kind: k })} style={[styles.kind, f.kind === k && styles.kindOn]}>
                  <Text style={[styles.kindText, f.kind === k && styles.kindTextOn]}>{t(k === 'lasting' ? 'groups.f.lasting' : 'groups.f.once')}</Text>
                </Pressable>
              ))}
            </View>
            {f.kind === 'once' ? <Quiet text={t('groups.f.once.hint')} /> : null}
            <Choice label={t('groups.f.city')} value={f.city ?? '*'} options={[{ id: '*', label: t('groups.f.anywhere') }, ...cities.map((c) => ({ id: c.slug, label: c.name.toLowerCase() }))]} onSelect={(c) => set({ city: c === '*' ? null : c })} />
            <Field label={t('groups.f.from')} value={f.from ?? ''} onChangeText={(from) => set({ from })} maxLength={10} keyboardType="numbers-and-punctuation" />
            <Field label={t('groups.f.to')} value={f.to ?? ''} onChangeText={(to) => set({ to })} maxLength={10} keyboardType="numbers-and-punctuation" />
          </>
        ) : null}
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
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
