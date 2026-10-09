import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import PickerSheet from '@/components/PickerSheet';
import CodeSheet from '@/components/CodeSheet';
import StaffPage, { Quiet, Said } from '@/components/StaffPage';
import { ACCOUNT_TYPES, type AccountType } from '@/data/settings';
import { banPerson, peopleBy, roleCounts, setAdmin, setPersonType, unbanPerson, why, type PersonRow, type RoleCounts } from '@/data/staff';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';

// People, search first (design 17C): a big search field, role chips with their
// counts, then rows with a face, a small role badge and what each does here.
// A tap gives a type; admins are appointed in the database and cannot be changed here.
// admin is given here too (53_trust.sql), never taken from the last one.
const GIVEABLE = ACCOUNT_TYPES;
const short: Record<AccountType, string> = { user: '', dj: 'dj', community_manager: 'cm', admin: 'admin' };

export default function People() {
  const { t, tx } = useLang();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [list, setList] = useState<PersonRow[] | null>(null);
  const [counts, setCounts] = useState<RoleCounts | null>(null);
  const [who, setWho] = useState<PersonRow | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  // Closing an account (52_bans.sql): the person whose reason is being typed.
  const [banning, setBanning] = useState<PersonRow | null>(null);

  useEffect(() => {
    roleCounts().then(setCounts, () => {});
  }, []);
  useEffect(() => {
    const id = setTimeout(() => peopleBy(q, role).then(setList, (e) => setSaid(why(e))), 250);
    return () => clearTimeout(id);
  }, [q, role]);

  const give = (p: PersonRow, type: AccountType) => {
    if (type === 'admin') return admin(p, true);
    setSaid(null);
    setPersonType(p.id, type).then(
      (r) => {
        if (r !== 'ok') return setSaid(r);
        setList((l) => l?.map((x) => (x.id === p.id ? { ...x, role: type } : x)) ?? l);
        roleCounts().then(setCounts, () => {});
      },
      (e) => setSaid(why(e)),
    );
  };
  const mark = (p: PersonRow, banned: boolean) => {
    setList((l) => l?.map((x) => (x.id === p.id ? { ...x, banned } : x)) ?? l);
    roleCounts().then(setCounts, () => {});
  };
  const ban = (p: PersonRow, reason: string) => {
    setSaid(null);
    banPerson(p.id, reason || null).then(() => mark(p, true), (e) => setSaid(why(e)));
  };
  const admin = (p: PersonRow, on: boolean) => {
    setSaid(null);
    setAdmin(p.id, on).then(
      (r) => {
        if (r !== 'ok') return setSaid(tx('staff.admin.' + r, r));
        setList((l) => l?.map((x) => (x.id === p.id ? { ...x, role: on ? 'admin' : 'user' } : x)) ?? l);
        roleCounts().then(setCounts, () => {});
      },
      (e) => setSaid(why(e)),
    );
  };
  // A tap: change the role, make or unmake an admin, close or open the account.
  const choose = (p: PersonRow) => {
    const name = (p.display_name ?? p.handle ?? '').toLowerCase();
    if (p.role === 'admin') {
      return Alert.alert(name, t('staff.admin.is'), [
        { text: t('staff.admin.unmake'), style: 'destructive', onPress: () => admin(p, false) },
        { text: t('staff.delete.keep'), style: 'cancel' },
      ]);
    }
    Alert.alert(name, p.banned ? t('staff.ban.closed') : undefined, [
      { text: t('staff.ban.role'), onPress: () => setWho(p) },
      p.banned
        ? { text: t('staff.ban.undo'), onPress: () => unbanPerson(p.id).then(() => mark(p, false), (e) => setSaid(why(e))) }
        : { text: t('staff.ban.do'), style: 'destructive', onPress: () => setBanning(p) },
      { text: t('staff.delete.keep'), style: 'cancel' },
    ]);
  };
  const chips: { id: string; label: string; n?: number }[] = [
    { id: '', label: t('staff.people.all'), n: counts?.all },
    { id: 'dj', label: 'dj', n: counts?.dj },
    { id: 'community_manager', label: 'cm', n: counts?.community_manager },
    { id: 'admin', label: 'admin', n: counts?.admin },
    { id: 'new', label: t('staff.people.new'), n: counts?.new },
    { id: 'banned', label: t('staff.ban.list'), n: counts?.banned },
  ];

  return (
    <StaffPage title={t('staff.people')}>
      <View style={styles.search}>
        <Text style={styles.searchMark}>⌕</Text>
        <TextInput value={q} onChangeText={setQ} placeholder={t('staff.people.search')} placeholderTextColor={colors.mute} autoCapitalize="none" autoCorrect={false} style={styles.searchInput} returnKeyType="search" />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {chips.map((c) => (
          <Pressable key={c.id || 'all'} onPress={() => setRole(c.id)} style={[styles.chip, role === c.id && styles.chipOn]}>
            <Text style={[styles.chipText, role === c.id && styles.chipTextOn]}>{c.n === undefined ? c.label : `${c.label} ${c.n}`}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Said text={said} bad />
      <Quiet text={t('staff.people.note')} />
      {list === null ? <Quiet text="…" /> : null}
      {list && !list.length ? <Quiet text={t('staff.people.none')} /> : null}
      {list?.map((p) => {
        const name = (p.display_name ?? p.handle ?? '—').toLowerCase();
        return (
          <Pressable key={p.id} onPress={() => (p.role === 'community_manager' ? setWho(p) : choose(p))} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <View style={styles.face}>
              <Text style={styles.faceText}>{name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.text}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>{name}</Text>
                {p.banned ? (
                  <View style={[styles.badge, styles.badgeRed]}>
                    <Text style={styles.badgeText}>{t('staff.ban.badge')}</Text>
                  </View>
                ) : null}
                {short[p.role] ? (
                  <View style={[styles.badge, p.role !== 'dj' && styles.badgeRed]}>
                    <Text style={styles.badgeText}>{short[p.role]}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.meta} numberOfLines={1}>
                {[p.handle ? `@${p.handle}` : null, t('staff.people.nights', { n: p.nights }), p.groups ? t('staff.people.groups', { n: p.groups }) : null].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </Pressable>
        );
      })}
      <PickerSheet
        open={who !== null}
        title={t('staff.people.give', { name: (who?.display_name ?? who?.handle ?? '').toLowerCase() })}
        options={GIVEABLE}
        selected={who?.role ?? null}
        onSelect={(id) => who && give(who, id as AccountType)}
        onClose={() => setWho(null)}
      />
      <CodeSheet
        key={banning ? banning.id : 'shut'}
        open={banning !== null}
        title={t('staff.ban.why', { name: (banning?.display_name ?? banning?.handle ?? '').toLowerCase() })}
        go={t('staff.ban.do')}
        error={null}
        onSubmit={(reason) => {
          const p = banning;
          setBanning(null);
          if (p) ban(p, reason);
        }}
        onClose={() => setBanning(null)}
      />
    </StaffPage>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, borderRadius: radius.pill, backgroundColor: colors.ink3, paddingHorizontal: 16 },
  searchMark: { fontFamily: fonts.medium, fontSize: 18, color: colors.mute },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.paper, paddingVertical: 0 },
  chips: { gap: 6, paddingTop: 12, paddingBottom: 4 },
  chip: { height: 32, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.ink3, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.paper, borderColor: colors.paper },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.paper },
  chipTextOn: { color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.ink3 },
  pressed: { opacity: 0.6 },
  face: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3a3632', alignItems: 'center', justifyContent: 'center' },
  faceText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.paper },
  text: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flexShrink: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.paper },
  badge: { paddingHorizontal: 7, height: 18, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.mute, justifyContent: 'center' },
  badgeRed: { backgroundColor: colors.spot, borderColor: colors.spot },
  badgeText: { fontFamily: fonts.jet, fontSize: 9, letterSpacing: 1, color: colors.paper },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute },
});
