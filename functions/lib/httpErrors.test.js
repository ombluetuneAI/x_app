import { test } from 'node:test';
import assert from 'node:assert/strict';
import { friendlyXHttpError } from './httpErrors.js';

test('friendlyXHttpError explains SearchTimeline 404', () => {
  const msg = friendlyXHttpError(
    404,
    '/i/api/graphql/stale/SearchTimeline',
    '',
    {}
  );
  assert.match(msg, /SearchTimeline/);
  assert.match(msg, /X_SEARCH_TIMELINE_QUERY_ID/);
});

test('friendlyXHttpError avoids Unknown error for empty body', () => {
  const msg = friendlyXHttpError(502, '/i/api/1.1/foo.json', '', {});
  assert.notEqual(msg, 'Unknown error');
  assert.match(msg, /请求失败/);
});