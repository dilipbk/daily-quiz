// Pure checks the smoke script runs on what `tz-check.ts` reports from the workspace's Node and
// from inside the image. They are unit-tested in `tests/smoke-checks.test.ts`.

/** What `tz-check.ts` prints, on the host and inside the image. */
export interface RuntimeReport {
  /** `process.version`, such as `v26.13.1`. */
  readonly node: string;
  readonly icu: string;
  /** The IANA time-zone data Node's ICU carries, such as `2026e`. */
  readonly tz: string;
  /** `localDateOf` at 2026-11-02T07:30Z in America/Vancouver. */
  readonly vancouver: string;
  /** `localDateOf` at 2026-06-15T10:30Z in Pacific/Kiritimati. */
  readonly kiritimati: string;
  /** The same instant in America/Coyhaique, a zone older data lacks: a date, or the error's name. */
  readonly coyhaique: string;
  /** The same instant in a zone that doesn't exist: the error's name, or the date it gave. */
  readonly unknownZone: string;
  readonly tzEnv: string | null;
  readonly icuDataEnv: string | null;
}

/**
 * How the image's runtime differs from the one `package.json` pins (`devEngines.runtime`,
 * ADR 0001) and from the workspace Node's ICU and zone data (ADR 0005). Empty when it doesn't.
 */
export function runtimeMismatches(
  pinned: string,
  workspace: RuntimeReport,
  image: RuntimeReport,
): string[] {
  const problems: string[] = [];
  if (workspace.node !== `v${pinned}`) {
    problems.push(
      `node: the workspace runs ${workspace.node}, package.json pins ${pinned}; run the smoke through pnpm`,
    );
  }
  if (image.node !== `v${pinned}`) {
    problems.push(`node: the image runs ${image.node}, package.json pins ${pinned}`);
  }
  for (const field of ['icu', 'tz'] as const) {
    if (image[field] !== workspace[field]) {
      problems.push(
        `${field}: the image has ${image[field]}, the workspace Node has ${workspace[field]}`,
      );
    }
  }
  return problems;
}

/** How a report departs from the dates and the environment ADR 0005 expects. Empty when it doesn't. */
export function timeZoneFailures(report: RuntimeReport): string[] {
  const problems: string[] = [];
  if (report.vancouver !== '2026-11-02') {
    problems.push(`Vancouver at 2026-11-02T07:30Z gave ${report.vancouver}, not 2026-11-02`);
  }
  if (report.kiritimati !== '2026-06-16') {
    problems.push(`Kiritimati at 2026-06-15T10:30Z gave ${report.kiritimati}, not 2026-06-16`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(report.coyhaique)) {
    problems.push(`America/Coyhaique was refused (${report.coyhaique}); the zone data is too old`);
  }
  if (report.unknownZone !== 'RangeError') {
    problems.push(`an unknown zone gave ${report.unknownZone}, not a RangeError`);
  }
  if (report.tzEnv !== null) problems.push(`TZ is set to ${report.tzEnv}; leave it unset`);
  if (report.icuDataEnv !== null) {
    problems.push(`NODE_ICU_DATA is set to ${report.icuDataEnv}; Node must use its own ICU`);
  }
  return problems;
}
