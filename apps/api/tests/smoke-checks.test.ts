import { describe, expect, it } from 'vitest';
import { runtimeMismatches, timeZoneFailures, type RuntimeReport } from '../smoke/checks.ts';

// The image must run the Node that package.json pins, with that Node's own ICU and zone data,
// because streak dates come from it (ADR 0001, ADR 0005, ADR 0051).
const workspace: RuntimeReport = {
  node: 'v26.13.1',
  icu: '78.3',
  tz: '2026e',
  vancouver: '2026-11-02',
  kiritimati: '2026-06-16',
  coyhaique: '2026-06-15',
  unknownZone: 'RangeError',
  tzEnv: null,
  icuDataEnv: null,
};

describe('runtimeMismatches', () => {
  it("is empty when the image runs the pinned Node with the workspace's ICU and zone data", () => {
    expect(runtimeMismatches('26.13.1', workspace, { ...workspace })).toEqual([]);
  });

  it('names the Node version when it differs from devEngines.runtime.version', () => {
    const problems = runtimeMismatches('26.13.1', workspace, { ...workspace, node: 'v26.13.0' });

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('v26.13.0');
    expect(problems[0]).toContain('26.13.1');
  });

  it("names ICU or tz when they differ from the workspace Node's", () => {
    const problems = runtimeMismatches('26.13.1', workspace, {
      ...workspace,
      icu: '74.2',
      tz: '2024b',
    });

    expect(problems).toHaveLength(2);
    expect(problems.join('\n')).toMatch(/icu.*74\.2.*78\.3/);
    expect(problems.join('\n')).toMatch(/tz.*2024b.*2026e/);
  });

  it('names the workspace Node when it is not the pinned one, since nothing then compares', () => {
    expect(
      runtimeMismatches('26.13.1', { ...workspace, node: 'v22.14.0' }, workspace).join('\n'),
    ).toContain('v22.14.0');
  });
});

describe('timeZoneFailures', () => {
  it('is empty for the dates ADR 0005 expects', () => {
    expect(timeZoneFailures(workspace)).toEqual([]);
  });

  it('names a wrong date, a refused Coyhaique, an accepted unknown zone and a set TZ', () => {
    const problems = timeZoneFailures({
      ...workspace,
      vancouver: '2026-11-01',
      coyhaique: 'RangeError',
      unknownZone: '2026-06-15',
      tzEnv: 'UTC',
    });

    expect(problems).toHaveLength(4);
    expect(problems.join('\n')).toMatch(/Vancouver.*2026-11-01/);
    expect(problems.join('\n')).toMatch(/Coyhaique.*RangeError/);
    expect(problems.join('\n')).toMatch(/unknown zone.*2026-06-15/);
    expect(problems.join('\n')).toMatch(/TZ.*UTC/);
  });

  it('names NODE_ICU_DATA when the image sets it', () => {
    expect(timeZoneFailures({ ...workspace, icuDataEnv: '/usr/share/icu' }).join('\n')).toContain(
      'NODE_ICU_DATA',
    );
  });
});
