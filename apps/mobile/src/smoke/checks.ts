import { Platform as ReactNativePlatform, TurboModuleRegistry } from 'react-native';
import { createActor, createMachine } from 'xstate';

import icon from '../../assets/icon.png';
import { loadSkia } from './load-skia';
import type { Check, Platform } from './run-checks';

// One check per installed library (roadmap §3.1, spec §18.2). Each loads its library inside
// `run` with a dynamic import, so a native module that didn't link shows as one failed row
// instead of taking the whole screen down.
//
// Where a call is safe with nobody at the device, the check makes one and reports what came
// back. Where it isn't, the check only imports the library and its detail ends in "loaded":
// the components that render-strip.tsx renders instead (NativeTabs, Expo UI, symbols, the
// gesture detector, SVG, FlashList, expo-image), expo-web-browser outside Android, and the
// two hook libraries. docs/plans/FND-05-evidence/README.md lists them.

const everywhere: readonly Platform[] = ['ios', 'android', 'web'];
const native: readonly Platform[] = ['ios', 'android'];

export const currentPlatform: Platform =
  ReactNativePlatform.OS === 'ios' || ReactNativePlatform.OS === 'android'
    ? ReactNativePlatform.OS
    : 'web';

const expectDefined = (name: string, value: unknown): string => {
  if (value === undefined || value === null) throw new Error(`${name} is missing`);
  return `${name} loaded`;
};

// XState machines are created at module scope: React Compiler memoises component bodies,
// and a machine created during render would be rebuilt whenever its inputs changed.
const questionMachine = createMachine({
  id: 'question',
  initial: 'presenting',
  states: {
    presenting: { on: { ANSWER: 'revealing' } },
    revealing: { type: 'final' },
  },
});

const runtimeChecks: readonly Check[] = [
  {
    id: 'js-engine',
    label: 'JavaScript engine',
    platforms: everywhere,
    run: () => {
      const hermes = 'HermesInternal' in globalThis;
      if (currentPlatform !== 'web' && !hermes) throw new Error('not running on Hermes');
      return hermes ? 'Hermes' : 'browser engine';
    },
  },
  {
    id: 'js-unicode-regex',
    label: 'Unicode property escapes (regex literals, u flag)',
    platforms: everywhere,
    run: async () => (await import('./hermes-probes')).probeUnicodeRegex(),
  },
  {
    id: 'js-object-hasown',
    label: 'Object.hasOwn',
    platforms: everywhere,
    run: async () => (await import('./hermes-probes')).probeObjectHasOwn(),
  },
  {
    id: 'js-array-at',
    label: 'Array.prototype.at',
    platforms: everywhere,
    run: async () => (await import('./hermes-probes')).probeArrayAt(),
  },
  {
    id: 'js-normalize',
    label: 'String.prototype.normalize (NFD)',
    platforms: everywhere,
    run: async () => (await import('./hermes-probes')).probeNormalize(),
  },
  {
    id: 'js-date-time-format',
    label: 'Intl.DateTimeFormat with a time zone',
    platforms: everywhere,
    run: async () => (await import('./hermes-probes')).probeDateTimeFormat(),
  },
  {
    id: 'game-rules-local-date',
    label: 'game-rules localDateOf: offsets, DST days, unknown zones (ENG-03)',
    platforms: everywhere,
    run: async () => (await import('./hermes-probes')).probeLocalDates(),
  },
  {
    id: 'quiz-engine-fixtures',
    label: 'quiz-engine shared fixtures (ENG-02)',
    platforms: everywhere,
    run: async () => (await import('./hermes-probes')).probeSharedFixtures(),
  },
  {
    id: 'zod',
    label: 'zod 4',
    platforms: everywhere,
    run: async () => (await import('./hermes-probes')).probeZod(),
  },
];

