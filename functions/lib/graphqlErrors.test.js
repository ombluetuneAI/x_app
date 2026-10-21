import { test } from 'node:test';
import assert from 'node:assert/strict';
import { humanizeGraphqlErrors } from './graphqlErrors.js';

test('humanizeGraphqlErrors maps validation failures to short message', () => {
  const msg = humanizeGraphqlErrors({
    errors: [
      {
        code: 'GRAPHQL_VALIDATION_FAILED',
        extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
        message: 'Variable "$withBirdwatchNotes" must be defined',
        path: ['variable', 'withBirdwatchNotes'],
      },
    ],
  });
  assert.match(msg, /Unable to load this post/);
  assert.doesNotMatch(msg, /withBirdwatchNotes/);
});
