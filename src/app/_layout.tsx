import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import {
  useFonts,
  InterTight_400Regular,
  InterTight_500Medium,
} from '@expo-google-fonts/inter-tight';
import { colors } from '@/theme/tokens';
import { AmbientProvider } from '@/audio/AmbientContext';
import { AuthProvider } from '@/auth/AuthContext';

// native splash, fontlar gelene kadar açık kalır; sonra geçiş görünmez olur
SplashScreen.preventAutoHideAsync();
// expo go kendi splash'ını kullanır, setOptions orada geçersiz ve uyarı basar
if (Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) {
  SplashScreen.setOptions({ fade: true, duration: 250 });
}

export default function RootLayout() {
  const [loaded] = useFonts({ InterTight_400Regular, InterTight_500Medium });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  // fontlar gelene kadar beyaz değil, kâğıt rengi
  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.paper }} />;

  return (
    <AuthProvider>
    <AmbientProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          // sayfalar aynı zemini paylaşır; içerik yumuşakça birbirine karışır
          animation: 'fade',
          animationDuration: 350,
          contentStyle: { backgroundColor: colors.paper },
        }}
      />
    </AmbientProvider>
    </AuthProvider>
  );
}
