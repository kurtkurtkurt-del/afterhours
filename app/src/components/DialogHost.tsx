import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { AlertButton } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/Button';
import { closeDialog, useDialog } from '@/lib/dialog';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// The app's own question sheet (lib/dialog.ts): it rises from the bottom like the other
// sheets — a red dot, the question large, a line of why, then the choices: the one the
// question leads to filled, a destructive one red, the rest outlined, cancel last.
// A Modal, so it sits above any sheet that asked it (reporting, a post, the closed account).
export default function DialogHost() {
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const { t } = useLang();
  const rise = useSharedValue(0);
  useEffect(() => {
    if (!dialog) return;
    rise.set(0);
    rise.set(withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }));
  }, [dialog, rise]);
  const up = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - rise.get()) * 60 }] }));

  if (!dialog) return null;
  const list: AlertButton[] = dialog.buttons.length ? dialog.buttons : [{ text: t('word.ok') }];
  const cancel = list.find((b) => b.style === 'cancel');
  const actions = list.filter((b) => b !== cancel);
  // The choice the question leads to: the last action, as on iOS and Android.
  const lead = actions[actions.length - 1];
  const press = (b?: AlertButton) => closeDialog(dialog.id, b?.onPress ? () => b.onPress?.() : dialog.onDismiss);
  // Back or a tap beside the sheet: cancel when there is one; a plain notice just closes.
  const away = () => (cancel ? press(cancel) : actions.length <= 1 ? press(actions[0]) : undefined);

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={away}>
      <Pressable style={styles.scrim} onPress={away} accessibilityRole="button" accessibilityLabel={t('word.close')} />
      <Animated.View
        style={[styles.sheet, { paddingBottom: insets.bottom + 20 }, up]}
        accessibilityViewIsModal
      >
        <View style={styles.head}>
          <View style={styles.dot} />
          <Text style={styles.title} accessibilityRole="header">{dialog.title}</Text>
        </View>
        {dialog.body ? <Text style={styles.body}>{dialog.body}</Text> : null}
        <View style={styles.choices}>
          {actions.map((b, i) => (
            <Button key={i} label={b.text ?? t('word.ok')} kind={b.style === 'destructive' ? 'red' : b === lead ? 'fill' : 'line'} onPress={() => press(b)} />
          ))}
          {cancel ? <Button label={cancel.text ?? t('word.cancel')} kind="line" onPress={() => press(cancel)} /> : null}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(14,13,12,0.45)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.ink,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: colors.ink3,
    paddingHorizontal: brand.left,
    paddingTop: 24,
    gap: 12,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.spot, marginTop: 10 },
  title: { flex: 1, fontFamily: fonts.medium, fontSize: 22, lineHeight: 27, letterSpacing: -0.6, color: colors.paper },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.mute, paddingLeft: 18 },
  choices: { gap: 10, marginTop: 10 },
});
