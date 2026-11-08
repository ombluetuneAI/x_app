import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  parseMediaList,
  mediaFromTweetResults,
  summarizeUserMediaResponse,
} from './parsers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, 'fixtures');

function loadFixture(name) {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf8'));
}

test('parseMediaList includes original tweet photo and video media', () => {
  const data = loadFixture('user_media_timeline.json');
  const { media, nextCursor } = parseMediaList(data);
  assert.equal(media.length, 3);
  assert.equal(nextCursor, 'media-cursor-2');

  const original = media.find((m) => m.tweet_id === '1001');
  assert.ok(original);
  assert.equal(original.type, 'photo');
  assert.equal(original.url, 'https://pbs.twimg.com/media/original_photo.jpg');
  assert.equal(original.tweet_text, 'Original photo post');
});

test('parseMediaList extracts photo from retweeted_status_result', () => {
  const data = loadFixture('user_media_timeline.json');
  const { media } = parseMediaList(data);
  const fromRetweet = media.find((m) => m.tweet_id === '1500');
  assert.ok(fromRetweet, 'expected inner tweet media from retweet');
  assert.equal(fromRetweet.type, 'photo');
  assert.equal(fromRetweet.url, 'https://pbs.twimg.com/media/retweeted_photo.jpg');
  assert.equal(fromRetweet.tweet_text, 'Nice shot');
});

test('parseMediaList extracts video from retweeted_status_result', () => {
  const data = loadFixture('user_media_timeline.json');
  const { media } = parseMediaList(data);
  const video = media.find((m) => m.tweet_id === '2500');
  assert.ok(video);
  assert.equal(video.type, 'video');
  assert.equal(video.url, 'https://pbs.twimg.com/media/video_thumb.jpg');
  assert.equal(video.video_url, 'https://video.twimg.com/clip.mp4?tag=21');
  assert.equal(video.duration, 5);
});

test('mediaFromTweetResults falls back to nested retweet media', () => {
  const data = loadFixture('user_media_timeline.json');
  const item = data.data.user.result.timeline_v2.timeline.instructions[0].entries[1].content
    .itemContent;
  const items = mediaFromTweetResults(item.tweet_results);
  assert.equal(items.length, 1);
  assert.equal(items[0].tweet_id, '1500');
});

test('mediaFromTweetResults reads media on TweetWithVisibilityResults outer legacy', () => {
  const data = loadFixture('user_media_visibility_outer.json');
  const item =
    data.data.user.result.timeline_v2.timeline.instructions[0].entries[0].content.items[1].item
      .itemContent;
  const items = mediaFromTweetResults(item.tweet_results);
  assert.equal(items.length, 1);
  assert.equal(items[0].url, 'https://pbs.twimg.com/media/visibility_outer_photo.jpg');
  assert.equal(items[0].media_id, 'media-9101');
});

test('parseMediaList returns every photo on multi-image tweets', () => {
  const data = loadFixture('user_media_multi_photo.json');
  const { media } = parseMediaList(data);
  assert.equal(media.length, 2);
  assert.deepEqual(
    media.map((m) => m.media_id).sort(),
    ['m-8801-a', 'm-8801-b']
  );
});

test('summarizeUserMediaResponse counts outer and retweet fallback paths', () => {
  const data = loadFixture('user_media_timeline.json');
  const summary = summarizeUserMediaResponse(data);
  assert.equal(summary.itemCount, 3);
  assert.equal(summary.mediaCount, 3);
  assert.equal(summary.retweetFallbackHits, 2);
});
