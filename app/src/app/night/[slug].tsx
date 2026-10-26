import { useEffect, useRef, useState } from 'react';
import Tips from '@/components/Tips';
import { AppState, KeyboardAvoidingView, Linking, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Scrim from '@/components/Scrim';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import AfterhoursCard from '@/components/AfterhoursCard';
import { checkIn, checkOut, myCards, reasonCode, reasons, roomInfo, toCardData, type CardRow, type RoomInfo, friendsLive, type LiveFriend } from '@/data/checkin';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import Input from '@/components/Input';
import PullDownScroll from '@/components/PullDownScroll';
import SoundCorner from '@/components/SoundCorner';
import { useAuth } from '@/auth/AuthContext';
import { fetchNight, swipe, type Night } from '@/data/deck';
import { ticketMark, ticketState, type TicketAnswer } from '@/data/tickets';
import { OfflineError, useShelf } from '@/lib/offline';
import { shareNight } from '@/lib/share';
import ShareButton from '@/components/ShareButton';
import { AboutSheet, AskButton } from '@/components/About';
import { ListenButton, ListenOverlay } from '@/components/Listen';
import { aboutFor, type About } from '@/data/about';
import { previewsFor, type Preview } from '@/data/previews';
import { useTrack } from '@/audio/useTrack';
import { useReport } from '@/components/ReportSheet';
import { commentCode, commentErrors, fetchComments, postComment, whenText, type Comment } from '@/data/comments';
import { isSyncedBody, upperData, useLang } from '@/i18n';
import NudgeSheet from '@/components/NudgeSheet';
import { colors, fonts, radius, ground, barStyle, tint } from '@/theme/tokens';
import Avatar from '@/components/Avatar';
import { friendsList, type FriendRow } from '@/data/friends';
import { friendPhotos } from '@/data/photo';
import { brand } from '@/theme/layout';
import PillAction from '@/components/PillAction';

const fallback = require('../../../assets/intro/concert.jpg');

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const two = (n: number) => String(n).padStart(2, '0');

// Night page (design B, prototypes/night-page.html, 12.10.2026): the top is a ticket —
// the photo, the title and the kind, a perforated line, a stub with the date, the doors
// and the venue large, and the red action: get a ticket, or check in when there is no
// ticket to get. Under it check in / keep (or keep / share), the room line, the text,
// beforehours.
export default function NightScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { session, isAnonymous } = useAuth();
  const { t, tn, tx, up, lang } = useLang();
  // note and talkNote hold codes; strings are resolved here in the current language.
  const words = (code: string) => {
    if (code === 'nosaved') return t('offline.empty'); // offline and this night was never saved
    const key = commentErrors[code] ?? reasons[code];
    return key ? t(key) : code;
  };
  // "thu 26.09 · 20:00", weekday in the selected language
  const whenLine = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return t('night.tba');
    return `${tx('day.' + DAYS[d.getDay()])} ${two(d.getDate())}.${two(d.getMonth() + 1)} · ${two(d.getHours())}:${two(d.getMinutes())}`;
  };
  const [night, setNight] = useState<Night | null>(null);
  // "who is this?" and listen on the night's own page too (owner, 26.10.2026), top right of
  // the photo under share, the same buttons as on the cards; a preview plays over the photo
  const [about, setAbout] = useState<About | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [reading, setReading] = useState(false);
  const track = useTrack();
  useEffect(() => {
    if (!night?.id) return;
    let live = true;
    aboutFor([night.id], lang).then((m) => live && setAbout(m.get(night.id) ?? null), () => {});
    previewsFor([night.id]).then((m) => live && setPreview(m.get(night.id) ?? null), () => {});
    return () => {
      live = false;
    };
  }, [night?.id, lang]);
  const playing = !!night && track.playing === night.id;
  const [missing, setMissing] = useState(false);
  const [kept, setKept] = useState(false);
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [card, setCard] = useState<CardRow | null>(null);
  const [talk, setTalk] = useState<Comment[] | null>(null);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  // A long press on someone's words reports them (51_safety.sql).
  const reporting = useReport();
  const [sending, setSending] = useState(false);
  const [talkNote, setTalkNote] = useState<string | null>(null);

  // A background fetch that brought a newer night or new comments reads them again.
  const fresh = useShelf('night', 'comments');
  const freshRoom = useShelf('roomInfo', 'cards');
  useEffect(() => {
    let cancelled = false;
    // Offline, a night saved from the deck or map still opens (data/deck.ts).
    fetchNight(slug)
      .then((data) => {
        if (cancelled) return;
        if (data) {
          setNight(data);
          // Beforehours as soon as the night is known; errors quietly give an empty list.
          fetchComments(data.id).then((c) => { if (!cancelled) setTalk(c); }).catch(() => { if (!cancelled) setTalk([]); });
        } else setMissing(true);
      })
      .catch((error) => {
        if (!cancelled) setNote(error instanceof OfflineError ? 'nosaved' : String(error.message).toLowerCase());
      });
    return () => {
      cancelled = true;
    };
  }, [slug, fresh]);

  useEffect(() => {
    if (!session || !slug) return;
    roomInfo(slug).then(setRoom).catch(() => {});
  }, [session, slug, freshRoom]);

  // Check-in: sends the location when available (500 m rule), otherwise only the time rule applies.
  const doCheckIn = async () => {
    if (!night || busy) return;
    if (!session || session.user.is_anonymous) {
      // The card belongs to an account; guests add an email first.
      router.push('/signup');
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      // The door test needs a location; ask now if not granted. Indoors a fresh fix can take minutes
      // (it hung on "one moment"), so use the last known one first, then wait at most 6 s for a fresh one.
      let perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted) perm = await Location.requestForegroundPermissionsAsync();
      if (perm.granted) {
        const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 }).catch(() => null);
        const fresh = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null),
          new Promise<null>((ok) => setTimeout(() => ok(null), 6000)),
        ]);
        const pos = fresh ?? last;
        if (pos) {
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        }
      }
      await checkIn(night.slug, lat, lng);
      const mine = (await myCards()).find((c) => c.slug === night.slug) ?? null;
      setCard(mine);
      setRoom(await roomInfo(night.slug));
    } catch (e) {
      setNote(reasonCode(e));
    }
    setBusy(false);
  };

  const keep = () => {
    setKept(true);
    if (session && night) swipe(night.slug, 'right').catch(() => {});
  };

  // Did you get your ticket? (60_tickets.sql). The ticket page is Ticketmaster's; it
  // tells nobody who bought what. So a tap on "get a ticket" keeps the night (you are
  // interested), and when the app comes back to the front the page asks once: got it /
  // not this time. The answer is stored and never asked again.
  const [ticket, setTicket] = useState<TicketAnswer | null>(null);
  const [askTicket, setAskTicket] = useState(false);
  const [nudging, setNudging] = useState(false);
  const [nudged, setNudged] = useState<string | null>(null);
  // the faces on the nudge card: your people, whoever is out right now first
  const [nudgeFriends, setNudgeFriends] = useState<FriendRow[]>([]);
  const [nudgeLive, setNudgeLive] = useState<LiveFriend[]>([]);
  const [nudgePhotos, setNudgePhotos] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    if (!session || isAnonymous) return;
    let alive = true;
    friendsList().then((l) => alive && setNudgeFriends(l.filter((f) => f.status === 'accepted')), () => {});
    friendsLive().then((l) => alive && setNudgeLive(l), () => {});
    friendPhotos().then((m) => alive && setNudgePhotos(m), () => {});
    return () => {
      alive = false;
    };
  }, [session, isAnonymous]);
  const isOut = (id: string) => nudgeLive.some((l) => l.friend_id === id);
  const friendPhotoOf = (id: string) => nudgePhotos.get(id);
  const nudgeFaces = [...nudgeFriends].sort((a, b) => Number(isOut(b.other_id)) - Number(isOut(a.other_id))).slice(0, 3);
  const awaiting = useRef(false);
  useEffect(() => {
    if (!session || !slug) return;
    let live = true;
    ticketState(slug).then((s) => live && setTicket(s), () => {});
    return () => {
      live = false;
    };
  }, [session, slug]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && awaiting.current) {
        awaiting.current = false;
        setAskTicket(true);
      }
    });
    return () => sub.remove();
  }, []);
  const openTicket = () => {
    if (!night?.ticket_url) return;
    if (!kept) keep();
    if (session && ticket === null) awaiting.current = true;
    Linking.openURL(night.ticket_url).catch(() => {});
  };
  const answerTicket = (a: TicketAnswer) => {
    setAskTicket(false);
    setTicket(a);
    if (slug) ticketMark(slug, a).catch(() => setTicket(null));
  };

  // Beforehours: post, then reload the list. A reply lands under replyTo.
  const say = async () => {
    const body = text.trim();
    if (!night || !body || sending) return;
    if (!session) {
      setTalkNote('signin');
      return;
    }
    setSending(true);
    setTalkNote(null);
    try {
      await postComment(night.id, body, replyTo?.id);
      setText('');
      setReplyTo(null);
      setTalk(await fetchComments(night.id));
    } catch (e) {
      setTalkNote(commentCode(e) ?? reasonCode(e));
    }
    setSending(false);
  };

  const band = (
    <View style={styles.band}>
      <BackButton />
      <SoundCorner />
    </View>
  );
  return (
    <View style={styles.root}>
      <StatusBar style={barStyle} />
      {night ? null : band}
      {night ? (
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <PullDownScroll header={band} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.ticketWrap}>
            <View style={styles.ticket}>
              <View style={[styles.ticketPhoto, { height: (width - brand.left * 2) * 0.78 }]}>
                <Image source={night.image_url ? { uri: night.image_url } : fallback} style={styles.heroPhoto} contentFit="cover" />
                {playing && preview ? <ListenOverlay preview={preview} elapsed={track.elapsed} duration={track.duration} onStop={track.stop} /> : null}
                <ShareButton onPress={() => shareNight(night)} style={styles.ticketShare} />
                {about || preview ? (
                  <View style={styles.extras}>
                    {about ? <AskButton onPress={() => setReading(true)} /> : null}
                    {preview ? <ListenButton onPress={() => track.play(night.id, { uri: preview.preview_url })} playing={playing} /> : null}
                  </View>
                ) : null}
              </View>
              <View style={styles.ticketHead}>
                <Text style={styles.title}>{night.title.toLowerCase()}</Text>
                <Text style={styles.mono}>
                  {tx('type.' + night.type_slug, '') ? up(tx('type.' + night.type_slug, '')) : upperData(night.type_name)}
                  {night.venue_name ? ` · ${upperData(night.venue_name)}` : ` · ${upperData(night.city_name)}`}
                </Text>
              </View>
              {/* the perforation: a dashed line and two notches of the page's own colour */}
              <View style={styles.perf}>
                <View style={styles.perfLine} />
                <View style={[styles.notch, styles.notchLeft]} />
                <View style={[styles.notch, styles.notchRight]} />
              </View>
              <View style={styles.stub}>
                {(() => {
                  const d = night.starts_at ? new Date(night.starts_at) : null;
                  const ok = !!d && !isNaN(d.getTime());
                  return (
                    <>
                      <View style={styles.fact}>
                        <Text style={styles.factK}>{up(t('night.date'))}</Text>
                        <Text style={styles.factBig} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{ok ? `${two(d!.getDate())}.${two(d!.getMonth() + 1)}` : (night.date_text ?? t('night.tba')).toLowerCase()}</Text>
                        {night.starts_at_estimated ? <Text style={styles.factNote}>{t('night.estimated')}</Text> : null}
                      </View>
                      <View style={styles.fact}>
                        <Text style={styles.factK}>{up(t('night.doors'))}</Text>
                        <Text style={styles.factBig}>{ok ? `${two(d!.getHours())}:${two(d!.getMinutes())}` : '—'}</Text>
                      </View>
                      <View style={[styles.fact, styles.factWide]}>
                        <Text style={styles.factK}>{up(t('night.where'))}</Text>
                        <Text style={styles.factV} numberOfLines={2}>{(night.venue_name ?? (night.source === 'ticketmaster' ? night.city_name : t('night.address'))).toLowerCase()}</Text>
                      </View>
                    </>
                  );
                })()}
              </View>
              <View style={styles.stubAction}>
                {night.ticket_url ? (
                  ticket === 'got' ? (
                    <Button label={`${t('night.ticketGot')} ↗`} kind="line" onPress={openTicket} />
                  ) : (
                    <Button label={`${t('night.getTicket')} ↗`} kind="red" onPress={openTicket} />
                  )
                ) : room?.checked_in ? (
                  <Button label={t('night.room')} kind="red" onPress={() => router.push(`/room/${night.slug}`)} />
                ) : (
                  <Button label={busy ? t('word.moment') : t('night.checkin')} kind="red" onPress={doCheckIn} />
                )}
                {!night.ticket_url ? <Text style={styles.stubNote}>{up(`${t('word.szene')} · ${t('night.noTicket')}`)}</Text> : null}
                {night.ticket_url && ticket === 'got' ? <Text style={styles.stubNote}>{up(t('night.ticketYours'))}</Text> : null}
              </View>
            </View>
          </View>

          <View style={styles.body}>
            <View style={styles.actions}>
              {night.ticket_url ? (
                <View style={{ flex: 1 }}>
                  {room?.checked_in ? (
                    <Button label={t('night.room')} onPress={() => router.push(`/room/${night.slug}`)} />
                  ) : (
                    <Button label={busy ? t('word.moment') : t('night.checkin')} onPress={doCheckIn} />
                  )}
                </View>
              ) : null}
              <View style={{ flex: 1 }}>
                <Button label={kept ? t('night.kept') : t('word.keep')} kind="line" onPress={keep} />
              </View>
              {!night.ticket_url ? (
                <View style={{ flex: 1 }}>
                  {/* Share: the night's web page; "open in the app" on the site brings it back. */}
                  <Button label={t('night.share')} kind="line" onPress={() => shareNight(night)} />
                </View>
              ) : null}
            </View>
            {note ? <Text style={styles.mono}>{up(words(note))}</Text> : null}
            {room ? <Text style={styles.mono}>{up(tn('night.checkedin', room.who_count))}</Text> : null}

            {/* Nudge a friend about this night (owner, 12.10.2026): a direct message with the link.
                A card of its own since 22.10.2026 — the faces of your people on it, whoever is out
                first — so it reads as the thing to do, not a side button. */}
            {session && !isAnonymous ? (
              <Pressable onPress={() => setNudging(true)} accessibilityRole="button" accessibilityLabel={t('night.nudge')} style={({ pressed }) => [styles.nudgeCard, pressed && styles.pressed]}>
                <View style={styles.nudgeFaces}>
                  {nudgeFaces.map((f, i) => {
                    const photo = friendPhotoOf(f.other_id);
                    return (
                      <View key={f.other_id} style={[styles.nudgeFace, i > 0 && styles.nudgeOverlap, isOut(f.other_id) && styles.nudgeLive]}>
                        {photo ? <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Avatar name={f.handle ?? f.display_name ?? '?'} size={34} />}
                      </View>
                    );
                  })}
                  {!nudgeFaces.length ? <View style={[styles.nudgeFace, styles.nudgeEmpty]}><Text style={styles.nudgePlus}>+</Text></View> : null}
                </View>
                <View style={styles.nudgeText}>
                  <Text style={styles.nudgeTitle} numberOfLines={1}>{nudged ? t('night.nudged', { name: nudged }) : t('night.nudge')}</Text>
                  <Text style={styles.nudgeHint} numberOfLines={2}>{nudged ? t('night.nudge.again') : t('night.nudge.hint')}</Text>
                </View>
                <Text style={styles.nudgeArrow}>→</Text>
              </Pressable>
            ) : null}

            {/* The synced sentence (one fixed line for every listed night) is not shown since 12.10.2026;
                a night's own text still is. The room rule line went the same day. */}
            {night.body && !isSyncedBody(night.body) ? <Text style={styles.text}>{night.body}</Text> : null}
            {night.starts_at ? <Text style={styles.mono}>{up(whenLine(night.starts_at))}</Text> : null}

            {/* Beforehours: what people said before the night. Anyone can post, guests too. */}
            <View style={styles.talk}>
              <Text style={styles.mono}>{upperData('beforehours')}</Text>
              {talk === null ? (
                <Text style={styles.talkNone}>{t('night.loading')}</Text>
              ) : talk.length === 0 ? (
                <Text style={styles.talkNone}>{t('comments.none')}</Text>
              ) : (
                talk.map((c) => (
                  <View key={c.id} style={styles.topic}>
                    <Text style={styles.talkWho}>{c.who || t('word.someone')} · {c.waiting ? t('offline.waiting') : whenText(c.at, t, tx)}</Text>
                    <Text style={styles.talkBody} onLongPress={c.waiting ? undefined : () => reporting.ask('comment', c.id)}>{c.body}</Text>
                    {c.replies.map((r, i) => (
                      <View key={i} style={styles.reply}>
                        <Text style={styles.talkWho}>{r.who || t('word.someone')} · {r.waiting ? t('offline.waiting') : whenText(r.at, t, tx)}</Text>
                        <Text style={styles.talkBody} onLongPress={r.id ? () => reporting.ask('comment', r.id!) : undefined}>{r.body}</Text>
                      </View>
                    ))}
                    <View style={styles.talkLinks}>
                      <Pressable onPress={() => setReplyTo(replyTo?.id === c.id ? null : c)} hitSlop={8}>
                        <Text style={[styles.talkLink, replyTo?.id === c.id && styles.talkLinkOn]}>{replyTo?.id === c.id ? t('comments.replying') : t('comments.reply')}</Text>
                      </Pressable>
                      {c.waiting ? null : <PillAction small icon="flag" label={t('posts.report')} onPress={() => reporting.ask('comment', c.id)} />}
                    </View>
                  </View>
                ))
              )}
              <View style={styles.compose}>
                {replyTo ? <Text style={styles.talkWho}>{t('comments.to', { name: replyTo.who || t('word.someone') })}</Text> : null}
                <Input
                  value={text}
                  onChangeText={setText}
                  placeholder={replyTo ? t('comments.placeholder.reply') : t('comments.placeholder')}
                  maxLength={500}
                  multiline
                  returnKeyType="send"
                  blurOnSubmit
                  onSubmitEditing={say}
                />
                {talkNote ? <Text style={styles.talkNote}>{words(talkNote)}</Text> : null}
                <Pressable onPress={say} disabled={sending || !text.trim()} style={[styles.sendBtn, (sending || !text.trim()) && styles.sendBtnOff]}>
                  <Text style={styles.sendText}>{sending ? t('word.moment') : t('comments.say')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </PullDownScroll>
        </KeyboardAvoidingView>
      ) : null}
      <AboutSheet about={reading ? about : null} onClose={() => setReading(false)} />

      {/* Card earned: first reveal, then the room. */}
      <Modal visible={!!card} transparent animationType="fade" onRequestClose={() => setCard(null)}>
        <Pressable style={styles.dim} onPress={() => setCard(null)}>
          <Text style={styles.cardLabel}>{up(t('night.card', { no: card ? String(card.card_no).padStart(4, '0') : '' }))}</Text>
          {card ? <AfterhoursCard data={toCardData(card)} index={card.card_no} width={Math.min(width - 48, 340)} /> : null}
          <Pressable
            onPress={() => {
              setCard(null);
              if (night) router.push(`/room/${night.slug}`);
            }}
            style={styles.roomBtn}
          >
            <Text style={styles.roomBtnText}>{t('night.openroom')}</Text>
          </Pressable>
          {/* Within the hour the check-in can be taken back (88_checkin_truth.sql); after it
              the server answers "toolate" and the note says the card stays. */}
          {card && !card.waiting ? (
            <View style={styles.undoRow}>
              <PillAction
                icon="out"
                label={t('checkin.undo')}
                onPress={() => {
                  if (!night) return;
                  checkOut(night.slug)
                    .then(async () => {
                      setCard(null);
                      setRoom(await roomInfo(night.slug));
                    })
                    .catch((e) => setNote(reasonCode(e)));
                }}
              />
            </View>
          ) : null}
        </Pressable>
      </Modal>
      {!night && (
        <View style={styles.centre}>
          <Text style={styles.mono}>{up(missing ? t('night.gone') : note ? words(note) : t('night.loading'))}</Text>
        </View>
      )}
      <Tips page="night" tip={{ title: 'tips.night.1.t', body: 'tips.night.1.b', motion: 'tap' }} bottom={insets.bottom + 84} />
      {reporting.sheet}

      {night ? <NudgeSheet open={nudging} night={night} onClose={() => setNudging(false)} onSent={setNudged} seed={{ friends: nudgeFriends, live: nudgeLive, photos: nudgePhotos }} /> : null}

      {/* Back from the ticket page: one question, once. */}
      <Modal visible={askTicket} transparent animationType="fade" onRequestClose={() => setAskTicket(false)}>
        <Scrim onPress={() => setAskTicket(false)} />
        <View style={[styles.askSheet, { paddingBottom: insets.bottom + 18 }]}>
          <Text style={styles.askTitle}>{t('night.ask.ticket')}</Text>
          <Text style={styles.askNote}>{t('night.ask.ticket.note')}</Text>
          <View style={styles.actions}>
            <View style={{ flex: 1 }}><Button label={t('night.ask.got')} kind="red" onPress={() => answerTicket('got')} /></View>
            <View style={{ flex: 1 }}><Button label={t('night.ask.no')} kind="line" onPress={() => answerTicket('no')} /></View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 36, zIndex: 2 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // the ticket (design B)
  ticketWrap: { paddingHorizontal: brand.left, paddingTop: brand.top + 44 },
  ticket: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.edge },
  ticketPhoto: { backgroundColor: colors.ink2, overflow: 'hidden' },
  heroPhoto: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  ticketShare: { right: 12, top: 12, bottom: 'auto' },
  extras: { position: 'absolute', top: 60, right: 12, alignItems: 'flex-end', gap: 8 },
  ticketHead: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, gap: 6 },
  perf: { height: 2, marginHorizontal: 12, justifyContent: 'center' },
  perfLine: { borderTopWidth: 2, borderStyle: 'dashed', borderColor: colors.edge },
  notch: { position: 'absolute', top: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.ink, borderWidth: 1, borderColor: colors.edge },
  notchLeft: { left: -21 },
  notchRight: { right: -21 },
  stub: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  fact: { flex: 1, gap: 2 },
  factWide: { flex: 1.4 },
  factK: { fontFamily: fonts.jet, fontSize: 9, letterSpacing: 1.2, color: colors.mute },
  factBig: { fontFamily: fonts.logo, fontSize: 24, lineHeight: 26, letterSpacing: -0.5, color: colors.paper },
  factV: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 18, color: colors.paper, marginTop: 4 },
  factNote: { fontFamily: fonts.regular, fontSize: 10, color: colors.mute },
  stubAction: { padding: 12, paddingTop: 10, gap: 8 },
  stubNote: { fontFamily: fonts.jet, fontSize: 9, letterSpacing: 1.2, color: colors.mute, textAlign: 'center' },
  // the question on return from the ticket page
  askSheet: { backgroundColor: colors.ink, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderTopWidth: 1, borderColor: colors.ink3, paddingHorizontal: brand.left, paddingTop: 20, gap: 14 },
  askTitle: { fontFamily: fonts.semibold, fontSize: 22, letterSpacing: -0.5, color: colors.paper },
  askNote: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.mute },
  title: { fontFamily: fonts.logo, fontSize: 34, lineHeight: 34, letterSpacing: -0.9, color: colors.spotText },
  mono: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.mute },
  body: { paddingHorizontal: brand.left, paddingTop: 18, gap: 22 },
  actions: { flexDirection: 'row', gap: 10 },
  text: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.paper2, opacity: 0.9 },
  nudgeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, backgroundColor: tint(0.08), borderWidth: 1, borderColor: tint(0.45) },
  nudgeFaces: { flexDirection: 'row' },
  nudgeFace: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden', borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.ink3, alignItems: 'center', justifyContent: 'center' },
  nudgeOverlap: { marginLeft: -12 },
  nudgeLive: { borderColor: colors.spot },
  nudgeEmpty: { backgroundColor: 'transparent', borderStyle: 'dashed', borderColor: colors.spotText },
  nudgePlus: { fontFamily: fonts.medium, fontSize: 18, color: colors.spotText },
  nudgeText: { flex: 1, minWidth: 0, gap: 2 },
  nudgeTitle: { fontFamily: fonts.semibold, fontSize: 16, letterSpacing: -0.3, color: colors.spotText },
  nudgeHint: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 17, color: colors.mute },
  nudgeArrow: { fontFamily: fonts.medium, fontSize: 20, color: colors.spotText },
  pressed: { opacity: 0.7 },
  dim: { flex: 1, backgroundColor: ground(0.94), alignItems: 'center', justifyContent: 'center', gap: 18 },
  cardLabel: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.spot },
  talk: { marginTop: 28, paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.ink3, gap: 10 },
  topic: { gap: 4, paddingTop: 8 },
  reply: { marginLeft: 14, paddingTop: 6, gap: 2 },
  talkWho: { fontFamily: fonts.regular, fontSize: 11, color: colors.paper, opacity: 0.5 },
  talkBody: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.paper },
  talkNone: { fontFamily: fonts.regular, fontSize: 14, color: colors.paper, opacity: 0.5 },
  talkLinks: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6 },
  talkLink: { fontFamily: fonts.medium, fontSize: 12, color: colors.paper, opacity: 0.55, marginTop: 2 },
  talkLinkOn: { opacity: 1, color: colors.spot },
  compose: { marginTop: 10, gap: 8 },
  talkNote: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute },
  sendBtn: { alignSelf: 'flex-end', backgroundColor: colors.paper, paddingVertical: 8, paddingHorizontal: 16, borderRadius: radius.pill },
  sendBtnOff: { opacity: 0.4 },
  sendText: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  roomBtn: { backgroundColor: colors.paper, paddingVertical: 10, paddingHorizontal: 20, borderRadius: radius.pill },
  roomBtnText: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  undoRow: { marginTop: 14 },
});
