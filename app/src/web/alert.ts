// Web only (loaded from app/_layout.tsx): react-native-web's Alert.alert does nothing,
// so confirmations would vanish. Here they become the browser's alert / confirm / prompt.
import { Alert, type AlertButton } from 'react-native';

Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
  const text = [title, message].filter(Boolean).join('\n\n');
  const list = buttons ?? [];
  if (list.length <= 1) {
    window.alert(text);
    list[0]?.onPress?.();
    return;
  }
  const cancel = list.find((b) => b.style === 'cancel');
  const others = list.filter((b) => b !== cancel);
  if (others.length === 1) {
    if (window.confirm(text)) others[0].onPress?.();
    else cancel?.onPress?.();
    return;
  }
  // Three or more: confirm first, then pick one by number.
  if (!window.confirm(text)) return cancel?.onPress?.();
  const menu = others.map((b, i) => `${i + 1}. ${b.text ?? ''}`).join('\n');
  const n = Number(window.prompt(menu, '1'));
  const pick = others[n - 1];
  if (pick) pick.onPress?.();
  else cancel?.onPress?.();
};
