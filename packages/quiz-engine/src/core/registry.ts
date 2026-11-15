import * as z from 'zod';
import type { QuestionTypeModule } from './module.ts';

// A registry is built from a list of modules and derives everything that spans types: the
// question, player-question and answer schemas, their unions, and the lookup that grading
// dispatches on (spec QT-01). Nothing here, or elsewhere in src/core, names a question type.

/**
 * The bound of every generic that takes modules. `any` is deliberate: a grader takes its own
 * payload, key and response, so no real module is assignable to one that takes `unknown`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see the comment above
export type AnyQuestionTypeModule = QuestionTypeModule<string, any, any, any, any>;

/** A module as the core handles it once a registry holds it: its type parameters forgotten. */
export type ErasedQuestionTypeModule = QuestionTypeModule<
  string,
  unknown,
  unknown,
  unknown,
  unknown
>;

type QuestionOfModule<Module> = Module extends {
  readonly type: infer TType;
  readonly payloadSchema: z.ZodType<infer TPayload>;
  readonly keySchema: z.ZodType<infer TKey>;
}
  ? { readonly type: TType; readonly payload: TPayload; readonly key: TKey }
  : never;

type PlayerQuestionOfModule<Module> = Module extends {
  readonly type: infer TType;
  readonly payloadSchema: z.ZodType<infer TPayload>;
}
  ? { readonly type: TType; readonly payload: TPayload }
  : never;

type AnswerOfModule<Module> = Module extends {
  readonly type: infer TType;
  readonly responseSchema: z.ZodType<infer TResponse>;
}
  ? { readonly type: TType; readonly response: TResponse }
  : never;

/** The module's type id when it declares tunables, and `never` when it doesn't. */
type TunableTypeOf<Module> = Module extends {
  readonly type: infer TType extends string;
  readonly tunablesSchema?: z.ZodType<infer TTunables>;
}
  ? [TTunables] extends [undefined]
    ? never
    : TType
  : never;

type TunablesOfModule<Module> = Module extends {
  readonly tunablesSchema?: z.ZodType<infer TTunables>;
}
  ? TTunables
  : never;

/** A question as stored and as graded: `{ type, payload, key }`, one member per module. */
export type QuestionOf<M extends readonly AnyQuestionTypeModule[]> = QuestionOfModule<M[number]>;

/** A question as a player may see it before answering: no key. Still one member per module. */
export type PlayerQuestionOf<M extends readonly AnyQuestionTypeModule[]> = PlayerQuestionOfModule<
  M[number]
>;

/** What a player submits: the response, tagged with the type it answers. */
export type AnswerOf<M extends readonly AnyQuestionTypeModule[]> = AnswerOfModule<M[number]>;

/** The tunables of every module that declares some, keyed by type id. */
export type TunablesOf<M extends readonly AnyQuestionTypeModule[]> = {
  readonly [Module in M[number] as TunableTypeOf<Module>]: TunablesOfModule<Module>;
};

export interface Registry<M extends readonly AnyQuestionTypeModule[]> {
  /** Type ids, in the order the modules were given. */
  readonly types: readonly M[number]['type'][];
  /** Strict, and runs each module's `check`. */
  readonly questionSchema: z.ZodType<QuestionOf<M>>;
  /** Strict: an object that carries a `key` fails. */
  readonly playerQuestionSchema: z.ZodType<PlayerQuestionOf<M>>;
  /** Strict `{ type, response }`. */
  readonly answerSchema: z.ZodType<AnswerOf<M>>;
  readonly tunablesSchema: z.ZodType<TunablesOf<M>>;
  readonly get: (type: string) => M[number] | undefined;
}

/** Throws when the list is empty or two modules share a type id: a programming error, at start-up. */
export function createRegistry<const M extends readonly AnyQuestionTypeModule[]>(
  modules: M,
): Registry<M> {
  const erased: readonly ErasedQuestionTypeModule[] = modules;
  const [first, ...rest] = erased;
  if (first === undefined) {
    throw new Error('A registry needs at least one question type.');
  }

  // A Map, not an object: a type id such as "constructor" must find nothing.
  const byType = new Map<string, M[number]>();
  for (const module of modules) {
    if (byType.has(module.type)) {
      throw new Error(`The question type "${module.type}" is registered twice.`);
    }
    byType.set(module.type, module);
  }

  /** One strict object per module, told apart by the literal in `type`. */
  const unionByType = <Option extends z.core.$ZodTypeDiscriminable>(
    toOption: (module: ErasedQuestionTypeModule) => Option,
  ) => z.discriminatedUnion('type', [toOption(first), ...rest.map(toOption)]);

  const questionSchema = unionByType((module) => {
    const { check } = module;
    const fields = z.strictObject({
      type: z.literal(module.type),
      payload: module.payloadSchema,
      key: module.keySchema,
    });
    if (check === undefined) return fields;

    // zod runs this only once the fields above have parsed, so `check` can trust what it is given.
    return fields.superRefine(({ payload, key }, context) => {
      for (const issue of check({ payload, key })) {
        context.addIssue({ code: 'custom', message: issue.message, path: [...issue.path] });
      }
    });
  });

  const playerQuestionSchema = unionByType((module) =>
    z.strictObject({ type: z.literal(module.type), payload: module.payloadSchema }),
  );

  const answerSchema = unionByType((module) =>
    z.strictObject({ type: z.literal(module.type), response: module.responseSchema }),
  );

  const tunablesSchema = z.strictObject(
    Object.fromEntries(
      erased.flatMap((module) =>
        module.tunablesSchema === undefined ? [] : [[module.type, module.tunablesSchema]],
      ),
    ),
  );

  return Object.freeze({
    types: Object.freeze(modules.map((module): M[number]['type'] => module.type)),
    questionSchema: questionSchema as z.ZodType as z.ZodType<QuestionOf<M>>,
    playerQuestionSchema: playerQuestionSchema as z.ZodType as z.ZodType<PlayerQuestionOf<M>>,
    answerSchema: answerSchema as z.ZodType as z.ZodType<AnswerOf<M>>,
    tunablesSchema: tunablesSchema as z.ZodType as z.ZodType<TunablesOf<M>>,
    get: (type: string) => byType.get(type),
  });
}
