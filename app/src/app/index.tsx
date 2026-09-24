import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import City from '@/components/City';
import Intro from '@/components/Intro';
import { useAmbient } from '@/audio/AmbientContext';
import { useAuth } from '@/auth/AuthContext';

// tek ekran: şehir ekranı altta hazır bekler, intro üstünde oynayıp kalkar.
// route değişimi olmadığı için arada boş kare yok.
export default function Home() {
  const [introDone, setIntroDone] = useState(false);
  const done = useCallback(() => setIntroDone(true), []);
  const ambient = useAmbient();
  const { ready, session } = useAuth();
  // daha önce girmiş olan (hesap ya da misafir) introyu bir daha görmez
  useEffect(() => {
    if (ready && session) router.replace('/yours');
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