const frameworkChecks: readonly Check[] = [
  {
    id: 'expo',
    label: 'Expo SDK and React Native',
    platforms: everywhere,
    run: async () => {
      const { default: Constants } = await import('expo-constants');
      const sdk = Constants.expoConfig?.sdkVersion ?? 'unknown';
      if (currentPlatform === 'web') return `SDK ${sdk}`;
      const { major, minor, patch } = ReactNativePlatform.constants.reactNativeVersion;
      return `SDK ${sdk}, React Native ${String(major)}.${String(minor)}.${String(patch)}`;
    },
  },
  {
    id: 'expo-dev-client',
    label: 'expo-dev-client',
    platforms: native,
    run: async () => {
      const DevClient = await import('expo-dev-client');
      // Registering no items still reaches the dev menu's native module in a development
      // build. A release build leaves the dev client out, and the call does nothing there.
      await DevClient.registerDevMenuItems([]);
      return 'registered an empty dev-menu list';
    },
  },
  {
    id: 'expo-router',
    label: 'Expo Router with NativeTabs',
    platforms: everywhere,
    run: async () => {
      const { NativeTabs } = await import('expo-router/native-tabs');
      return expectDefined('NativeTabs', NativeTabs);
    },
  },
  {
    id: 'expo-ui',
    label: '@expo/ui',
    platforms: everywhere,
    run: async () => expectDefined('Host', (await import('@expo/ui')).Host),
  },
  {
    id: 'expo-symbols',
    label: 'expo-symbols',
    platforms: everywhere,
    run: async () => expectDefined('SymbolView', (await import('expo-symbols')).SymbolView),
  },
  {
    id: 'expo-glass-effect',
    label: 'expo-glass-effect',
    platforms: everywhere,
    run: async () => {
      const { isLiquidGlassAvailable } = await import('expo-glass-effect');
      return `liquid glass available: ${String(isLiquidGlassAvailable())}`;
    },
  },
];

const styleAndMotionChecks: readonly Check[] = [
  {
    id: 'unistyles',
    label: 'Unistyles',
    platforms: everywhere,
    run: async () => {
      const { UnistylesRuntime } = await import('react-native-unistyles');
      return `theme: ${String(UnistylesRuntime.themeName)}`;
    },
  },
  {
    id: 'nitro-modules',
    label: 'Nitro Modules',
    platforms: native,
    run: async () => {
      const { NitroModules } = await import('react-native-nitro-modules');
      return `Nitro ${NitroModules.version}, ${NitroModules.buildType} build`;
    },
  },
  {
    id: 'reanimated',
    label: 'Reanimated',
    platforms: everywhere,
    run: async () => {
      const { makeMutable, reanimatedVersion } = await import('react-native-reanimated');
      const value = makeMutable(1);
      value.value = 2;
      return `Reanimated ${reanimatedVersion}`;
    },
  },
  {
    id: 'worklets',
    label: 'Worklets (UI runtime)',
    platforms: native,
    run: async () => {
      const { runOnUIAsync } = await import('react-native-worklets');
      const answer = await runOnUIAsync(() => {
        'worklet';
        return 6 * 7;
      });
      if (answer !== 42) throw new Error(`the UI runtime returned ${String(answer)}`);
      return 'a worklet ran on the UI thread';
    },
  },
  {
    id: 'gesture-handler',
    label: 'Gesture Handler',
    platforms: everywhere,
    run: async () => {
      const { GestureDetector } = await import('react-native-gesture-handler');
      return expectDefined('GestureDetector', GestureDetector);
    },
  },
  {
    id: 'skia',
    label: 'Skia',
    platforms: everywhere,
    run: async () => {
      await loadSkia();
      const { Skia } = await import('@shopify/react-native-skia');
      const paint = Skia.Paint();
      paint.setColor(Skia.Color('#3355D0'));
      return 'created a paint';
    },
  },
  {
    id: 'svg',
    label: 'react-native-svg',
    platforms: everywhere,
    run: async () => expectDefined('Svg', (await import('react-native-svg')).Svg),
  },
  {
    id: 'flash-list',
    label: 'FlashList',
    platforms: everywhere,
    run: async () => expectDefined('FlashList', (await import('@shopify/flash-list')).FlashList),
  },
];

