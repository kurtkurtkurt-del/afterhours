import { KeyboardAvoidingView, type KeyboardAvoidingViewProps } from 'react-native';

// Keeps what you type above the keyboard. The app draws edge to edge on Android, so the
// window no longer shrinks for the keyboard and `behavior={undefined}` on Android left the
// field under it (messages, a group chat, sending in a night — owner, 22.10.2026). 'padding'
// on both platforms lifts the content; a ScrollView inside brings the focused field into
// view by itself. Use this instead of KeyboardAvoidingView.
export default function KeyboardSafe({ behavior = 'padding', ...rest }: KeyboardAvoidingViewProps) {
  return <KeyboardAvoidingView behavior={behavior} {...rest} />;
}
