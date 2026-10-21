import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  parseUserByScreenName,
  parseTweets,
  parseTweetDetail,
  getNextCursor,
  getEntries,
} from './parsers.js';
import { buildTweetDetailVariables } from './constants.js';
import { userToDict, tweetToDict } from './models.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, 'fixtures');

function loadFixture(name) {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf8'));
}

test('parseUserByScreenName extracts screen name and id', () => {
  const data = loadFixture('user_by_screen_name.json');
  const user = parseUserByScreenName(data);
  assert.ok(user);
  assert.equal(user.screen_name, 'exampleuser');
  assert.equal(user.id, '1234567890');
  const dict = userToDict(user);
  assert.equal(dict.stats.followers_count, 42);
});

test('buildTweetDetailVariables includes required withBirdwatchNotes', () => {
  const vars = buildTweetDetailVariables('12345');
  assert.equal(vars.focalTweetId, '12345');
  assert.equal(vars.withBirdwatchNotes, false);
  assert.equal(vars.withV2Timeline, true);
  assert.equal(vars.withVoice, true);
  assert.equal(vars.withCommunity, true);
  assert.equal(vars.rankingMode, 'Relevance');
  assert.equal(vars.cursor, undefined);
  const withCursor = buildTweetDetailVariables('12345', 'abc');
  assert.equal(withCursor.cursor, 'abc');
});

test('parseTweetDetail extracts ancestors, focal tweet, replies, and cursor', () => {
  const data = loadFixture('tweet_detail.json');
  const { tweet, ancestors, replies, nextCursor } = parseTweetDetail(data, '200');
  assert.ok(tweet);
  assert.equal(tweet.id, '200');
  assert.equal(tweet.text, 'Focal tweet text for detail view');
  assert.equal(ancestors.length, 2);
  assert.equal(ancestors[0].id, '100');
  assert.equal(ancestors[1].id, '101');
  assert.equal(replies.length, 2);
  assert.equal(replies[0].id, '201');
  assert.equal(replies[1].id, '202');
  assert.equal(nextCursor, 'reply-cursor-page-2');
});

test('parseTweets extracts tweet text and cursor', () => {
  const data = loadFixture('home_timeline.json');
  const { tweets, nextCursor } = parseTweets(data);
  assert.equal(tweets.length, 1);
  assert.equal(tweets[0].text, 'Hello world');
  const entries = getEntries(data.data.home.home_timeline_urt.instructions);
  assert.equal(getNextCursor(entries), nextCursor);
  assert.ok(tweetToDict(tweets[0]).stats);
});
