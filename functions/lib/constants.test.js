import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTweetDetailVariables, getTweetDetailEndpoint } from './constants.js';

test('buildTweetDetailVariables always includes withBirdwatchNotes', () => {
  const vars = buildTweetDetailVariables('12345');
  assert.equal(vars.focalTweetId, '12345');
  assert.equal(vars.withBirdwatchNotes, false);
  assert.equal(vars.withV2Timeline, true);
  assert.equal(vars.cursor, undefined);
});

test('buildTweetDetailVariables adds cursor and referrer for pagination', () => {
  const vars = buildTweetDetailVariables('99', 'cursor-abc');
  assert.equal(vars.cursor, 'cursor-abc');
  assert.equal(vars.referrer, 'tweet');
  assert.equal(vars.withBirdwatchNotes, false);
});

test('getTweetDetailEndpoint uses env override', () => {
  assert.match(getTweetDetailEndpoint({}), /3BlMtudy4N-d78ch7zTLZQ\/TweetDetail/);
  assert.match(
    getTweetDetailEndpoint({ X_TWEET_DETAIL_QUERY_ID: 'customQueryId' }),
    /customQueryId\/TweetDetail/
  );
});
