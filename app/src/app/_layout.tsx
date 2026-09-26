import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { Platform, View } from 'react-native';
import { NavigationBar } from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import {
  useFonts,
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
} from '@expo-google-fonts/inter-tight';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors } from '@/theme/tokens';
import { AmbientProvider } from '@/audio/AmbientContext';
import { AuthProvider } from '@/auth/AuthContext';
import GenrePicker from '@/components/GenrePicker';

// native splash, fontlar gelene kadar açık kalır; sonra geçiş görünmez olur
SplashScreen.preventAutoHideAsync();
// expo go kendi splash'ını kullanır, setOptions orada geçersiz ve uyarı basar
if (Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) {
  SplashScreen.setOptions({ fade: true, duration: 250 });
}

export default function RootLayout() {
  const [loaded] = useFonts({ InterTight_400Regular, InterTight_500Medium, InterTight_600SemiBold, JetBrainsMono_400Regular, ArchivoLogo: require('../../assets/fonts/ArchivoLogo.ttf') });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  // android'in alttaki sistem tuşları gizli; yukarı kaydırınca geçici görünür
  useEffect(() => {
    if (Platform.OS === 'android') NavigationBar.setHidden(true);
  }, []);

  // fontlar gelene kadar splash ile aynı zemin: mürekkep
  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.ink }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <AuthProvider>
    <AmbientProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          // sayfalar aynı zemini paylaşır; içerik yumuşakça birbirine karışır
          animation: 'fade',
          animationDuration: 350,
          contentStyle: { backgroundColor: colors.ink },
        }}
      />
      <GenrePicker />
    </AmbientProvider>
    </AuthProvider>
    </GestureHandlerRootView>
  );
}
