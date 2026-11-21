import { describe, expect, it } from 'vitest';
import * as fixtures from '../src/fixtures/index.ts';
import * as contracts from '../src/index.ts';
import * as openapi from '../src/openapi.ts';

// What the three entry points of `@repo/contracts` export at run time. The app, the API and the
// fake server build on these names, so adding or removing one is a deliberate edit to these lists.

describe('public API', () => {
  it('@repo/contracts exports the schemas, the registry, the catalogue and the shared logic', () => {
    expect(Object.keys(contracts).sort()).toEqual([
      'accessLevels',
      'appVersionSchema',
      'areas',
      'assetOf',
      'audioAssetSchema',
      'codeRenderingOf',
      'codeRenderingSchema',
      'codeTokenKinds',
      'completionResultSchema',
      'completionSchema',
      'configSchema',
      'countSchema',
      'createSessionSchema',
      'cursorSchema',
      'dailyGoalTierSchema',
      'dailySetSchema',
      'defineEndpoint',
      'deviceParamsSchema',
      'deviceSchema',
      'domainSchema',
      'domainsSchema',
      'endpointList',
      'endpoints',
      'errorCatalog',
      'errorCodes',
      'gameRulesSchema',
      'globalSetParamsSchema',
      'guestRequestSchema',
      'guestResponseSchema',
      'headerNames',
      'httpsUrlSchema',
      'idSchema',
      'idempotencyKeySchema',
      'imageAssetSchema',
      'isErrorCode',
      'isoTimestampSchema',
      'localDateSchema',
      'localeSchema',
      'mathRenderingOf',
      'mathRenderingSchema',
      'maxPageSize',
      'maxSessionQuestions',
      'maxSvgLength',
      'mediaAssetSchema',
      'pageOf',
      'pageQueryShape',
      'platformSchema',
      'playModeSchema',
      'playerQuestionItemSchema',
      'playerSchema',
      'problemContentType',
      'problemOf',
      'problemSchema',
      'progressQuerySchema',
      'progressSchema',
      'questionSetSchema',
      'quizPageSchema',
      'quizParamsSchema',
      'quizSchema',
      'quizzesQuerySchema',
      'renderingsSchema',
      'sessionEvaluationSchema',
      'sessionItemsOf',
      'sessionParamsSchema',
      'sessionQuestionSchema',
      'sessionRulesSchema',
      'sessionSchema',
      'sessionSourceSchema',
      'sharedSchemas',
      'slugSchema',
      'streakStatusSchema',
      'svgProblem',
      'timeZoneSchema',
      'toPlayerQuestionItem',
      'unrenderedBlocks',
      'updatePlayerSchema',
      'utcOffsetMinutesSchema',
    ]);
  });

  it('@repo/contracts/fixtures exports the list and each fixture by name', () => {
    const names = Object.keys(fixtures);

    expect(names).toContain('fixtures');
    expect(names.filter((name) => name !== 'fixtures' && !name.endsWith('Fixture'))).toEqual([
      'problemFixtures',
      'questionFixtures',
    ]);
    expect(names).toHaveLength(37);
  });

  it('@repo/contracts/openapi exports the generator and nothing else', () => {
    expect(Object.keys(openapi)).toEqual(['generateOpenApi']);
  });

  it('the main entry point does not carry the fixtures or the generator into the app', () => {
    expect(contracts).not.toHaveProperty('fixtures');
    expect(contracts).not.toHaveProperty('generateOpenApi');
  });
});
