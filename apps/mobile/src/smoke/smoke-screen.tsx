import { useEffect, useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { checks, currentPlatform } from './checks';
import { RenderStrip } from './render-strip';
import { ResultsList, summarise } from './results-list';
import { runChecks, type CheckResult } from './run-checks';

/**
 * The placeholder screen of the FND-05 shell: a smoke report. It renders each visual
 * library once and lists every planned library as pass, fail or skipped on this platform.
 * FE-01 replaces it with the real app shell.
 */
export function SmokeScreen() {
  const [results, setResults] = useState<readonly CheckResult[] | null>(null);

  useEffect(() => {
    let current = true;
    runChecks(checks, currentPlatform)
      .catch((error: unknown): CheckResult[] => [
        { id: 'runner', label: 'Smoke runner', status: 'fail', detail: String(error) },
      ])
      .then((finished) => {
        // The same report as text, for the build evidence: Metro's log in a debug build,
        // `adb logcat -s ReactNativeJS` or Console.app in a release build.
        console.info(
          [
            `[smoke] ${currentPlatform}: ${summarise(finished)}`,
            ...finished.map(
              ({ status, label, detail }) => `[smoke] ${status} | ${label} | ${detail}`,
            ),
          ].join('\n'),
        );
        if (current) setResults(finished);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, []);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Native smoke build
          </Text>
          <Text style={styles.summary}>
            {results === null
              ? `Running ${String(checks.length)} checks on ${currentPlatform}…`
              : `${currentPlatform}: ${summarise(results)}`}
          </Text>
        </View>
        {/* The strip and the list render on the device only, after the checks have run. */}
        {results !== null && (
          <>
            <RenderStrip />
            <ResultsList results={results} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

// The insets come from Unistyles' runtime and the styles sit on React Native's own views:
// Unistyles updates those natively when the theme changes, but not third-party views
// such as SafeAreaView, which kept the old theme's background.
const styles = StyleSheet.create((theme, runtime) => ({
  screen: {
    backgroundColor: theme.colors.background,
    flex: 1,
    paddingLeft: runtime.insets.left,
    paddingRight: runtime.insets.right,
    paddingTop: runtime.insets.top,
  },
  // NativeTabs' web fallback floats its tab bar over the top of the page.
  content: {
    gap: 12,
    padding: 16,
    paddingBottom: 120,
    paddingTop: Platform.OS === 'web' ? 72 : 16,
  },
  header: { gap: 4 },
  title: { color: theme.colors.text, fontSize: 24, fontWeight: '700' },
  summary: { color: theme.colors.muted, fontSize: 15 },
}));
