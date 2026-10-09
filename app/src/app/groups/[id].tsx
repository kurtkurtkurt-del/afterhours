import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, FadeIn, FadeOut, ZoomIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useReport } from '@/components/ReportSheet';
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import CardFace, { toDeckCard, openDetails } from '@/components/CardFace';
import SwipeStack, { type StackHandle } from '@/components/SwipeStack';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { posterUrl } from '@/data/deck';
import { dayLabel } from '@/data/when';
import GroupBadge from '@/components/GroupBadge';
import Icon from '@/components/Icon';
import PickerSheet from '@/components/PickerSheet';
import { Switch } from '@/components/Row';
import { rsvpSet, type Answer } from '@/data/rsvp';
import { Quiet, Said } from '@/components/StaffPage';
import Tips from '@/components/Tips';
import type { Night } from '@/data/deck';
import {
  groupDeck,
  groupGet,
  groupMatches,
  groupSwipe,
  groupPlan,
  groupAlsoThere,
  liveHere,
  planSet,
  planTicket,
  roundClose,
  roundStart,
  roundVote,
  liveLeave,
  liveSkip,
  liveState,
  why,
  type Group,
  type LiveState,
  type Match,
  type PlanState,
  type AlsoThere,
} from '@/data/groups';
import { useLang } from '@/i18n';
import { colors, fonts, radius, tint } from '@/theme/tokens';
import { brand } from '@/theme/layout';

type Tab = 'swipe' | 'matches' | 'plan' | 'live';
const ACTIONS = 86;