const stateAndStorageChecks: readonly Check[] = [
  {
    id: 'xstate',
    label: 'XState',
    platforms: everywhere,
    run: () => {
      const actor = createActor(questionMachine).start();
      actor.send({ type: 'ANSWER' });
      const state = actor.getSnapshot().value;
      if (state !== 'revealing') throw new Error(`the machine is in ${JSON.stringify(state)}`);
      return 'presenting → revealing';
    },
  },
  {
    id: 'zustand',
    label: 'Zustand',
    platforms: everywhere,
    run: async () => {
      const { createStore } = await import('zustand/vanilla');
      const store = createStore(() => ({ sound: true }));
      store.setState({ sound: false });
      if (store.getState().sound) throw new Error('setState did not apply');
      return 'store updated';
    },
  },
  {
    id: 'mmkv',
    label: 'MMKV',
    platforms: everywhere,
    run: async () => {
      const { createMMKV } = await import('react-native-mmkv');
      const storage = createMMKV({ id: 'smoke' });
      storage.set('probe', 'stored');
      const read = storage.getString('probe');
      storage.remove('probe');
      if (read !== 'stored') throw new Error(`read back ${String(read)}`);
      return 'wrote and read a key';
    },
  },
  {
    id: 'tanstack-query',
    label: 'TanStack Query persisted to MMKV',
    platforms: everywhere,
    run: async () => {
      const { QueryClient } = await import('@tanstack/react-query');
      const { persistQueryClientSave } = await import('@tanstack/react-query-persist-client');
      const { createAsyncStoragePersister } =
        await import('@tanstack/query-async-storage-persister');
      const { createMMKV } = await import('react-native-mmkv');

      const storage = createMMKV({ id: 'smoke-query-cache' });
      const persister = createAsyncStoragePersister({
        key: 'cache',
        throttleTime: 0,
        storage: {
          getItem: (key) => storage.getString(key) ?? null,
          setItem: (key, value) => {
            storage.set(key, value);
          },
          removeItem: (key) => {
            storage.remove(key);
          },
        },
      });

      const queryClient = new QueryClient();
      queryClient.setQueryData(['smoke'], 'cached answer');
      await persistQueryClientSave({ queryClient, persister });
      const persisted = storage.getString('cache') ?? '';
      storage.clearAll();
      if (!persisted.includes('cached answer')) throw new Error('the cache was not written');
      return 'cache written to MMKV';
    },
  },
  {
    id: 'expo-secure-store',
    label: 'expo-secure-store',
    platforms: native,
    run: async () => {
      const SecureStore = await import('expo-secure-store');
      return `available: ${String(await SecureStore.isAvailableAsync())}`;
    },
  },
];

