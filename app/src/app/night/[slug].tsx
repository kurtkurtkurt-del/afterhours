import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Linking, Modal, Pressable, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import * as Location from 'expo-location';
import AfterhoursCard from '@/components/AfterhoursCard';
import { checkIn, myCards, reasonCode, reasons, roomInfo, toCardData, type CardRow, type RoomInfo } from '@/data/checkin';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import Input from '@/components/Input';
import PullDownScroll from '@/components/PullDownScroll';
import SoundCorner from '@/components/SoundCorner';
import { useAuth } from '@/auth/AuthContext';
import { fetchNight, SITE, swipe, type Night } from '@/data/deck';
import { OfflineError } from '@/lib/offline';
import { commentCode, commentErrors, fetchComments, postComment, whenText, type Comment } from '@/data/comments';
import { bodyText, upperData, useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

const fallback = require('../../../assets/intro/concert.jpg');

// bir gecenin web sayfası; paylaşılan bağlantı budur
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const two = (n: number) => String(n).padStart(2, '0');

const webUrl = (slug: string) => `${SITE}explore/event/index.html?slug=${encodeURIComponent(slug)}`;

// gece sayfası: fotoğraf, künye, metin, mekân; keep ve varsa bilet.
export default function NightScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { session } = useAuth();
  const { t, tn, tx, up } = useLang();
  // note ve talkNote kod saklar; söz burada, o anki dilde çözülür
  const words = (code: string) => {
    if (code === 'nosaved') return t('offline.empty'); // çevrimdışı ve bu gece kaydedilmemiş
    const key = commentErrors[code] ?? reasons[code];
    return key ? t(key) : code;
  };
  // "thu 26.09 · 20:00", gün adı seçili dilde
  const whenLine = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return t('night.tba');
    return `${tx('day.' + DAYS[d.getDay()])} ${two(d.getDate())}.${two(d.getMonth() + 1)} · ${two(d.getHours())}:${two(d.getMinutes())}`;
  };
  const [night, setNight] = useState<Night | null>(null);
  const [missing, setMissing] = useState(false);
  const [kept, setKept] = useState(false);
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [card, setCard] = useState<CardRow | null>(null);
  const [talk, setTalk] = useState<Comment[] | null>(null);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [sending, setSending] = useState(false);
  const [talkNote, setTalkNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // çevrimdışıyken desteden/haritadan kaydedilen gece açılır (data/deck.ts)
    fetchNight(slug)
      .then((data) => {
        if (cancelled) return;
        if (data) {
          setNight(data);
          // beforehours, gece bilinir bilinmez; hata sessizce boş liste
          fetchComments(data.id).then((c) => { if (!cancelled) setTalk(c); }).catch(() => { if (!cancelled) setTalk([]); });
        } else setMissing(true);
      })
      .catch((error) => {
        if (!cancelled) setNote(error instanceof OfflineError ? 'nosaved' : String(error.message).toLowerCase());
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!session || !slug) return;
    roomInfo(slug).then(setRoom).catch(() => {});
  }, [session, slug]);

  // check-in: konum varsa gönderilir (500 m kuralı), yoksa sadece zaman kuralı
  const doCheckIn = async () => {
    if (!night || busy) return;
    if (!session || session.user.is_anonymous) {
      // kart bir hesaba bağlanır; misafir önce e-posta ekler
      router.push('/signup');
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      // kapı testi konum ister; izin yoksa şimdi sor. kapalı mekânda taze konum dakikalarca
      // gelmeyebilir ("one moment"da takılıyordu): önce son bilinen, sonra en çok 6 sn taze.
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

  // beforehours: yaz, listeyi yeniden çek. cevapsa replyTo'nun altına düşer.
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

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.band}>
        <BackButton />
        <SoundCorner />
      </View>
      {night ? (
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <PullDownScroll contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={[styles.hero, { height: width * 1.1 }]}>
            <Image source={night.image_url ? { uri: night.image_url } : fallback} style={styles.heroPhoto} resizeMode="cover" />
            <View style={styles.heroShade} />
            <View style={styles.heroText}>
              <Text style={styles.mono}>
                {tx('type.' + night.type_slug, '') ? up(tx('type.' + night.type_slug, '')) : upperData(night.type_name)} · {up(night.source === 'ticketmaster' ? t('word.ticket') : t('word.szene'))} · {upperData(night.city_name)}
              </Text>
              <Text style={styles.title}>{night.title.toLowerCase()}</Text>
              <Text style={styles.mono}>{upperData(night.meta)}</Text>
            </View>
          </View>

          <View style={styles.body}>
            <View style={styles.actions}>
              <View style={{ flex: 1 }}>
                {room?.checked_in ? (
                  <Button label={t('night.room')} kind="line" onPress={() => router.push(`/room/${night.slug}`)} />
                ) : (
                  <Button label={busy ? t('word.moment') : t('night.checkin')} onPress={doCheckIn} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Button label={kept ? t('night.kept') : t('word.keep')} kind={room?.checked_in ? 'fill' : 'line'} onPress={keep} />
              </View>
            </View>
            {note ? <Text style={styles.mono}>{up(words(note))}</Text> : null}
            <View style={styles.actions}>
              {night.ticket_url ? (
                <View style={{ flex: 1 }}>
                  <Button label={t('word.ticket')} kind="line" onPress={() => Linking.openURL(night.ticket_url!)} />
                </View>
              ) : null}
              <View style={{ flex: 1 }}>
                {/* paylaşım: gecenin web sayfası. sitedeki "open in the app" geri getirir. */}
                <Button label={t('night.share')} kind="line" onPress={() => Share.share({ message: `${night.title.toLowerCase()} · ${webUrl(night.slug)}`, url: webUrl(night.slug) })} />
              </View>
            </View>
            {room ? (
              <Text style={styles.mono}>
                {up(tn('night.checkedin', room.who_count))} · {up(room.frozen ? t('night.room.frozen') : t('night.room.open'))}
              </Text>
            ) : null}

            {night.body ? <Text style={styles.text}>{bodyText(night.body, t)}</Text> : null}

            <View style={styles.rows}>
              <Row k={t('night.where')} v={night.venue_name ?? (night.source === 'ticketmaster' ? night.city_name : t('night.address'))} />
              <Row k={t('night.when')} v={night.starts_at ? whenLine(night.starts_at) : (night.date_text ?? t('night.tba'))} />
              <Row k={t('night.kind')} v={tx('type.' + night.type_slug, night.type_name.toLowerCase())} />
              {night.starts_at_estimated ? <Row k={t('night.date')} v={t('night.estimated')} /> : null}
            </View>

            <Text style={styles.mono}>{up(t('night.rule'))}</Text>

            {/* beforehours: geceden önce söylenenler. herkes yazar, misafir de. */}
            <View style={styles.talk}>
              <Text style={styles.mono}>{upperData('beforehours')}</Text>
              {talk === null ? (
                <Text style={styles.talkNone}>{t('night.loading')}</Text>
              ) : talk.length === 0 ? (
                <Text style={styles.talkNone}>{t('comments.none')}</Text>
              ) : (
                talk.map((c) => (
                  <View key={c.id} style={styles.topic}>
                    <Text style={styles.talkWho}>{c.who || t('word.someone')} · {whenText(c.at, t, tx)}</Text>
                    <Text style={styles.talkBody}>{c.body}</Text>
                    {c.replies.map((r, i) => (
                      <View key={i} style={styles.reply}>
                        <Text style={styles.talkWho}>{r.who || t('word.someone')} · {whenText(r.at, t, tx)}</Text>
                        <Text style={styles.talkBody}>{r.body}</Text>
                      </View>
                    ))}
                    <Pressable onPress={() => setReplyTo(replyTo?.id === c.id ? null : c)} hitSlop={8}>
                      <Text style={[styles.talkLink, replyTo?.id === c.id && styles.talkLinkOn]}>{replyTo?.id === c.id ? t('comments.replying') : t('comments.reply')}</Text>
                    </Pressable>
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

      {/* kart çıktı: ilk gösterim, sonra oda */}
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
        </Pressable>
      </Modal>
      {!night && (
        <View style={styles.centre}>
          <Text style={styles.mono}>{up(missing ? t('night.gone') : note ? words(note) : t('night.loading'))}</Text>
        </View>
      )}
    </View>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 36, zIndex: 2 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { backgroundColor: colors.ink2, overflow: 'hidden', borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  heroPhoto: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  heroShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 170, backgroundColor: colors.ink, opacity: 0.78 },
  heroText: { position: 'absolute', left: brand.left, right: brand.left, bottom: 18, gap: 6 },
  title: { fontFamily: fonts.medium, fontSize: 34, lineHeight: 36, letterSpacing: -1.1, color: colors.paper },
  mono: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.mute },
  body: { paddingHorizontal: brand.left, paddingTop: 18, gap: 22 },
  actions: { flexDirection: 'row', gap: 10 },
  text: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.paper2, opacity: 0.9 },
  rows: { borderTopWidth: 1, borderTopColor: colors.ink3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.ink3 },
  rowK: { fontFamily: fonts.regular, fontSize: 13, color: colors.mute },
  rowV: { fontFamily: fonts.regular, fontSize: 13, color: colors.paper2, flex: 1, textAlign: 'right' },
  dim: { flex: 1, backgroundColor: 'rgba(14,13,12,0.94)', alignItems: 'center', justifyContent: 'center', gap: 18 },
  cardLabel: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, color: colors.spot },
  talk: { marginTop: 28, paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.ink3, gap: 10 },
  topic: { gap: 4, paddingTop: 8 },
  reply: { marginLeft: 14, paddingTop: 6, gap: 2 },
  talkWho: { fontFamily: fonts.regular, fontSize: 11, color: colors.paper, opacity: 0.5 },
  talkBody: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.paper },
  talkNone: { fontFamily: fonts.regular, fontSize: 14, color: colors.paper, opacity: 0.5 },
  talkLink: { fontFamily: fonts.medium, fontSize: 12, color: colors.paper, opacity: 0.55, marginTop: 2 },
  talkLinkOn: { opacity: 1, color: colors.spot },
  compose: { marginTop: 10, gap: 8 },
  talkNote: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute },
  sendBtn: { alignSelf: 'flex-end', backgroundColor: colors.paper, paddingVertical: 8, paddingHorizontal: 16, borderRadius: radius.pill },
  sendBtnOff: { opacity: 0.4 },
  sendText: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  roomBtn: { backgroundColor: colors.paper, paddingVertical: 10, paddingHorizontal: 20, borderRadius: radius.pill },
  roomBtnText: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
});
