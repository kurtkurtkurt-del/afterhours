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
  // Returning users (account or guest) skip the intro.
  useEffect(() => {
    if (!ready || !session) return;
    router.replace('/flow');
    // Back where you were after the app redrew itself (a new ground or accent, lib/restart.ts).
    const back = takeBack();
    if (back) setTimeout(() => router.push(back as Href), 60);
  }, [ready, session]);
  return (
    <View style={styles.root}>
      <City play={introDone} soundOn={ambient.on} onToggleSound={ambient.toggle} onPickSound={ambient.openPicker} />
      {!introDone && (
        <View style={StyleSheet.absoluteFill}>
          <Intro onDone={done} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
