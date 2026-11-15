import * as z from 'zod';
import { invalid, unanswered } from './module.ts';
import type { Grade } from './module.ts';
import type {
  AnyQuestionTypeModule,
  ErasedQuestionTypeModule,
  Registry,
  TunablesOf,
} from './registry.ts';

// Grading one answer through a registry (spec QT-01, QT-02). This is the only way a grader is
// reached: the same call on the device and on the server, which re-grades what the device sent
// (roadmap §4.3). It decides what is common to every type and leaves the rest to the module.

export interface GradeContext<M extends readonly AnyQuestionTypeModule[]> {
  /** The question's content language as BCP 47, such as 'en' or 'pt-BR'. Never the device's. */
  readonly locale: string;
  readonly tunables: TunablesOf<M>;
}

/** Every answer, before its type is known: a response under the tag of the type it answers. */
const answerEnvelopeSchema = z.strictObject({ type: z.string(), response: z.unknown() });

/**
 * Never throws for a question the registry's schema accepts. `answer` is untrusted: it is whatever
 * the player's device sent, and anything that isn't an answer to this question grades `invalid`.
 */
export function gradeAnswer<M extends readonly AnyQuestionTypeModule[]>(
  registry: Registry<M>,
  question: { readonly type: string; readonly payload: unknown; readonly key: unknown },
  answer: unknown,
  context: GradeContext<M>,
): Grade {
  const module: ErasedQuestionTypeModule | undefined = registry.get(question.type);
  // A type this build doesn't hold: the server is ahead of the app. Nothing can be said about it.
  if (module === undefined) return invalid('unknown_type');

  // The question timed out (spec §10.2, TIMEOUT).
  if (answer === null || answer === undefined) return unanswered();

  const envelope = answerEnvelopeSchema.safeParse(answer);
  if (!envelope.success) return invalid('malformed');
  if (envelope.data.type !== question.type) return invalid('type_mismatch');

  const response = module.responseSchema.safeParse(envelope.data.response);
  if (!response.success) return invalid('malformed');

  const tunables: Readonly<Record<string, unknown>> = context.tunables;
  return module.grade({ payload: question.payload, key: question.key }, response.data, {
    locale: context.locale,
    tunables: tunables[module.type],
  });
}

/** `Omit` that keeps a union of questions a union: one member per type, each without its key. */
type WithoutKey<Q> = Q extends unknown ? Omit<Q, 'key'> : never;

/** What may be sent to a player before they answer. Copies; the question is left as it was. */
export function toPlayerQuestion<
  Q extends { readonly type: string; readonly payload: unknown; readonly key: unknown },
>(question: Q): WithoutKey<Q> {
  const kept = Object.entries(question).filter(([name]) => name !== 'key');
  return Object.fromEntries(kept) as WithoutKey<Q>;
}
