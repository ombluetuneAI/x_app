import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseUserByScreenName, parseTweets, getNextCursor, getEntries } from './parsers.js';
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

test('parseTweets extracts tweet text and cursor', () => {
  const data = loadFixture('home_timeline.json');
  const { tweets, nextCursor } = parseTweets(data);
  assert.equal(tweets.length, 1);
  assert.equal(tweets[0].text, 'Hello world');
  const entries = getEntries(data.data.home.home_timeline_urt.instructions);
  assert.equal(getNextCursor(entries), nextCursor);
  assert.ok(tweetToDict(tweets[0]).stats);
});
