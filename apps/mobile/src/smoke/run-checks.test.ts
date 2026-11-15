import { describe, expect, it, jest } from '@jest/globals';

import { runChecks, type Check } from './run-checks';

const check = (id: string, overrides: Partial<Check> = {}): Check => ({
  id,
  label: `Library ${id}`,
  platforms: ['ios', 'android', 'web'],
  run: () => 'ok',
  ...overrides,
});

describe('runChecks', () => {
  it('returns an empty list when there are no checks', async () => {
    await expect(runChecks([], 'ios')).resolves.toEqual([]);
  });

  it('reports pass, with what the check returned as the detail', async () => {
    const results = await runChecks(
      [
        check('sync', { run: () => 'en-GB' }),
        check('async', { run: () => Promise.resolve('4.3.2') }),
        check('number', { run: () => 42 }),
        check('nothing', { run: () => undefined }),
      ],
      'ios',
    );

    expect(results).toEqual([
      { id: 'sync', label: 'Library sync', status: 'pass', detail: 'en-GB' },
      { id: 'async', label: 'Library async', status: 'pass', detail: '4.3.2' },
      { id: 'number', label: 'Library number', status: 'pass', detail: '42' },
      { id: 'nothing', label: 'Library nothing', status: 'pass', detail: 'loaded' },
    ]);
  });

  it('reports fail with the message when a check throws, and still runs the checks after it', async () => {
    const after = jest.fn(() => 'still ran');

    const results = await runChecks(
      [
        check('throws', {
          run: () => {
            throw new Error('native module not found');
          },
        }),
        check('after', { run: after }),
      ],
      'android',
    );

    expect(results[0]).toMatchObject({ status: 'fail', detail: 'native module not found' });
    expect(results[1]).toMatchObject({ status: 'pass', detail: 'still ran' });
    expect(after).toHaveBeenCalledTimes(1);
  });

  it('reports fail when a check rejects, whatever was thrown', async () => {
    const results = await runChecks(
      [
        check('rejects', { run: () => Promise.reject(new Error('no such method')) }),
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- libraries do reject with strings
        check('string', { run: () => Promise.reject('plain string') }),
      ],
      'ios',
    );

    expect(results[0]).toMatchObject({ status: 'fail', detail: 'no such method' });
    expect(results[1]).toMatchObject({ status: 'fail', detail: 'plain string' });
  });

  it('skips a check that is not for this platform, without running it', async () => {
    const run = jest.fn(() => 'ran');

    const results = await runChecks([check('ios-only', { platforms: ['ios'], run })], 'web');

    expect(results).toEqual([
      { id: 'ios-only', label: 'Library ios-only', status: 'skipped', detail: 'not on web' },
    ]);
    expect(run).not.toHaveBeenCalled();
  });

  it('fails a check that never settles, and moves on', async () => {
    const results = await runChecks(
      [check('hangs', { run: () => new Promise(() => undefined) }), check('after')],
      'ios',
      20,
    );

    expect(results[0]).toMatchObject({ status: 'fail', detail: 'timed out after 20 ms' });
    expect(results[1]).toMatchObject({ status: 'pass' });
  });

  it('keeps the order the checks were given in', async () => {
    const results = await runChecks(
      [
        check('slow', { run: () => new Promise((resolve) => setTimeout(resolve, 15)) }),
        check('fast'),
      ],
      'ios',
    );

    expect(results.map((result) => result.id)).toEqual(['slow', 'fast']);
  });

  it('rejects two checks with the same id', async () => {
    await expect(runChecks([check('mmkv'), check('mmkv')], 'ios')).rejects.toThrow(
      'duplicate check id: mmkv',
    );
  });
});
