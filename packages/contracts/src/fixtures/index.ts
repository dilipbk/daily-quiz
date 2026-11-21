import type * as z from 'zod';
import type { Endpoint } from '../endpoint.ts';
import { endpoints } from '../endpoints.ts';
import { errorCodes, problemSchema } from '../errors.ts';
import { playerQuestionItemSchema, toPlayerQuestionItem } from '../questions.ts';
import { gameRulesSchema } from '../rules.ts';
import { configFixture, gameRulesFixture } from './config.ts';
import {
  domainsFixture,
  emptyQuizPageFixture,
  lastQuizPageFixture,
  quizFixture,
  quizPageFixture,
  quizParamsFixture,
  quizzesQueryFixture,
} from './content.ts';
import { globalDailySetFixture, globalSetParamsFixture } from './dailies.ts';
import {
  deviceFixture,
  deviceParamsFixture,
  guestRequestFixture,
  guestResponseFixture,
  playerFixture,
  updatedPlayerFixture,
  updatePlayerFixture,
} from './identity.ts';
import { problemFixtures } from './problems.ts';
import {
  firstDailyProgressFixture,
  frozenStreakProgressFixture,
  hundredDayStreakProgressFixture,
  newPlayerProgressFixture,
  progressQueryFixture,
} from './progress.ts';
import { questionFixtures, questionSetFixture } from './questions.ts';
import {
  completedGlobalDailySessionFixture,
  completionFixture,
  completionResultFixture,
  createDaily5Fixture,
  createGlobalDailyFixture,
  createQuizFixture,
  daily5SessionFixture,
  globalDailySessionFixture,
  quizSessionFixture,
  sessionParamsFixture,
} from './sessions.ts';

// Fixtures for every endpoint (roadmap, ENG-04): a value for each thing an endpoint takes and
// for what it answers, and a problem for every error code. They are data. Tests on both sides
// parse them, and the fake server answers with them (spec §19.6).

/** The part of an exchange a fixture is: something the client sends, or what the server answers. */
export type FixturePart = 'params' | 'query' | 'body' | 'response';

export interface Fixture {
  /** Unique: `endpoint.id/part`, with a label after it where an endpoint has several. */
  readonly name: string;
  /** The schema the value must parse with. For an endpoint's fixture, the endpoint's own. */
  readonly schema: z.ZodType;
  readonly value: unknown;
  /** The id of the endpoint this is a fixture of, when it is one. */
  readonly endpoint?: string;
  readonly part?: FixturePart;
}

/** A fixture for one part of an endpoint, checked against the schema the endpoint itself holds. */
function of(endpoint: Endpoint, part: FixturePart, value: unknown, label?: string): Fixture {
  const schema = part === 'response' ? endpoint.success.body : endpoint[part];
  if (schema === null) throw new Error(`The endpoint "${endpoint.id}" has no ${part}.`);

  return {
    name: [endpoint.id, part, ...(label === undefined ? [] : [label])].join('/'),
    schema,
    value,
    endpoint: endpoint.id,
    part,
  };
}

export const fixtures: readonly Fixture[] = [
  of(endpoints.getConfig, 'response', configFixture),

  of(endpoints.authGuest, 'body', guestRequestFixture),
  of(endpoints.authGuest, 'response', guestResponseFixture),
  of(endpoints.getMe, 'response', playerFixture),
  of(endpoints.updateMe, 'body', updatePlayerFixture),
  of(endpoints.updateMe, 'response', updatedPlayerFixture),
  of(endpoints.putDevice, 'params', deviceParamsFixture),
  of(endpoints.putDevice, 'body', deviceFixture),

  of(endpoints.getDomains, 'response', domainsFixture),
  of(endpoints.listQuizzes, 'query', quizzesQueryFixture),
  of(endpoints.listQuizzes, 'response', quizPageFixture, 'first-page'),
  of(endpoints.listQuizzes, 'response', lastQuizPageFixture, 'last-page'),
  of(endpoints.listQuizzes, 'response', emptyQuizPageFixture, 'empty'),
  of(endpoints.getQuiz, 'params', quizParamsFixture),
  of(endpoints.getQuiz, 'response', quizFixture),

  of(endpoints.getGlobalDailySet, 'params', globalSetParamsFixture),
  of(endpoints.getGlobalDailySet, 'response', globalDailySetFixture),

  of(endpoints.createSession, 'body', createGlobalDailyFixture, 'global-daily'),
  of(endpoints.createSession, 'body', createDaily5Fixture, 'daily-5'),
  of(endpoints.createSession, 'body', createQuizFixture, 'quiz'),
  of(endpoints.createSession, 'response', globalDailySessionFixture, 'global-daily-open'),
  of(
    endpoints.createSession,
    'response',
    completedGlobalDailySessionFixture,
    'global-daily-completed',
  ),
  of(endpoints.createSession, 'response', daily5SessionFixture, 'daily-5'),
  of(endpoints.createSession, 'response', quizSessionFixture, 'quiz'),
  of(endpoints.completeSession, 'params', sessionParamsFixture),
  of(endpoints.completeSession, 'body', completionFixture),
  of(endpoints.completeSession, 'response', completionResultFixture),

  of(endpoints.getProgress, 'query', progressQueryFixture),
  of(endpoints.getProgress, 'response', newPlayerProgressFixture, 'new-player'),
  of(endpoints.getProgress, 'response', firstDailyProgressFixture, 'first-daily'),
  of(endpoints.getProgress, 'response', hundredDayStreakProgressFixture, 'hundred-day-streak'),
  of(endpoints.getProgress, 'response', frozenStreakProgressFixture, 'frozen-streak'),

  ...errorCodes.map((code): Fixture => ({
    name: `problem/${code}`,
    schema: problemSchema,
    value: problemFixtures[code],
  })),

  { name: 'game-rules', schema: gameRulesSchema, value: gameRulesFixture },
  ...questionFixtures.map((question): Fixture => ({
    name: `player-question-item/${question.id}`,
    schema: playerQuestionItemSchema,
    value: toPlayerQuestionItem(question),
  })),
];

export {
  completedGlobalDailySessionFixture,
  completionFixture,
  completionResultFixture,
  configFixture,
  createDaily5Fixture,
  createGlobalDailyFixture,
  createQuizFixture,
  daily5SessionFixture,
  deviceFixture,
  deviceParamsFixture,
  domainsFixture,
  emptyQuizPageFixture,
  firstDailyProgressFixture,
  frozenStreakProgressFixture,
  gameRulesFixture,
  globalDailySessionFixture,
  globalDailySetFixture,
  globalSetParamsFixture,
  guestRequestFixture,
  guestResponseFixture,
  hundredDayStreakProgressFixture,
  lastQuizPageFixture,
  newPlayerProgressFixture,
  playerFixture,
  problemFixtures,
  progressQueryFixture,
  questionFixtures,
  questionSetFixture,
  quizFixture,
  quizPageFixture,
  quizParamsFixture,
  quizSessionFixture,
  quizzesQueryFixture,
  sessionParamsFixture,
  updatedPlayerFixture,
  updatePlayerFixture,
};
