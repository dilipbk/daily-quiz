export type Platform = 'ios' | 'android' | 'web';

export type CheckStatus = 'pass' | 'fail' | 'skipped';

export interface Check {
  /** Stable and unique: the row's key on screen and in the evidence. */
  id: string;
  label: string;
  /** Platforms the library supports. On any other the check is skipped, not run. */
  platforms: readonly Platform[];
  /** Loads the library and makes one real call. What it returns becomes the row's detail. */
  run: () => unknown;
}

export interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

const DEFAULT_TIMEOUT_MS = 5000;

const describeValue = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return 'loaded';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
};

const describeFailure = (thrown: unknown): string =>
  thrown instanceof Error ? thrown.message : describeValue(thrown);

const runWithTimeout = (check: Check, timeoutMs: number): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`timed out after ${String(timeoutMs)} ms`));
    }, timeoutMs);

    // `Promise.resolve().then` turns a synchronous throw into a rejection too.
    Promise.resolve()
      .then(() => check.run())
      .then(resolve, reject)
      .finally(() => {
        clearTimeout(timer);
      });
  });

/**
 * Runs every check in order, one at a time, and never rejects because a check failed:
 * a library that didn't link is one failed row, and the checks after it still run.
 */
export async function runChecks(
  checks: readonly Check[],
  platform: Platform,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<CheckResult[]> {
  const seen = new Set<string>();
  for (const { id } of checks) {
    if (seen.has(id)) throw new Error(`duplicate check id: ${id}`);
    seen.add(id);
  }

  const results: CheckResult[] = [];
  for (const check of checks) {
    const { id, label } = check;

    if (!check.platforms.includes(platform)) {
      results.push({ id, label, status: 'skipped', detail: `not on ${platform}` });
      continue;
    }

    try {
      const value = await runWithTimeout(check, timeoutMs);
      results.push({ id, label, status: 'pass', detail: describeValue(value) });
    } catch (thrown) {
      results.push({ id, label, status: 'fail', detail: describeFailure(thrown) });
    }
  }
  return results;
}
