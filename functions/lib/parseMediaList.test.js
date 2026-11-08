import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseMediaList, mediaFromTweetResults } from './parsers.js';

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
