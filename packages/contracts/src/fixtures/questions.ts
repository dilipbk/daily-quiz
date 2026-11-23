import type { Block } from '@repo/content-blocks';
import { specMvpTunables, specScoringConfig } from '@repo/quiz-engine';
import type { ImageAsset, Renderings } from '../published.ts';
import type { QuestionSet, SessionQuestion } from '../questions.ts';

// Eight questions shaped like a Global Daily (DLY-01): seven domains, three easy, three medium
// and two hard, in that order, across the five MVP types. One prompt holds math and one holds
// code, and one question is answered by picking a picture, so every kind of rendering appears.
// The facts are real and each cites its source.

/** One paragraph of plain text. */
const text = (value: string): Block[] => [
  { type: 'paragraph', children: [{ type: 'text', text: value }] },
];

const nothingRendered = (): Renderings => ({ media: [], math: [], code: [] });

const wikipedia = (title: string, page: string) => ({
  title,
  url: `https://en.wikipedia.org/wiki/${page}`,
});

/** A photograph in two formats at two widths, as the publish pipeline would produce it. */
const photo = (assetId: string, hash: string): ImageAsset => ({
  assetId,
  kind: 'image',
  width: 1200,
  height: 900,
  placeholder: { kind: 'thumbhash', hash },
  sources: [
    {
      url: `https://media.example.org/q/${assetId}/480.avif`,
      format: 'avif',
      width: 480,
      bytes: 18_420,
    },
    {
      url: `https://media.example.org/q/${assetId}/960.avif`,
      format: 'avif',
      width: 960,
      bytes: 52_310,
    },
    {
      url: `https://media.example.org/q/${assetId}/960.webp`,
      format: 'webp',
      width: 960,
      bytes: 71_844,
    },
  ],
});

// The multipliers are the engine's line (ADR 0021, R2): easy 1200 gives 0.8, medium 1500 gives
// 1.15 and hard 1800 gives 1.5. The limits are §10.3's: 20 s to pick, 30 s to construct, and
// 10 s more with media or math.

const largestOcean: SessionQuestion = {
  id: 'q-largest-ocean',
  version: 1,
  domain: 'geography',
  locale: 'en',
  difficultyMultiplier: 0.8,
  standardLimitMs: 20_000,
  prompt: text('Which is the largest ocean on Earth?'),
  renderings: nothingRendered(),
  question: {
    type: 'single_choice',
    payload: {
      options: [
        { id: 'a', content: text('Atlantic Ocean') },
        { id: 'b', content: text('Indian Ocean') },
        { id: 'c', content: text('Pacific Ocean') },
        { id: 'd', content: text('Arctic Ocean') },
      ],
    },
    key: { correctOptionId: 'c' },
  },
  explanation: {
    blocks: text(
      'The Pacific covers about 165 million square kilometres, which is more than all of the land on Earth put together.',
    ),
    sources: [wikipedia('Pacific Ocean', 'Pacific_Ocean')],
    renderings: nothingRendered(),
  },
};

const soundInWater: SessionQuestion = {
  id: 'q-sound-in-water',
  version: 2,
  domain: 'science',
  locale: 'en',
  difficultyMultiplier: 0.8,
  standardLimitMs: 20_000,
  prompt: text('Sound travels faster in water than in air.'),
  renderings: nothingRendered(),
  question: { type: 'true_false', payload: {}, key: { value: true } },
  explanation: {
    blocks: text(
      'Sound moves at about 1,480 metres per second in water and about 343 in air at 20 °C. Water is far harder to compress, which more than makes up for its density.',
    ),
    sources: [wikipedia('Speed of sound', 'Speed_of_sound')],
    renderings: nothingRendered(),
  },
};

