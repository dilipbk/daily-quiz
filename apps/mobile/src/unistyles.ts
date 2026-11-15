import { StyleSheet } from 'react-native-unistyles';

// A throwaway palette for the smoke screen only. The real themes come from
// packages/design-tokens (DS-11) and replace this file in FE-01.
const lightTheme = {
  colors: {
    background: '#F4F3EF',
    surface: '#FFFFFF',
    border: '#D8D6CF',
    text: '#1A1A1F',
    muted: '#5A5A66',
    accent: '#3355D0',
    pass: '#136C3E',
    fail: '#B3261E',
    skipped: '#5A5A66',
  },
} as const;

const darkTheme = {
  colors: {
    background: '#121216',
    surface: '#1E1E24',
    border: '#3A3A44',
    text: '#F2F1ED',
    muted: '#A9A9B6',
    accent: '#8FA6FF',
    pass: '#6BD79A',
    fail: '#FF8A80',
    skipped: '#A9A9B6',
  },
} as const;

interface AppThemes {
  light: typeof lightTheme;
  dark: typeof darkTheme;
}

declare module 'react-native-unistyles' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Unistyles reads its theme types from this merged interface
  export interface UnistylesThemes extends AppThemes {}
}

StyleSheet.configure({
  themes: { light: lightTheme, dark: darkTheme },
  settings: { adaptiveThemes: true },
});
