import { describe, expect, it } from 'vitest';
import { image, text } from '../../src/fixtures/content.ts';
import { mvpRegistry } from '../../src/types/index.ts';

/** Where the question schema objects, or nowhere when the question is sound. */
const issuePaths = (question: unknown): PropertyKey[][] => {
  const result = mvpRegistry.questionSchema.safeParse(question);
  return result.success ? [] : result.error.issues.map((issue) => issue.path);
};

const letters = ['a', 'b', 'c', 'd', 'e'];

const singleChoice = (options: unknown, correctOptionId: unknown = 'a') => ({
  type: 'single_choice',
  payload: { options },
  key: { correctOptionId },
});
const textOptions = (...labels: string[]) =>
  labels.map((label, index) => ({ id: letters[index], content: text(label) }));

const imageChoice = (options: unknown, correctOptionId: unknown = 'a') => ({
  type: 'image_choice',
  payload: { options },
  key: { correctOptionId },
});
const imageOptions = (...assetIds: string[]) =>
  assetIds.map((assetId, index) => ({
    id: letters[index],
    image: image(assetId, `A picture of ${assetId}`),
  }));

describe('single_choice and image_choice questions', () => {
  it('accepts 2 to 4 distinct options with a key that names one', () => {
    expect(issuePaths(singleChoice(textOptions('Earth', 'Mars')))).toEqual([]);
    expect(issuePaths(singleChoice(textOptions('Earth', 'Mars', 'Venus', 'Jupiter'), 'd'))).toEqual(
      [],
    );
    expect(issuePaths(imageChoice(imageOptions('earth', 'mars')))).toEqual([]);
    expect(issuePaths(imageChoice(imageOptions('earth', 'mars', 'venus', 'jupiter'), 'd'))).toEqual(
      [],
    );
  });

  it('refuses fewer than 2 or more than 4 options', () => {
    const five = ['Earth', 'Mars', 'Venus', 'Jupiter', 'Saturn'];

    expect(issuePaths(singleChoice(textOptions('Earth')))).toEqual([['payload', 'options']]);
    expect(issuePaths(singleChoice(textOptions(...five)))).toEqual([['payload', 'options']]);
    expect(issuePaths(imageChoice(imageOptions('earth')))).toEqual([['payload', 'options']]);
    expect(issuePaths(imageChoice(imageOptions(...five)))).toEqual([['payload', 'options']]);
  });

  it('a list over its cap is refused for its size alone, before its options are compared', () => {
    const same = Array.from({ length: 2_000 }, () => ({ id: 'a', content: text('Earth') }));
    const started = Date.now();

    expect(issuePaths(singleChoice(same, 'z'))).toEqual([['payload', 'options']]);
    // Comparing every pair of 2,000 options would be two million structural comparisons.
    expect(Date.now() - started).toBeLessThan(1_000);
  });

  it('refuses duplicate option ids', () => {
    const [earth, mars] = textOptions('Earth', 'Mars');
    const [earthImage, marsImage] = imageOptions('earth', 'mars');

    expect(issuePaths(singleChoice([earth, { ...mars, id: 'a' }]))).toEqual([
      ['payload', 'options', 1, 'id'],
    ]);
    expect(issuePaths(imageChoice([earthImage, { ...marsImage, id: 'a' }]))).toEqual([
      ['payload', 'options', 1, 'id'],
    ]);
  });

  it('refuses an option id that is empty or longer than 32 characters', () => {
    const [earth, mars] = textOptions('Earth', 'Mars');

    expect(issuePaths(singleChoice([earth, { ...mars, id: '' }]))).toEqual([
      ['payload', 'options', 1, 'id'],
    ]);
    expect(issuePaths(singleChoice([earth, { ...mars, id: 'x'.repeat(33) }]))).toEqual([
      ['payload', 'options', 1, 'id'],
    ]);
    expect(issuePaths(singleChoice([earth, { ...mars, id: 'x'.repeat(32) }]))).toEqual([]);
  });

  it('refuses a key that names no option', () => {
    expect(issuePaths(singleChoice(textOptions('Earth', 'Mars'), 'z'))).toEqual([
      ['key', 'correctOptionId'],
    ]);
    expect(issuePaths(imageChoice(imageOptions('earth', 'mars'), 'z'))).toEqual([
      ['key', 'correctOptionId'],
    ]);
  });

  it('refuses two options with the same content', () => {
    expect(issuePaths(singleChoice(textOptions('Earth', 'Mars', 'Earth')))).toEqual([
      ['payload', 'options', 2, 'content'],
    ]);
    expect(issuePaths(imageChoice(imageOptions('earth', 'mars', 'earth')))).toEqual([
      ['payload', 'options', 2, 'image'],
    ]);
  });

  it('refuses an option with no content', () => {
    const [earth, mars] = textOptions('Earth', 'Mars');

    expect(issuePaths(singleChoice([earth, { ...mars, content: [] }]))).toEqual([
      ['payload', 'options', 1, 'content'],
    ]);
    expect(issuePaths(singleChoice([earth, { id: 'b' }]))).toEqual([
      ['payload', 'options', 1, 'content'],
    ]);
  });

  it('refuses an image option without alt text', () => {
    const [earth] = imageOptions('earth');
    const noAlt = { id: 'b', image: { type: 'image', assetId: 'mars' } };
    const blankAlt = { id: 'b', image: image('mars', '   ') };

    expect(issuePaths(imageChoice([earth, noAlt]))).toEqual([
      ['payload', 'options', 1, 'image', 'alt'],
    ]);
    expect(issuePaths(imageChoice([earth, blankAlt]))).toEqual([
      ['payload', 'options', 1, 'image', 'alt'],
    ]);
  });

  it('refuses an image option that holds anything but one image', () => {
    const [earth] = imageOptions('earth');

    expect(issuePaths(imageChoice([earth, { id: 'b', image: text('Mars') }]))).not.toEqual([]);
    expect(issuePaths(imageChoice([earth, { id: 'b', content: text('Mars') }]))).not.toEqual([]);
  });

  it('refuses properties the schema does not name', () => {
    const options = textOptions('Earth', 'Mars');
    const [earth, mars] = options;

    expect(issuePaths({ ...singleChoice(options), explanation: 'x' })).toEqual([[]]);
    expect(issuePaths({ ...singleChoice(options), payload: { options, shuffle: true } })).toEqual([
      ['payload'],
    ]);
    expect(issuePaths(singleChoice([earth, { ...mars, correct: true }]))).toEqual([
      ['payload', 'options', 1],
    ]);
    expect(
      issuePaths({ ...singleChoice(options), key: { correctOptionId: 'a', hint: 'x' } }),
    ).toEqual([['key']]);
  });
});

describe('true_false questions', () => {
  it('accepts an empty payload and a boolean key', () => {
    expect(issuePaths({ type: 'true_false', payload: {}, key: { value: false } })).toEqual([]);
  });

  it('true_false refuses any payload property', () => {
    expect(
      issuePaths({
        type: 'true_false',
        payload: { labels: ['Fact', 'Myth'] },
        key: { value: true },
      }),
    ).toEqual([['payload']]);
  });

  it('refuses a key that is not a boolean', () => {
    expect(issuePaths({ type: 'true_false', payload: {}, key: { value: 'true' } })).toEqual([
      ['key', 'value'],
    ]);
  });
});
