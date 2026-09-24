import { useEffect, useState } from 'react';
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import * as Location from 'expo-location';
import AfterhoursCard from '@/components/AfterhoursCard';
import { checkIn, myCards, reason, roomInfo, toCardData, type CardRow, type RoomInfo } from '@/data/checkin';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import SoundCorner from '@/components/SoundCorner';
import { useAuth } from '@/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import { swipe, type Night } from '@/data/deck';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

const fallback = require('../../../assets/intro/concert.jpg');

// gece sayfası: fotoğraf, künye, metin, mekân; keep ve varsa bilet.
export default function NightScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { session } = useAuth();
  const [night, setNight] = useState<Night | null>(null);
  const [missing, setMissing] = useState(false);
  const [kept, setKept] = useState(false);
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [card, setCard] = useState<CardRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('events_public')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) setNight(data as Night);
        else setMissing(true);
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
    if (!session) {
      router.push('/signup');
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.granted) {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      }
      await checkIn(night.slug, lat, lng);
      const mine = (await myCards()).find((c) => c.slug === night.slug) ?? null;
      setCard(mine);
      setRoom(await roomInfo(night.slug));
    } catch (e) {
      setNote(reason(e));
    }
    setBusy(false);
  };

  const keep = () => {
    setKept(true);
    if (session && night) swipe(night.slug, 'right').catch(() => {});
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.band}>
        <BackButton />
        <SoundCorner />
      </View>
      {night ? (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
          <View style={[styles.hero, { height: width * 1.1 }]}>
            <Image source={night.image_url ? { uri: night.image_url } : fallback} style={styles.heroPhoto} resizeMode="cover" />
            <View style={styles.heroShade} />
            <View style={styles.heroText}>
              <Text style={styles.mono}>
                {night.type_name} · {night.source === 'ticketmaster' ? 'ticket' : 'szene'} · {night.city_name}
              </Text>
              <Text style={styles.title}>{night.title.toLowerCase()}</Text>
              <Text style={styles.mono}>{night.meta}</Text>
            </View>
          </View>

          <View style={styles.body}>
            <View style={styles.actions}>
              <View style={{ flex: 1 }}>
                {room?.checked_in ? (
                  <Button label="the room" kind="line" onPress={() => router.push(`/room/${night.slug}`)} />
                ) : (
                  <Button label={busy ? 'one moment' : 'check in'} onPress={doCheckIn} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Button label={kept ? 'kept' : 'keep'} kind={room?.checked_in ? 'fill' : 'line'} onPress={keep} />
              </View>
            </View>
            {note ? <Text style={styles.mono}>{note}</Text> : null}
            {night.ticket_url ? <Button label="ticket" kind="line" onPress={() => Linking.openURL(night.ticket_url!)} /> : null}
            {room ? (
              <Text style={styles.mono}>
                {room.who_count} checked in · {room.frozen ? 'room frozen' : 'room open'}
              </Text>
            ) : null}

            {night.body ? <Text style={styles.text}>{night.body}</Text> : null}

            <View style={styles.rows}>
              <Row k="where" v={night.venue_name ?? (night.source === 'ticketmaster' ? night.city_name : 'address opens at check-in')} />
              <Row k="when" v={night.starts_at ? new Date(night.starts_at).toLocaleString('en-GB', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).toLowerCase() : (night.date_text ?? 'tba')} />
              <Row k="kind" v={night.type_name.toLowerCase()} />
              {night.starts_at_estimated ? <Row k="date" v="estimated" /> : null}
            </View>

            <Text style={styles.mono}>the room opens at check-in and freezes 48h after the night</Text>
          </View>
        </ScrollView>
      ) : null}

      {/* kart çıktı: ilk gösterim, sonra oda */}
      <Modal visible={!!card} transparent animationType="fade" onRequestClose={() => setCard(null)}>
        <Pressable style={styles.dim} onPress={() => setCard(null)}>
          <Text style={styles.cardLabel}>you were there · card no. {card ? String(card.card_no).padStart(4, '0') : ''}</Text>
          {card ? <AfterhoursCard data={toCardData(card)} index={card.card_no} width={Math.min(width - 48, 340)} /> : null}
          <Pressable
            onPress={() => {
              setCard(null);
              if (night) router.push(`/room/${night.slug}`);
            }}
            style={styles.roomBtn}
          >
            <Text style={styles.roomBtnText}>open the room</Text>
          </Pressable>
        </Pressable>
      </Modal>
      {!night && (
        <View style={styles.centre}>
          <Text style={styles.mono}>{missing ? 'this night is gone' : 'loading…'}</Text>
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
  hero: { backgroundColor: colors.ink2, overflow: 'hidden' },
  heroPhoto: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  heroShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 170, backgroundColor: colors.ink, opacity: 0.78 },
  heroText: { position: 'absolute', left: brand.left, right: brand.left, bottom: 18, gap: 6 },
  title: { fontFamily: fonts.medium, fontSize: 34, lineHeight: 36, letterSpacing: -1.1, color: colors.paper },
  mono: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.mute },
  body: { paddingHorizontal: brand.left, paddingTop: 18, gap: 22 },
  actions: { flexDirection: 'row', gap: 10 },
  text: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.paper2, opacity: 0.9 },
  rows: { borderTopWidth: 1, borderTopColor: colors.ink3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.ink3 },
  rowK: { fontFamily: fonts.regular, fontSize: 13, color: colors.mute },
  rowV: { fontFamily: fonts.regular, fontSize: 13, color: colors.paper2, flex: 1, textAlign: 'right' },
  dim: { flex: 1, backgroundColor: 'rgba(22,21,18,0.94)', alignItems: 'center', justifyContent: 'center', gap: 18 },
  cardLabel: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.spot },
  roomBtn: { backgroundColor: colors.paper, paddingVertical: 10, paddingHorizontal: 18 },
  roomBtnText: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
});