// One group: its face on top, then three ways to look at its nights.
//   swipe    the group's deck, each in their own time. Faces on a card: who here
//            already said yes. When your yes completes everyone's, "everyone is in".
//   matches  what members said yes to: match (all), most (more than half), some.
//   live     the same card for everyone here now; it moves on when all answered.
export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, up } = useLang();
  // A long press on the name reports the group (51_safety.sql).
  const reporting = useReport();
  const insets = useSafeAreaInsets();
  const [group, setGroup] = useState<Group | null>(null);
  const [tab, setTab] = useState<Tab>('swipe');
  const [deck, setDeck] = useState<Night[] | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [said, setSaid] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const [headH, setHeadH] = useState(0);
  const stackRef = useRef<StackHandle>(null);
  // how many cards of this deck you answered here: the next one is deck[seen]
  const [seen, setSeen] = useState(0);

  const load = useCallback(() => {
    groupGet(id).then(setGroup, (e) => setSaid(why(e)));
    groupMatches(id).then(setMatches, () => {});
  }, [id]);
  useFocusEffect(load);
  useEffect(() => {
    groupDeck(id).then(setDeck, (e) => {
      setDeck([]);
      setSaid(why(e));
    });
  }, [id]);

  const nameOf = (uid: string) => (group?.members.find((m) => m.id === uid)?.name ?? '?').toLowerCase();
  const yesOf = (nightId: string) => matches.find((m) => m.id === nightId)?.yes_ids ?? [];

  const onSwipe = (n: Night, direction: 'left' | 'right') => {
    setSeen((x) => x + 1);
    const others = yesOf(n.id).filter((u) => u !== group?.me).length;
    if (direction === 'right' && group && others === group.members.length - 1 && group.members.length > 1) setBurst((b) => b + 1);
    groupSwipe(id, n.id, direction).then(() => groupMatches(id).then(setMatches, () => {}), (e) => setSaid(why(e)));
  };

  const current = deck?.[seen];
  const completes = !!current && !!group && group.members.length > 1 && yesOf(current.id).filter((u) => u !== group.me).length === group.members.length - 1;
  const top = Math.max(brand.top, insets.top + 24);
  const window = group ? [group.city_slug, group.date_from || group.date_to ? `${group.date_from ?? '…'} – ${group.date_to ?? '…'}` : t('groups.window.all')].filter(Boolean).join(' · ') : '';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.head, { paddingTop: top - 8 }]} onLayout={(e) => setHeadH(e.nativeEvent.layout.height)}>
        <View style={styles.headRow}>
          <Pressable onPress={() => router.push({ pathname: '/groups/memories', params: { id } })} onLongPress={() => id && reporting.ask('group', id)} style={styles.headLink} accessibilityRole="button" accessibilityHint={t('groups.memories.hint')}>
          {group ? <GroupBadge emoji={group.emoji} color={group.color} cover={group.cover_path} size={44} /> : null}
          <View style={styles.headText}>
            <Text style={styles.name} numberOfLines={1}>{group?.name ?? '…'} <Text style={styles.under}>· {t('groups.memories')} ›</Text></Text>
            <Text style={styles.under} numberOfLines={1}>{group ? `${group.members.map((m) => (m.name ?? m.handle ?? '?').toLowerCase()).join(', ')} · ${window}` : ''}</Text>
          </View>
          </Pressable>
          <Pressable onPress={() => router.push({ pathname: '/groups/chat', params: { id } })} hitSlop={8} accessibilityLabel={t('groups.chat')} style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
            <Icon name="chat" size={17} color={colors.paper} />
          </Pressable>
          <Pressable onPress={() => router.push({ pathname: '/groups/invite', params: { id } })} hitSlop={8} style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
            <Text style={styles.chipText}>{t('groups.invite')}</Text>
          </Pressable>
          <Pressable onPress={() => router.push({ pathname: '/groups/new', params: { id } })} hitSlop={8} style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
            <Text style={styles.chipText}>{t('groups.edit')}</Text>
          </Pressable>
        </View>
        <View style={styles.tabs} accessibilityRole="tablist">
          {(['swipe', 'matches', 'plan', 'live'] as const).map((k) => (
            <Pressable key={k} onPress={() => setTab(k)} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} style={[styles.tab, tab === k && styles.tabOn]}>
              {k === 'live' ? <View style={styles.liveDot} /> : null}
              <Text style={[styles.tabText, tab === k && styles.tabTextOn]}>
                {t(`groups.tab.${k}`)}
                {k === 'matches' && matches.some((m) => m.status === 'match') ? ` · ${matches.filter((m) => m.status === 'match').length}` : ''}
              </Text>
            </Pressable>
          ))}
        </View>
        <Said text={said} bad />
      </View>

      {tab === 'swipe' ? (
        <View style={[styles.stage, { paddingTop: headH + 6, paddingBottom: insets.bottom + 84 }]}>
          {deck ? (
            <SwipeStack
              ref={stackRef}
              items={deck}
              keyOf={(n) => n.id}
              stamps={{ right: t('groups.stamp.yes'), left: t('groups.stamp.no') }}
              onSwipe={(n, way) => onSwipe(n, way === 'right' ? 'right' : 'left')}
              render={(n) => <ScoreCard night={n} yes={yesOf(n.id).filter((u) => u !== group?.me).length} members={group?.members.length ?? 1} group={group?.name ?? ''} />}
              empty={<Quiet text={t('groups.deck.done')} />}
            />
          ) : (
            <Quiet text="…" />
          )}
          {deck && seen < deck.length ? (
            <View style={[styles.scoreButtons, { bottom: insets.bottom + 18 }]}>
              <Pressable onPress={() => stackRef.current?.swipe('left')} style={({ pressed }) => [styles.scoreLine, pressed && styles.pressed]} accessibilityRole="button">
                <Text style={styles.scoreLineText}>{t('groups.swipe.no')}</Text>
              </Pressable>
              <Pressable onPress={() => stackRef.current?.swipe('right')} style={({ pressed }) => [styles.scoreYes, pressed && styles.pressed]} accessibilityRole="button">
                <Text style={styles.scoreYesText}>{completes ? t('groups.swipe.complete') : t('groups.swipe.yes')}</Text>
              </Pressable>
            </View>
          ) : null}
          {burst ? <MatchBurst key={burst} text={up(t('groups.match.burst'))} onEnd={() => setBurst(0)} /> : null}
        </View>
      ) : null}

      {tab === 'matches' ? <Matches id={id} matches={matches} nameOf={nameOf} top={headH} onPlan={() => setTab('plan')} /> : null}
      {tab === 'plan' ? <PlanTab id={id} me={group?.me ?? ''} top={headH} groupName={group?.name ?? ''} /> : null}
      {tab === 'live' ? <Live id={id} me={group?.me ?? ''} top={headH} nameOf={nameOf} onChange={() => groupMatches(id).then(setMatches, () => {})} /> : null}

      {tab !== 'swipe' ? <BackButton /> : null}
      <Tips page="group" tips={[{ title: 'tips.group.1.t', body: 'tips.group.1.b', motion: 'swipe' }, { title: 'tips.group.2.t', body: 'tips.group.2.b', motion: 'tap' }]} bottom={insets.bottom + ACTIONS + 10} />
      {reporting.sheet}
    </View>
  );
}