const platformChecks: readonly Check[] = [
  {
    id: 'i18n',
    label: 'i18next with ICU, expo-localization',
    platforms: everywhere,
    run: async () => {
      const { getLocales } = await import('expo-localization');
      const locale = getLocales()[0].languageTag;

      // Hermes ships Intl without Locale and PluralRules, which ICU plurals need.
      const polyfilled = typeof Intl.PluralRules === 'undefined';
      if (polyfilled) {
        await import('@formatjs/intl-locale/polyfill-force.js');
        await import('@formatjs/intl-pluralrules/polyfill-force.js');
        await import('@formatjs/intl-pluralrules/locale-data/en.js');
      }

      const { createInstance } = await import('i18next');
      const { default: ICU } = await import('i18next-icu');
      const i18n = createInstance();
      await i18n.use(ICU).init({
        lng: 'en',
        resources: {
          en: { translation: { left: '{count, plural, one {# question} other {# questions}}' } },
        },
      });
      const text = `${i18n.t('left', { count: 1 })}, ${i18n.t('left', { count: 5 })}`;
      if (text !== '1 question, 5 questions') throw new Error(`formatted "${text}"`);
      return `${text}; device locale ${locale}; PluralRules ${polyfilled ? 'polyfilled' : 'built in'}`;
    },
  },
  {
    id: 'expo-haptics',
    label: 'expo-haptics',
    platforms: native,
    run: async () => {
      const Haptics = await import('expo-haptics');
      await Haptics.selectionAsync();
      return 'selection haptic sent';
    },
  },
  {
    id: 'expo-audio',
    label: 'expo-audio',
    platforms: everywhere,
    run: async () => {
      const { createAudioPlayer } = await import('expo-audio');
      const player = createAudioPlayer(null);
      const { volume } = player;
      player.remove();
      return `created and released a player (volume ${String(volume)})`;
    },
  },
  {
    id: 'expo-image',
    label: 'expo-image',
    platforms: everywhere,
    run: async () => expectDefined('Image', (await import('expo-image')).Image),
  },
  {
    id: 'expo-video',
    label: 'expo-video',
    platforms: everywhere,
    run: async () => {
      const { isPictureInPictureSupported } = await import('expo-video');
      return `picture in picture supported: ${String(isPictureInPictureSupported())}`;
    },
  },
  {
    id: 'expo-sharing',
    label: 'expo-sharing',
    platforms: everywhere,
    run: async () => {
      const Sharing = await import('expo-sharing');
      return `available: ${String(await Sharing.isAvailableAsync())}`;
    },
  },
  {
    id: 'expo-notifications',
    label: 'expo-notifications',
    platforms: native,
    run: async () => {
      const Notifications = await import('expo-notifications');
      const { status } = await Notifications.getPermissionsAsync();
      return `permission: ${status}`;
    },
  },
  {
    id: 'expo-updates',
    label: 'expo-updates',
    platforms: everywhere,
    run: async () => {
      const Updates = await import('expo-updates');
      // Empty until the EAS half enables updates: a disabled module reports no runtime version.
      const runtime =
        Updates.runtimeVersion === null || Updates.runtimeVersion === ''
          ? 'not reported'
          : Updates.runtimeVersion;
      return `enabled: ${String(Updates.isEnabled)}, runtime version ${runtime}`;
    },
  },
  {
    id: 'expo-web-browser',
    label: 'expo-web-browser',
    platforms: everywhere,
    run: async () => {
      const WebBrowser = await import('expo-web-browser');
      // Opening a browser needs a person to close it. Android has a call that doesn't.
      if (currentPlatform !== 'android') {
        return expectDefined('openBrowserAsync', WebBrowser.openBrowserAsync);
      }
      const { browserPackages } = await WebBrowser.getCustomTabsSupportingBrowsersAsync();
      return `${String(browserPackages.length)} Custom Tabs browsers found`;
    },
  },
];

const serviceChecks: readonly Check[] = [
  {
    id: 'expo-apple-authentication',
    label: 'expo-apple-authentication',
    platforms: ['ios'],
    run: async () => {
      const AppleAuthentication = await import('expo-apple-authentication');
      return `available: ${String(await AppleAuthentication.isAvailableAsync())}`;
    },
  },
  {
    id: 'google-sign-in',
    label: 'Google sign-in',
    platforms: native,
    run: async () => {
      const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
      return `linked; signed in before: ${String(GoogleSignin.hasPreviousSignIn())}`;
    },
  },
  {
    id: 'better-auth',
    label: 'Better Auth Expo client',
    platforms: native,
    run: async () => {
      const { createAuthClient } = await import('better-auth/react');
      const { expoClient } = await import('@better-auth/expo/client');
      const SecureStore = await import('expo-secure-store');
      // `.invalid` never resolves (RFC 2606): the client is built, never used.
      const client = createAuthClient({
        baseURL: 'https://auth.invalid',
        plugins: [
          expoClient({ scheme: 'dailyquiz', storagePrefix: 'smoke', storage: SecureStore }),
        ],
      });
      return expectDefined('auth client', client.signIn);
    },
  },
  {
    id: 'posthog',
    label: 'PostHog',
    platforms: everywhere,
    run: async () => {
      const { default: PostHog } = await import('posthog-react-native');
      // Disabled and keyless: nothing is captured or sent until FND-04 supplies a project.
      // On web the SDK has no file storage and throws unless told to keep state in memory.
      const client = new PostHog('no-key', {
        disabled: true,
        persistence: currentPlatform === 'web' ? 'memory' : 'file',
      });
      return `constructed, disabled: ${String(client.isDisabled)}`;
    },
  },
  {
    id: 'sentry',
    label: 'Sentry',
    platforms: everywhere,
    run: async () => {
      const Sentry = await import('@sentry/react-native');
      // `Sentry.init` is never called: there is no DSN until FND-04.
      if (currentPlatform === 'web') return `SDK ${Sentry.SDK_VERSION}, not initialised`;
      if (TurboModuleRegistry.get('RNSentry') === null) {
        throw new Error('the native module RNSentry is not linked');
      }
      return `SDK ${Sentry.SDK_VERSION}, native module linked, not initialised`;
    },
  },
];

