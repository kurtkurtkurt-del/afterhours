import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Backdrop from '@/components/Backdrop';
import BackButton from '@/components/BackButton';
import SoundCorner from '@/components/SoundCorner';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { colors, fonts } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// kayıt. şimdilik ne yazılırsa yazılsın kabul edip uygulamaya alır.
export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const enter = () => router.replace('/app');

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Backdrop />
      <BackButton />
      <SoundCorner />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.body, { paddingBottom: insets.bottom + 24 }]}
      >
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
          <View style={styles.gap} />
          <Button label="enter" onPress={enter} />
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
});
