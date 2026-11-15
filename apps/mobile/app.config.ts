import type { ExpoConfig } from 'expo/config';
import { withEntitlementsPlist, type ConfigPlugin } from 'expo/config-plugins';

// A placeholder identity for local smoke builds (FND-05). Nothing built from it is
// uploaded: the real name and bundle identifier are chosen with the EAS half of the
// ticket, after DS-01's trademark check (roadmap §3.3, A12).
// No key, DSN, client id or project id belongs in this file (roadmap §7, SEC-01).
const identifier = 'dev.dailyquiz.shell';

// Prebuild applies expo-apple-authentication's plugin whenever the package is installed,
// and the entitlement it adds makes Expo CLI demand a development signing certificate
// even for a simulator build. A certificate needs the Apple Developer account, which
// arrives with the EAS half (ADR 0006). Until then the library links without it.
const appleSignInEntitlement = 'com.apple.developer.applesignin';
const withoutAppleSignInEntitlement: ConfigPlugin = (config) =>
  withEntitlementsPlist(config, (mod) => {
    mod.modResults = Object.fromEntries(
      Object.entries(mod.modResults).filter(([key]) => key !== appleSignInEntitlement),
    );
    return mod;
  });

const config: ExpoConfig = {
  name: 'Daily Quiz shell',
  slug: 'daily-quiz-shell',
  version: '0.0.0',
  scheme: 'dailyquiz',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: identifier,
    supportsTablet: true,
  },
  android: {
    package: identifier,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'server',
    favicon: './assets/favicon.png',
  },
  // Updates stay off until the EAS half supplies a URL and a channel. The runtime
  // version policy is set now so the fingerprint step is part of every local build.
  updates: { enabled: false },
  runtimeVersion: { policy: 'fingerprint' },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-localization',
    'expo-notifications',
    'expo-audio',
    'expo-image',
    'expo-video',
    'expo-sharing',
    'expo-font',
    'expo-splash-screen',
    'expo-web-browser',
    'expo-asset',
    // Upload of source maps and debug files needs a Sentry organisation and token (EAS half).
    ['@sentry/react-native/expo', { disableAutoUpload: true }],
    // The plugin refuses to run without a URL scheme. This one is a placeholder, not a
    // client id: the real one comes from the Google project FND-04 creates.
    [
      '@react-native-google-signin/google-signin',
      { iosUrlScheme: 'com.googleusercontent.apps.placeholder' },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default withoutAppleSignInEntitlement(config);
