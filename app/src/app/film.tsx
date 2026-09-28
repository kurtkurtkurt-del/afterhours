import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';
import { brand } from '@/theme/layout';

// tanıtım filmi: ana ekrandaki "explore your city" bunu oynatır, bitince kayıt
// ekranı. film claude design'da yapıldı (assets/film/film.html, tek dosya,
// internetsiz oynar). bittiğini film kendisi söyler: postMessage('end').
// söylemezse süre dolunca geçilir; "geç" her an basılabilir.
const FILM = require('../../assets/film/film.html');
const LONGEST = 90_000; // film ne kadar uzun olursa olsun bu kadar sonra geçilir

export default function FilmScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [html, setHtml] = useState<string | null>(null);
  const left = useRef(false);

  const next = () => {
    if (left.current) return;
    left.current = true;
    router.replace('/signup');
  };

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const asset = Asset.fromModule(FILM);
        await asset.downloadAsync();
        const text = await new File(asset.localUri ?? asset.uri).text();
        if (live) setHtml(text);
      } catch {
        if (live) next(); // film açılamadıysa bekletme
      }
    })();
    const timer = setTimeout(next, LONGEST);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" hidden />
      {html ? (
        <WebView
          source={{ html, baseUrl: '' }}
          originWhitelist={['*']}
          style={styles.web}
          javaScriptEnabled
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          setSupportMultipleWindows={false}
          onMessage={(e) => e.nativeEvent.data === 'end' && next()}
        />
      ) : null}
      <Pressable onPress={next} hitSlop={14} accessibilityRole="button" style={({ pressed }) => [styles.skip, { top: insets.top + 16 }, pressed && styles.pressed]}>
        <Text style={styles.skipText}>{t('film.skip')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  web: { flex: 1, backgroundColor: colors.ink },
  skip: { position: 'absolute', right: brand.left, backgroundColor: 'rgba(14,13,12,0.6)', borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 14 },
  skipText: { fontFamily: fonts.regular, fontSize: 13, color: colors.paper },
  pressed: { opacity: 0.6 },
});
