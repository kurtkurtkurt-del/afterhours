import { useCallback, useEffect, useState } from 'react';
import { router, type Href } from 'expo-router';
import { takeBack } from '@/lib/restart';
import { StyleSheet, View } from 'react-native';
import City from '@/components/City';
import Intro from '@/components/Intro';
import { useAmbient } from '@/audio/AmbientContext';
import { useAuth } from '@/auth/AuthContext';

// Single screen: the city screen waits underneath while the intro plays on top,
// so there is no blank frame from a route change.
export default function Home() {
  const [introDone, setIntroDone] = useState(false);
  const done = useCallback(() => setIntroDone(true), []);
  const ambient = useAmbient();
  const { ready, session } = useAuth();
  // The name stays up until it is known who is opening the app: a returning user goes
  // straight on to the flow, and never sees the sign-up screen flash by first.
  // (auth is always ready within about 4 s, auth/AuthContext.tsx)
  const opened = introDone && ready && !session;
  // Returning users (account or guest) skip the intro.
  useEffect(() => {
    if (!ready) return;
    // Back where you were after the app redrew itself (a new ground or accent, lib/restart.ts);
    // taken either way, so it never fires on a later sign-in.
    const back = takeBack();
    if (!session) return;
    router.replace('/flow');
    if (back) setTimeout(() => router.push(back as Href), 60);
  }, [ready, session]);
  return (
    <View style={styles.root}>
      <City play={opened} soundOn={ambient.on} onToggleSound={ambient.toggle} onPickSound={ambient.openPicker} />
      {!opened && (
        <View style={StyleSheet.absoluteFill}>
          <Intro onDone={done} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