const whichIsAMammal: SessionQuestion = {
  id: 'q-which-is-a-mammal',
  version: 1,
  domain: 'nature-animals',
  locale: 'en',
  difficultyMultiplier: 0.8,
  standardLimitMs: 30_000,
  prompt: text('Which of these animals is a mammal?'),
  renderings: {
    media: [
      photo('animal-shark', '3OcRJYB4d3h/iIeHeEh3eIhw+j2w'),
      photo('animal-dolphin', '1QcSHQRnh493V4dIh4eXh1h4kJUI'),
      photo('animal-penguin', 'HBkSHYSIeHiPiHh8eJd4eTN0EEQG'),
      photo('animal-sea-turtle', 'XJUCFYJ4d4iAeIh3iHeHd2h3cFMH'),
    ],
    math: [],
    code: [],
  },
  question: {
    type: 'image_choice',
    payload: {
      options: [
        {
          id: 'a',
          image: {
            type: 'image',
            assetId: 'animal-shark',
            alt: 'A grey shark swimming over a reef',
          },
        },
        {
          id: 'b',
          image: {
            type: 'image',
            assetId: 'animal-dolphin',
            alt: 'A dolphin leaping out of the sea',
          },
        },
        {
          id: 'c',
          image: {
            type: 'image',
            assetId: 'animal-penguin',
            alt: 'A penguin standing on ice',
          },
        },
        {
          id: 'd',
          image: {
            type: 'image',
            assetId: 'animal-sea-turtle',
            alt: 'A sea turtle gliding through blue water',
          },
        },
      ],
    },
    key: { correctOptionId: 'b' },
  },
  explanation: {
    blocks: text(
      'Dolphins breathe air, are warm-blooded and feed their young on milk. A shark is a fish, a penguin is a bird and a sea turtle is a reptile.',
    ),
    sources: [wikipedia('Dolphin', 'Dolphin')],
    renderings: nothingRendered(),
  },
};

const solveForX: SessionQuestion = {
  id: 'q-solve-for-x',
  version: 1,
  domain: 'math-logic',
  locale: 'en',
  difficultyMultiplier: 1.15,
  standardLimitMs: 40_000,
  prompt: [...text('What is the value of x?'), { type: 'math', latex: '2x + 6 = 20' }],
  renderings: {
    media: [],
    math: [
      {
        latex: '2x + 6 = 20',
        svg: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="12.321ex" height="2.262ex" role="img" focusable="false" viewBox="0 -750 5446 1000" style="vertical-align: -0.566ex;"><defs><path id="MJX-1-N-32" d="M109 429Q82 429 66 447T50 491Q50 562 103 614T235 666Q326 666 387 610T449 465Q449 422 429 383T381 315T301 241Q265 210 201 149L142 93L218 92Q375 92 385 97Q392 99 409 186V189H449V186Q448 183 436 95T421 3V0H50V19V31Q50 38 56 46T86 81Q115 113 136 137Q145 147 170 174T204 211T233 244T261 278T284 308T305 340T320 369T333 401T340 431T343 464Q343 527 309 573T212 619Q179 619 154 602T119 569T109 550Q109 549 114 549Q132 549 151 535T170 489Q170 464 154 447T109 429Z"></path></defs><g stroke="currentColor" fill="currentColor" stroke-width="0" transform="scale(1,-1)"><g data-mml-node="math"><use data-c="32" xlink:href="#MJX-1-N-32"></use></g></g></svg>',
        widthEx: 12.321,
        heightEx: 2.262,
      },
    ],
    code: [],
  },
  question: {
    type: 'type_answer',
    payload: { format: 'number' },
    key: { accepted: ['7'], numeric: { value: 7, tolerance: 0 } },
  },
  explanation: {
    blocks: [
      ...text('Take 6 from both sides, then halve both sides.'),
      { type: 'math', latex: '2x = 14 \\implies x = 7' },
    ],
    sources: [wikipedia('Linear equation', 'Linear_equation')],
    renderings: {
      media: [],
      math: [
        {
          latex: '2x = 14 \\implies x = 7',
          svg: '<svg xmlns="http://www.w3.org/2000/svg" width="21.87ex" height="1.756ex" role="img" focusable="false" viewBox="0 -694 9666.6 776"><g stroke="currentColor" fill="currentColor" stroke-width="0" transform="scale(1,-1)"><g data-mml-node="math"><path data-c="37" d="M55 458Q56 460 72 567L88 674Q88 676 108 676H128V672Q128 662 143 655T195 646T364 644H485V605L417 512Q408 500 387 472T360 435T339 403T319 367T305 330T292 284T284 230T278 162T275 80Q275 66 275 52T274 28V19Q270 2 255 -10T221 -22Q210 -22 200 -19T179 0T168 40Q168 198 265 368Q285 400 349 489L395 552H302Q128 552 119 546Q113 543 108 522T98 479L95 458V455H55V458Z"></path></g></g></svg>',
          widthEx: 21.87,
          heightEx: 1.756,
        },
      ],
      code: [],
    },
  },
};

