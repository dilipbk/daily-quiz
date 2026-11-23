// Prints the runtime and the local dates `@repo/game-rules` computes, as one line of JSON. The
// smoke script runs it with the workspace's Node and inside the image (bind-mounted, since the
// image doesn't ship it) and compares the two (ADR 0005). Importing @repo/game-rules inside the
// image also proves Node strips the types of the workspace packages there (ADR 0079).
import { localDateOf } from '@repo/game-rules';
import type { RuntimeReport } from './checks.ts';

function outcome(run: () => string): string {
  try {
    return run();
  } catch (error) {
    return error instanceof Error ? error.name : 'thrown';
  }
}

const midsummer = Date.UTC(2026, 5, 15, 10, 30);

const report: RuntimeReport = {
  node: process.version,
  icu: process.versions.icu ?? '',
  tz: process.versions.tz ?? '',
  vancouver: outcome(() => localDateOf(Date.UTC(2026, 10, 2, 7, 30), 'America/Vancouver')),
  kiritimati: outcome(() => localDateOf(midsummer, 'Pacific/Kiritimati')),
  coyhaique: outcome(() => localDateOf(midsummer, 'America/Coyhaique')),
  unknownZone: outcome(() => localDateOf(midsummer, 'Mars/Olympus')),
  tzEnv: process.env.TZ ?? null,
  icuDataEnv: process.env.NODE_ICU_DATA ?? null,
};

console.log(JSON.stringify(report));
