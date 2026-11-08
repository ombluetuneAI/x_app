import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  enrichUserMediaPage,
  extractRetweetMediaFromTweets,
  mergeGalleryMediaLists,
  mediaGalleryKey,
} from './userMediaEnrich.js';

const nativeOnly = [
  {
    type: 'photo',
    tweet_id: '100',
    url: 'https://pbs.twimg.com/native.jpg',
    media_id: 'n-100',
  },
];

const tweetsWithRt = [
  {
    id: '500',
    text: 'RT @other: scenic',
    created_at: 'Mon Jan 02 00:00:00 +0000 2024',
    media: [],
    retweeted_tweet: {
      id: '888',
      text: 'scenic',
      created_at: 'Mon Jan 01 12:00:00 +0000 2024',
      media: [
        {
          type: 'photo',
          tweet_id: '888',
          url: 'https://pbs.twimg.com/rt-photo.jpg',
          media_id: 'rt-888',
        },
      ],
    },
  },
  {
    id: '501',
    text: 'RT @other: clip',
    created_at: 'Mon Jan 03 00:00:00 +0000 2024',
    media: [],
    retweeted_tweet: {
      id: '777',
      text: 'clip',
      created_at: 'Mon Jan 02 12:00:00 +0000 2024',
      media: [
        {
          type: 'video',
          tweet_id: '777',
          url: 'https://pbs.twimg.com/rt-video-thumb.jpg',
          video_url: 'https://video.twimg.com/x.mp4',
          media_id: 'rt-777',
        },
      ],
    },
  },
];

test('extractRetweetMediaFromTweets returns inner tweet media only', () => {
  const items = extractRetweetMediaFromTweets(tweetsWithRt);
  assert.equal(items.length, 2);
  assert.equal(items[0].media_source, 'tweet_retweet');
  assert.equal(items[0].wrapper_tweet_id, '500');
  assert.equal(items[0].tweet_id, '888');
});

test('enrichUserMediaPage merges UserMedia with tweet retweet supplements', () => {
  const { media, sources } = enrichUserMediaPage({
    nativeMedia: nativeOnly,
    tweets: tweetsWithRt,
  });
  assert.equal(sources.user_media_count, 1);
  assert.equal(sources.tweet_retweet_items, 2);
  assert.equal(sources.merged_count, 3);
  assert.ok(media.some((m) => m.media_source === 'tweet_retweet' && m.tweet_id === '888'));
  assert.ok(media.some((m) => m.media_source === 'tweet_retweet' && m.type === 'video'));
});

test('mergeGalleryMediaLists dedupes by media_id', () => {
  const dup = { tweet_id: '1', media_id: 'same', url: 'https://pbs.twimg.com/a.jpg' };
  const merged = mergeGalleryMediaLists([dup], [{ ...dup, media_source: 'tweet_retweet' }]);
  assert.equal(merged.length, 1);
});

test('mediaGalleryKey prefers media_id', () => {
  assert.equal(mediaGalleryKey({ media_id: 'x', tweet_id: '1', url: 'u' }), 'x');
});
