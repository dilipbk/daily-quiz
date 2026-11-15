import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { CheckResult, CheckStatus } from './run-checks';

// Status is never colour alone: each row carries a glyph and the word as well.
const glyphs: Record<CheckStatus, string> = { pass: '✓', fail: '✕', skipped: '–' };

export const summarise = (results: readonly CheckResult[]): string => {
  const count = (status: CheckStatus) =>
    results.filter((result) => result.status === status).length;
  return `${String(count('pass'))} pass, ${String(count('fail'))} fail, ${String(count('skipped'))} skipped`;
};

export function ResultsList({ results }: { results: readonly CheckResult[] }) {
  return (
    <View style={styles.list}>
      {results.map(({ id, label, status, detail }) => (
        <View
          key={id}
          accessible
          accessibilityLabel={`${label}: ${status}, ${detail}`}
          style={styles.row}
        >
          <Text style={[styles.glyph, styles[status]]}>{glyphs[status]}</Text>
          <View style={styles.body}>
            <Text style={styles.label}>{label}</Text>
            <Text style={[styles.detail, styles[status]]}>
              {status}: {detail}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  list: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  glyph: { fontSize: 17, fontWeight: '700', width: 18 },
  body: { flex: 1, gap: 2 },
  label: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  detail: { fontSize: 13 },
  pass: { color: theme.colors.pass },
  fail: { color: theme.colors.fail },
  skipped: { color: theme.colors.skipped },
}));
