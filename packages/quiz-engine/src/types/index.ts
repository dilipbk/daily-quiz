import { createRegistry } from '../core/registry.ts';
import type { AnswerOf, PlayerQuestionOf, QuestionOf, TunablesOf } from '../core/registry.ts';
import { imageChoice } from './image-choice.ts';
import { ordering } from './ordering.ts';
import { singleChoice } from './single-choice.ts';
import { trueFalse } from './true-false.ts';
import { specTypeAnswerTunables, typeAnswer } from './type-answer.ts';

// The catalogue of MVP question types (spec §7.4, QT-01). A new type is a module in this folder
// and one entry in the list below; every schema, union and lookup follows from the list.

export const mvpQuestionTypes = [
  singleChoice,
  trueFalse,
  imageChoice,
  typeAnswer,
  ordering,
] as const;

export const mvpRegistry = createRegistry(mvpQuestionTypes);

export type QuestionType = (typeof mvpQuestionTypes)[number]['type'];
export type Question = QuestionOf<typeof mvpQuestionTypes>;
export type PlayerQuestion = PlayerQuestionOf<typeof mvpQuestionTypes>;
export type Answer = AnswerOf<typeof mvpQuestionTypes>;
export type MvpTunables = TunablesOf<typeof mvpQuestionTypes>;

/** The spec's value for every tunable of every type, as data. No function falls back to it. */
export const specMvpTunables: MvpTunables = Object.freeze({ type_answer: specTypeAnswerTunables });
