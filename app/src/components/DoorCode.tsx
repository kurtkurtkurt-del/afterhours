import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';

// The code at the door (design 16C): a dark panel, one box per letter as you type,
// the red enter key. The letters come from the phone's own keyboard (codes are words).
// A wrong code shakes the panel. Give it a key per request so it starts empty.
export default function DoorCode({ open, title, error, onSubmit, onClose }: {
  open: boolean;
  title: string;
  error: string | null;
  onSubmit: (code: string) => void;
  onClose: () => void;
}) {
  const { up } = useLang();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const input = useRef<TextInput>(null);
  const shake = useSharedValue(0);
  const [lastError, setLastError] = useState<string | null>(null);
  if (error !== lastError) {
    setLastError(error);
    if (error) shake.set(withSequence(withTiming(-12, { duration: 50 }), withTiming(12, { duration: 70 }), withTiming(-8, { duration: 60 }), withTiming(0, { duration: 60 })));
  }
  const panel = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const boxes = [...code.toUpperCase().split(''), ''];
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.dim} onPress={onClose} />
        <Animated.View style={[styles.panel, { paddingBottom: insets.bottom + 20 }, panel]}>
          <Text style={styles.title}>{up(title)}</Text>
          <Pressable onPress={() => input.current?.focus()} style={styles.boxes}>
            {boxes.map((c, i) => (
              <View key={i} style={[styles.box, c === ' ' && styles.space, i === boxes.length - 1 && styles.boxNext]}>
                <Text style={styles.letter}>{c === ' ' ? '' : c}</Text>
              </View>
            ))}
          </Pressable>
          <TextInput
            ref={input}
            value={code}
            onChangeText={(v) => setCode(v.slice(0, 16))}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={() => onSubmit(code)}
            style={styles.hidden}
          />
          <Text style={styles.error}>{error ?? ' '}</Text>
          <View style={styles.keys}>
            <Pressable onPress={() => setCode((c) => c.slice(0, -1))} style={({ pressed }) => [styles.key, pressed && styles.pressed]} accessibilityLabel="⌫">
              <Text style={styles.keyText}>⌫</Text>
            </Pressable>
            <Pressable onPress={() => setCode((c) => c + ' ')} style={({ pressed }) => [styles.key, pressed && styles.pressed]} accessibilityLabel="space">
              <Text style={styles.keyText}>␣</Text>
            </Pressable>
            <Pressable onPress={() => onSubmit(code)} style={({ pressed }) => [styles.key, styles.enter, pressed && styles.pressed]} accessibilityLabel="enter">
              <Text style={styles.keyText}>↵</Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  dim: { flex: 1, backgroundColor: 'rgba(14,13,12,0.7)' },
  panel: { backgroundColor: '#161412', borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderWidth: 1, borderBottomWidth: 0, borderColor: colors.ink3, paddingHorizontal: 22, paddingTop: 22, alignItems: 'center' },
  title: { fontFamily: fonts.jet, fontSize: 11, letterSpacing: 1.6, color: colors.mute },
  boxes: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 18, minHeight: 52 },
  box: { width: 38, height: 50, borderBottomWidth: 2, borderBottomColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  space: { width: 16, borderBottomColor: 'transparent' },
  boxNext: { borderBottomColor: colors.spot },
  letter: { fontFamily: fonts.jet, fontSize: 26, color: colors.paper },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  error: { fontFamily: fonts.regular, fontSize: 13, color: colors.spotText, marginTop: 10 },
  keys: { flexDirection: 'row', gap: 10, marginTop: 14, alignSelf: 'stretch' },
  key: { flex: 1, height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.ink3, alignItems: 'center', justifyContent: 'center' },
  enter: { backgroundColor: colors.spot, borderColor: colors.spot },
  keyText: { fontFamily: fonts.medium, fontSize: 20, color: colors.paper },
  pressed: { opacity: 0.6 },
});
