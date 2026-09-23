import { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Storage from 'expo-sqlite/kv-store';
import BackButton from '@/components/BackButton';
import SoundCorner from '@/components/SoundCorner';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { useAuth } from '@/auth/AuthContext';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// kayıt. şimdilik ne yazılırsa yazılsın kabul edip uygulamaya alır.
export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const { signUp } = useAuth();

  // hesap açar (varsa giriş yapar) ve uygulamaya alır.
  // alanlar boşsa hesapsız girer: şimdilik bakmak serbest.
  const enter = async () => {
    if (busy) return;
    if (!email.trim() && !password) {
      router.replace('/yours');
      return;
    }
    setBusy(true);
    setNote(null);
    const err = await signUp(email.trim(), password, Storage.getItemSync('city') ?? undefined);
    setBusy(false);
    if (err) setNote(err);
    else router.replace('/yours');
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
          <Text style={styles.line}>first time?</Text>
          <Text style={styles.line}>welcome in.</Text>
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
          <Button label={busy ? 'one moment' : 'enter'} onPress={enter} />
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
});
