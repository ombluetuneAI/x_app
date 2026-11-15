import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  buildSearchTimelineVariables,
  buildTrendsParams,
  buildTypeaheadParams,
  getSearchTimelineEndpoint,
} from './constants.js';
import {
  parseTweets,
  parseUsersFromTimeline,
  parseTrends,
  parseTypeaheadUsers,
} from './parsers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, 'fixtures');

function loadFixture(name) {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf8'));
}

test('buildSearchTimelineVariables sets product and cursor', () => {
  const base = buildSearchTimelineVariables({
    rawQuery: 'elon',
    product: 'Latest',
    count: 15,
  });
  assert.equal(base.rawQuery, 'elon');
  assert.equal(base.product, 'Latest');
  assert.equal(base.count, 15);
  assert.equal(base.querySource, 'typed_query');
  assert.equal(base.withGrokTranslatedBio, true);
  assert.equal(base.withQuickPromoteEligibilityTweetFields, false);
  assert.equal(base.cursor, undefined);

  const paged = buildSearchTimelineVariables({
    rawQuery: 'test',
    product: 'People',
    cursor: 'abc',
  });
  assert.equal(paged.cursor, 'abc');
  assert.equal(paged.product, 'People');
});

test('buildTrendsParams requests trends guide feed', () => {
  const params = buildTrendsParams();
  assert.equal(params.candidate_source, 'trends');
  assert.equal(params.requestContext, 'launch');
});

test('getSearchTimelineEndpoint uses env override', () => {
  assert.match(getSearchTimelineEndpoint({}), /3fEctOs2-FvTB7_mvm1hrQ\/SearchTimeline/);
  assert.match(
    getSearchTimelineEndpoint({ X_SEARCH_TIMELINE_QUERY_ID: 'customSearchId' }),
    /customSearchId\/SearchTimeline/
  );
});

test('buildTypeaheadParams limits to users', () => {
  const params = buildTypeaheadParams('foo');
  assert.equal(params.q, 'foo');
  assert.equal(params.result_type, 'users');
  assert.equal(params.src, 'search_box');
});

test('parseTweets reads SearchTimeline instructions', () => {
  const data = loadFixture('search_timeline_tweets.json');
  const { tweets, nextCursor } = parseTweets(data);
  assert.equal(tweets.length, 1);
  assert.equal(tweets[0].text, 'Search hit tweet');
  assert.equal(nextCursor, 'search-cursor-2');
});

test('parseUsersFromTimeline reads SearchTimeline people results', () => {
  const data = loadFixture('search_timeline_people.json');
  const { users, nextCursor } = parseUsersFromTimeline(data);
  assert.equal(users.length, 1);
  assert.equal(users[0].screen_name, 'founduser');
  assert.equal(nextCursor, '');
});

test('parseTrends extracts trend names from guide.json', () => {
  const data = loadFixture('trends_guide.json');
  const { trends } = parseTrends(data);
  assert.equal(trends.length, 2);
  assert.equal(trends[0].name, '示例热搜');
  assert.match(trends[0].tweet_count, /12\.3K/);
});

test('parseTypeaheadUsers maps v1.1 users', () => {
  const data = {
    users: [
      {
        id_str: '1',
        name: 'Type User',
        screen_name: 'typeuser',
        profile_image_url_https: 'https://pbs.twimg.com/profile_normal/t.jpg',
      },
    ],
  };
  const { users } = parseTypeaheadUsers(data);
  assert.equal(users.length, 1);
  assert.equal(users[0].screen_name, 'typeuser');
});