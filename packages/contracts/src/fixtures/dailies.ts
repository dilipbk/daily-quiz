import type { DailySet } from '../areas/dailies.ts';
import { questionSetFixture } from './questions.ts';

export const globalSetParamsFixture = { date: '2026-11-21', contentVersion: 'gd-2026-11-21-v3' };

/** The Global Daily of 21 November 2026: the eight fixture questions under the spec's rules. */
export const globalDailySetFixture: DailySet = {
  ...questionSetFixture,
  ...globalSetParamsFixture,
};
