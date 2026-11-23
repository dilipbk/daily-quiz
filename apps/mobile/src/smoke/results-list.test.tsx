import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';

import { ResultsList, summarise } from './results-list';
import type { CheckResult } from './run-checks';

const results: CheckResult[] = [
  { id: 'mmkv', label: 'MMKV', status: 'pass', detail: 'wrote and read a key' },
  { id: 'skia', label: 'Skia', status: 'fail', detail: 'native module not found' },
  { id: 'apple', label: 'Apple sign-in', status: 'skipped', detail: 'not on android' },
];

describe('ResultsList', () => {
  it('renders one row per result, labelled with the library, its status and the detail', async () => {
    await render(<ResultsList results={results} />);

    expect(screen.getByLabelText('MMKV: pass, wrote and read a key')).toBeOnTheScreen();
    expect(screen.getByLabelText('Skia: fail, native module not found')).toBeOnTheScreen();
    expect(screen.getByLabelText('Apple sign-in: skipped, not on android')).toBeOnTheScreen();
  });

  it('shows the status as a word and a glyph, not by colour alone', async () => {
    await render(<ResultsList results={results} />);

    expect(screen.getByText('fail: native module not found')).toBeOnTheScreen();
    expect(screen.getByText('✕')).toBeOnTheScreen();
  });

  it('renders nothing for an empty list', async () => {
    await render(<ResultsList results={[]} />);

    expect(screen.queryByText(/pass|fail|skipped/)).toBeNull();
  });
});

describe('summarise', () => {
  it('counts each status', () => {
    expect(summarise(results)).toBe('1 pass, 1 fail, 1 skipped');
    expect(summarise([])).toBe('0 pass, 0 fail, 0 skipped');
  });
});
