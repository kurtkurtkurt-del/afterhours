import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import City from '@/components/City';
import Intro from '@/components/Intro';

// tek ekran: şehir ekranı altta hazır bekler, intro üstünde oynayıp kalkar.
// route değişimi olmadığı için arada boş kare yok.
export default function Home() {
  const [introDone, setIntroDone] = useState(false);
  const done = useCallback(() => setIntroDone(true), []);
  return (
    <View style={styles.root}>
      <City play={introDone} />
      {!introDone && (
        <View style={StyleSheet.absoluteFill}>
          <Intro onDone={done} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