// Libraries no feature uses directly yet: peers of the SDKs above, and Expo's own plumbing.
const supportingChecks: readonly Check[] = [
  {
    id: 'expo-crypto',
    label: 'expo-crypto',
    platforms: everywhere,
    run: async () => {
      const Crypto = await import('expo-crypto');
      return `random UUID of ${String(Crypto.randomUUID().length)} characters`;
    },
  },
  {
    id: 'expo-network',
    label: 'expo-network',
    platforms: everywhere,
    run: async () => {
      const Network = await import('expo-network');
      const { type } = await Network.getNetworkStateAsync();
      return `network type: ${String(type)}`;
    },
  },
  {
    id: 'expo-device',
    label: 'expo-device',
    platforms: everywhere,
    run: async () => {
      const Device = await import('expo-device');
      return `model: ${Device.modelName ?? 'not reported'}`;
    },
  },
  {
    id: 'expo-application',
    label: 'expo-application',
    platforms: native,
    run: async () => {
      const Application = await import('expo-application');
      return `application id: ${Application.applicationId ?? 'not reported'}`;
    },
  },
  {
    id: 'expo-file-system',
    label: 'expo-file-system',
    platforms: native,
    run: async () => {
      const { File, Paths } = await import('expo-file-system');
      const file = new File(Paths.cache, 'smoke-probe.txt');
      if (file.exists) file.delete();
      file.create();
      await file.write('stored');
      const read = file.textSync();
      file.delete();
      if (read !== 'stored') throw new Error(`read back ${read}`);
      return 'wrote, read and deleted a file';
    },
  },
  {
    id: 'expo-linking',
    label: 'expo-linking',
    platforms: everywhere,
    run: async () => {
      const Linking = await import('expo-linking');
      return `app URL: ${Linking.createURL('/')}`;
    },
  },
  {
    id: 'expo-font',
    label: 'expo-font',
    platforms: everywhere,
    run: async () => {
      const Font = await import('expo-font');
      return `a font that was never loaded is loaded: ${String(Font.isLoaded('never-loaded'))}`;
    },
  },
  {
    id: 'expo-asset',
    label: 'expo-asset',
    platforms: everywhere,
    run: async () => {
      const { Asset } = await import('expo-asset');
      return `bundled icon is a ${Asset.fromModule(icon).type} asset`;
    },
  },
  {
    id: 'expo-system-ui',
    label: 'expo-system-ui',
    platforms: native,
    run: async () => {
      const SystemUI = await import('expo-system-ui');
      return `root background: ${String(await SystemUI.getBackgroundColorAsync())}`;
    },
  },
  {
    id: 'expo-splash-screen',
    label: 'expo-splash-screen',
    platforms: native,
    run: async () => {
      const SplashScreen = await import('expo-splash-screen');
      await SplashScreen.hideAsync();
      return 'hide requested';
    },
  },
  {
    id: 'safe-area-context',
    label: 'react-native-safe-area-context',
    platforms: native,
    run: async () => {
      const { initialWindowMetrics } = await import('react-native-safe-area-context');
      return `top inset at launch: ${String(initialWindowMetrics?.insets.top ?? 'not reported')}`;
    },
  },
  {
    id: 'xstate-react',
    label: '@xstate/react (imported only: its hooks need a component)',
    platforms: everywhere,
    run: async () => expectDefined('useMachine', (await import('@xstate/react')).useMachine),
  },
  {
    id: 'react-i18next',
    label: 'react-i18next (imported only: its hooks need a component)',
    platforms: everywhere,
    run: async () =>
      expectDefined('useTranslation', (await import('react-i18next')).useTranslation),
  },
];

export const checks: readonly Check[] = [
  ...runtimeChecks,
  ...frameworkChecks,
  ...styleAndMotionChecks,
  ...stateAndStorageChecks,
  ...platformChecks,
  ...serviceChecks,
  ...supportingChecks,
];
