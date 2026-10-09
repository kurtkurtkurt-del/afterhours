// Metro: bundle the intro film (assets/film/film.html) into the app as an asset.
// For the web build only, native-only modules resolve to the stand-ins in src/web/.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('html');

const web = (f) => path.join(__dirname, 'src/web', f);
const webOnly = {
  'expo-sqlite/kv-store': web('kv-store.ts'),
  'expo-sqlite/localStorage/install': web('empty.ts'),
  'expo-secure-store': web('secure-store.ts'),
  'react-native-webview': web('WebView.tsx'),
  'expo-apple-authentication': web('apple.ts'),
  'expo-notifications': web('notifications.ts'),
  'expo-device': web('device.ts'),
  'expo-navigation-bar': web('navigation-bar.ts'),
  'expo-file-system': web('file-system.ts'),
};

config.resolver.resolveRequest = (context, name, platform) => {
  if (platform === 'web' && webOnly[name]) return { type: 'sourceFile', filePath: webOnly[name] };
  return context.resolveRequest(context, name, platform);
};

module.exports = config;
