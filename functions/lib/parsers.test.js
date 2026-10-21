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

test('parseTweetDetail splits classic TimelineTimelineItem replies', () => {
  const data = loadFixture('tweet_detail_classic.json');
  const { focal, ancestors, replies, nextCursor } = parseTweetDetail(data, '200');
  assert.equal(focal?.id, '200');
  assert.equal(focal?.text, 'Focal tweet body');
  assert.equal(ancestors.length, 1);
  assert.equal(ancestors[0].id, '100');
  assert.equal(replies.length, 1);
  assert.equal(replies[0].text, 'Classic reply item');
  assert.equal(nextCursor, 'reply-cursor-2');
});

test('parseTweetDetail classifies conversationthread modules by focal position', () => {
  const data = loadFixture('tweet_detail_conversationthread.json');
  const { focal, ancestors, replies, nextCursor } = parseTweetDetail(data, '20');
  assert.equal(focal?.id, '20');
  assert.equal(ancestors.length, 1);
  assert.equal(ancestors[0].id, '10');
  assert.equal(replies.length, 2);
  assert.equal(replies[0].id, '30');
  assert.equal(replies[1].id, '31');
  assert.equal(nextCursor, 'thread-reply-cursor');
});

test('parseTweetDetail continuation returns reply page only', () => {
  const data = loadFixture('tweet_detail_classic.json');
  const page = parseTweetDetail(data, '200', { continuation: true });
  assert.equal(page.focal, null);
  assert.equal(page.ancestors.length, 0);
  assert.equal(page.replies.length, 3);
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
