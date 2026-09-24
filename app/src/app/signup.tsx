import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Storage from 'expo-sqlite/kv-store';
import BackButton from '@/components/BackButton';
import SoundCorner from '@/components/SoundCorner';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { useAuth } from '@/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// kayıt. şimdilik ne yazılırsa yazılsın kabul edip uygulamaya alır.
export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const { signUp, signIn, signInAsGuest, resetPassword } = useAuth();
  const [mode, setMode] = useState<'up' | 'in'>('up');

  // hesap açar (varsa giriş yapar) ve uygulamaya alır.
  // alanlar boşsa cihaza özel anonim kullanıcı: bakmak serbest, kaydırmalar yine de kaydolur,
  // sonra e-posta girince aynı kullanıcı hesaba dönüşür.
  const enter = async () => {
    if (busy) return;
    const guest = !email.trim() && !password;
    setBusy(true);
    setNote(null);
    try {
      const err = guest
        ? await signInAsGuest()
        : mode === 'in'
          ? await signIn(email.trim(), password)
          : await signUp(email.trim(), password, Storage.getItemSync('city') ?? undefined);
      if (guest) {
        // anonim giriş panelde kapalıysa yine de içeri al; kaydırmalar kaydolmaz
        router.replace('/yours');
        return;
      }
      if (err) {
        setNote(err);
        return;
      }
      // handle seçilmediyse kayıt bitmemiş sayılır: önce o adım
      const { data } = await supabase.rpc('profile_me');
      const row = Array.isArray(data) ? data[0] : data;
      router.replace(row?.handle ? '/yours' : '/welcome');
    } catch (e) {
      setNote(String((e as Error).message ?? e).toLowerCase());
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <BackButton />
      <SoundCorner />
      <KeyboardAvoidingView behavior="padding" style={styles.body}>
        {/* alt boşluk burada: klavye sarmalayıcısı kendi paddingBottom'unu ezer */}
        <View style={{ paddingBottom: insets.bottom + 24 }}>
        <View style={styles.heading}>
          <Text style={styles.line}>{mode === 'up' ? 'first time?' : 'welcome back.'}</Text>
          <Text style={styles.line}>{mode === 'up' ? 'welcome in.' : 'sign in.'}</Text>
        </View>
        <View style={styles.form}>
          <Input
            placeholder="email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
          />
          <Input
            placeholder="password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={enter}
          />
          {note && <Text style={styles.note}>{note}</Text>}
          <View style={styles.gap} />
          <Button label={busy ? 'one moment' : mode === 'up' ? 'create account' : 'sign in'} onPress={enter} />
          <Pressable hitSlop={8} onPress={() => setMode((m) => (m === 'up' ? 'in' : 'up'))}>
            <Text style={styles.small}>{mode === 'up' ? 'already have an account? sign in' : 'new here? create an account'}</Text>
          </Pressable>
          <Pressable
            hitSlop={8}
            onPress={async () => {
              const err = await resetPassword(email);
              setNote(err ?? 'reset link sent, check your inbox');
            }}
          >
            <Text style={styles.small}>forgot password? enter your email and tap here</Text>
          </Pressable>
          <Text style={styles.small}>leave both empty to look around first</Text>
        </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  body: { flex: 1, paddingHorizontal: brand.left, justifyContent: 'flex-end' },
  heading: { marginBottom: 36 },
  line: { fontFamily: fonts.medium, fontSize: 34, lineHeight: 40, letterSpacing: -0.8, color: colors.paper },
  form: { gap: 16 },
  gap: { height: 8 },
  note: { fontFamily: fonts.regular, fontSize: 13, color: colors.paper2, opacity: 0.8 },
  small: { fontFamily: fonts.regular, fontSize: 12, color: colors.mute, marginTop: 6 },
});