// One night in the group's deck (design 5E): the photo full, the score huge on top
// (how many of the others said yes, of everyone), the night at the bottom.
const fallback = require('../../../assets/intro/concert.jpg');
function ScoreCard({ night, yes, members, group }: { night: Night; yes: number; members: number; group: string }) {
  const { t, up } = useLang();
  const uri = night.image_url ?? posterUrl(night);
  return (
    <View style={styles.fill}>
      <Image source={uri ? { uri } : fallback} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient colors={['rgba(14,13,12,0.65)', 'rgba(14,13,12,0)', 'rgba(14,13,12,0.15)', 'rgba(14,13,12,0.92)']} locations={[0, 0.32, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.score}>
        <Text style={styles.scoreBig}>
          {yes}
          <Text style={styles.scoreRed}>/{members}</Text>
        </Text>
        <Text style={styles.scoreLabel}>{up(t('groups.swipe.score', { group: group.toLowerCase() }))}</Text>
      </View>
      <View style={styles.scoreFoot}>
        <Text style={styles.scoreTitle} numberOfLines={2}>{night.title.toLowerCase()}</Text>
        <Text style={styles.scoreMeta} numberOfLines={1}>{[up(dayLabel(night.starts_at)), night.venue_name?.toLowerCase(), night.city_name?.toLowerCase()].filter(Boolean).join(' · ')}</Text>
      </View>
    </View>
  );
}

// "Everyone is in": a red stamp that grows in the middle and fades.
function MatchBurst({ text, onEnd }: { text: string; onEnd: () => void }) {
  useEffect(() => {
    const id = setTimeout(onEnd, 1800);
    return () => clearTimeout(id);
  }, [onEnd]);
  return (
    <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(300)} style={styles.burst} pointerEvents="none">
      <Animated.View entering={ZoomIn.springify().damping(11)} style={styles.burstStamp}>
        <Text style={styles.burstText}>{text}</Text>
      </Animated.View>
    </Animated.View>
  );
}

