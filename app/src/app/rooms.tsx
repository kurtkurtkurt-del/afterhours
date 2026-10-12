import { Redirect } from 'expo-router';

// The messages page is the messages tab since 12.10.2026; this old address sends there.
export default function RoomsRedirect() {
  return <Redirect href="/messages" />;
}
