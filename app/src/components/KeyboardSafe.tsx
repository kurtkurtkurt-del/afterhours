import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, View, type KeyboardAvoidingViewProps } from 'react-native';

// Keeps what you type above the keyboard. The app draws edge to edge on Android, so the
// window no longer shrinks for the keyboard and `behavior={undefined}` on Android left the
// field under it (messages, a group chat, sending in a night — owner, 22.10.2026). 'padding'
// on both platforms lifts the content; a ScrollView inside brings the focused field into
// view by itself. Use this instead of KeyboardAvoidingView.
//
// On the web KeyboardAvoidingView does nothing, and Safari on iPhone does not shrink the
// page for the keyboard either: it only shrinks the visual viewport. So there the content
// is padded by the part of the window the keyboard covers (window height − visual viewport
// height), read from `visualViewport` as it changes (22.10.2026).
export default function KeyboardSafe({ behavior = 'padding', ...rest }: KeyboardAvoidingViewProps) {
  if (Platform.OS === 'web') return <WebKeyboardSafe {...rest} />;
  return <KeyboardAvoidingView behavior={behavior} {...rest} />;
}

function WebKeyboardSafe({ style, children, ...rest }: KeyboardAvoidingViewProps) {
  const [covered, setCovered] = useState(0);
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return;
    const read = () => setCovered(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    vv.addEventListener('resize', read);
    vv.addEventListener('scroll', read);
    read();
    return () => {
      vv.removeEventListener('resize', read);
      vv.removeEventListener('scroll', read);
    };
  }, []);
  return (
    <View {...rest} style={[style, covered > 0 && { paddingBottom: covered }]}>
      {children}
    </View>
  );
}
