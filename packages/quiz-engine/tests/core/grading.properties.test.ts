import fc from 'fast-check';
import { describeRegistryProperties } from '../support/registry-properties.ts';
import { toyKits, toyRegistry } from '../support/toy-types.ts';

describeRegistryProperties(
  'toy registry',
  toyRegistry,
  toyKits,
  { toy_word: { ignoreCase: true } },
  fc.constantFrom('en', 'en-GB', 'es', 'pt-BR', 'hi'),
);
