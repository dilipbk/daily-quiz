// Expo's ambient types (asset imports, process.env.EXPO_PUBLIC_*). `expo start` writes the
// same reference into the git-ignored expo-env.d.ts; this copy keeps `tsc` working in CI.
/// <reference types="expo/types" />

// Metro resolves an image import to a registered asset, which image components accept as a source.
declare module '*.png' {
  const source: number;
  export default source;
}
