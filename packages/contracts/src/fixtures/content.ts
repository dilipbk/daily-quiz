import type { Domains, Quiz, QuizPage } from '../areas/content.ts';

/** The eleven launch domains of spec §11.4. Topics are CT-01's to settle; a few stand in here. */
export const domainsFixture: Domains = {
  domains: [
    {
      slug: 'science',
      name: 'Science',
      topics: [
        { slug: 'chemistry', name: 'Chemistry' },
        { slug: 'physics', name: 'Physics' },
        { slug: 'space', name: 'Space' },
      ],
    },
    {
      slug: 'math-logic',
      name: 'Math & Logic',
      topics: [{ slug: 'algebra', name: 'Algebra' }],
    },
    {
      slug: 'technology',
      name: 'Technology',
      topics: [{ slug: 'programming', name: 'Programming' }],
    },
    { slug: 'food-cooking', name: 'Food & Cooking', topics: [] },
    {
      slug: 'history',
      name: 'History',
      topics: [{ slug: 'twentieth-century', name: '20th century' }],
    },
    { slug: 'geography', name: 'Geography', topics: [{ slug: 'oceans', name: 'Oceans' }] },
    { slug: 'arts-literature', name: 'Arts & Literature', topics: [] },
    { slug: 'words-language', name: 'Words & Language', topics: [] },
    { slug: 'nature-animals', name: 'Nature & Animals', topics: [] },
    { slug: 'sports', name: 'Sports', topics: [] },
    { slug: 'entertainment', name: 'Entertainment', topics: [] },
  ],
};

export const quizFixture: Quiz = {
  id: 'quiz-periodic-table',
  version: 4,
  title: 'The periodic table in ten questions',
  description: 'Symbols, groups and the stories behind a few odd names.',
  cover: {
    assetId: 'cover-periodic-table',
    kind: 'image',
    width: 1600,
    height: 900,
    placeholder: { kind: 'thumbhash', hash: '2PcJDYCniHeAeHh/d4h4d3iAeQ' },
    sources: [
      {
        url: 'https://media.example.org/covers/cover-periodic-table/800.avif',
        format: 'avif',
        width: 800,
        bytes: 41_250,
      },
      {
        url: 'https://media.example.org/covers/cover-periodic-table/800.webp',
        format: 'webp',
        width: 800,
        bytes: 58_904,
      },
    ],
  },
  domain: 'science',
  topic: 'chemistry',
  locale: 'en',
  questionCount: 10,
  estimatedSeconds: 180,
  difficulty: 'medium',
  questionTypes: ['single_choice', 'type_answer'],
};

const quickQuiz: Quiz = {
  id: 'quiz-oceans-quick',
  version: 1,
  title: 'Five oceans, five questions',
  description: null,
  cover: null,
  domain: 'geography',
  topic: 'oceans',
  locale: 'en',
  questionCount: 5,
  estimatedSeconds: 90,
  difficulty: 'easy',
  questionTypes: ['single_choice', 'true_false'],
};

/** The parsed form of `?domain=science&limit=20`. */
export const quizzesQueryFixture = { domain: 'science', limit: 20 };

export const quizParamsFixture = { quizId: quizFixture.id };

/** A first page, with more to come. */
export const quizPageFixture: QuizPage = {
  items: [quizFixture, quickQuiz],
  nextCursor: 'b2Zmc2V0LXF1aXotb2NlYW5zLXF1aWNr',
};

/** The last page. */
export const lastQuizPageFixture: QuizPage = { items: [quickQuiz], nextCursor: null };

/** A filter that matches nothing. */
export const emptyQuizPageFixture: QuizPage = { items: [], nextCursor: null };
