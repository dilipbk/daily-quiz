import * as z from 'zod';
import { defineEndpoint } from '../endpoint.ts';
import { idSchema, localeSchema, pageOf, pageQueryShape, slugSchema } from '../primitives.ts';
import { imageAssetSchema } from '../published.ts';
import { maxSessionQuestions } from '../questions.ts';

// The catalogue (spec §19.3, EXP-02): the taxonomy and the quizzes a player can browse. v0 holds
// what the quiz list and quiz detail need. Topic pages, collections and search arrive with the
// tickets that build them (BE-13, BE-19).

const nameSchema = z.string().min(1).max(80);

export const domainSchema = z.object({
  /** The key the app's category colours and illustrations hang on. */
  slug: slugSchema,
  name: nameSchema,
  topics: z.array(z.object({ slug: slugSchema, name: nameSchema })).max(200),
});

export const domainsSchema = z.object({
  domains: z.array(domainSchema).max(64),
});

/** A quiz as a list or its detail screen shows it (PLAY-01). The questions come with a session. */
export const quizSchema = z.object({
  id: idSchema,
  version: z.int().min(1).max(1_000_000),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(500).nullable(),
  cover: imageAssetSchema.nullable(),
  domain: slugSchema,
  topic: slugSchema.nullable(),
  locale: localeSchema,
  questionCount: z.int().min(1).max(maxSessionQuestions),
  estimatedSeconds: z.int().min(1).max(7200),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  /**
   * The question types the quiz uses, as labels to show. A word, not the engine's list of types:
   * a list may name a type this build can't play yet.
   */
  questionTypes: z.array(z.string().regex(/^[a-z][a-z0-9_]{0,31}$/)).max(32),
});

export const quizPageSchema = pageOf(quizSchema);

export const quizzesQuerySchema = z.strictObject({
  domain: slugSchema.optional(),
  topic: slugSchema.optional(),
  ...pageQueryShape,
});

export const quizParamsSchema = z.strictObject({ quizId: idSchema });

export type Domain = z.infer<typeof domainSchema>;
export type Domains = z.infer<typeof domainsSchema>;
export type Quiz = z.infer<typeof quizSchema>;
export type QuizPage = z.infer<typeof quizPageSchema>;

export const getDomains = defineEndpoint({
  id: 'content.domains',
  area: 'content',
  method: 'GET',
  path: '/domains',
  access: 'public',
  summary: 'The domains and their topics.',
  params: null,
  query: null,
  body: null,
  idempotencyKey: false,
  caching: 'etag',
  success: { status: 200, body: domainsSchema },
  errors: [],
});

export const listQuizzes = defineEndpoint({
  id: 'content.quizzes',
  area: 'content',
  method: 'GET',
  path: '/quizzes',
  access: 'public',
  summary: 'Quizzes, one page at a time, optionally within a domain or a topic.',
  params: null,
  query: quizzesQuerySchema,
  body: null,
  idempotencyKey: false,
  caching: 'etag',
  success: { status: 200, body: quizPageSchema },
  errors: [],
});

export const getQuiz = defineEndpoint({
  id: 'content.quiz',
  area: 'content',
  method: 'GET',
  path: '/quizzes/:quizId',
  access: 'public',
  summary: 'One quiz, for its detail screen.',
  params: quizParamsSchema,
  query: null,
  body: null,
  idempotencyKey: false,
  caching: 'etag',
  success: { status: 200, body: quizSchema },
  errors: ['not_found'],
});
