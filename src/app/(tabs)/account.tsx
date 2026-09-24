import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Storage from 'expo-sqlite/kv-store';
import AfterhoursCard from '@/components/AfterhoursCard';
import Icon from '@/components/Icon';
import Button from '@/components/Button';
import SoundCorner from '@/components/SoundCorner';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import { useAuth } from '@/auth/AuthContext';
import { useProfile } from '@/data/profile';
import { collection } from '@/content/collection';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

const GAP = 8;

// profil, seçenek 1 "kimlik kartı": baş harf, isim, bio, üç sayı, koleksiyon ızgarası.
export default function AccountScreen() {
  const { session, signOut } = useAuth();
  const profile = useProfile();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState<number | null>(null);
  const [side, setSide] = useState<'front' | 'back'>('front');

  const name = (profile?.display_name ?? session?.user.email?.split('@')[0] ?? 'you').toLowerCase();
  const handle = profile?.handle ? `@${profile.handle}` : null;
  const city = profile?.city_name ?? Storage.getItemSync('city.name');
  const since = profile ? new Date(profile.created_at) : null;
  const sinceText = since ? `since ${String(since.getMonth() + 1).padStart(2, '0')}.${String(since.getFullYear()).slice(2)}` : null;
  const joined = since ? since.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toLowerCase() : null;
  const seen = profile?.last_seen_at ? new Date(profile.last_seen_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toLowerCase() : null;
  const cardW = (width - brand.left * 2 - GAP * 2) / 3;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.band}>
        <Text style={styles.title}>account</Text>
        <Pressable onPress={() => router.push('/settings')} hitSlop={12} accessibilityRole="button" accessibilityLabel="settings" style={({ pressed }) => [styles.gear, pressed && styles.pressed]}>
          <Icon name="settings" size={20} color={colors.paper} />
        </Pressable>
        <SoundCorner />
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: TAB_BAR_SPACE + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={styles.initial}>
          <Text style={styles.initialText}>{name.charAt(0)}</Text>
        </View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.meta}>{[handle, city?.toLowerCase(), sinceText].filter(Boolean).join(' · ') || 'not signed in'}</Text>
        {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        {session ? (
          <>
            <View style={styles.counts}>
              <Count n={collection.length} label="nights" />
              <Count n={profile?.kept_count ?? 0} label="kept" />
              <Count n={profile?.friend_count ?? 0} label="friends" />
              <Count n={profile?.comment_count ?? 0} label="said" />
            </View>
            <View style={styles.details}>
              {joined ? <Detail k="joined" v={joined} /> : null}
              {seen ? <Detail k="last seen" v={seen} /> : null}
              <Detail k="home" v={(profile?.city_name ?? city ?? 'not set').toLowerCase()} />
              <Detail k="handle" v={handle ?? 'not chosen yet'} />
            </View>
            <Pressable onPress={() => signOut().then(() => router.replace('/'))} hitSlop={8} style={styles.edit}>
              <Text style={styles.link}>sign out</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.cta}>
            <Button label="sign up" onPress={() => router.push('/signup')} />
          </View>
        )}

        <View style={styles.rule} />
        <Text style={styles.section}>collection</Text>
        <View style={styles.grid}>
          {collection.map((c, i) => (
            <Pressable
              key={`${c.t}-${i}`}
              onPress={() => {
                setSide('front');
                setOpen(i);
              }}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <AfterhoursCard data={c} index={i} width={cardW} />
            </Pressable>
          ))}
        </View>

      </ScrollView>

      {/* kart büyütme: dokununca ön/arka döner */}
      <Modal visible={open !== null} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <Pressable style={styles.dim} onPress={() => setOpen(null)}>
          {open !== null && (
            <Pressable onPress={() => setSide((s) => (s === 'front' ? 'back' : 'front'))}>
              <AfterhoursCard data={collection[open]} index={open} side={side} width={Math.min(width - 48, 360)} />
            </Pressable>
          )}
          <Text style={styles.flipHint}>tap the card to turn it</Text>
        </Pressable>
      </Modal>
    </View>
  );
}

function Detail({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailK}>{k}</Text>
      <Text style={styles.detailV}>{v}</Text>
    </View>
  );
}

function Count({ n, label }: { n: number; label: string }) {
  return (
    <View>
      <Text style={styles.countN}>{n}</Text>
      <Text style={styles.countL}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  band: { position: 'absolute', top: 0, left: 0, right: 0, height: brand.top + 36, backgroundColor: colors.ink, zIndex: 2 },
  title: { position: 'absolute', top: brand.top, left: brand.left, fontFamily: fonts.medium, fontSize: brand.smallSize, letterSpacing: -0.3, color: colors.paper, zIndex: 1 },
  body: { paddingTop: brand.top + 56, paddingHorizontal: brand.left },
  initial: { width: 64, height: 64, borderWidth: 1.5, borderColor: colors.paper, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  initialText: { fontFamily: fonts.medium, fontSize: 30, color: colors.paper, letterSpacing: -0.5 },
  name: { fontFamily: fonts.medium, fontSize: 28, lineHeight: 30, letterSpacing: -0.8, color: colors.paper },
  meta: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.mute, marginTop: 6 },
  bio: { fontFamily: fonts.regular, fontSize: 15, color: colors.paper2, opacity: 0.85, marginTop: 8 },
  counts: { flexDirection: 'row', gap: 28, marginTop: 20 },
  countN: { fontFamily: fonts.medium, fontSize: 24, letterSpacing: -0.6, color: colors.paper, fontVariant: ['tabular-nums'] },
  countL: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.mute },
  details: { marginTop: 18, gap: 6 },
  detail: { flexDirection: 'row', justifyContent: 'space-between' },
  detailK: { fontFamily: fonts.regular, fontSize: 13, color: colors.mute },
  detailV: { fontFamily: fonts.regular, fontSize: 13, color: colors.paper2 },
  edit: { marginTop: 14, alignSelf: 'flex-start' },
  cta: { marginTop: 20 },
  rule: { borderTopWidth: 1, borderTopColor: colors.ink3, marginVertical: 20 },
  section: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.mute, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  pressed: { opacity: 0.7 },
  gear: { position: 'absolute', top: brand.top - 3, right: brand.left + 84 },
  link: { fontFamily: fonts.regular, fontSize: 14, color: colors.mute },
  dim: { flex: 1, backgroundColor: 'rgba(22,21,18,0.92)', alignItems: 'center', justifyContent: 'center', gap: 18 },
  flipHint: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.mute },
});
