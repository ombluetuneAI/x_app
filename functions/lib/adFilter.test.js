import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isPromotedEntryId,
  isPromotedItemContent,
  isPromotedTimelineEntry,
  filterTimelineEntries,
} from './adFilter.js';

test('isPromotedEntryId matches promoted-tweet and promoted- prefixes', () => {
  assert.equal(isPromotedEntryId('promoted-tweet-123'), true);
  assert.equal(isPromotedEntryId('promoted-card-abc'), true);
  assert.equal(isPromotedEntryId('tweet-123'), false);
});

test('isPromotedItemContent detects promotedMetadata and itemType', () => {
  assert.equal(
    isPromotedItemContent({
      itemType: 'TimelineTweet',
      promotedMetadata: { impressionId: 'x' },
    }),
    true
  );
  assert.equal(
    isPromotedItemContent({ itemType: 'TimelinePromotedTweet', tweet_results: {} }),
    true
  );
  assert.equal(
    isPromotedItemContent({
      itemType: 'TimelineTweet',
      tweet_results: { result: { rest_id: '1', legacy: {} } },
    }),
    false
  );
});

test('filterTimelineEntries keeps organic tweets and bottom cursor', () => {
  const entries = [
    {
      entryId: 'tweet-1',
      content: {
        entryType: 'TimelineTimelineItem',
        itemContent: { itemType: 'TimelineTweet', tweet_results: { result: { rest_id: '1' } } },
      },
    },
    {
      entryId: 'promoted-tweet-9',
      content: {
        entryType: 'TimelineTimelineItem',
        itemContent: {
          promotedMetadata: {},
          tweet_results: { result: { rest_id: '9' } },
        },
      },
    },
    {
      entryId: 'cursor-bottom',
      content: {
        entryType: 'TimelineTimelineCursor',
        cursorType: 'Bottom',
        value: 'next',
      },
    },
  ];
  const filtered = filterTimelineEntries(entries);
  assert.equal(filtered.length, 2);
  assert.equal(filtered[0].entryId, 'tweet-1');
  assert.equal(filtered[1].content.value, 'next');
  assert.equal(isPromotedTimelineEntry(filtered[0]), false);
});