const pythonLen: SessionQuestion = {
  id: 'q-python-len',
  version: 3,
  domain: 'technology',
  locale: 'en',
  difficultyMultiplier: 1.15,
  standardLimitMs: 20_000,
  prompt: [
    ...text('What does this Python code print?'),
    { type: 'code', language: 'python', source: 'word = "hello"\nprint(len(word))' },
  ],
  renderings: {
    media: [],
    math: [],
    code: [
      {
        language: 'python',
        source: 'word = "hello"\nprint(len(word))',
        lines: [
          [
            { text: 'word', kind: 'variable' },
            { text: ' ', kind: 'plain' },
            { text: '=', kind: 'operator' },
            { text: ' ', kind: 'plain' },
            { text: '"hello"', kind: 'string' },
          ],
          [
            { text: 'print', kind: 'function' },
            { text: '(', kind: 'punctuation' },
            { text: 'len', kind: 'function' },
            { text: '(', kind: 'punctuation' },
            { text: 'word', kind: 'variable' },
            { text: '))', kind: 'punctuation' },
          ],
        ],
      },
    ],
  },
  question: {
    type: 'single_choice',
    payload: {
      options: [
        { id: 'a', content: text('4') },
        { id: 'b', content: text('5') },
        { id: 'c', content: text('6') },
        { id: 'd', content: text('hello') },
      ],
    },
    key: { correctOptionId: 'b' },
  },
  explanation: {
    blocks: text(
      'len() returns the number of items in a sequence. The string "hello" has five characters.',
    ),
    sources: [
      {
        title: 'Built-in Functions: len()',
        url: 'https://docs.python.org/3/library/functions.html#len',
      },
    ],
    renderings: nothingRendered(),
  },
};

const orderTheEvents: SessionQuestion = {
  id: 'q-order-the-events',
  version: 1,
  domain: 'history',
  locale: 'en',
  difficultyMultiplier: 1.15,
  standardLimitMs: 30_000,
  prompt: text('Put these events in order, earliest first.'),
  renderings: nothingRendered(),
  question: {
    type: 'ordering',
    payload: {
      items: [
        { id: 'wall', content: text('The Berlin Wall falls') },
        { id: 'flight', content: text('The Wright brothers make the first powered flight') },
        { id: 'moon', content: text('Apollo 11 lands on the Moon') },
        { id: 'war', content: text('The Second World War begins') },
      ],
    },
    key: { order: ['flight', 'war', 'moon', 'wall'] },
  },
  explanation: {
    blocks: text(
      'The Wright brothers flew in 1903, the Second World War began in 1939, Apollo 11 landed in 1969 and the Berlin Wall fell in 1989.',
    ),
    sources: [
      wikipedia('Wright Flyer', 'Wright_Flyer'),
      wikipedia('Apollo 11', 'Apollo_11'),
      wikipedia('Fall of the Berlin Wall', 'Fall_of_the_Berlin_Wall'),
    ],
    renderings: nothingRendered(),
  },
};

const solitudeAuthor: SessionQuestion = {
  id: 'q-solitude-author',
  version: 1,
  domain: 'arts-literature',
  locale: 'en',
  difficultyMultiplier: 1.5,
  standardLimitMs: 30_000,
  prompt: text('Who wrote the novel "One Hundred Years of Solitude"?'),
  renderings: nothingRendered(),
  question: {
    type: 'type_answer',
    payload: { format: 'text' },
    key: { accepted: ['Gabriel García Márquez', 'García Márquez'] },
  },
  explanation: {
    blocks: text(
      'The Colombian writer Gabriel García Márquez published it in 1967. He was awarded the Nobel Prize in Literature in 1982.',
    ),
    sources: [wikipedia('One Hundred Years of Solitude', 'One_Hundred_Years_of_Solitude')],
    renderings: nothingRendered(),
  },
};

const symbolW: SessionQuestion = {
  id: 'q-symbol-w',
  version: 1,
  domain: 'science',
  locale: 'en',
  difficultyMultiplier: 1.5,
  standardLimitMs: 20_000,
  prompt: text('Which element has the chemical symbol W?'),
  renderings: nothingRendered(),
  question: {
    type: 'single_choice',
    payload: {
      options: [
        { id: 'a', content: text('Tin') },
        { id: 'b', content: text('Titanium') },
        { id: 'c', content: text('Tellurium') },
        { id: 'd', content: text('Tungsten') },
      ],
    },
    key: { correctOptionId: 'd' },
  },
  explanation: {
    blocks: text(
      "The W stands for wolfram, the element's other name, which comes from the mineral wolframite.",
    ),
    sources: [wikipedia('Tungsten', 'Tungsten')],
    renderings: nothingRendered(),
  },
};

/** The eight questions, easy to hard. */
export const questionFixtures: readonly SessionQuestion[] = [
  largestOcean,
  soundInWater,
  whichIsAMammal,
  solveForX,
  pythonLen,
  orderTheEvents,
  solitudeAuthor,
  symbolW,
];

/** The eight as one snapshot, scored with the spec's values. */
export const questionSetFixture: QuestionSet = {
  rules: { scoring: specScoringConfig, tunables: specMvpTunables },
  questions: [...questionFixtures],
};
