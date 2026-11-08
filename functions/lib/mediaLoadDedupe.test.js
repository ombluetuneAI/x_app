import { test } from 'node:test';
import assert from 'node:assert/strict';

/** Keep in sync with static/app.js mediaDedupeKey */
function mediaDedupeKey(m) {
  if (m.media_id) return String(m.media_id);
  const url = m.url || '';
  const tweetId = m.tweet_id || '';
  return url ? `${tweetId}:${url}` : tweetId;
}

function applyMediaLoadDedupe(media) {
  const loaded = new Set();
  const kept = [];
  for (const m of media) {
    const key = mediaDedupeKey(m);
    if (!key || loaded.has(key)) continue;
    loaded.add(key);
    kept.push(m);
  }
  return kept;
}

test('media load dedupe keeps multiple assets on one tweet', () => {
  const media = [
    { tweet_id: '1', media_id: 'm-a', url: 'https://pbs.twimg.com/a.jpg' },
    { tweet_id: '1', media_id: 'm-b', url: 'https://pbs.twimg.com/b.jpg' },
  ];
  const kept = applyMediaLoadDedupe(media);
  assert.equal(kept.length, 2);
});

test('media load dedupe still drops identical keys', () => {
  const media = [
    { tweet_id: '1', media_id: 'm-a', url: 'https://pbs.twimg.com/a.jpg' },
    { tweet_id: '1', media_id: 'm-a', url: 'https://pbs.twimg.com/a.jpg' },
  ];
  assert.equal(applyMediaLoadDedupe(media).length, 1);
});