// What members said yes to. A tap: open the night, or make it the plan. "put to a
// vote": tap two or three, choose how long, start.
function Matches({ id, matches, nameOf, top, onPlan }: { id: string; matches: Match[]; nameOf: (id: string) => string; top: number; onPlan: () => void }) {
  const { t, up } = useLang();
  const insets = useSafeAreaInsets();
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [asking, setAsking] = useState<Match | null>(null);
  const [hours, setHours] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const label = { match: t('groups.match'), most: t('groups.most'), some: t('groups.some') };
  const toggle = (m: Match) => setPicked((p) => (p.includes(m.id) ? p.filter((x) => x !== m.id) : p.length >= 3 ? p : [...p, m.id]));
  const start = (h: string) =>
    roundStart(id, picked, Number(h)).then(
      () => {
        setPicking(false);
        setPicked([]);
        onPlan();
      },
      (e) => setSaid(why(e)),
    );
  return (
    <>
      <ScrollView contentContainerStyle={{ paddingTop: top + 8, paddingHorizontal: brand.left, paddingBottom: insets.bottom + 120 }}>
        {!matches.length ? <Quiet text={t('groups.matches.none')} /> : null}
        {matches.length >= 2 ? (
          <View style={styles.pickRow}>
            {picking ? <Text style={styles.under}>{t('groups.vote.pickHint')}</Text> : <View />}
            <Pressable onPress={() => (setPicking(!picking), setPicked([]))} hitSlop={8}>
              <Text style={styles.pickLink}>{picking ? t('groups.vote.cancel') : t('groups.vote.pick')}</Text>
            </Pressable>
          </View>
        ) : null}
        <Said text={said} bad />
        {(['match', 'most', 'some'] as const).map((tier) => {
          const shelf = matches.filter((m) => m.status === tier);
          if (!shelf.length) return null;
          const size = tier === 'match' ? styles.coverBig : tier === 'most' ? styles.coverMid : styles.coverSmall;
          return (
            <View key={tier} style={styles.tier}>
              <Text style={[styles.badge, tier === 'match' && styles.badgeOn]}>{up(`${label[tier]} · ${shelf.length}`)}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tierRow}>
                {shelf.map((m) => {
                  const uri = m.image_url ?? posterUrl({ poster_no: m.poster_no, poster_path: m.poster_path });
                  const on = picked.includes(m.id);
                  return (
                    <Pressable key={m.id} onPress={() => (picking ? toggle(m) : setAsking(m))} style={({ pressed }) => [pressed && styles.pressed]} accessibilityRole="button">
                      <View style={[styles.cover, size, tier === 'some' && styles.coverFaded, on && styles.coverPicked]}>
                        <Image source={uri ? { uri } : fallback} style={StyleSheet.absoluteFill} contentFit="cover" />
                        <LinearGradient colors={['rgba(14,13,12,0)', 'rgba(14,13,12,0.85)']} locations={[0.45, 1]} style={StyleSheet.absoluteFill} />
                        {on ? <Text style={styles.coverCheck}>✓</Text> : null}
                        <View style={styles.coverText}>
                          <Text style={[styles.coverTitle, tier === 'some' && styles.coverTitleSmall]} numberOfLines={2}>{m.title.toLowerCase()}</Text>
                          {tier !== 'some' ? <Text style={styles.coverMeta} numberOfLines={1}>{t('groups.yes', { yes: m.yes, n: m.members })}</Text> : null}
                        </View>
                      </View>
                      {tier === 'match' ? <Text style={styles.under} numberOfLines={1}>{[up(dayLabel(m.starts_at)), m.venue_name?.toLowerCase()].filter(Boolean).join(' · ')}</Text> : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>
      {picking && picked.length >= 2 ? (
        <View style={[styles.floating, { bottom: insets.bottom + 16 }]}>
          <Button label={t('groups.vote.go', { n: picked.length })} onPress={() => setHours(true)} />
        </View>
      ) : null}
      <PickerSheet
        open={asking !== null}
        title={asking?.title.toLowerCase() ?? ''}
        options={[
          { id: 'open', label: t('groups.match.open') },
          { id: 'plan', label: t('groups.match.plan') },
        ]}
        selected={null}
        onSelect={(k) => {
          const m = asking;
          if (!m) return;
          if (k === 'open') router.push(`/night/${m.slug}`);
          else planSet(id, m.id).then(onPlan, (e) => setSaid(why(e)));
        }}
        onClose={() => setAsking(null)}
      />
      <PickerSheet
        open={hours}
        title={t('groups.vote.how')}
        options={[1, 3, 12, 24].map((h) => ({ id: String(h), label: t('groups.vote.hours', { n: h }) }))}
        selected={null}
        onSelect={start}
        onClose={() => setHours(false)}
      />
    </>
  );
}

// The vote that is open (vote, see who voted for what, close it early) and the plan
// (who comes, who has a ticket, the ticket link). Read every 5 s while open.
function PlanTab({ id, me, top, groupName }: { id: string; me: string; top: number; groupName: string }) {
  const { t, up } = useLang();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<PlanState | null>(null);
  const [also, setAlso] = useState<AlsoThere[]>([]);
  const [said, setSaid] = useState<string | null>(null);
  const read = useCallback(() => {
    groupAlsoThere(id).then(setAlso, () => {});
    return groupPlan(id).then(setState, (e) => setSaid(why(e)));
  }, [id]);
  useEffect(() => {
    read();
    const timer = setInterval(read, 5000);
    return () => clearInterval(timer);
  }, [read]);
  const act = (p: Promise<unknown>) => p.then(read, (e) => setSaid(why(e)));
  const r = state?.round ?? null;
  const plan = state?.plan ?? null;
  const mine = plan?.people.find((p) => p.id === me) ?? null;
  const coming = plan?.people.filter((p) => p.answer === 'in' || p.answer === 'maybe') ?? [];
  const needTicket = coming.filter((p) => !p.ticket).length;
  const answers: Answer[] = ['in', 'maybe', 'out'];
  const word = { in: t('groups.plan.in'), maybe: t('groups.plan.maybe'), out: t('groups.plan.out') };
  const at = (iso: string) => iso.slice(11, 16);
  return (
    <ScrollView contentContainerStyle={{ paddingTop: top + 8, paddingHorizontal: brand.left, paddingBottom: insets.bottom + 100 }}>
      <Said text={said} bad />
      {state === null ? <Quiet text="…" /> : null}

      {r ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>{t('groups.vote.title')}</Text>
          <Text style={styles.under}>{t('groups.vote.by', { name: (r.started_by ?? '—').toLowerCase(), at: at(r.closes_at) })}</Text>
          <Text style={styles.under}>{t('groups.vote.voted', { n: r.voted, m: state?.members ?? 0 })}</Text>
          {r.options.map((o) => {
            const on = r.my_vote === o.id;
            const share = r.voted ? o.votes / r.voted : 0;
            return (
              <Pressable key={o.id} onPress={() => act(roundVote(r.id, o.id))} style={({ pressed }) => [styles.option, on && styles.optionOn, pressed && styles.pressed]}>
                <View style={[styles.bar, { width: `${Math.round(share * 100)}%` }]} />
                <View style={styles.optionRow}>
                  <Text style={styles.optionTitle} numberOfLines={1}>{o.title.toLowerCase()}</Text>
                  <Text style={styles.optionVotes}>{o.votes}</Text>
                </View>
                <Text style={styles.under} numberOfLines={1}>
                  {[o.starts_at?.slice(0, 16).replace('T', ' '), o.venue_name, on ? up(t('groups.vote.mine')) : null, o.voters.length ? o.voters.map((v) => v.toLowerCase()).join(', ') : null].filter(Boolean).join(' · ')}
                </Text>
              </Pressable>
            );
          })}
          {r.mine ? (
            <Pressable onPress={() => act(roundClose(r.id))} hitSlop={8}>
              <Text style={styles.pickLink}>{t('groups.vote.close')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : state ? (
        <Quiet text={t('groups.vote.none')} />
      ) : null}

      {plan ? (
        // the plan as the group's own flyer (design 7D)
        <View style={styles.flyer}>
          <Image source={plan.image_url ? { uri: plan.image_url } : fallback} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={styles.flyerRed} />
          <LinearGradient colors={['rgba(14,13,12,0.2)', 'rgba(14,13,12,0)', 'rgba(14,13,12,0.92)']} locations={[0, 0.35, 0.8]} style={StyleSheet.absoluteFill} />
          <Pressable onPress={() => router.push(`/night/${plan.slug}`)} style={styles.flyerHead} accessibilityRole="button">
            <Text style={styles.flyerMono}>{up(t('groups.plan.presents', { group: groupName.toLowerCase() }))}</Text>
            <Text style={styles.flyerTitle} numberOfLines={3}>{plan.title.toUpperCase()}</Text>
            <Text style={styles.flyerMono}>{[up(dayLabel(plan.starts_at)), plan.starts_at?.slice(11, 16), plan.venue_name?.toUpperCase()].filter(Boolean).join(' — ')}</Text>
          </Pressable>
          <View style={styles.flyerFoot}>
            <Text style={styles.flyerWho} numberOfLines={2}>
              {[coming.filter((p) => p.answer === 'in').map((p) => (p.id === me ? t('posts.you') : (p.name ?? '').toLowerCase())).join(', '), coming.some((p) => p.answer === 'maybe') ? `${t('groups.plan.maybe')}: ${coming.filter((p) => p.answer === 'maybe').map((p) => (p.name ?? '').toLowerCase()).join(', ')}` : null].filter(Boolean).join(' · ') || t('groups.plan.nobody')}
            </Text>
            {also.map((a) => (
              <Text key={a.id} style={styles.also}>
                {t('groups.also', { emoji: a.emoji, name: a.name })}
                {a.friends.length ? ` · ${t('groups.also.friends', { names: a.friends.map((f) => f.toLowerCase()).join(', ') })}` : ''}
              </Text>
            ))}
            <View style={styles.answers}>
              {answers.map((a) => (
                <Pressable key={a} onPress={() => act(rsvpSet(plan.id, mine?.answer === a ? null : a))} style={[styles.flyerAnswer, mine?.answer === a && styles.answerOn]}>
                  <Text style={[styles.answerText, mine?.answer === a && styles.answerTextOn]}>{word[a]}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => act(planTicket(id, !mine?.ticket))} style={styles.ticketRow}>
              <Text style={styles.ticketText}>{t('groups.plan.ticket')}</Text>
              <Switch on={!!mine?.ticket} />
            </Pressable>
            <Text style={styles.flyerNote}>{coming.length ? (needTicket ? t('groups.plan.tickets', { n: needTicket }) : t('groups.plan.allTickets')) : ''}</Text>
            <View style={styles.planButtons}>
              {plan.ticket_url ? <Button label={t('groups.plan.buy')} onPress={() => Linking.openURL(plan.ticket_url!).catch(() => {})} /> : null}
              <View style={styles.flyerLinks}>
                <Text style={styles.flyerLink} onPress={() => router.push({ pathname: '/groups/album', params: { id, event: plan.id } })}>{t('groups.album')}</Text>
                <Text style={styles.flyerLink} onPress={() => act(planSet(id, null))}>{t('groups.plan.drop')}</Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

// Live: say "here" every 5 s, read the shared card every 2.5 s. Leaving the tab
// (or the page) says goodbye, so the others stop waiting.
const ROUND = 15_000;

// Live in timed rounds (design 8C): every card has 15 s; the bar drains, and whoever
// has not answered when it ends passes (each phone answers for itself). Say "here"
// every 5 s, read the shared card every 2.5 s; leaving says goodbye.
function Live({ id, me, top, nameOf, onChange }: { id: string; me: string; top: number; nameOf: (id: string) => string; onChange: () => void }) {
  const { t, up } = useLang();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<LiveState | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const read = useCallback(() => liveState(id).then(setState, (e) => setSaid(why(e))), [id]);
  useEffect(() => {
    liveHere(id).then(read, (e) => setSaid(why(e)));
    const beat = setInterval(() => liveHere(id).catch(() => {}), 5000);
    const poll = setInterval(read, 2500);
    return () => {
      clearInterval(beat);
      clearInterval(poll);
      liveLeave(id).catch(() => {});
    };
  }, [id, read]);

  const card = state?.card ?? null;
  const mine = state?.people?.find((p) => p.id === me)?.answer ?? null;
  const answer = useCallback(
    (direction: 'left' | 'right') => {
      if (!card) return;
      // Show it at once; the next read confirms it.
      setState((s) => s && { ...s, people: s.people?.map((p) => (p.id === me ? { ...p, answer: direction } : p)) ?? null });
      groupSwipe(id, card.id, direction).then(() => {
        read();
        onChange();
      }, (e) => setSaid(why(e)));
    },
    [card, id, me, read, onChange],
  );

  // the round: a new card starts the bar and the clock
  const left = useSharedValue(1);
  const cardId = card?.id ?? null;
  const answered = !!mine;
  useEffect(() => {
    if (!cardId) return;
    left.set(1);
    left.set(withTiming(0, { duration: ROUND, easing: Easing.linear }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);
  const latest = useRef(answer);
  useEffect(() => {
    latest.current = answer;
  }, [answer]);
  useEffect(() => {
    if (!cardId || answered) return;
    const timer = setTimeout(() => latest.current('left'), ROUND);
    return () => clearTimeout(timer);
  }, [cardId, answered]);
  const bar = useAnimatedStyle(() => ({ width: `${left.value * 100}%` }));

  return (
    <View style={[styles.liveRoot, { paddingTop: top + 8, paddingBottom: insets.bottom + 18 }]}>
      <View style={styles.liveTop}>
        <Text style={styles.liveMark}>{up(`● ${t('groups.tab.live')}`)}</Text>
        <Text style={styles.leftCount}>{up(t('groups.live.left', { n: state?.left ?? 0 }))}</Text>
      </View>
      <View style={styles.roundTrack}>
        <Animated.View style={[styles.roundBar, bar]} />
      </View>
      <Said text={said} bad />
      {card ? (
        <>
          <View style={styles.liveCard}>
            <CardFace card={toDeckCard(card, [])} bottom={8} fit={{ top: 8 }} rightLabel={t('word.details')} onRight={() => openDetails(toDeckCard(card, []))} onDetails={() => openDetails(toDeckCard(card, []))} />
          </View>
          <View style={styles.liveRow}>
            <Text style={styles.liveName} numberOfLines={1}>{answered ? t('groups.live.waiting') : t('groups.live.hint.short')}</Text>
            <View style={styles.faces}>
              {(state?.people ?? []).map((p) => (
                <View key={p.id} style={[styles.liveFace, p.answer === 'right' && styles.liveFaceYes, p.answer === 'left' && styles.liveFaceNo, p.id === me && styles.liveFaceMe]}>
                  <Text style={styles.liveFaceText}>{(p.id === me ? t('posts.you') : (p.name ?? nameOf(p.id))).charAt(0).toUpperCase()}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.liveButtons}>
            <View style={styles.flex}>
              <Button kind="line" label="✕" onPress={answered ? undefined : () => answer('left')} />
            </View>
            <View style={styles.flex}>
              <Button label="♥" onPress={answered ? undefined : () => answer('right')} />
            </View>
          </View>
          <Pressable onPress={() => liveSkip(id, card.id).then(read, () => {})} hitSlop={8}>
            <Text style={styles.skip}>{up(t('groups.live.skip'))}</Text>
          </Pressable>
        </>
      ) : state ? (
        <Quiet text={t('groups.live.done')} />
      ) : (
        <Quiet text="…" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  head: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3, paddingHorizontal: brand.left, paddingBottom: 8, backgroundColor: colors.ink },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headLink: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headText: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.semibold, fontSize: 20, letterSpacing: -0.5, color: colors.paper },
  under: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute },
  chip: { height: 30, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.ink3, justifyContent: 'center' },
  chipText: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.paper },
  pressed: { opacity: 0.6 },
  tabs: { flexDirection: 'row', alignSelf: 'center', height: 34, padding: 3, marginTop: 12, borderRadius: radius.pill, backgroundColor: colors.ink3, borderWidth: 1, borderColor: '#4a4640' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: radius.pill },
  tabOn: { backgroundColor: colors.paper },
  tabText: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.paper, opacity: 0.75 },
  tabTextOn: { color: colors.ink, opacity: 1 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.spot },
  stage: { flex: 1, paddingHorizontal: 10 },
  fill: { flex: 1 },
  score: { position: 'absolute', top: 22, left: 0, right: 0, alignItems: 'center' },
  scoreBig: { fontFamily: fonts.logo, fontSize: 96, lineHeight: 96, color: colors.paper },
  scoreRed: { color: colors.spotText },
  scoreLabel: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.6, color: colors.paper },
  scoreFoot: { position: 'absolute', left: 18, right: 18, bottom: 20, gap: 4 },
  scoreTitle: { fontFamily: fonts.semibold, fontSize: 30, lineHeight: 32, letterSpacing: -0.9, color: colors.paper },
  scoreMeta: { fontFamily: fonts.regular, fontSize: 13, color: '#ddd' },
  scoreButtons: { position: 'absolute', left: brand.left, right: brand.left, flexDirection: 'row', gap: 10 },
  scoreLine: { flex: 1, height: 50, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.ink3, alignItems: 'center', justifyContent: 'center' },
  scoreLineText: { fontFamily: fonts.medium, fontSize: 16, color: colors.paper },
  scoreYes: { flex: 2, height: 50, borderRadius: radius.pill, backgroundColor: colors.spot, alignItems: 'center', justifyContent: 'center' },
  scoreYesText: { fontFamily: fonts.medium, fontSize: 16, color: colors.paper },
  actions: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 28 },
  act: { width: 60, height: 60, borderRadius: 30, borderWidth: 1, borderColor: colors.ink3, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  actSmall: { width: 46, height: 46, borderRadius: 23 },
  actKeep: { backgroundColor: colors.spot, borderColor: colors.spot },
  burst: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(14,13,12,0.45)' },
  burstStamp: { paddingHorizontal: 22, paddingVertical: 14, borderRadius: radius.lg, backgroundColor: colors.spot, transform: [{ rotate: '-6deg' }] },
  burstText: { fontFamily: fonts.logo, fontSize: 30, letterSpacing: -0.5, color: colors.paper },
  pickRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  pickLink: { fontFamily: fonts.medium, fontSize: 14, color: colors.paper, textDecorationLine: 'underline', marginTop: 10 },
  matchPicked: { backgroundColor: colors.ink3, borderColor: colors.paper },
  floating: { position: 'absolute', left: brand.left, right: brand.left },
  block: { borderWidth: 1, borderColor: colors.ink3, borderRadius: radius.md, padding: 14, gap: 6, marginTop: 8 },
  planBlock: { borderColor: colors.spot, marginTop: 16 },
  blockTitle: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.6, color: colors.spotText },
  option: { borderWidth: 1, borderColor: colors.ink3, borderRadius: radius.sm, padding: 12, marginTop: 6, overflow: 'hidden', gap: 3 },
  optionOn: { borderColor: colors.paper },
  bar: { position: 'absolute', top: 0, left: 0, bottom: 0, backgroundColor: 'rgba(229,50,45,0.18)' },
  optionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  optionTitle: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.paper },
  optionVotes: { fontFamily: fonts.medium, fontSize: 16, color: colors.paper, fontVariant: ['tabular-nums'] },
  planTitle: { fontFamily: fonts.semibold, fontSize: 22, letterSpacing: -0.5, color: colors.paper },
  answers: { flexDirection: 'row', gap: 8, marginTop: 10 },
  answer: { flex: 1, height: 38, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.ink3, alignItems: 'center', justifyContent: 'center' },
  answerOn: { backgroundColor: colors.paper, borderColor: colors.paper },
  answerText: { fontFamily: fonts.medium, fontSize: 14, color: colors.paper },
  answerTextOn: { color: colors.ink },
  ticketRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.ink3 },
  ticketText: { fontFamily: fonts.regular, fontSize: 15, color: colors.paper },
  personRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  personName: { fontFamily: fonts.regular, fontSize: 14, color: colors.paper },
  personAnswer: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.2, color: colors.mute },
  ticketNote: { marginTop: 6 },
  flyer: { marginTop: 16, minHeight: 560, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.ink3, justifyContent: 'space-between' },
  flyerRed: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: tint(0.42) },
  flyerHead: { padding: 20, gap: 8 },
  flyerMono: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.6, color: colors.paper },
  flyerTitle: { fontFamily: fonts.logo, fontSize: 52, lineHeight: 48, letterSpacing: -0.5, color: colors.paper },
  flyerFoot: { padding: 20, gap: 8 },
  flyerWho: { fontFamily: fonts.regular, fontSize: 13, color: '#eee' },
  flyerAnswer: { flex: 1, height: 42, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(243,241,236,0.45)', alignItems: 'center', justifyContent: 'center' },
  flyerNote: { fontFamily: fonts.regular, fontSize: 12, color: '#ddd' },
  flyerLinks: { flexDirection: 'row', justifyContent: 'center', gap: 22, marginTop: 4 },
  flyerLink: { fontFamily: fonts.regular, fontSize: 13, color: colors.paper, textDecorationLine: 'underline' },
  also: { fontFamily: fonts.medium, fontSize: 13, color: colors.spotText, marginTop: 8 },
  planButtons: { gap: 8, marginTop: 10 },
  tier: { marginTop: 18 },
  tierRow: { gap: 10, paddingTop: 8, paddingRight: brand.left },
  cover: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.ink3, justifyContent: 'flex-end' },
  coverBig: { width: 170, height: 220 },
  coverMid: { width: 120, height: 150 },
  coverSmall: { width: 82, height: 100 },
  coverFaded: { opacity: 0.75 },
  coverPicked: { borderWidth: 2.5, borderColor: colors.spot },
  coverCheck: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.spot, color: colors.paper, textAlign: 'center', lineHeight: 24, fontFamily: fonts.medium },
  coverText: { padding: 10, gap: 2 },
  coverTitle: { fontFamily: fonts.medium, fontSize: 15, letterSpacing: -0.2, color: colors.paper },
  coverTitleSmall: { fontSize: 11.5 },
  coverMeta: { fontFamily: fonts.regular, fontSize: 11, color: '#ddd' },
  match: { borderWidth: 1, borderColor: colors.ink3, borderRadius: radius.md, padding: 14, marginTop: 10, gap: 4 },
  matchOn: { borderColor: colors.spot },
  matchTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.4, color: colors.mute },
  badgeOn: { color: colors.spotText },
  count: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute },
  matchTitle: { fontFamily: fonts.medium, fontSize: 19, letterSpacing: -0.4, color: colors.paper },
  liveRoot: { flex: 1, paddingHorizontal: brand.left },
  liveTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  liveMark: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.4, color: colors.spotText },
  roundTrack: { height: 5, borderRadius: 3, backgroundColor: colors.ink3, overflow: 'hidden', marginTop: 8 },
  roundBar: { height: 5, backgroundColor: colors.spot },
  liveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 10 },
  liveName: { flex: 1, fontFamily: fonts.regular, fontSize: 12, color: colors.mute },
  faces: { flexDirection: 'row' },
  liveFace: { width: 28, height: 28, borderRadius: 14, marginLeft: -6, borderWidth: 2, borderColor: colors.ink, backgroundColor: '#3a3632', alignItems: 'center', justifyContent: 'center' },
  liveFaceYes: { backgroundColor: colors.spot },
  liveFaceNo: { opacity: 0.4 },
  liveFaceMe: { borderColor: colors.paper },
  liveFaceText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.paper },
  liveHead: { gap: 6 },
  liveTitle: { fontFamily: fonts.medium, fontSize: 18, color: colors.paper },
  people: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  person: { paddingHorizontal: 10, height: 28, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.ink3, justifyContent: 'center' },
  personYes: { backgroundColor: colors.spot, borderColor: colors.spot },
  personNo: { borderColor: colors.mute },
  personText: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.paper },
  personTextYes: { color: colors.paper },
  liveCard: { flex: 1, marginTop: 12, borderRadius: radius.lg, overflow: 'hidden' },
  leftCount: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.4, color: colors.mute, textAlign: 'center', marginTop: 8 },
  liveButtons: { flexDirection: 'row', gap: 10, marginTop: 10 },
  flex: { flex: 1 },
  skip: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.mute, textAlign: 'center', marginTop: 12 },
});
